import React, { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  RotateCcw,
  ShieldAlert,
  FileSignature,
  Loader2,
} from 'lucide-react';
import { DR_STAGES, DRStage, DoctorReview } from '../types';

interface DoctorReviewSectionProps {
  scanId: string;
  patientId: string;
  originalStage: DRStage;
  existingReview?: DoctorReview | null;
  onReviewSubmitted?: (review: DoctorReview) => void;
}

export const DoctorReviewSection: React.FC<DoctorReviewSectionProps> = ({
  scanId,
  patientId,
  originalStage,
  existingReview,
  onReviewSubmitted,
}) => {
  const [review, setReview] = useState<DoctorReview | null>(existingReview || null);
  const [doctorName, setDoctorName] = useState('Dr. Rajesh Sharma, MD (Ophthal)');
  const [doctorId, setDoctorId] = useState('DOC-OPHTH-01');
  const [decision, setDecision] = useState<'APPROVED' | 'MODIFIED' | 'REJECTED_RETAKE'>('APPROVED');
  const [adjustedStage, setAdjustedStage] = useState<DRStage>(originalStage);
  const [approvedPriority, setApprovedPriority] = useState<'ROUTINE' | 'EARLY' | 'URGENT'>(
    originalStage >= 3 ? 'URGENT' : originalStage >= 2 ? 'EARLY' : 'ROUTINE'
  );
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [recommendedIntervention, setRecommendedIntervention] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/scans/${scanId}/doctor-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          doctor_name: doctorName,
          decision,
          adjusted_stage: decision === 'MODIFIED' ? adjustedStage : originalStage,
          approved_priority: approvedPriority,
          clinical_notes: clinicalNotes,
          recommended_intervention: recommendedIntervention,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record doctor review.');
      }

      const savedReview: DoctorReview = {
        scan_id: scanId,
        patient_id: patientId,
        doctor_id: doctorId,
        doctor_name: doctorName,
        decision,
        original_stage: originalStage,
        adjusted_stage: decision === 'MODIFIED' ? adjustedStage : originalStage,
        approved_priority: approvedPriority,
        clinical_notes: clinicalNotes,
        recommended_intervention: recommendedIntervention,
        created_at: new Date().toISOString(),
      };

      setReview(savedReview);
      if (onReviewSubmitted) {
        onReviewSubmitted(savedReview);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-7 bg-white text-black rounded-3xl border-2 border-sky-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 text-[#1E54B7] flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-black font-sans flex items-center gap-2">
              Clinician Sign-off & Oversight
              {review ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono">
                  ✓ Verified by {review.doctor_name.split(',')[0]}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold font-mono">
                  Pending Clinician Sign-off
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500">
              Human-in-the-loop review mechanism enforcing clinical oversight before definitive referral
            </p>
          </div>
        </div>
      </div>

      {/* Review Completed Summary View */}
      {review ? (
        <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-emerald-800 font-bold block">Authorizing Clinician:</span>
              <strong className="text-black text-sm">{review.doctor_name} ({review.doctor_id})</strong>
            </div>
            <div className="text-right">
              <span className="text-emerald-800 font-bold block">Decision Outcome:</span>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                review.decision === 'APPROVED' ? 'bg-emerald-600 text-white' :
                review.decision === 'MODIFIED' ? 'bg-amber-500 text-white' : 'bg-rose-600 text-white'
              }`}>
                {review.decision}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-emerald-100">
            <div>
              <span className="text-gray-600 block font-bold">Approved Stage:</span>
              <span className="text-black font-bold">
                {DR_STAGES[review.adjusted_stage ?? review.original_stage].name}
              </span>
            </div>
            <div>
              <span className="text-gray-600 block font-bold">Approved Referral Priority:</span>
              <span className="font-mono font-bold text-[#1E54B7]">{review.approved_priority}</span>
            </div>
          </div>

          {review.clinical_notes && (
            <div className="text-xs text-gray-800 bg-white/80 p-3 rounded-xl border border-emerald-100">
              <strong className="block text-gray-600 mb-1">Clinician Notes:</strong>
              {review.clinical_notes}
            </div>
          )}

          <button
            onClick={() => setReview(null)}
            className="text-xs font-bold text-[#1E54B7] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" /> Re-evaluate / Edit Sign-off
          </button>
        </div>
      ) : (
        /* Review Input Form */
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {/* Clinician Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Reviewing Clinician Name</label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-black font-medium focus:outline-none focus:border-[#1E54B7]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Doctor ID / License</label>
              <input
                type="text"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-black font-medium focus:outline-none focus:border-[#1E54B7]"
              />
            </div>
          </div>

          {/* Decision Buttons */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Evaluation Action</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDecision('APPROVED');
                  setAdjustedStage(originalStage);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  decision === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve AI
              </button>

              <button
                type="button"
                onClick={() => setDecision('MODIFIED')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  decision === 'MODIFIED'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Modify Grade
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECTED_RETAKE')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  decision === 'REJECTED_RETAKE'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Order Retake
              </button>
            </div>
          </div>

          {/* Conditional Adjusted Stage & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {decision === 'MODIFIED' ? (
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Clinician Adjusted Stage</label>
                <select
                  value={adjustedStage}
                  onChange={(e) => setAdjustedStage(Number(e.target.value) as DRStage)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50/50 text-xs font-bold text-black focus:outline-none"
                >
                  {[0, 1, 2, 3, 4].map((st) => (
                    <option key={st} value={st}>
                      {DR_STAGES[st as DRStage].name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Retained AI Stage</label>
                <div className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700">
                  {DR_STAGES[originalStage].name}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Authorized Referral Triage</label>
              <select
                value={approvedPriority}
                onChange={(e) => setApprovedPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-black focus:outline-none"
              >
                <option value="ROUTINE">ROUTINE (Primary Care / Annual Follow-up)</option>
                <option value="EARLY">EARLY (Specialist Review within 3-6 Months)</option>
                <option value="URGENT">URGENT (Immediate Vitreoretinal Referral &lt; 2 Weeks)</option>
              </select>
            </div>
          </div>

          {/* Notes & Interventions */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Clinical Impressions & Findings</label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g., Foveal architecture appears preserved. Mild microaneurysm cluster in superior-temporal arcades. HbA1c control emphasized."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs text-black font-medium focus:outline-none focus:border-[#1E54B7]"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-gray-500 font-medium">
              Signs digital audit log in permanent database.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#1E54B7] hover:bg-[#153e8a] text-white font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSignature className="w-4 h-4" />
              )}
              <span>Submit Clinician Sign-off</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
