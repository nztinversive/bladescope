'use client';

import { useState, useEffect } from 'react';
import { FileImage, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { getInspections, deleteInspection } from '@/lib/storage';
import type { InspectionResult } from '@/lib/mock-data';

const severityColors = {
  critical: 'bg-red-500/10 text-red-400',
  major: 'bg-orange-500/10 text-orange-400',
  minor: 'bg-amber-500/10 text-amber-400',
  info: 'bg-blue-500/10 text-blue-400',
};

export default function InspectionHistory() {
  const [inspections, setInspections] = useState<InspectionResult[]>([]);

  useEffect(() => {
    setInspections(getInspections());
  }, []);

  const handleDelete = (id: string) => {
    deleteInspection(id);
    setInspections(getInspections());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inspection History</h1>
        <p className="text-slate-400 text-sm mt-1">Previous inspection results and defect tracking</p>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <FileImage className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg font-medium">No inspections yet</p>
          <p className="text-slate-500 text-sm mt-1">Upload and analyze blade images to build your inspection history.</p>
        </div>
      ) : (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 text-slate-400">
              <th className="text-left px-5 py-3 font-medium">Image</th>
              <th className="text-left px-5 py-3 font-medium">Turbine</th>
              <th className="text-left px-5 py-3 font-medium">Date</th>
              <th className="text-left px-5 py-3 font-medium">Defects</th>
              <th className="text-left px-5 py-3 font-medium">Severity</th>
              <th className="text-left px-5 py-3 font-medium">Time</th>
              <th className="text-left px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((insp) => {
              const worstSeverity = insp.detections.reduce<string>((worst, d) => {
                const order = ['critical', 'major', 'minor', 'info'];
                return order.indexOf(d.severity) < order.indexOf(worst) ? d.severity : worst;
              }, 'info');
              return (
                <tr key={insp.id} className="border-b border-slate-700/30 hover:bg-slate-800/80 cursor-pointer transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileImage className="w-4 h-4 text-slate-500" />
                      <span className="font-mono text-xs">{insp.filename}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-300">{insp.turbineId} / B{insp.bladeNumber}</td>
                  <td className="px-5 py-3 text-slate-400">{new Date(insp.timestamp).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    {insp.detections.length === 0 ? (
                      <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" /> Clean</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="w-3 h-3" /> {insp.detections.length}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {insp.detections.length > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[worstSeverity as keyof typeof severityColors]}`}>
                        {worstSeverity.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{insp.inferenceTime}ms</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleDelete(insp.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                      title="Delete inspection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
