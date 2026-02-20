import jsPDF from 'jspdf';
import { InspectionResult, DEFECT_CLASSES } from './mock-data';

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  critical: [239, 68, 68],
  major: [249, 115, 22],
  minor: [251, 191, 36],
  info: [96, 165, 250],
};

export async function generateReport(result: InspectionResult, imageUrl: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('BladeScope', margin, 18);
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Wind Turbine Blade Inspection Report', margin, 26);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 34);
  y = 50;

  // Inspection summary
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Summary', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryLines = [
    `File: ${result.filename}`,
    `Turbine: ${result.turbineId}  |  Blade: ${result.bladeNumber}`,
    `Date: ${new Date(result.timestamp).toLocaleString()}`,
    `Image: ${result.imageWidth} x ${result.imageHeight} px  |  Tiles: ${result.tilesProcessed}`,
    `Inference Time: ${result.inferenceTime}ms  |  Model: YOLO11m + SAHI`,
    `Defects Found: ${result.detections.length}`,
  ];
  for (const line of summaryLines) {
    doc.text(line, margin, y);
    y += 5.5;
  }
  y += 4;

  // Severity summary bar
  const severityCounts: Record<string, number> = { critical: 0, major: 0, minor: 0, info: 0 };
  result.detections.forEach((d) => severityCounts[d.severity]++);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Severity Breakdown', margin, y);
  y += 8;

  for (const [sev, count] of Object.entries(severityCounts)) {
    if (count === 0) continue;
    const color = SEVERITY_COLORS[sev] || [148, 163, 184];
    doc.setFillColor(...color);
    doc.roundedRect(margin, y - 3.5, 4, 4, 1, 1, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${sev.toUpperCase()}: ${count}`, margin + 7, y);
    y += 6;
  }
  y += 4;

  // Image (if available)
  if (imageUrl) {
    try {
      const imgW = pageW - margin * 2;
      const imgH = imgW * 0.6;
      if (y + imgH > 270) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Inspection Image', margin, y);
      y += 6;
      doc.addImage(imageUrl, 'JPEG', margin, y, imgW, imgH);
      y += imgH + 8;
    } catch {
      // skip image if it fails
    }
  }

  // Detection details
  if (result.detections.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Detection Details', margin, y);
    y += 8;

    for (const det of result.detections) {
      if (y > 260) {
        doc.addPage();
        y = margin;
      }
      const color = SEVERITY_COLORS[det.severity] || [148, 163, 184];
      const cls = DEFECT_CLASSES.find((c) => c.name === det.class);

      // Severity badge
      doc.setFillColor(...color);
      doc.roundedRect(margin, y - 3.5, pageW - margin * 2, 22, 2, 2, 'F');
      doc.setFillColor(255, 255, 255, 0.9);
      doc.roundedRect(margin + 0.5, y - 3, pageW - margin * 2 - 1, 21, 1.5, 1.5, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(`${det.class} — ${det.severity.toUpperCase()}`, margin + 4, y + 1);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Confidence: ${(det.confidence * 100).toFixed(1)}%  |  Location: (${det.bbox.x.toFixed(1)}%, ${det.bbox.y.toFixed(1)}%)`, margin + 4, y + 6.5);

      const descLines = doc.splitTextToSize(det.description, pageW - margin * 2 - 8);
      doc.text(descLines.slice(0, 2), margin + 4, y + 12);

      y += 26;
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`BladeScope Report — Page ${i}/${totalPages}`, margin, 290);
    doc.text('Powered by YOLO11m + SAHI | DTU Wind Turbine Blade Dataset', pageW - margin, 290, { align: 'right' });
  }

  doc.save(`bladescope-report-${result.id}.pdf`);
}
