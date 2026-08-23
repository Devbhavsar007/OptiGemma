import { jsPDF } from 'jspdf';
import { ScanAnalysis, Patient, DR_STAGES } from '../types';

export function generateLargePrintPDF(
  scan: ScanAnalysis,
  patient?: Patient | null,
  translatedTitle?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const stageMeta = DR_STAGES[scan.detection.stage];
  const patientName = patient?.name || scan.patient_name || 'Patient';
  const patientId = patient?.id || scan.patient_id || 'N/A';
  const patientAge = patient?.age || 'N/A';
  const hba1c = patient?.hba1c ? `${patient.hba1c}%` : 'N/A';
  const bloodSugar = patient?.sugar_level ? `${patient.sugar_level} mg/dL` : 'N/A';
  const duration = patient?.diabetes_duration ? `${patient.diabetes_duration} Years` : 'N/A';

  // --- HEADER: HIGH CONTRAST CLINICAL BANNER ---
  doc.setFillColor(11, 15, 25); // Deep Midnight Navy
  doc.rect(margin, y, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('OPTIGEMMA CLINICAL AI SUITE', margin + 6, y + 10);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Accessible Low-Vision Diabetic Retinopathy Diagnostic Report', margin + 6, y + 18);

  y += 30;

  // --- PATIENT METRICS BOX (High-contrast 2-column layout) ---
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 28, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.8);
  doc.rect(margin, y, contentWidth, 28, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Patient: ${patientName} (${patientId})`, margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Age: ${patientAge}  |  Diabetes Duration: ${duration}`, margin + 6, y + 17);
  doc.text(`Fasting Sugar: ${bloodSugar}  |  Latest HbA1c: ${hba1c}`, margin + 6, y + 23);
  doc.text(`Screening Date: ${scan.scan_date}`, margin + contentWidth - 65, y + 9);

  y += 34;

  // --- PRIMARY DIAGNOSIS HERO BANNER (Large-Print & Dual Coded) ---
  // Background highlight box
  doc.setFillColor(254, 242, 242);
  if (scan.detection.stage === 0) doc.setFillColor(240, 253, 250);
  else if (scan.detection.stage === 1) doc.setFillColor(254, 243, 199);
  else if (scan.detection.stage === 2) doc.setFillColor(255, 237, 213);

  doc.rect(margin, y, contentWidth, 32, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.2);
  doc.rect(margin, y, contentWidth, 32, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`DIAGNOSIS: [${stageMeta.icon}] ${stageMeta.name.toUpperCase()}`, margin + 6, y + 11);

  doc.setFontSize(12);
  doc.text(`AI Confidence Rating: ${scan.detection.confidence.toFixed(1)}%`, margin + 6, y + 20);
  doc.text(`Clinical Urgency: ${scan.report.urgency}`, margin + 6, y + 27);
  doc.text(`Follow-Up: ${scan.report.recommended_follow_up}`, margin + contentWidth - 85, y + 27);

  y += 38;

  // --- PLAIN LANGUAGE SUMMARY (Accessible 12-14pt text for Low-Vision Patients) ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('1. Patient Summary (Plain Language)', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const plainLines = doc.splitTextToSize(scan.report.current_diagnosis.plain_language, contentWidth);
  doc.text(plainLines, margin, y);
  y += plainLines.length * 6 + 6;

  // --- BIOMARKERS & VESSEL DENSITY ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('2. Retinal Biomarkers & Microvascular Density', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const vesselText = `Vessel Density: ${scan.vessel_stats.vessel_density_percent}% (${scan.vessel_stats.vessel_health_text})`;
  doc.text(vesselText, margin, y);
  y += 6;

  const heatLines = doc.splitTextToSize(`Grad-CAM Heatmap: ${scan.report.visual_findings.heatmap_summary}`, contentWidth);
  doc.text(heatLines, margin, y);
  y += heatLines.length * 6 + 6;

  // --- TIME-AWARE RISK PROGRESSION FORECAST ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('3. Longitudinal Progression Risk Forecast', margin, y);
  y += 6;

  // 6-month & 12-month boxes
  const colW = (contentWidth - 6) / 2;
  
  // 6 Month Box
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, colW, 22, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.rect(margin, y, colW, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`6-Month Risk: ${scan.report.risk_prediction['6_month'].progression_risk_percent}`, margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`If Untreated: ${scan.report.risk_prediction['6_month'].scenario_if_untreated.slice(0, 55)}...`, margin + 4, y + 12);
  doc.text(`If Managed: ${scan.report.risk_prediction['6_month'].scenario_if_managed.slice(0, 55)}...`, margin + 4, y + 18);

  // 12 Month Box
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + colW + 6, y, colW, 22, 'F');
  doc.rect(margin + colW + 6, y, colW, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`12-Month Risk: ${scan.report.risk_prediction['12_month'].progression_risk_percent}`, margin + colW + 10, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`If Untreated: ${scan.report.risk_prediction['12_month'].scenario_if_untreated.slice(0, 55)}...`, margin + colW + 10, y + 12);
  doc.text(`If Managed: ${scan.report.risk_prediction['12_month'].scenario_if_managed.slice(0, 55)}...`, margin + colW + 10, y + 18);

  y += 28;

  // --- ACTION PLAN CHECKLIST (Numbered) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('4. Clinical Action Plan', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  scan.report.action_plan.forEach((act, idx) => {
    const actLines = doc.splitTextToSize(`[  ] ${idx + 1}. ${act}`, contentWidth);
    doc.text(actLines, margin, y);
    y += actLines.length * 5.5 + 2;
  });

  y += 4;

  // --- DIETARY EYE-CARE RECOMMENDATIONS ---
  if (y < 250) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('5. Recommended Diabetic Eye-Care Diet', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    scan.report.diet_recommendations.slice(0, 3).forEach((diet) => {
      const dietLines = doc.splitTextToSize(`• ${diet}`, contentWidth);
      doc.text(dietLines, margin, y);
      y += dietLines.length * 5 + 1;
    });
  }

  // --- FOOTER & MEDICAL DISCLAIMER ---
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, 275, contentWidth, 14, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Disclaimer: AI-assisted screening decision support system. Confirm with a licensed ophthalmologist.',
    margin + 4,
    282
  );
  doc.text(
    `OptiGemma Clinical ID: ${scan.analysis_id} | Page 1 of 1`,
    margin + contentWidth - 75,
    282
  );

  // Save the PDF
  const filename = `OptiGemma_Report_${patientName.replace(/\s+/g, '_')}_${scan.scan_date}.pdf`;
  doc.save(filename);
}
