import React, { useState } from 'react';
import {
  Users,
  AlertTriangle,
  Hospital,
  Target,
  Microscope,
  ArrowRight,
  TrendingUp,
  Filter,
  Eye,
} from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';
import { DR_STAGES, DRStage, ScanAnalysis } from '../types';
import { DualCodedBadge } from './DualCodedBadge';

export const DashboardView: React.FC = () => {
  const { dashboardStats, setActiveView, setActiveScan, setActivePatient, patients } = useMedicalData();
  const [selectedStageFilter, setSelectedStageFilter] = useState<DRStage | 'all'>('all');

  const filteredScans =
    selectedStageFilter === 'all'
      ? dashboardStats.recent_scans
      : dashboardStats.recent_scans.filter(
          (scan) => scan.detection.stage === selectedStageFilter
        );

  const handleOpenScan = (scan: ScanAnalysis) => {
    setActiveScan(scan);
    const matchedPatient = patients.find((p) => p.id === scan.patient_id);
    if (matchedPatient) {
      setActivePatient(matchedPatient);
    }
    setActiveView('new-scan');
  };

  const handleOpenPatientDetail = (patientId: string) => {
    const matched = patients.find((p) => p.id === patientId);
    if (matched) {
      setActivePatient(matched);
      setActiveView('patient-detail');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-white">
      {/* 1. Header with CTA */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-xs font-bold text-white shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#E1FA4A] animate-pulse"></span>
            <span>Live Clinical Triage • Active Screening Center</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-sans">
            Clinical Overview
          </h1>
          <p className="text-white/90 text-base sm:text-lg font-medium max-w-2xl">
            Real-time screening metrics, microvascular risk distribution, and urgent ophthalmology triage queue.
          </p>
        </div>

        <button
          onClick={() => {
            setActiveScan(null);
            setActiveView('new-scan');
          }}
          className="bg-[#E1FA4A] hover:bg-[#d6f236] text-black px-7 sm:px-9 h-12 sm:h-14 rounded-full font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all shrink-0 cursor-pointer uppercase tracking-wider"
          aria-label="Start new retinal scan analysis"
        >
          <Microscope className="w-5 h-5 stroke-[2.5]" />
          <span>Start New Scan ↗</span>
        </button>
      </header>

      {/* 2. Key Metrics Row (4 Enamel White Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Patients Screened */}
        <div className="bg-white text-black p-6 rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] border-4 border-white flex flex-col justify-between hover:translate-y-[-2px] transition-all">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-gray-500 font-black text-xs uppercase tracking-wider">
                Total Screened
              </p>
              <span className="w-8 h-8 rounded-xl bg-sky-100 text-[#1E54B7] flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <p className="text-4xl font-black font-mono text-[#1E54B7] mt-3">
              {dashboardStats.total_patients.toLocaleString()}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-emerald-700 text-xs font-black">
            <TrendingUp className="w-4 h-4 stroke-[3]" />
            <span>+12% volume this month</span>
          </div>
        </div>

        {/* Card 2: High Risk Cases (Stage 2+) with Pulsing Crimson Dot */}
        <div className="bg-white text-black p-6 rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] border-4 border-rose-200/80 relative overflow-hidden flex flex-col justify-between hover:translate-y-[-2px] transition-all">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase">
            <span className="w-2 h-2 bg-rose-600 rounded-full animate-ping"></span>
            <span>Urgent</span>
          </div>
          <div>
            <p className="text-gray-500 font-black text-xs uppercase tracking-wider">
              High Risk Cases
            </p>
            <p className="text-4xl font-black font-mono text-rose-600 mt-3">
              {dashboardStats.high_risk_cases}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stages 3 & 4 detected</span>
          </div>
        </div>

        {/* Card 3: Referrals Pending */}
        <div className="bg-white text-black p-6 rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] border-4 border-white flex flex-col justify-between hover:translate-y-[-2px] transition-all">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-gray-500 font-black text-xs uppercase tracking-wider">
                Referrals Pending
              </p>
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                <Hospital className="w-4 h-4" />
              </span>
            </div>
            <p className="text-4xl font-black font-mono text-gray-900 mt-3">
              {dashboardStats.referrals_needed}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-gray-600 text-xs font-bold">
            Avg triage turnaround: <strong className="text-black">48h</strong>
          </div>
        </div>

        {/* Card 4: AI Accuracy */}
        <div className="bg-white text-black p-6 rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.12)] border-4 border-white flex flex-col justify-between hover:translate-y-[-2px] transition-all">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-gray-500 font-black text-xs uppercase tracking-wider">
                Model Accuracy
              </p>
              <span className="w-8 h-8 rounded-xl bg-[#E1FA4A] text-black flex items-center justify-center font-black text-xs shadow-sm">
                ★
              </span>
            </div>
            <p className="text-4xl font-black font-mono text-[#1E54B7] mt-3">
              {dashboardStats.diagnostic_accuracy}%
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-gray-600 text-xs font-bold">
            EyePACS &amp; Messidor-2 Verified
          </div>
        </div>
      </div>

      {/* 3. Stage Distribution & Recent Scans Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DR Stage Distribution */}
        <div className="lg:col-span-5 bg-white text-black rounded-[36px] p-7 shadow-2xl border-4 border-white flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-[#1E54B7]">
                  <Eye className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h2 className="text-xl font-bold text-black">
                  DR Stage Distribution
                </h2>
              </div>
              {selectedStageFilter !== 'all' && (
                <button
                  onClick={() => setSelectedStageFilter('all')}
                  className="text-xs font-black text-[#1E54B7] bg-sky-100 hover:bg-sky-200 px-3 py-1 rounded-full transition-all cursor-pointer"
                >
                  Clear Filter ✕
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Click any clinical stage below to filter active screening records in real time.
            </p>

            <div className="space-y-3.5">
              {([0, 1, 2, 3, 4] as DRStage[]).map((stageNum) => {
                const meta = DR_STAGES[stageNum];
                const dist = dashboardStats.stage_distribution[stageNum] || {
                  count: 0,
                  percentage: 0,
                };
                const isSelected = selectedStageFilter === stageNum;

                return (
                  <div
                    key={stageNum}
                    onClick={() =>
                      setSelectedStageFilter((prev) => (prev === stageNum ? 'all' : stageNum))
                    }
                    className={`flex flex-col gap-1.5 p-3 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-sky-50 border-[#1E54B7] shadow-md scale-[1.01]'
                        : 'bg-gray-50/80 hover:bg-gray-100 border-gray-200/80'
                    }`}
                  >
                    <div className="flex justify-between text-xs font-bold">
                      <span className="flex items-center gap-2 text-black">
                        <span
                          className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.icon}
                        </span>
                        <span>{meta.name}</span>
                      </span>
                      <span className="font-mono text-gray-600 font-bold">{dist.count} patients ({dist.percentage}%)</span>
                    </div>

                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(dist.percentage, 8)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
            <span>WCAG 2.2 AAA Dual-Coded</span>
            <span className="font-mono font-bold text-gray-700">Okabe-Ito Palette</span>
          </div>
        </div>

        {/* Recent Patient Scans Table */}
        <div className="lg:col-span-7 bg-white text-black rounded-[36px] p-7 shadow-2xl border-4 border-white flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Target className="w-4 h-4 stroke-[2.5]" />
              </div>
              <h2 className="text-xl font-bold text-black">
                Recent Patient Scans
              </h2>
            </div>
            <button
              onClick={() => setActiveView('patients')}
              className="text-xs font-black text-[#1E54B7] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/80 text-gray-700 text-[11px] font-black uppercase tracking-wider">
                  <th className="px-4 py-3 rounded-l-xl">Patient Name</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Scan Date</th>
                  <th className="px-4 py-3 rounded-r-xl text-right">AI Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 text-xs font-medium">
                      No recent scans matching the selected stage filter.
                    </td>
                  </tr>
                ) : (
                  filteredScans.map((scan) => {
                    const meta = DR_STAGES[scan.detection.stage];
                    return (
                      <tr
                        key={scan.analysis_id}
                        onClick={() => handleOpenScan(scan)}
                        className="hover:bg-sky-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="px-4 py-3.5 font-bold text-gray-950 group-hover:text-[#1E54B7]">
                          {scan.patient_name || 'Patient'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-gray-500">
                          {scan.patient_id}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-gray-600">
                          {scan.scan_date}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black text-white shadow-sm"
                            style={{ backgroundColor: meta.color }}
                          >
                            <span>{meta.icon}</span>
                            <span>{meta.name}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-gray-500">
            <span>Showing recent triage queue</span>
            <button
              onClick={() => {
                setActiveScan(null);
                setActiveView('batch-screening');
              }}
              className="text-[#1E54B7] font-black hover:underline cursor-pointer"
            >
              Open Batch Screening Queue ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
