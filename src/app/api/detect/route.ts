import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || '';
const MODEL_VERSION = process.env.REPLICATE_MODEL_VERSION || '';

const CLASS_INFO: Record<string, { name: string; severity: string; description: string }> = {
  'VG;MT': {
    name: 'Vortex Generator Missing/Damaged',
    severity: 'minor',
    description: 'Vortex generator missing or damaged; monitor and repair to restore aerodynamic performance.',
  },
  'LE;ER': {
    name: 'Leading Edge Erosion',
    severity: 'critical',
    description: 'Leading edge erosion that can reduce efficiency and accelerate structural wear.',
  },
  'LR;DA': {
    name: 'Lightning Receptor Damage',
    severity: 'critical',
    description: 'Lightning receptor damage that increases strike risk and requires urgent corrective action.',
  },
  'LE;CR': {
    name: 'Leading Edge Crack',
    severity: 'major',
    description: 'Leading edge crack with propagation risk under cyclic turbine loading.',
  },
  'SF;PO': {
    name: 'Surface Peel-Off',
    severity: 'major',
    description: 'Surface peel-off exposing underlying material and increasing further degradation risk.',
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64 data URI for Replicate
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64}`;

    // Call Replicate API
    const startTime = Date.now();
    const replicateRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          image: dataUri,
          conf: 0.25,
          iou: 0.45,
          imgsz: 640,
          return_json: true,
        },
      }),
    });

    if (!replicateRes.ok) {
      const error = await replicateRes.json();
      return NextResponse.json(
        { error: 'Replicate API error', detail: error },
        { status: replicateRes.status }
      );
    }

    let prediction = await replicateRes.json();

    // Poll for completion
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise((r) => setTimeout(r, 1000));
      const pollRes = await fetch(prediction.urls.get, {
        headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
      });
      prediction = await pollRes.json();
    }

    if (prediction.status === 'failed') {
      return NextResponse.json(
        { error: 'Prediction failed', detail: prediction.error },
        { status: 500 }
      );
    }

    const inferenceTime = Date.now() - startTime;

    // Parse YOLO JSON output from Replicate
    const output = prediction.output;
    const jsonStr = output?.json_str;
    const annotatedImage = output?.image;

    let detections: any[] = [];
    if (jsonStr) {
      try {
        const yamlResults = JSON.parse(jsonStr);
        detections = yamlResults.map((det: any) => {
          const cls = det.name || '';
          const info = CLASS_INFO[cls] || { name: cls, severity: 'info', description: '' };
          const box = det.box || {};
          return {
            class: cls,
            confidence: det.confidence || 0,
            severity: info.severity,
            description: info.description,
            bbox: {
              x: box.x1 ? Math.round((box.x1 / (det.image_width || 640)) * 100 * 100) / 100 : 0,
              y: box.y1 ? Math.round((box.y1 / (det.image_height || 640)) * 100 * 100) / 100 : 0,
              w: box.x1 && box.x2 ? Math.round(((box.x2 - box.x1) / (det.image_width || 640)) * 100 * 100) / 100 : 0,
              h: box.y1 && box.y2 ? Math.round(((box.y2 - box.y1) / (det.image_height || 640)) * 100 * 100) / 100 : 0,
            },
          };
        });
      } catch {
        // json parse failed, leave detections empty
      }
    }

    return NextResponse.json({
      filename: file.name,
      image_width: 0,
      image_height: 0,
      detections,
      detection_count: detections.length,
      inference_time_ms: inferenceTime,
      tiles_processed: 1,
      model: 'YOLO11m-DTU',
      sahi_enabled: false,
      annotated_image: annotatedImage || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Server error', detail: error.message },
      { status: 500 }
    );
  }
}
