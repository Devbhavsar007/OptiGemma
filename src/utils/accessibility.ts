/**
 * Web Speech API and Low-Vision Accessibility Utilities
 * WCAG 2.2 AAA Compliant
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function speakText(
  text: string,
  options?: {
    lang?: string;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: () => void;
  }
): void {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis not supported in this browser.');
    options?.onError?.();
    return;
  }

  stopSpeaking();

  // Strip XML/HTML tags and normalize spaces for clean speech
  const cleanText = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/[%]/g, ' percent ')
    .replace(/[✓◐▲⬢⚠️]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = options?.lang || 'en-US';
  utterance.rate = options?.rate || 0.92; // Slightly measured rate for clear low-vision comprehension
  utterance.pitch = options?.pitch || 1.0;

  utterance.onstart = () => {
    options?.onStart?.();
  };

  utterance.onend = () => {
    currentUtterance = null;
    options?.onEnd?.();
  };

  utterance.onerror = (e) => {
    console.error('Speech synthesis error:', e);
    currentUtterance = null;
    options?.onError?.();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function generateDiagnosticSpeechScript(
  patientName: string,
  stageName: string,
  confidence: string,
  plainLanguage: string,
  urgency: string,
  followUp: string,
  topActions: string[]
): string {
  return `OptiGemma Clinical Screening Summary for ${patientName}. 
Diagnosis: ${stageName}, with an AI confidence rating of ${confidence}. 
Clinical Urgency: ${urgency}. 
Summary: ${plainLanguage}. 
Recommended follow up: ${followUp}. 
Key recommendations: ${topActions.slice(0, 3).join('. ')}. 
Please consult a licensed ophthalmologist to confirm this evaluation.`;
}
