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
      <div className="p-8 text-center bg-white text-black rounded-[36px] shadow-2xl border-4 border-white space-y-4">
        <p className="text-gray-600 font-bold">No patient selected.</p>
        <button
          onClick={() => setActiveView('patients')}
          className="px-6 py-3 rounded-full bg-[#E1FA4A] text-black font-black text-xs uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
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
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-white">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => setActiveView('patients')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Directory</span>
        </button>

        <button
          onClick={handleStartScan}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#E1FA4A] hover:bg-[#d6f236] text-black font-black text-xs uppercase tracking-wider shadow-xl hover:scale-105 transition-all cursor-pointer"
        >
          <Microscope className="w-4 h-4" />
          <span>Perform New Scan for {activePatient.name.split(' ')[0]} ↗</span>
        </button>
      </div>

      {/* Patient Profile Hero Card */}
      <div className="p-7 sm:p-8 bg-white text-black rounded-[36px] shadow-2xl border-4 border-white space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-black text-black font-sans">
                {activePatient.name}
              </h1>
              <span className="text-xs font-mono font-bold text-[#1E54B7] bg-sky-100 px-3 py-1 rounded-full">
                {activePatient.id}
              </span>
              {latestScan && (
                <DualCodedBadge stage={latestScan.detection.stage} size="sm" showDetails />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600 font-medium">
              <span>Age: <strong className="text-black font-bold">{activePatient.age}</strong> ({activePatient.gender})</span>
              <span>•</span>
              <span>Diabetes Duration: <strong className="text-black font-bold">{activePatient.diabetes_duration} Years</strong></span>
              {activePatient.phone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-[#1E54B7]" /> {activePatient.phone}</span>
                </>
              )}
              {activePatient.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#1E54B7]" /> {activePatient.location}</span>
                </>
              )}
            </div>
          </div>

          {/* Key Glycemic Metrics */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-200 text-center min-w-[130px]">
              <span className="text-[10px] font-black uppercase text-gray-500 block">HbA1c Level</span>
              <span className="text-3xl font-black text-black font-mono mt-1 block">
                {activePatient.hba1c}%
              </span>
              <span className={`text-[10px] font-bold ${activePatient.hba1c >= 8 ? 'text-rose-600' : 'text-amber-700'}`}>
                {activePatient.hba1c >= 8 ? 'High Glycemic Risk' : 'Borderline Managed'}
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-gray-50 border border-gray-200 text-center min-w-[130px]">
              <span className="text-[10px] font-black uppercase text-gray-500 block">Fasting Glucose</span>
              <span className="text-3xl font-black text-black font-mono mt-1 block">
                {activePatient.sugar_level}
              </span>
              <span className="text-[10px] font-bold text-gray-500">mg / dL</span>
            </div>
          </div>
        </div>

        {activePatient.notes && (
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 text-xs sm:text-sm text-gray-800 flex items-start gap-3">
            <FileText className="w-4 h-4 text-[#1E54B7] shrink-0 mt-0.5" />
            <div>
              <strong className="text-black block mb-0.5">Clinical Case Notes:</strong>
              {activePatient.notes}
            </div>
          </div>
        )}
      </div>

      {/* Longitudinal Progression Timeline */}
      <div className="p-7 sm:p-8 bg-white text-black rounded-[36px] shadow-2xl border-4 border-white space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-black flex items-center gap-2 font-sans">
            <Activity className="w-6 h-6 text-[#1E54B7]" />
            Longitudinal Retinal Progression Timeline
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Sequential comparison of retinal microvascular integrity and Diabetic Retinopathy severity across clinic visits
          </p>
        </div>

        {scans.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-500 text-sm">
            No historical scans recorded for this patient yet.
          </div>
        ) : (
          <div className="relative border-l-2 border-gray-200 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-8">
            {scans.map((scan, idx) => {
              const meta = DR_STAGES[scan.detection.stage];
              return (
                <div key={scan.analysis_id} className="relative group">
                  {/* Timeline bullet node */}
                  <div
                    className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-md font-black text-white text-[10px]"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.icon}
                  </div>

                  {/* Visit Card */}
                  <div className="p-6 bg-gray-50/70 border border-gray-200 group-hover:border-[#1E54B7] group-hover:bg-white rounded-3xl space-y-4 transition-all shadow-sm group-hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-gray-600 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[#1E54B7]" />
                            {scan.scan_date}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">
                            ({scan.analysis_id})
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-black mt-1">
                          Diagnostic Result: {meta.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleInspectScan(scan)}
                          className="px-4 py-2 rounded-full bg-sky-100 hover:bg-[#1E54B7] text-[#1E54B7] hover:text-white text-xs font-black transition-all cursor-pointer"
                        >
                          View Full AI Report →
                        </button>
                        <button
                          onClick={() => generateLargePrintPDF(scan, activePatient)}
                          className="p-2 rounded-full bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-sm cursor-pointer"
                          title="Download Patient PDF"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Scan Triptych Thumbnail Preview */}
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className="aspect-square rounded-2xl bg-black overflow-hidden border-2 border-white shadow-md cursor-pointer"
                        onClick={() => setSelectedScanForLightbox(scan)}
                      >
                        <img
                          src={scan.images.original}
                          alt="Original"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                      <div
                        className="aspect-square rounded-2xl bg-black overflow-hidden border-2 border-white shadow-md cursor-pointer"
                        onClick={() => setSelectedScanForLightbox(scan)}
                      >
                        <img
                          src={scan.images.vessels}
                          alt="Vessels"
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                      <div
                        className="aspect-square rounded-2xl bg-black overflow-hidden border-2 border-white shadow-md cursor-pointer"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700 pt-3 border-t border-gray-200">
                      <div>
                        <span className="text-gray-500 font-bold block">AI Plain Language Note:</span>
                        <p className="mt-0.5 line-clamp-2">{scan.report.current_diagnosis.plain_language}</p>
                      </div>
                      <div className="space-y-1 font-mono">
                        <div>Vessel Density: <strong className="text-black">{scan.vessel_stats.vessel_density_percent}%</strong></div>
                        <div>Urgency: <strong className="text-amber-800">{scan.report.urgency}</strong></div>
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
