'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Detection } from '@/lib/mock-data';

interface Props {
  imageUrl: string;
  detections: Detection[];
  selectedId: string | null;
  onSelectDetection: (id: string | null) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  major: '#f97316',
  minor: '#f59e0b',
  info: '#3b82f6',
};

const LEGEND = [
  { severity: 'critical', label: 'Critical' },
  { severity: 'major', label: 'Major' },
  { severity: 'minor', label: 'Minor' },
  { severity: 'info', label: 'Info' },
];

export default function AnnotationCanvas({ imageUrl, detections, selectedId, onSelectDetection }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      setTransform({ x: 0, y: 0, scale: 1 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imgRef.current;
    if (!canvas || !ctx || !img) return;

    const container = containerRef.current;
    if (!container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Fit image
    const fitScale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const drawW = img.width * fitScale;
    const drawH = img.height * fitScale;
    const offsetX = (canvas.width - drawW) / 2;
    const offsetY = (canvas.height - drawH) / 2;

    ctx.translate(canvas.width / 2 + transform.x, canvas.height / 2 + transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    // Draw bounding boxes
    for (const det of detections) {
      const bx = offsetX + (det.bbox.x / 100) * drawW;
      const by = offsetY + (det.bbox.y / 100) * drawH;
      const bw = (det.bbox.w / 100) * drawW;
      const bh = (det.bbox.h / 100) * drawH;

      const color = SEVERITY_COLORS[det.severity] || '#f59e0b';
      const isSelected = det.id === selectedId;

      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(bx, by, bw, bh);

      if (isSelected) {
        ctx.fillStyle = color + '20';
        ctx.fillRect(bx, by, bw, bh);
      }

      // Label
      const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
      const tm = ctx.measureText(label);
      const labelH = 16;
      const labelY = by - labelH - 2;

      ctx.fillStyle = color;
      ctx.fillRect(bx, labelY, tm.width + 8, labelH);
      ctx.fillStyle = '#0f172a';
      ctx.fillText(label, bx + 4, labelY + 12);
    }

    ctx.restore();
  }, [detections, selectedId, transform, imgLoaded]);

  useEffect(() => {
    if (imgLoaded) draw();
  }, [draw, imgLoaded]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => {
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.5, Math.min(10, t.scale * factor));
      return { ...t, scale: newScale };
    });
  }, []);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTransform((t) => ({ ...t, x: dragStart.current.tx + dx, y: dragStart.current.ty + dy }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Click detection
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (dragging) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Reverse transform
    const cx = canvas.width / 2 + transform.x;
    const cy = canvas.height / 2 + transform.y;
    const ix = (mx - cx) / transform.scale + canvas.width / 2;
    const iy = (my - cy) / transform.scale + canvas.height / 2;

    const fitScale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const drawW = img.width * fitScale;
    const drawH = img.height * fitScale;
    const offsetX = (canvas.width - drawW) / 2;
    const offsetY = (canvas.height - drawH) / 2;

    for (const det of detections) {
      const bx = offsetX + (det.bbox.x / 100) * drawW;
      const by = offsetY + (det.bbox.y / 100) * drawH;
      const bw = (det.bbox.w / 100) * drawW;
      const bh = (det.bbox.h / 100) * drawH;

      if (ix >= bx && ix <= bx + bw && iy >= by && iy <= by + bh) {
        onSelectDetection(det.id);
        return;
      }
    }
    onSelectDetection(null);
  }, [detections, onSelectDetection, transform, dragging]);

  return (
    <div ref={containerRef} className="relative w-full h-[500px] bg-slate-900 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing">
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        className="w-full h-full"
      />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-2 flex gap-3">
        {LEGEND.map((l) => (
          <div key={l.severity} className="flex items-center gap-1.5 text-[10px] text-slate-300">
            <span className="w-3 h-3 rounded-sm border-2" style={{ borderColor: SEVERITY_COLORS[l.severity] }} />
            {l.label}
          </div>
        ))}
      </div>
      {/* Zoom hint */}
      {transform.scale !== 1 && (
        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm rounded px-2 py-1 text-[10px] text-slate-400">
          {(transform.scale * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}
