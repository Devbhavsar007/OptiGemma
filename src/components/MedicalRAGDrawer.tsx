import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  X,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Loader2,
  FileText,
  Building,
} from 'lucide-react';
import { GroundedMedicalQueryResponse } from '../types';

interface MedicalRAGDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialStage?: number;
  initialHbA1c?: number;
}

const PRESET_QUERIES = [
  'When should Moderate NPDR be referred to an ophthalmologist?',
  'How does HbA1c >= 8.0% impact screening frequency?',
  'What is the emergency intervention protocol for Proliferative DR?',
  'What are the signs and referral timeline for Diabetic Macular Edema (DME)?',
  'What does WHO mandate regarding AI decision-support quality gates?',
];

export const MedicalRAGDrawer: React.FC<MedicalRAGDrawerProps> = ({
  isOpen,
  onClose,
  initialStage,
  initialHbA1c,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<GroundedMedicalQueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (textToSearch: string) => {
    if (!textToSearch.trim()) return;
    setQuery(textToSearch);
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/medical/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSearch,
          clinical_context: {
            stage: initialStage,
            hba1c: initialHbA1c,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to query clinical guidelines.');
      }

      setResponse(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error querying clinical knowledge base.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-white text-black h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
        {/* Drawer Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E1FA4A] text-black flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black font-sans">
                Clinical Guidelines Intelligence (RAG)
              </h2>
              <p className="text-xs text-gray-400">
                Grounded retrieval from AIOS, ICMR, WHO, and ICO protocols with citations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Suggestions */}
        <div className="p-6 border-b border-gray-200 bg-gray-50/70 space-y-4 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="relative"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask clinical guideline protocols (e.g. Stage 2 referral window)..."
              className="w-full pl-11 pr-24 py-3 rounded-2xl border border-gray-300 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#1E54B7] shadow-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-2 px-4 py-1.5 rounded-xl bg-[#1E54B7] hover:bg-[#153e8a] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Retrieve'}
            </button>
          </form>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold block">
              Suggested Clinical Queries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(q)}
                  className="px-3 py-1 rounded-full bg-white hover:bg-sky-50 border border-gray-200 hover:border-[#1E54B7] text-gray-700 hover:text-[#1E54B7] text-[11px] font-medium transition-all cursor-pointer text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-gray-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#1E54B7] mx-auto" />
              <p className="text-xs font-bold">Scanning curated peer-reviewed clinical guidelines...</p>
            </div>
          ) : response ? (
            <div className="space-y-5">
              {/* Evidence Status Header */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                  response.evidence_found
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {response.evidence_found ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {response.evidence_found ? 'Authoritative Evidence Grounded' : 'Out-of-Scope Fallback'}
                </span>
                {response.confidence > 0 && (
                  <span className="text-xs font-mono font-bold text-gray-500">
                    Relevance Score: {(response.confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Synthesized Answer */}
              <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                <div className="text-xs sm:text-sm font-sans text-gray-900 whitespace-pre-line leading-relaxed">
                  {response.answer}
                </div>
              </div>

              {/* Citations List */}
              {response.citations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase text-gray-600 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#1E54B7]" />
                    Referenced Clinical Sources ({response.citations.length})
                  </h3>

                  <div className="space-y-3">
                    {response.citations.map((cite) => (
                      <div
                        key={cite.id}
                        className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 hover:border-[#1E54B7] transition-all"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-[#1E54B7] bg-sky-100 px-2 py-0.5 rounded-full">
                            {cite.organization}
                          </span>
                          <span className="text-gray-400 font-mono text-[11px]">{cite.year}</span>
                        </div>

                        <h4 className="text-sm font-bold text-black">{cite.title}</h4>
                        <div className="text-xs text-gray-500 font-mono">
                          Section: <strong>{cite.section}</strong>
                        </div>

                        <div className="text-[11px] text-gray-600 italic bg-white p-2.5 rounded-xl border border-gray-200">
                          {cite.citation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400 space-y-3">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-600">No query submitted yet.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Type a clinical query or click any of the suggested prompts above to retrieve grounded guideline protocols.
              </p>
            </div>
          )}
        </div>

        {/* Footer Disclaimer */}
        <div className="p-4 bg-gray-100 border-t border-gray-200 text-[11px] text-gray-600 shrink-0">
          <strong>Clinical Decision Support Disclaimer:</strong> Grounded responses are direct excerpts and consensus syntheses from published clinical guidelines. Always apply independent ophthalmic judgment.
        </div>
      </div>
    </div>
  );
};
