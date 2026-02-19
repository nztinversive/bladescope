'use client';

import { ArrowLeft, Download, AlertTriangle, CheckCircle, Clock, Grid3X3 } from 'lucide-react';
import { InspectionResult, DEFECT_CLASSES } from '@/lib/mock-data';

interface Props {
  result: InspectionResult;
  imageUrl: string;
  onReset: () => void;
}

const severityConfig = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'CRITICAL' },
  major: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'MAJOR' },
  minor: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'MINOR' },
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'INFO' },
};

export default function InspectionResults({ result, imageUrl, onReset }: Props) {
  const hasCritical = result.detections.some((d) => d.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onReset} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Inspection Results</h1>
            <p className="text-slate-400 text-sm">{result.filename}</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Summary bar */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${hasCritical ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
        {hasCritical ? (
          <AlertTriangle className="w-6 h-6 text-red-400" />
        ) : result.detections.length === 0 ? (
          <CheckCircle className="w-6 h-6 text-green-400" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        )}
        <div>
          <p className="font-semibold">
            {result.detections.length === 0
              ? 'No defects detected — blade appears healthy'
              : `${result.detections.length} defect${result.detections.length > 1 ? 's' : ''} detected`}
          </p>
          <p className="text-xs text-slate-400">
            {result.turbineId} · Blade {result.bladeNumber} · {result.tilesProcessed} tiles processed in {result.inferenceTime}ms
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Annotated image */}
        <div className="lg:col-span-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="relative rounded-lg overflow-hidden bg-slate-900">
            <img src={imageUrl} alt="Inspection" className="w-full" />
            {/* Bounding box overlays */}
            {result.detections.map((det) => {
              const cls = DEFECT_CLASSES.find((c) => c.name === det.class);
              const sev = severityConfig[det.severity];
              return (
                <div
                  key={det.id}
                  className="absolute border-2 rounded"
                  style={{
                    left: `${det.bbox.x}%`,
                    top: `${det.bbox.y}%`,
                    width: `${det.bbox.w}%`,
                    height: `${det.bbox.h}%`,
                    borderColor: cls?.color || '#f59e0b',
                  }}
                >
                  <span
                    className="absolute -top-5 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                    style={{ backgroundColor: cls?.color || '#f59e0b', color: '#0f172a' }}
                  >
                    {det.class} {(det.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Grid3X3 className="w-3 h-3" /> {result.imageWidth}×{result.imageHeight}px</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {result.inferenceTime}ms</span>
            <span>{result.tilesProcessed} SAHI tiles</span>
          </div>
        </div>

        {/* Detection list */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-semibold text-sm text-slate-300">Detections ({result.detections.length})</h2>
          {result.detections.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="font-medium">All Clear</p>
              <p className="text-xs text-slate-400 mt-1">No defects detected in this image</p>
            </div>
          ) : (
            result.detections.map((det) => {
              const sev = severityConfig[det.severity];
              return (
                <div key={det.id} className={`bg-slate-800/50 border rounded-xl p-4 ${sev.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{det.class}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                      {sev.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2 text-xs text-slate-400">
                    <span>Confidence: <strong className="text-slate-200">{(det.confidence * 100).toFixed(1)}%</strong></span>
                    <span>Location: ({det.bbox.x}, {det.bbox.y})</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{det.description}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
