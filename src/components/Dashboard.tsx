'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Zap, Clock, Eye, Activity } from 'lucide-react';
import { DEFECT_CLASSES } from '@/lib/mock-data';
import { getInspections, computeStats, DashboardStats } from '@/lib/storage';
import type { InspectionResult } from '@/lib/mock-data';

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-slate-400 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [inspections, setInspections] = useState<InspectionResult[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalInspections: 0, totalDefects: 0, criticalDefects: 0,
    avgConfidence: 0, avgInferenceTime: 0, turbinesInspected: 0, defectsByClass: [],
  });

  useEffect(() => {
    const data = getInspections();
    setInspections(data);
    setStats(computeStats(data));
  }, []);

  const recent = inspections.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of inspection activity and defect detection metrics</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Eye} label="Inspections" value={stats.totalInspections} sub="All time" color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={AlertTriangle} label="Total Defects" value={stats.totalDefects} sub="Detected" color="bg-amber-500/20 text-amber-400" />
        <StatCard icon={Shield} label="Critical" value={stats.criticalDefects} sub="Require action" color="bg-red-500/20 text-red-400" />
        <StatCard icon={Zap} label="Avg Confidence" value={stats.totalDefects > 0 ? `${(stats.avgConfidence * 100).toFixed(0)}%` : '—'} sub="Model certainty" color="bg-green-500/20 text-green-400" />
        <StatCard icon={Clock} label="Inference Time" value={`${stats.avgInferenceTime}ms`} sub="Per image avg" color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={Activity} label="Turbines" value={stats.turbinesInspected} sub="Inspected" color="bg-cyan-500/20 text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect distribution */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h2 className="font-semibold mb-4">Defect Distribution</h2>
          {stats.defectsByClass.length === 0 && (
            <p className="text-slate-500 text-sm py-8 text-center">No defects recorded yet. Run an inspection to see distribution.</p>
          )}
          <div className="space-y-3">
            {stats.defectsByClass.map((d) => {
              const cls = DEFECT_CLASSES.find((c) => c.name === d.name);
              return (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{d.name}</span>
                    <span className="text-slate-400">{d.count} ({d.percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${d.percentage * 3.5}%`, backgroundColor: cls?.color || '#f59e0b' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent inspections */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h2 className="font-semibold mb-4">Recent Inspections</h2>
          {recent.length === 0 && (
            <p className="text-slate-500 text-sm py-8 text-center">No inspections yet. Upload a blade image to get started.</p>
          )}
          <div className="space-y-3">
            {recent.map((insp) => (
              <div key={insp.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{insp.filename}</p>
                  <p className="text-xs text-slate-500">
                    {insp.turbineId} · Blade {insp.bladeNumber} · {new Date(insp.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {insp.detections.length === 0 ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400">Clean</span>
                  ) : (
                    <>
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400">
                        {insp.detections.length} defect{insp.detections.length > 1 ? 's' : ''}
                      </span>
                      {insp.detections.some((d) => d.severity === 'critical') && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">Critical</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model info */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Model Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Model</span>
            <p className="font-mono text-amber-400">YOLO11m</p>
          </div>
          <div>
            <span className="text-slate-400">Inference</span>
            <p className="font-mono text-amber-400">SAHI Sliced</p>
          </div>
          <div>
            <span className="text-slate-400">Tile Size</span>
            <p className="font-mono text-amber-400">640×640 (20% overlap)</p>
          </div>
          <div>
            <span className="text-slate-400">Dataset</span>
            <p className="font-mono text-amber-400">DTU (606 images)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
