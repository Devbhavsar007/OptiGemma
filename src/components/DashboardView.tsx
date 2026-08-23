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
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* 1. Header with CTA */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F8FAFC]">
            Clinical Overview
          </h1>
          <p className="text-[#CBD5E1] text-base sm:text-lg mt-1 font-medium">
            Screening metrics and population risk stratification
          </p>
        </div>

        <button
          onClick={() => {
            setActiveScan(null);
            setActiveView('new-scan');
          }}
          className="bg-[#38BDF8] text-[#0B0F19] px-6 sm:px-8 h-12 sm:h-14 rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-lg hover:scale-105 transition-all shrink-0 cursor-pointer"
          aria-label="Start new retinal scan analysis"
        >
          <Microscope className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          <span>START NEW SCAN</span>
        </button>
      </header>

      {/* 2. Key Metrics Row (4 Large Cards in grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Patients Screened */}
        <div className="bg-[#131B2E] border-2 border-[#334155] p-5 rounded-2xl">
          <p className="text-[#94A3B8] font-bold text-xs uppercase tracking-wider mb-1">
            Total Screened
          </p>
          <p className="text-4xl font-black font-mono text-[#F8FAFC]">
            {dashboardStats.total_patients.toLocaleString()}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[#0D9488] text-sm font-bold">
            <TrendingUp className="w-4 h-4 stroke-[3]" />
            <span>+12% this month</span>
          </div>
        </div>

        {/* Card 2: High Risk Cases (Stage 2+) with Pulsing Red Dot & Red Border */}
        <div className="bg-[#131B2E] border-2 border-[#DC2626] p-5 rounded-2xl relative overflow-hidden">
          <div className="absolute top-3 right-3 w-3 h-3 bg-[#DC2626] rounded-full animate-pulse"></div>
          <p className="text-[#94A3B8] font-bold text-xs uppercase tracking-wider mb-1">
            High Risk Cases
          </p>
          <p className="text-4xl font-black font-mono text-[#DC2626]">
            {dashboardStats.high_risk_cases}
          </p>
          <p className="text-[#94A3B8] text-xs font-bold mt-2 uppercase">
            Stages 3 & 4 detected
          </p>
        </div>

        {/* Card 3: Referrals Pending */}
        <div className="bg-[#131B2E] border-2 border-[#334155] p-5 rounded-2xl">
          <p className="text-[#94A3B8] font-bold text-xs uppercase tracking-wider mb-1">
            Referrals Pending
          </p>
          <p className="text-4xl font-black font-mono text-[#F8FAFC]">
            {dashboardStats.referrals_needed}
          </p>
          <p className="text-[#CBD5E1] text-xs font-bold mt-2 uppercase">
            Avg process time: 48h
          </p>
        </div>

        {/* Card 4: AI Accuracy */}
        <div className="bg-[#131B2E] border-2 border-[#334155] p-5 rounded-2xl">
          <p className="text-[#94A3B8] font-bold text-xs uppercase tracking-wider mb-1">
            AI Accuracy
          </p>
          <p className="text-4xl font-black font-mono text-[#38BDF8]">
            {dashboardStats.diagnostic_accuracy}%
          </p>
          <p className="text-[#CBD5E1] text-xs font-bold mt-2 uppercase">
            Clinical Benchmark Verified
          </p>
        </div>
      </div>

      {/* 3. Stage Distribution & Recent Scans Side-by-Side on LG screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DR Stage Distribution */}
        <div className="lg:col-span-5 bg-[#131B2E] border-2 border-[#334155] rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[#F8FAFC]">
                <Eye className="w-5 h-5 text-[#38BDF8]" />
                DR Stage Distribution
              </h2>
              {selectedStageFilter !== 'all' && (
                <button
                  onClick={() => setSelectedStageFilter('all')}
                  className="text-xs font-bold text-[#38BDF8] underline hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-4">
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
                    className={`flex flex-col gap-1.5 p-2 rounded-xl transition-all cursor-pointer ${
                      isSelected ? 'bg-[#1E293B] border border-[#38BDF8]' : 'hover:bg-[#0F172A]'
                    }`}
                  >
                    <div className="flex justify-between text-xs sm:text-sm font-bold uppercase">
                      <span className="flex items-center gap-2 text-[#F8FAFC]">
                        <span
                          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          {meta.icon}
                        </span>
                        {meta.name}
                      </span>
                      <span className="font-mono text-[#CBD5E1]">{dist.count} pts</span>
                    </div>

                    <div className="h-7 sm:h-8 bg-[#0F172A] border border-[#334155] rounded-lg overflow-hidden flex">
                      <div
                        className="h-full flex items-center px-3 font-bold text-xs text-white transition-all duration-500"
                        style={{
                          width: `${Math.max(dist.percentage, 10)}%`,
                          backgroundColor: meta.color,
                        }}
                      >
                        {dist.percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Patient Scans Table */}
        <div className="lg:col-span-7 bg-[#131B2E] border-2 border-[#334155] rounded-3xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[#F8FAFC]">
              <Target className="w-5 h-5 text-[#38BDF8]" />
              Recent Patient Scans
            </h2>
            <button
              onClick={() => setActiveView('patients')}
              className="text-sm font-bold text-[#38BDF8] underline hover:text-white"
            >
              View All Records
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0F172A] text-[#94A3B8] text-xs font-black uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Patient Name</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Scan Date</th>
                  <th className="px-4 py-3 rounded-r-lg">AI Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#94A3B8]">
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
                        className="hover:bg-[#1E293B] cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-4 font-bold text-[#F8FAFC]">
                          {scan.patient_name || 'Patient'}
                        </td>
                        <td className="px-4 py-4 font-mono text-sm text-[#94A3B8]">
                          {scan.patient_id}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-[#CBD5E1]">
                          {scan.scan_date}
                        </td>
                        <td className="px-4 py-4">
                          <div
                            className="px-3 py-1 rounded-full text-xs font-black flex items-center gap-2 w-fit uppercase text-white shadow-sm"
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
        </div>
      </div>
    </div>
  );
};
