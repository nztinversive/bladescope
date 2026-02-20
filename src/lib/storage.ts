import { InspectionResult } from './mock-data';

const STORAGE_KEY = 'bladescope_inspections';

export function getInspections(): InspectionResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InspectionResult[];
  } catch {
    return [];
  }
}

export function saveInspection(result: InspectionResult): void {
  const inspections = getInspections();
  // Prepend new inspection (most recent first), deduplicate by id
  const filtered = inspections.filter((i) => i.id !== result.id);
  filtered.unshift(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function deleteInspection(id: string): void {
  const inspections = getInspections().filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inspections));
}

export function clearInspections(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface DashboardStats {
  totalInspections: number;
  totalDefects: number;
  criticalDefects: number;
  avgConfidence: number;
  avgInferenceTime: number;
  turbinesInspected: number;
  defectsByClass: Array<{ name: string; count: number; percentage: number }>;
}

export function computeStats(inspections: InspectionResult[]): DashboardStats {
  const totalInspections = inspections.length;
  const allDetections = inspections.flatMap((i) => i.detections);
  const totalDefects = allDetections.length;
  const criticalDefects = allDetections.filter((d) => d.severity === 'critical').length;

  const avgConfidence =
    totalDefects > 0
      ? allDetections.reduce((sum, d) => sum + d.confidence, 0) / totalDefects
      : 0;

  const avgInferenceTime =
    totalInspections > 0
      ? Math.round(inspections.reduce((sum, i) => sum + i.inferenceTime, 0) / totalInspections)
      : 0;

  const turbineSet = new Set(inspections.map((i) => i.turbineId));
  const turbinesInspected = turbineSet.size;

  // Aggregate defects by class
  const classMap = new Map<string, number>();
  for (const d of allDetections) {
    classMap.set(d.class, (classMap.get(d.class) || 0) + 1);
  }
  const defectsByClass = Array.from(classMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalDefects > 0 ? Math.round((count / totalDefects) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalInspections,
    totalDefects,
    criticalDefects,
    avgConfidence,
    avgInferenceTime,
    turbinesInspected,
    defectsByClass,
  };
}
