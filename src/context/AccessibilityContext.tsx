import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { speakText, stopSpeaking, isSpeechSynthesisSupported } from '../utils/accessibility';

export type FontSizeScale = 'standard' | 'large' | 'xlarge';
export type AppTheme = 'dark' | 'light';

interface AccessibilityContextValue {
  theme: AppTheme;
  fontSize: FontSizeScale;
  highContrast: boolean;
  isSpeaking: boolean;
  toggleTheme: () => void;
  setFontSize: (size: FontSizeScale) => void;
  toggleContrast: () => void;
  speak: (text: string) => void;
  stopSpeech: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [fontSize, setFontSizeState] = useState<FontSizeScale>('standard');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Sync DOM classes
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');

    // Font Scale
    root.classList.remove('font-scale-standard', 'font-scale-large', 'font-scale-xlarge');
    root.classList.add(`font-scale-${fontSize}`);

    // Contrast
    if (highContrast) {
      root.classList.add('contrast-high');
    } else {
      root.classList.remove('contrast-high');
    }
  }, [theme, fontSize, highContrast]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setFontSize = useCallback((size: FontSizeScale) => {
    setFontSizeState(size);
  }, []);

  const toggleContrast = useCallback(() => {
    setHighContrast((prev) => !prev);
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSpeechSynthesisSupported()) return;
    setIsSpeaking(true);
    speakText(text, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stopSpeech = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        theme,
        fontSize,
        highContrast,
        isSpeaking,
        toggleTheme,
        setFontSize,
        toggleContrast,
        speak,
        stopSpeech,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
