import React, { useState } from 'react';
import {
  Eye,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Contrast,
  Type,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useAccessibility, FontSizeScale } from '../context/AccessibilityContext';
import { useMedicalData } from '../context/MedicalDataContext';
import { BackendSettingsModal } from './BackendSettingsModal';

export const AccessibilityToolbar: React.FC = () => {
  const {
    theme,
    fontSize,
    highContrast,
    isSpeaking,
    toggleTheme,
    setFontSize,
    toggleContrast,
    speak,
    stopSpeech,
  } = useAccessibility();

  const { activeView, activePatient, activeScan, dashboardStats, backendStatus } = useMedicalData();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleReadScreen = () => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    let speechText = '';
    if (activeView === 'dashboard') {
      speechText = `OptiGemma Clinical Dashboard. Total patients screened: ${dashboardStats.total_patients}. High risk cases requiring immediate attention: ${dashboardStats.high_risk_cases}. Treatment referrals needed: ${dashboardStats.referrals_needed}. AI Diagnostic Accuracy: ${dashboardStats.diagnostic_accuracy} percent. To begin screening, select Start New Scan.`;
    } else if (activeView === 'new-scan') {
      if (activeScan) {
        speechText = `Retinal Analysis Results for ${activeScan.patient_name || 'Patient'}. Diagnosis: ${activeScan.detection.stage_name}. Confidence: ${activeScan.detection.confidence} percent. Clinical Urgency: ${activeScan.report.urgency}. ${activeScan.report.current_diagnosis.plain_language} Recommended follow up: ${activeScan.report.recommended_follow_up}.`;
      } else {
        speechText = `OptiGemma New Retinal Scan Screening Workflow. Step 1: Assign a patient. Step 2: Upload or drag and drop a retinal fundus image or choose a preset case. Then select Run Full AI Analysis.`;
      }
    } else if (activeView === 'batch-screening') {
      speechText = `OptiGemma Mobile Camp Batch Screening Queue. Manage multiple patient retinal scans simultaneously with real-time queue processing.`;
    } else if (activeView === 'patients') {
      speechText = `Patient Records Directory. Search and filter patients by Diabetic Retinopathy severity and review longitudinal HbA1c histories.`;
    } else if (activeView === 'patient-detail' && activePatient) {
      speechText = `Patient Profile for ${activePatient.name}. Age ${activePatient.age}. Diabetes duration: ${activePatient.diabetes_duration} years. Latest fasting sugar: ${activePatient.sugar_level} mg per dL. HbA1c: ${activePatient.hba1c} percent. Past retinal scans on record: ${activePatient.scans?.length || 0}.`;
    } else {
      speechText = `Welcome to OptiGemma, an accessible medical AI dashboard for Diabetic Retinopathy screening.`;
    }

    speak(speechText);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full min-h-[72px] bg-[#131B2E] border-b-2 border-[#334155] text-[#F8FAFC] flex items-center shadow-md transition-colors"
        role="region"
        aria-label="Accessibility and Primary Toolbar"
      >
        <div className="w-full px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Suite Subtitle */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#38BDF8] rounded-full flex items-center justify-center shadow-md shrink-0">
              <Eye className="w-6 h-6 text-[#0B0F19] stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
                  OptiGemma
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/20 text-[#38BDF8] border border-sky-500/30">
                  <Sparkles className="w-3 h-3" />
                  Gemma-4 AI
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#94A3B8] font-semibold">
                Diabetic Retinopathy Clinical Suite
              </span>
            </div>
          </div>

          {/* Right-Aligned Accessibility & Mode Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Font Scale Switcher: [A-] [STD] [A+] */}
            <div
              className="flex bg-[#0B0F19] rounded-lg border-2 border-[#334155] p-1"
              role="group"
              aria-label="Font size scaling"
            >
              <button
                onClick={() => setFontSize('standard')}
                className={`px-3 sm:px-4 py-1 text-sm font-bold border-r border-[#334155] transition-all ${
                  fontSize === 'standard'
                    ? 'bg-[#38BDF8] text-[#0B0F19] rounded-md'
                    : 'text-[#CBD5E1] hover:bg-[#38BDF8] hover:text-[#0B0F19]'
                }`}
                aria-pressed={fontSize === 'standard'}
                title="Standard Text Size"
              >
                STD
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-3 sm:px-4 py-1 text-sm font-bold border-r border-[#334155] transition-all ${
                  fontSize === 'large'
                    ? 'bg-[#38BDF8] text-[#0B0F19] rounded-md'
                    : 'text-[#CBD5E1] hover:bg-[#38BDF8] hover:text-[#0B0F19]'
                }`}
                aria-pressed={fontSize === 'large'}
                title="Large Text Size (A+)"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-3 sm:px-4 py-1 text-sm font-bold transition-all ${
                  fontSize === 'xlarge'
                    ? 'bg-[#38BDF8] text-[#0B0F19] rounded-md'
                    : 'text-[#CBD5E1] hover:bg-[#38BDF8] hover:text-[#0B0F19]'
                }`}
                aria-pressed={fontSize === 'xlarge'}
                title="Extra Large Text Size (A++)"
              >
                A++
              </button>
            </div>

            {/* High Contrast Mode Toggle */}
            <button
              onClick={toggleContrast}
              className={`flex items-center gap-2 px-3 sm:px-4 h-11 sm:h-12 border-2 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all ${
                highContrast
                  ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                  : 'bg-[#0F172A] border-[#334155] text-[#CBD5E1] hover:border-[#38BDF8]'
              }`}
              aria-pressed={highContrast}
              title="Toggle High Contrast Mode"
            >
              <Contrast className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">CONTRAST</span>
            </button>

            {/* Dark / Light Mode Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 sm:px-4 h-11 sm:h-12 bg-[#0F172A] border-2 border-[#334155] rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider text-[#CBD5E1] hover:border-[#38BDF8] transition-all"
              aria-label={`Switch to ${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-4 h-4 text-[#38BDF8]" />
                  <span>DARK</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>LIGHT</span>
                </>
              )}
            </button>

            {/* Read Screen Speech Synthesizer Button */}
            <button
              onClick={handleReadScreen}
              className={`flex items-center gap-2 px-4 sm:px-5 h-11 sm:h-12 rounded-lg font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all ${
                isSpeaking
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-[#38BDF8] text-[#0B0F19] hover:bg-[#0284C7] hover:text-white'
              }`}
              aria-label={isSpeaking ? 'Stop reading screen' : 'Read screen aloud'}
              title="Screen reader text-to-speech"
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>STOP</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>READ SCREEN</span>
                </>
              )}
            </button>

            {/* Settings Opener */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border-2 border-[#334155] hover:border-[#38BDF8] text-[#CBD5E1] transition-all"
              title="Backend & AI Settings"
              aria-label="Backend Connection Settings"
            >
              <Settings className="w-4 h-4 text-[#94A3B8]" />
            </button>
          </div>
        </div>
      </header>

      {/* Backend Settings Modal */}
      <BackendSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
