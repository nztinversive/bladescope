'use client';

export default function SettingsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure model and inference parameters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Model Configuration</h2>
          <div className="space-y-3">
            <Field label="Model" value="YOLO11m (yolo11m.pt)" />
            <Field label="Confidence Threshold" value="0.25" />
            <Field label="IoU Threshold" value="0.45" />
            <Field label="Max Detections" value="300" />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">SAHI Parameters</h2>
          <div className="space-y-3">
            <Field label="Slice Width" value="640" />
            <Field label="Slice Height" value="640" />
            <Field label="Overlap Ratio" value="0.2" />
            <Field label="Postprocess Type" value="NMS" />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">API Connection</h2>
          <div className="space-y-3">
            <Field label="Backend URL" value="http://localhost:8000" />
            <Field label="Status" value="Mock Mode (no backend connected)" />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Dataset</h2>
          <div className="space-y-3">
            <Field label="Training Set" value="DTU Drone Inspection (606 images)" />
            <Field label="Classes" value="6 (erosion, crack, lightning, coating, contamination, delamination)" />
            <Field label="Annotations" value="YOLO format (DTU-annotations)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <p className="text-sm font-mono text-slate-200 mt-0.5">{value}</p>
    </div>
  );
}
