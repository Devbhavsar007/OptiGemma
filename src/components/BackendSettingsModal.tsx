import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Radio, ExternalLink } from 'lucide-react';
import { useMedicalData } from '../context/MedicalDataContext';

interface BackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendSettingsModal: React.FC<BackendSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { backendUrl, setBackendUrl, backendStatus, checkBackendHealth } = useMedicalData();
  const [inputUrl, setInputUrl] = useState(backendUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    setBackendUrl(inputUrl);

    const isHealthy = await checkBackendHealth();
    setTesting(false);
    if (isHealthy) {
      setTestResult('Successfully connected to Flask Diabetic Retinopathy API!');
    } else {
      setTestResult('Backend unreachable at this URL. Running in Autonomous AI Mode (Offline-First Ready).');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="backend-modal-title"
    >
      <div className="w-full max-w-xl bg-[#131B2E] border-2 border-[#334155] rounded-3xl shadow-2xl overflow-hidden text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#334155] bg-[#0B0F19]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 text-[#1E54B7] border border-[#1E54B7]/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 id="backend-modal-title" className="text-xl font-bold">
                Backend Connection & API Settings
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                Configure Flask server or test connection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] border border-[#475569] transition-all"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleTestAndSave} className="p-6 space-y-5">
          {/* Current Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              backendStatus === 'connected'
                ? 'bg-[#E1FA4A]/10 border-[#E1FA4A]/30 text-[#E1FA4A]'
                : 'bg-sky-50 border-sky-300 text-[#22D3EE]'
            }`}
          >
            {backendStatus === 'connected' ? (
              <CheckCircle2 className="w-5 h-5 text-[#E1FA4A] shrink-0 mt-0.5" />
            ) : (
              <Radio className="w-5 h-5 text-[#1E54B7] shrink-0 mt-0.5 animate-pulse" />
            )}
            <div className="text-sm">
              <span className="font-bold block">
                {backendStatus === 'connected'
                  ? 'Connected to Live Flask Backend'
                  : 'Active Mode: Autonomous AI Medical Intelligence'}
              </span>
              <p className="text-xs opacity-90 mt-1">
                {backendStatus === 'connected'
                  ? `Routing live fundus requests to ${backendUrl}`
                  : 'The web dashboard is fully equipped with client-side vessel segmentation, Grad-CAM heatmaps, and Gemma-4 multi-lingual reports out of the box.'}
              </p>
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <label htmlFor="backend-url-input" className="block text-sm font-bold text-[#CBD5E1]">
              Flask Backend Base URL:
            </label>
            <input
              id="backend-url-input"
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://127.0.0.1:5000"
              className="w-full px-4 py-3 bg-[#0F172A] border border-white/10 rounded-xl text-white font-mono text-sm focus:border-[#1E54B7] focus:outline-none transition-colors"
            />
            <p className="text-xs text-[#94A3B8]">
              Standard endpoint: <code className="text-[#38BDF8]">http://127.0.0.1:5000</code> with routes{' '}
              <code className="text-[#1E54B7]">/analyze</code>, <code className="text-[#38BDF8]">/translate</code>,{' '}
              <code className="text-[#1E54B7]">/api/patients</code>.
            </p>
          </div>

          {testResult && (
            <div className="p-3 bg-[#0B0F19] rounded-xl border border-[#334155] text-xs sm:text-sm text-[#CBD5E1] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#1E54B7] shrink-0" />
              <span>{testResult}</span>
            </div>
          )}

          {/* API Endpoints Quick Reference */}
          <div className="p-4 bg-[#0B0F19] rounded-xl border border-[#334155] space-y-2">
            <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">
              Supported Endpoints:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-[#131B2E] p-2 rounded-lg border border-[#1E293B]">
                <span className="text-emerald-400 font-bold">GET</span> /api/dashboard
              </div>
              <div className="bg-[#131B2E] p-2 rounded-lg border border-[#1E293B]">
                <span className="text-[#1E54B7] font-bold">POST</span> /analyze
              </div>
              <div className="bg-[#131B2E] p-2 rounded-lg border border-[#1E293B]">
                <span className="text-[#1E54B7] font-bold">POST</span> /translate
              </div>
              <div className="bg-[#131B2E] p-2 rounded-lg border border-[#1E293B]">
                <span className="text-emerald-400 font-bold">GET</span> /api/patients
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white text-sm font-semibold border border-[#475569] transition-all"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={testing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1E54B7] hover:bg-[#0E7490] text-white font-semibold text-sm btn-clinical disabled:opacity-50"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {testing ? 'Testing Endpoint...' : 'Save & Test Connection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
