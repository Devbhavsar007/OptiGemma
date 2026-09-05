import React from 'react';
import {
  Activity,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import { DR_STAGES, DRStage, TimelineEvent } from '../types';

interface PatientTimelineProps {
  events: TimelineEvent[];
  onSelectScan?: (scanId: string) => void;
  onOpenLightbox?: (scanId: string) => void;
}

export const PatientTimeline: React.FC<PatientTimelineProps> = ({
  events,
  onSelectScan,
}) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-3xl border border-gray-200 text-gray-500">
        <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="font-semibold text-sm">No longitudinal visits recorded yet.</p>
        <p className="text-xs text-gray-400 mt-1">Screening sessions will build the patient trajectory here.</p>
      </div>
    );
  }

  // Calculate overall trajectory summary
  const firstEvent = events[0];
  const latestEvent = events[events.length - 1];
  const overallDelta = latestEvent.stage - firstEvent.stage;

  return (
    <div className="space-y-6">
      {/* Trajectory KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-[#1E54B7] font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold block">Visits Monitored</span>
            <span className="text-lg font-black text-black font-sans">{events.length} Screening{events.length > 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
            overallDelta > 0
              ? 'bg-rose-100 text-rose-600'
              : overallDelta < 0
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-gray-200 text-gray-700'
          }`}>
            {overallDelta > 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : overallDelta < 0 ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <Minus className="w-5 h-5" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold block">Overall Trajectory</span>
            <span className="text-sm font-black text-black font-sans">
              {overallDelta > 0
                ? `Progression (+${overallDelta} Stage)`
                : overallDelta < 0
                ? `Improvement (${overallDelta} Stage)`
                : 'Stable Retinal State'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
            latestEvent.referral?.priority === 'URGENT'
              ? 'bg-rose-100 text-rose-600'
              : latestEvent.referral?.priority === 'EARLY'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-emerald-100 text-emerald-600'
          }`}>
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold block">Active Triage Status</span>
            <span className="text-sm font-black uppercase text-black font-sans">
              {latestEvent.referral?.priority || (latestEvent.stage >= 3 ? 'URGENT' : latestEvent.stage >= 2 ? 'EARLY' : 'ROUTINE')}
            </span>
          </div>
        </div>
      </div>

      {/* Sequential Timeline Nodes */}
      <div className="relative border-l-2 border-gray-200 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-6">
        {events.map((evt, idx) => {
          const meta = DR_STAGES[evt.stage as DRStage] || DR_STAGES[0];
          const prog = evt.progression;
          const ref = evt.referral;
          const priority = ref?.priority || (evt.stage >= 3 ? 'URGENT' : evt.stage >= 2 ? 'EARLY' : 'ROUTINE');

          return (
            <div key={evt.scan_id || idx} className="relative group">
              {/* Node bullet */}
              <div
                className="absolute -left-[35px] sm:-left-[43px] top-2 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center shadow-md font-black text-white text-[10px]"
                style={{ backgroundColor: meta.color }}
              >
                {meta.icon}
              </div>

              {/* Event Card */}
              <div className="p-5 sm:p-6 bg-gray-50/80 border border-gray-200 rounded-3xl space-y-4 hover:border-[#1E54B7] hover:bg-white transition-all shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-600 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#1E54B7]" />
                        {evt.date}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">({evt.scan_id})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 mt-1">
                      <h4 className="text-base sm:text-lg font-black text-black font-sans">
                        {meta.name}
                      </h4>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white border border-gray-200 font-bold text-gray-700">
                        {evt.confidence}% Conf
                      </span>
                      {evt.stage_delta !== null && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          evt.stage_delta > 0
                            ? 'bg-rose-100 text-rose-700'
                            : evt.stage_delta < 0
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {evt.stage_delta > 0 ? `+${evt.stage_delta} Stage` : evt.stage_delta < 0 ? `${evt.stage_delta} Stage` : 'Stable'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Triage Priority Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      priority === 'URGENT'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : priority === 'EARLY'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                    }`}>
                      {priority === 'URGENT' ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      Triage: {priority}
                    </span>

                    {onSelectScan && (
                      <button
                        onClick={() => onSelectScan(evt.scan_id)}
                        className="px-3 py-1 rounded-full bg-sky-100 hover:bg-[#1E54B7] text-[#1E54B7] hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        Details <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progression Risk Panel */}
                {prog?.predicted_risk && (
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-700 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-[#1E54B7]" />
                        Deterministic Progression Model
                      </span>
                      <span className="font-mono font-bold text-gray-500">
                        Risk Category: <strong className={
                          prog.predicted_risk.risk_category === 'HIGH' ? 'text-rose-600' :
                          prog.predicted_risk.risk_category === 'MODERATE' ? 'text-amber-600' : 'text-emerald-600'
                        }>{prog.predicted_risk.risk_category}</strong>
                      </span>
                    </div>

                    {/* Progress bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="flex justify-between text-gray-600 mb-1">
                          <span>6-Month Progression Risk</span>
                          <span className="font-mono font-bold text-black">
                            {(prog.predicted_risk.six_month_risk * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, prog.predicted_risk.six_month_risk * 100)}%`,
                              backgroundColor: prog.predicted_risk.six_month_risk >= 0.6 ? '#DC2626' : prog.predicted_risk.six_month_risk >= 0.3 ? '#EA580C' : '#0D9488',
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-gray-600 mb-1">
                          <span>12-Month Progression Risk</span>
                          <span className="font-mono font-bold text-black">
                            {(prog.predicted_risk.twelve_month_risk * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, prog.predicted_risk.twelve_month_risk * 100)}%`,
                              backgroundColor: prog.predicted_risk.twelve_month_risk >= 0.6 ? '#DC2626' : prog.predicted_risk.twelve_month_risk >= 0.3 ? '#EA580C' : '#0D9488',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Supporting factors and uncertainties */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {prog.predicted_risk.supporting_factors?.map((factor, fIdx) => (
                        <span key={fIdx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          ✓ {factor}
                        </span>
                      ))}
                      {prog.predicted_risk.uncertainty_flags?.map((flag, uIdx) => (
                        <span key={uIdx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          ⚠ {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reason Codes from Referral Triage */}
                {ref?.reasonCodes && ref.reasonCodes.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-bold text-gray-500">Triage Indicators:</span>
                    <div className="flex flex-wrap gap-1">
                      {ref.reasonCodes.map((code: string, cIdx: number) => (
                        <span key={cIdx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 text-[#1E54B7] border border-sky-100">
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety & Clinical Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-950 flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-[#1E54B7] shrink-0 mt-0.5" />
        <div>
          <strong className="block text-[#1E54B7]">Assistive Decision Support Policy Notice:</strong>
          Longitudinal progression risks and triage tiers are deterministic screening aids intended to assist healthcare workers in rural and primary clinics. They do not constitute an ophthalmological diagnosis or definitive medical prescription.
        </div>
      </div>
    </div>
  );
};
