import React, { useState } from 'react';
import {
  Layers,
  Play,
  Trash2,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  UserPlus,
} from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { DualCodedBadge } from './DualCodedBadge';
import { createFundusDataUrl } from '../data/sampleFundusPresets';
import { BatchQueueItem } from '../types';

export const BatchScreeningView: React.FC = () => {
  const {
    batchQueue,
    processBatchQueue,
    removeFromBatchQueue,
    clearBatchQueue,
    addToBatchQueue,
    setActiveScan,
    setActivePatient,
    setActiveView,
    patients,
  } = useMedicalData();

  const { speak } = useAccessibility();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showAddModal, setShowAddModal] = useState(false);

  const [quickForm, setQuickForm] = useState({
    patient_name: '',
    age: 58,
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    diabetes_duration: 8,
    sugar_level: 175,
    hba1c: 8.2,
  });

  const queuedCount = batchQueue.filter((q) => q.status === 'QUEUED').length;
  const completedCount = batchQueue.filter((q) => q.status === 'COMPLETED' || q.status === 'REQUIRES_ATTENTION').length;
  const highRiskCount = batchQueue.filter((q) => q.status === 'REQUIRES_ATTENTION').length;

  const handleStartBatch = async () => {
    if (batchQueue.length === 0) return;
    setIsProcessing(true);
    speak(`Starting batch screening of ${batchQueue.length} patient scans.`);

    await processBatchQueue((current, total) => {
      setProgress({ current, total });
    });

    setIsProcessing(false);
    speak('Batch screening complete. All queued scans processed.');
  };

  const handleInspectResult = (item: BatchQueueItem) => {
    if (item.result) {
      setActiveScan(item.result);
      const matched = patients.find((p) => p.id === item.patient_id);
      if (matched) setActivePatient(matched);
      setActiveView('new-scan');
    }
  };

  const handleAddPatientToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.patient_name.trim()) return;

    // Select random preset fundus image based on glucose level
    const stage = quickForm.hba1c >= 9 ? 3 : quickForm.hba1c >= 7.5 ? 2 : 1;
    const imageUrl = createFundusDataUrl(stage, 'original');

    addToBatchQueue({
      ...quickForm,
      image_url: imageUrl,
    });

    setQuickForm({
      patient_name: '',
      age: 55,
      gender: 'Male',
      diabetes_duration: 6,
      sugar_level: 150,
      hba1c: 7.2,
    });
    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    const headers = ['Patient Name', 'Age', 'Gender', 'HbA1c', 'Blood Sugar', 'Duration', 'Status', 'Diagnosis', 'Confidence'];
    const rows = batchQueue.map((item) => [
      item.patient_name,
      item.age,
      item.gender,
      `${item.hba1c}%`,
      `${item.sugar_level} mg/dL`,
      `${item.diabetes_duration} yrs`,
      item.status,
      item.result ? item.result.detection.stage_name : 'Pending',
      item.result ? `${item.result.detection.confidence}%` : 'N/A',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OptiGemma_Batch_Screening_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl shadow-xl">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] flex items-center gap-3">
            <Layers className="w-8 h-8 text-[#38BDF8]" />
            Batch Screening — Mobile Camp Queue
          </h1>
          <p className="text-base text-[#CBD5E1]">
            High-throughput pipeline for community outreach vans and rural screening camps
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white font-bold text-sm border border-[#475569] transition-all min-h-[48px]"
          >
            <UserPlus className="w-4 h-4 text-[#38BDF8]" />
            <span>Add Patient to Queue</span>
          </button>

          <button
            onClick={handleStartBatch}
            disabled={isProcessing || queuedCount === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] disabled:opacity-50 text-[#0B0F19] font-black text-sm shadow-lg shadow-sky-500/20 transition-all min-h-[48px]"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isProcessing ? 'Processing Queue...' : `Process All (${queuedCount})`}</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-[#131B2E] border-2 border-[#334155] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
              Waiting in Queue
            </span>
            <span className="text-3xl font-black text-white font-mono mt-1 block">
              {queuedCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-sky-500/10 text-[#38BDF8] border border-sky-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-[#131B2E] border-2 border-[#334155] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
              Successfully Analyzed
            </span>
            <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">
              {completedCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 bg-[#131B2E] border-2 border-[#334155] rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] block">
              High Risk / Urgent Attention
            </span>
            <span className="text-3xl font-black text-rose-400 font-mono mt-1 block">
              {highRiskCount}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Processing Progress Bar */}
      {isProcessing && (
        <div className="p-6 bg-[#131B2E] border-2 border-[#38BDF8] rounded-2xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-sm font-bold text-white">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#38BDF8] animate-spin" />
              Batch Inference Pipeline in Progress...
            </span>
            <span className="font-mono text-[#38BDF8]">
              {progress.current} of {progress.total} Completed
            </span>
          </div>

          <div className="w-full h-3 bg-[#0B0F19] rounded-full overflow-hidden border border-[#334155]">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue Table */}
      <div className="p-6 bg-[#131B2E] border-2 border-[#334155] rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-white">Queued Patient Records ({batchQueue.length})</h2>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={batchQueue.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-[#CBD5E1] text-xs font-bold border border-[#334155] transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#38BDF8]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={clearBatchQueue}
              disabled={batchQueue.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Queue</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#334155]">
          <table className="w-full text-left border-collapse" role="table">
            <thead>
              <tr className="bg-[#0B0F19] text-[#94A3B8] text-xs uppercase tracking-wider border-b border-[#334155]">
                <th className="p-4 font-bold">Scan Preview</th>
                <th className="p-4 font-bold">Patient Details</th>
                <th className="p-4 font-bold">Vitals</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">AI Diagnosis</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] text-sm">
              {batchQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#94A3B8]">
                    No scans in the queue. Click "Add Patient to Queue" above.
                  </td>
                </tr>
              ) : (
                batchQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1E293B]/60 transition-colors min-h-[64px]">
                    <td className="p-4">
                      <div className="w-12 h-12 rounded-lg bg-black overflow-hidden border border-[#334155] shrink-0">
                        <img
                          src={item.image_url}
                          alt="Fundus thumb"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-white">{item.patient_name}</div>
                      <span className="text-xs text-[#94A3B8]">
                        {item.age} yrs • {item.gender}
                      </span>
                    </td>

                    <td className="p-4 text-xs font-mono text-[#CBD5E1]">
                      <div>HbA1c: <strong className="text-white">{item.hba1c}%</strong></div>
                      <div>Sugar: {item.sugar_level} mg/dL</div>
                    </td>

                    <td className="p-4">
                      {item.status === 'QUEUED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0F172A] text-[#94A3B8] border border-[#334155] text-xs font-bold font-mono">
                          <Clock className="w-3.5 h-3.5" /> Queued
                        </span>
                      )}
                      {item.status === 'ANALYZING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500/20 text-[#38BDF8] border border-sky-500/40 text-xs font-bold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing
                        </span>
                      )}
                      {item.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                      {item.status === 'REQUIRES_ATTENTION' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> High Risk
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {item.result ? (
                        <DualCodedBadge stage={item.result.detection.stage} size="sm" />
                      ) : (
                        <span className="text-xs text-[#64748B] font-mono">Pending inference</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.result && (
                          <button
                            onClick={() => handleInspectResult(item)}
                            className="p-2 rounded-lg bg-[#38BDF8]/10 hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#0B0F19] transition-all"
                            title="Inspect Diagnosis"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => removeFromBatchQueue(item.id)}
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                          title="Remove from Queue"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#131B2E] border-2 border-[#334155] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="text-xl font-bold text-white">Add Patient to Batch Queue</h3>

            <form onSubmit={handleAddPatientToQueue} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#94A3B8] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={quickForm.patient_name}
                  onChange={(e) => setQuickForm({ ...quickForm, patient_name: e.target.value })}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-4 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white focus:border-[#38BDF8] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#94A3B8] mb-1">Age</label>
                  <input
                    type="number"
                    value={quickForm.age}
                    onChange={(e) => setQuickForm({ ...quickForm, age: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#94A3B8] mb-1">HbA1c (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={quickForm.hba1c}
                    onChange={(e) => setQuickForm({ ...quickForm, hba1c: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#0F172A] border-2 border-[#334155] rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2 rounded-xl bg-[#1E293B] text-white font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#38BDF8] text-[#0B0F19] font-bold text-sm"
                >
                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
