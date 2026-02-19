'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, ImageIcon, Loader2, X } from 'lucide-react';
import InspectionResults from './InspectionResults';
import { MOCK_INSPECTIONS, InspectionResult } from '@/lib/mock-data';

export default function InspectionUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectionResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const runInference = async () => {
    setLoading(true);
    // Simulate inference delay
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    // Pick a random mock result
    const mock = MOCK_INSPECTIONS[Math.floor(Math.random() * (MOCK_INSPECTIONS.length - 1))];
    setResult({
      ...mock,
      id: `insp-${Date.now()}`,
      filename: file?.name || mock.filename,
      timestamp: new Date().toISOString(),
    });
    setLoading(false);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  if (result && preview) {
    return <InspectionResults result={result} imageUrl={preview} onReset={reset} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Inspection</h1>
        <p className="text-slate-400 text-sm mt-1">Upload a drone image to detect blade defects using YOLO11m + SAHI</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          dragActive ? 'border-amber-500 bg-amber-500/5' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <Upload className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <p className="text-lg font-medium">Drop drone image here</p>
            <p className="text-sm text-slate-400 mt-1">or click to browse · JPG, PNG up to 50MB</p>
          </div>
        </div>
      </div>

      {/* Preview */}
      {preview && file && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </div>
            <button onClick={reset} className="text-slate-500 hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="rounded-lg overflow-hidden bg-slate-900 max-h-96 flex items-center justify-center">
            <img src={preview} alt="Preview" className="max-h-96 object-contain" />
          </div>

          <button
            onClick={runInference}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running SAHI Inference...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Analyze Image
              </>
            )}
          </button>
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          title="SAHI Sliced Inference"
          desc="Images are sliced into 640×640 overlapping tiles for high-resolution defect detection. Small defects that would be lost in standard inference are preserved."
        />
        <InfoCard
          title="YOLO11m Detection"
          desc="Fine-tuned on the DTU wind turbine blade dataset (606 images). Detects 6 defect classes including cracks, erosion, and lightning damage."
        />
        <InfoCard
          title="Severity Assessment"
          desc="Each detection is classified by severity (critical/major/minor/info) based on defect type, size, and model confidence."
        />
      </div>
    </div>
  );
}

function Zap(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
    </svg>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <h3 className="font-semibold text-amber-400 text-sm mb-2">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
