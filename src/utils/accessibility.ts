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

export type SpeechLanguage = 'en' | 'hi' | 'gu';

const STAGE_TRANSLATIONS: Record<string, { hi: string; gu: string }> = {
  'No DR': {
    hi: 'डायबिटिक रेटिनोपैथी का कोई लक्षण नहीं (स्वस्थ रेटिना)',
    gu: 'ડાયાબિટીક રેટિનોપેથીના કોઈ લક્ષણ નથી (તંદુરસ્ત રેટિના)',
  },
  'Mild NPDR': {
    hi: 'हल्का गैर-प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी (प्रारंभिक अवस्था)',
    gu: 'હળવો બિન-પ્રોલિફેરેટીવ ડાયાબિટીક રેટિનોપેથી (શરૂઆતનો તબક્કો)',
  },
  'Moderate NPDR': {
    hi: 'मध्यम गैर-प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी',
    gu: 'મધ્યમ બિન-પ્રોલિફેરેટીવ ડાયાબિટીક રેટિનોપેથી',
  },
  'Severe NPDR': {
    hi: 'गंभीर गैर-प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी',
    gu: 'ગંભીર બિન-પ્રોલિફેરેટીવ ડાયાબિટીક રેટિનોપેથી',
  },
  'PDR': {
    hi: 'प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी (उन्नत जोखिम अवस्था)',
    gu: 'પ્રોલિફેરેટીવ ડાયાબિટીક રેટિનોપેથી (અતિ જોખમી તબક્કો)',
  },
  'Proliferative DR': {
    hi: 'प्रोलिफेरेटिव डायबिटिक रेटिनोपैथी (उन्नत जोखिम अवस्था)',
    gu: 'પ્રોલિફેરેટીવ ડાયાબિટીક રેટિનોપેથી (અતિ જોખમી તબક્કો)',
  },
};

const URGENCY_TRANSLATIONS: Record<string, { hi: string; gu: string }> = {
  'URGENT': { hi: 'अति आवश्यक त्वरित परामर्श', gu: 'તાત્કાલિક નિષ્ણાત સલાહ જરૂરી' },
  'EARLY': { hi: 'शीघ्र परामर्श आवश्यक', gu: 'વહેલી તકે ડૉક્ટરની મુલાકાત' },
  'ROUTINE': { hi: 'नियमित वार्षिक जांच', gu: 'નિયમિત વાર્ષિક તપાસ' },
};

export function generateLocalizedDiagnosticSpeechScript(
  patientName: string,
  stageName: string,
  confidence: string,
  plainLanguage: string,
  urgency: string,
  followUp: string,
  topActions: string[],
  language: SpeechLanguage = 'en'
): { script: string; langCode: string } {
  const normUrgency = urgency.toUpperCase();

  if (language === 'hi') {
    const locStage = STAGE_TRANSLATIONS[stageName]?.hi || stageName;
    const locUrgency = URGENCY_TRANSLATIONS[normUrgency]?.hi || urgency;
    const script = `दृष्टि एआई क्लिनिकल स्क्रीनिंग सारांश, मरीज ${patientName} के लिए। जांच का परिणाम: ${locStage}, एआई विश्वसनीयता रेटिंग ${confidence} प्रतिशत। क्लिनिकल प्राथमिकता: ${locUrgency}। अनुशंसित अगली जांच: ${followUp}। मुख्य सलाह: नियमित रक्त शर्करा जांचें और निर्धारित दवाएं लें। कृपया अंतिम पुष्टि के लिए नेत्र रोग विशेषज्ञ से अवश्य मिलें।`;
    return { script, langCode: 'hi-IN' };
  }

  if (language === 'gu') {
    const locStage = STAGE_TRANSLATIONS[stageName]?.gu || stageName;
    const locUrgency = URGENCY_TRANSLATIONS[normUrgency]?.gu || urgency;
    const script = `દૃષ્ટિ એઆઈ ક્લિનિકલ સ્ક્રીનિંગ સારાંશ, દર્દી ${patientName} માટે. તપાસનું પરિણામ: ${locStage}, એઆઈ વિશ્વસનીયતા રેટિંગ ${confidence} ટકા. સારવાર અગ્રતા: ${locUrgency}. આગામી તપાસ ભલામણ: ${followUp}. મુખ્ય ભલામણ: ડાયાબિટીસ અને બ્લડ સુગર નિયંત્રણમાં રાખો. કૃપા કરીને આ મૂલ્યાંકનની પુષ્ટિ માટે નેત્ર નિષ્ણાતની મુલાકાત લો.`;
    return { script, langCode: 'gu-IN' };
  }

  // Default: English
  const script = `DrishtiAI Clinical Screening Summary for ${patientName}. 
Diagnosis: ${stageName}, with an AI confidence rating of ${confidence} percent. 
Clinical Urgency: ${urgency}. 
Summary: ${plainLanguage}. 
Recommended follow up: ${followUp}. 
Key recommendations: ${topActions.slice(0, 3).join('. ')}. 
Please consult a licensed ophthalmologist to confirm this evaluation.`;

  return { script, langCode: 'en-US' };
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
  return generateLocalizedDiagnosticSpeechScript(
    patientName,
    stageName,
    confidence,
    plainLanguage,
    urgency,
    followUp,
    topActions,
    'en'
  ).script;
}
