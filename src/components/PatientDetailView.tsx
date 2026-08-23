import React, { useState } from 'react';
import {
  ArrowLeft,
  Microscope,
  Calendar,
  Activity,
  FileDown,
  Clock,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Eye,
  Layers,
  Flame,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';
import { DR_STAGES, DRStage, ScanAnalysis } from '../types';
import { DualCodedBadge } from './DualCodedBadge';
import { generateLargePrintPDF } from '../utils/pdfGenerator';
import { ImageLightboxModal } from './ImageLightboxModal';

export const PatientDetailView: React.FC = () => {
  const {
    activePatient,
    setActivePatient,
    setActiveView,
    setActiveScan,
  } = useMedicalData();

  const [selectedScanForLightbox, setSelectedScanForLightbox] = useState<ScanAnalysis | null>(null);

  if (!activePatient) {
    return (
      <div className="p-8 text-center bg-[#131B2E] border-2 border-[#334155] rounded-2xl text-[#CBD5E1] space-y-4">
        <p>No patient selected.</p>
        <button
          onClick={() => setActiveView('patients')}
          className="px-5 py-2.5 rounded-xl bg-[#38BDF8] text-[#0B0F19] font-bold text-sm"
        >
          Return to Patient Directory
        </button>
      </div>
    );
  }

  const scans = activePatient.scans || [];
  const latestScan = scans.length > 0 ? scans[0] : null;

  const handleStartScan = () => {
    setActiveScan(null);
    setActiveView('new-scan');
  };

  const handleInspectScan = (scan: ScanAnalysis) => {
    setActiveScan(scan);
    setActiveView('new-scan');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => setActiveView('patients')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] text-[#CBD5E1] hover:text-white border border-[#334155] font-bold text-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </button>

        <button
          onClick={handleStartScan}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F19] font-black text-sm shadow-md transition-all"
        >
          <Microscope className="w-5 h-5" />
          <span>Perform New Scan for {activePatient.name.split(' ')[0]}</span>
        </button>
      </div>

      {/* Patient Profile Hero Card */}
      <div className="p-6 sm:p-8 bg-[#131B2E] border-2 border-[#334155] rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {activePatient.name}
              </h1>
              <span className="text-xs font-mono font-bold text-[#38BDF8] bg-sky-500/20 px-3 py-1 rounded-lg border border-sky-500/30">
                {activePatient.id}
              </span>
              {latestScan && (
                <DualCodedBadge stage={latestScan.detection.stage} size="sm" showDetails />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#CBD5E1]">
              <span>Age: <strong className="text-white">{activePatient.age}</strong> ({activePatient.gender})</span>
              <span>•</span>
              <span>Diabetes Duration: <strong className="text-white">{activePatient.diabetes_duration} Years</strong></span>
              {activePatient.phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#38BDF8]" /> {activePatient.phone}</span>
                </>
              )}
              {activePatient.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#38BDF8]" /> {activePatient.location}</span>
                </>
              )}
            </div>
          </div>

          {/* Key Glycemic Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#334155] text-center min-w-[120px]">
              <span className="text-xs font-bold uppercase text-[#94A3B8] block">HbA1c Level</span>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono mt-1 block">
                {activePatient.hba1c}%
              </span>
              <span className={`text-[10px] font-bold ${activePatient.hba1c >= 8 ? 'text-rose-400' : 'text-amber-400'}`}>
                {activePatient.hba1c >= 8 ? 'High Glycemic Risk' : 'Borderline Managed'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0F172A] border border-[#334155] text-center min-w-[120px]">
              <span className="text-xs font-bold uppercase text-[#94A3B8] block">Fasting Glucose</span>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono mt-1 block">
                {activePatient.sugar_level}
              </span>
              <span className="text-[10px] font-bold text-[#CBD5E1]">mg / dL</span>
            </div>
          </div>
        </div>

        {activePatient.notes && (
          <div className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] text-xs sm:text-sm text-[#CBD5E1] flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-[#38BDF8] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Clinical Case Notes:</strong>
              {activePatient.notes}
            </div>
          </div>
        )}
      </div>

      {/* Longitudinal Progression Timeline */}
      <div className="p-6 sm:p-8 bg-[#131B2E] border-2 border-[#334155] rounded-3xl shadow-xl space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#38BDF8]" />
            Longitudinal Retinal Progression Timeline
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8]">
            Sequential comparison of retinal microvascular integrity and Diabetic Retinopathy severity across clinic visits
          </p>
        </div>

        {scans.length === 0 ? (
          <div className="p-8 text-center bg-[#0F172A] rounded-2xl border border-[#334155] text-[#94A3B8]">
            No historical scans recorded for this patient yet.
          </div>
        ) : (
          <div className="relative border-l-2 border-[#334155] ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-8">
            {scans.map((scan, idx) => {
              const meta = DR_STAGES[scan.detection.stage];
              return (
                <div key={scan.analysis_id} className="relative group">
                  {/* Timeline bullet node */}
                  <div
                    className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full border-4 border-[#131B2E] flex items-center justify-center shadow-lg font-bold text-white text-[10px]"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.icon}
                  </div>

                  {/* Visit Card */}
                  <div className="p-5 bg-[#0F172A] border-2 border-[#1E293B] group-hover:border-[#38BDF8] rounded-2xl space-y-4 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-[#94A3B8] flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[#38BDF8]" />
                            {scan.scan_date}
                          </span>
                          <span className="text-xs text-[#64748B] font-mono">
                            ({scan.analysis_id})
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1">
                          Diagnostic Result: {meta.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleInspectScan(scan)}
                          className="px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#0B0F19] text-xs font-bold border border-sky-500/30 transition-all"
                        >
                          View Full AI Report →
                        </button>
                        <button
                          onClick={() => generateLargePrintPDF(scan, activePatient)}
                          className="p-2 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] text-white border border-[#334155]"
                          title="Download Patient PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Scan Triptych Thumbnail Preview */}
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className="aspect-square rounded-xl bg-black overflow-hidden border border-[#334155] cursor-pointer"
                        onClick={() => setSelectedScanForLightbox(scan)}
                      >
                        <img
                          src={scan.images.original}
                          alt="Original"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                      <div
                        className="aspect-square rounded-xl bg-black overflow-hidden border border-[#334155] cursor-pointer"
                        onClick={() => setSelectedScanForLightbox(scan)}
                      >
                        <img
                          src={scan.images.vessels}
                          alt="Vessels"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                      <div
                        className="aspect-square rounded-xl bg-black overflow-hidden border border-[#334155] cursor-pointer"
                        onClick={() => setSelectedScanForLightbox(scan)}
                      >
                        <img
                          src={scan.images.heatmap}
                          alt="Heatmap"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    </div>

                    {/* Clinical Summary & Microvascular Vitals */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#CBD5E1] pt-2 border-t border-[#1E293B]">
                      <div>
                        <span className="text-[#94A3B8] font-bold block">AI Plain Language Note:</span>
                        <p className="mt-0.5 line-clamp-2">{scan.report.current_diagnosis.plain_language}</p>
                      </div>
                      <div className="space-y-1 font-mono">
                        <div>Vessel Density: <strong className="text-white">{scan.vessel_stats.vessel_density_percent}%</strong></div>
                        <div>Urgency: <strong className="text-amber-400">{scan.report.urgency}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox for History Scans */}
      {selectedScanForLightbox && (
        <ImageLightboxModal
          isOpen={!!selectedScanForLightbox}
          onClose={() => setSelectedScanForLightbox(null)}
          originalUrl={selectedScanForLightbox.images.original}
          vesselUrl={selectedScanForLightbox.images.vessels}
          heatmapUrl={selectedScanForLightbox.images.heatmap}
          title={`Historical Scan Inspection (${selectedScanForLightbox.scan_date})`}
          patientName={activePatient.name}
          stageName={selectedScanForLightbox.detection.stage_name}
        />
      )}
    </div>
  );
};
