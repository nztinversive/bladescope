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

    // Call Replicate API with SAHI enabled
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
          use_sahi: true,
          slice_size: 640,
          overlap_ratio: 0.2,
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

    // Poll for completion (timeout after 5 min)
    const pollDeadline = Date.now() + 300_000;
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      if (Date.now() > pollDeadline) {
        return NextResponse.json({ error: 'Prediction timed out' }, { status: 504 });
      }
      await new Promise((r) => setTimeout(r, 1500));
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

    // Parse output
    const output = prediction.output;
    const jsonStr = output?.json_str;
    const annotatedImage = output?.image;

    let detections: any[] = [];
    if (jsonStr) {
      try {
        const results = JSON.parse(jsonStr);
        // Handle both SAHI format (bbox array) and YOLO format (box object)
        detections = results.map((det: any) => {
          // SAHI format: { class, confidence, severity, bbox: [x1, y1, x2, y2] }
          // YOLO format: { name, confidence, box: { x1, y1, x2, y2 } }
          const cls = det.class || det.name || '';
          const info = CLASS_INFO[cls] || { name: cls, severity: det.severity || 'info', description: '' };

          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
          if (Array.isArray(det.bbox)) {
            // SAHI format
            [x1, y1, x2, y2] = det.bbox;
          } else if (det.box) {
            // YOLO format
            x1 = det.box.x1 || 0;
            y1 = det.box.y1 || 0;
            x2 = det.box.x2 || 0;
            y2 = det.box.y2 || 0;
          }

          // We don't have image dimensions from the API; estimate from bbox max values
          // The frontend will use percentage-based coords
          return {
            class: cls,
            confidence: det.confidence || 0,
            severity: info.severity,
            description: info.description,
            bbox_abs: { x1, y1, x2, y2 },
          };
        });
      } catch {
        // json parse failed
      }
    }

    // Convert absolute bbox to percentages if we have the annotated image dimensions
    // For now, return absolute coords and let frontend handle it
    return NextResponse.json({
      filename: file.name,
      detections: detections.map((d) => ({
        class: d.class,
        confidence: d.confidence,
        severity: d.severity,
        description: d.description,
        bbox: d.bbox_abs, // { x1, y1, x2, y2 } absolute pixels
      })),
      detection_count: detections.length,
      inference_time_ms: inferenceTime,
      tiles_processed: 1, // SAHI handles tiling internally
      model: 'YOLO11m-DTU',
      sahi_enabled: true,
      annotated_image: annotatedImage || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Server error', detail: error.message },
      { status: 500 }
    );
  }
}
