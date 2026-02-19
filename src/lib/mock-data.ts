export interface Detection {
  id: string;
  class: string;
  confidence: number;
  severity: 'critical' | 'major' | 'minor' | 'info';
  bbox: { x: number; y: number; w: number; h: number }; // percentages
  description: string;
}

export interface InspectionResult {
  id: string;
  filename: string;
  timestamp: string;
  turbineId: string;
  bladeNumber: number;
  detections: Detection[];
  inferenceTime: number; // ms
  imageWidth: number;
  imageHeight: number;
  tilesProcessed: number;
}

export const DEFECT_CLASSES = [
  { name: 'VG;MT', color: '#fbbf24', severity: 'minor' as const },
  { name: 'LE;ER', color: '#ef4444', severity: 'critical' as const },
  { name: 'LR;DA', color: '#dc2626', severity: 'critical' as const },
  { name: 'LE;CR', color: '#f97316', severity: 'major' as const },
  { name: 'SF;PO', color: '#fb923c', severity: 'major' as const },
];

export const MOCK_INSPECTIONS: InspectionResult[] = [
  {
    id: 'insp-001',
    filename: 'DTU_blade_0142.jpg',
    timestamp: '2026-02-19T09:15:00Z',
    turbineId: 'WT-NTK-01',
    bladeNumber: 2,
    detections: [
      {
        id: 'det-001',
        class: 'Leading Edge Erosion',
        confidence: 0.94,
        severity: 'critical',
        bbox: { x: 32, y: 18, w: 15, h: 8 },
        description: 'Significant erosion along leading edge, ~45cm span. Immediate attention recommended.',
      },
      {
        id: 'det-002',
        class: 'Surface Crack',
        confidence: 0.87,
        severity: 'major',
        bbox: { x: 55, y: 42, w: 8, h: 12 },
        description: 'Longitudinal crack, approx 20cm length. Monitor or schedule repair.',
      },
      {
        id: 'det-003',
        class: 'Coating Damage',
        confidence: 0.72,
        severity: 'minor',
        bbox: { x: 70, y: 60, w: 6, h: 5 },
        description: 'Minor coating peel, cosmetic. Schedule during next maintenance window.',
      },
    ],
    inferenceTime: 187,
    imageWidth: 4000,
    imageHeight: 3000,
    tilesProcessed: 42,
  },
  {
    id: 'insp-002',
    filename: 'DTU_blade_0287.jpg',
    timestamp: '2026-02-19T09:22:00Z',
    turbineId: 'WT-NTK-01',
    bladeNumber: 1,
    detections: [
      {
        id: 'det-004',
        class: 'Lightning Damage',
        confidence: 0.96,
        severity: 'critical',
        bbox: { x: 45, y: 30, w: 20, h: 25 },
        description: 'Lightning strike damage with visible burn marks and receptor damage. Critical — ground turbine.',
      },
    ],
    inferenceTime: 203,
    imageWidth: 4000,
    imageHeight: 3000,
    tilesProcessed: 42,
  },
  {
    id: 'insp-003',
    filename: 'DTU_blade_0415.jpg',
    timestamp: '2026-02-18T14:45:00Z',
    turbineId: 'WT-NTK-01',
    bladeNumber: 3,
    detections: [
      {
        id: 'det-005',
        class: 'Contamination',
        confidence: 0.68,
        severity: 'info',
        bbox: { x: 20, y: 50, w: 30, h: 15 },
        description: 'Surface contamination (likely biological growth). Clean during scheduled maintenance.',
      },
      {
        id: 'det-006',
        class: 'Surface Crack',
        confidence: 0.81,
        severity: 'major',
        bbox: { x: 60, y: 25, w: 5, h: 18 },
        description: 'Transverse crack near blade root. Schedule structural assessment.',
      },
    ],
    inferenceTime: 195,
    imageWidth: 4000,
    imageHeight: 3000,
    tilesProcessed: 42,
  },
  {
    id: 'insp-004',
    filename: 'DTU_blade_0503.jpg',
    timestamp: '2026-02-18T15:10:00Z',
    turbineId: 'WT-NTK-01',
    bladeNumber: 2,
    detections: [],
    inferenceTime: 162,
    imageWidth: 4000,
    imageHeight: 3000,
    tilesProcessed: 42,
  },
  {
    id: 'insp-005',
    filename: 'DTU_blade_0089.jpg',
    timestamp: '2026-02-17T11:30:00Z',
    turbineId: 'WT-NTK-01',
    bladeNumber: 1,
    detections: [
      {
        id: 'det-007',
        class: 'Delamination',
        confidence: 0.91,
        severity: 'critical',
        bbox: { x: 38, y: 55, w: 12, h: 10 },
        description: 'Surface delamination detected, ~8cm diameter. Structural integrity risk — priority repair.',
      },
      {
        id: 'det-008',
        class: 'Coating Damage',
        confidence: 0.75,
        severity: 'minor',
        bbox: { x: 15, y: 70, w: 8, h: 6 },
        description: 'Coating chip near trailing edge. Low priority.',
      },
      {
        id: 'det-009',
        class: 'Leading Edge Erosion',
        confidence: 0.88,
        severity: 'critical',
        bbox: { x: 5, y: 10, w: 10, h: 35 },
        description: 'Early-stage leading edge erosion along outer 1/3 of blade span.',
      },
    ],
    inferenceTime: 211,
    imageWidth: 4000,
    imageHeight: 3000,
    tilesProcessed: 42,
  },
];

export const DASHBOARD_STATS = {
  totalInspections: 47,
  totalDefects: 124,
  criticalDefects: 18,
  avgConfidence: 0.84,
  avgInferenceTime: 195,
  turbinesInspected: 12,
  defectsByClass: [
    { name: 'Leading Edge Erosion', count: 34, percentage: 27.4 },
    { name: 'Surface Crack', count: 28, percentage: 22.6 },
    { name: 'Coating Damage', count: 24, percentage: 19.4 },
    { name: 'Contamination', count: 19, percentage: 15.3 },
    { name: 'Lightning Damage', count: 11, percentage: 8.9 },
    { name: 'Delamination', count: 8, percentage: 6.5 },
  ],
  recentTrend: [12, 18, 15, 22, 19, 24, 14],
};
