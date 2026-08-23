import React, { useState } from 'react';
import {
  Users,
  Search,
  UserPlus,
  ArrowRight,
  Filter,
  Microscope,
  Calendar,
  Activity,
} from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';
import { DR_STAGES, DRStage, Patient } from '../types';
import { DualCodedBadge } from './DualCodedBadge';

type SeverityFilter = 'all' | 'no-dr' | 'mild-mod' | 'high-risk';

export const PatientDirectoryView: React.FC = () => {
  const { patients, setActivePatient, setActiveView, setActiveScan } = useMedicalData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    const latestScan = p.scans && p.scans.length > 0 ? p.scans[0] : null;
    const stage = latestScan ? latestScan.detection.stage : null;

    if (filter === 'no-dr') return stage === 0;
    if (filter === 'mild-mod') return stage === 1 || stage === 2;
    if (filter === 'high-risk') return stage === 3 || stage === 4;
    return true;
  });

  const handleSelectPatient = (patient: Patient) => {
    setActivePatient(patient);
    setActiveView('patient-detail');
  };

  const handleStartScanForPatient = (patient: Patient) => {
    setActivePatient(patient);
    setActiveScan(null);
    setActiveView('new-scan');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] flex items-center gap-3">
            <Users className="w-8 h-8 text-[#38BDF8]" />
            Patient Records Directory
          </h1>
          <p className="text-base text-[#CBD5E1]">
            Longitudinal diabetic ophthalmology profiles, scan histories, and HbA1c tracking
          </p>
        </div>

        <button
          onClick={() => {
            setActivePatient(null);
            setActiveScan(null);
            setActiveView('new-scan');
          }}
          className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B0F19] font-black text-sm shadow-md transition-all shrink-0 min-h-[48px]"
        >
          <UserPlus className="w-5 h-5" />
          <span>Register & Scan Patient</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient name, ID, clinical notes..."
              className="w-full pl-12 pr-4 py-3 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white placeholder-[#94A3B8] font-medium focus:border-[#38BDF8] focus:outline-none transition-colors"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-[#38BDF8] text-[#0B0F19] shadow-md'
                  : 'bg-[#0F172A] text-[#CBD5E1] border border-[#334155] hover:bg-[#1E293B]'
              }`}
            >
              All Records ({patients.length})
            </button>
            <button
              onClick={() => setFilter('no-dr')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'no-dr'
                  ? 'bg-[#009E73] text-white shadow-md'
                  : 'bg-[#0F172A] text-[#CBD5E1] border border-[#334155] hover:bg-[#1E293B]'
              }`}
            >
              [●] No DR / Healthy
            </button>
            <button
              onClick={() => setFilter('mild-mod')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'mild-mod'
                  ? 'bg-[#E69F00] text-black shadow-md'
                  : 'bg-[#0F172A] text-[#CBD5E1] border border-[#334155] hover:bg-[#1E293B]'
              }`}
            >
              [▲] Mild / Moderate
            </button>
            <button
              onClick={() => setFilter('high-risk')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'high-risk'
                  ? 'bg-[#D55E00] text-white shadow-md'
                  : 'bg-[#0F172A] text-[#CBD5E1] border border-[#334155] hover:bg-[#1E293B]'
              }`}
            >
              [◆] High Risk (Severe/PDR)
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredPatients.map((patient) => {
            const latestScan = patient.scans && patient.scans.length > 0 ? patient.scans[0] : null;

            return (
              <div
                key={patient.id}
                onClick={() => handleSelectPatient(patient)}
                className="p-5 bg-[#0F172A] border-2 border-[#1E293B] hover:border-[#38BDF8] rounded-2xl cursor-pointer transition-all hover:bg-[#131B2E] space-y-4 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-lg text-[#F8FAFC] group-hover:text-[#38BDF8] transition-colors truncate">
                      {patient.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#38BDF8] bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 shrink-0">
                      {patient.id}
                    </span>
                  </div>

                  <div className="text-xs text-[#94A3B8] mt-1 flex items-center gap-3">
                    <span>Age: {patient.age} ({patient.gender})</span>
                    <span>•</span>
                    <span>Diabetes: {patient.diabetes_duration} yrs</span>
                  </div>

                  {/* Vitals Summary */}
                  <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-[#131B2E] rounded-xl border border-[#1E293B] text-xs font-mono">
                    <div>
                      <span className="text-[#94A3B8] block">HbA1c</span>
                      <strong className="text-white text-sm">{patient.hba1c}%</strong>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block">Fasting Sugar</span>
                      <strong className="text-white text-sm">{patient.sugar_level} mg/dL</strong>
                    </div>
                  </div>

                  {/* Latest Diagnostic Status */}
                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-[#94A3B8] uppercase block mb-1">
                      Latest Retinal Diagnosis:
                    </span>
                    {latestScan ? (
                      <DualCodedBadge stage={latestScan.detection.stage} size="sm" showDetails />
                    ) : (
                      <span className="text-xs text-[#64748B] italic">No prior scans recorded</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#1E293B] text-xs">
                  <span className="text-[#94A3B8] font-mono">
                    {patient.scans?.length || 0} scans on file
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartScanForPatient(patient);
                      }}
                      className="p-2 rounded-lg bg-sky-500/10 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#0B0F19] transition-all font-bold"
                      title="Run new scan for this patient"
                    >
                      <Microscope className="w-4 h-4" />
                    </button>

                    <span className="inline-flex items-center gap-1 font-bold text-[#38BDF8] group-hover:translate-x-1 transition-transform">
                      Profile <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
