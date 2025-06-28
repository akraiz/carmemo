import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Language = 'en' | 'ar';
// Allow translations to be of mixed primitive types from JSON, but t() will stringify.
type RawTranslationValue = string | number | boolean; 
type Translations = Record<string, RawTranslationValue>;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Translations; // Represents current language's raw translations
  t: (key: string, options?: Record<string, string | number>) => string;
  loadingTranslations: boolean;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const loadedTranslationsCache: Record<Language, Translations | null> = {
  en: null,
  ar: null,
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const storedLang = localStorage.getItem('appLanguage') as Language | null;
    console.log('🔤 LanguageContext: Initial language from localStorage:', storedLang);
    return storedLang || 'en';
  });
  
  const [currentActiveTranslations, setCurrentActiveTranslations] = useState<Translations>({});
  const [loadingTranslations, setLoadingTranslations] = useState(true); // Start true for initial load

  const setLanguage = (lang: Language) => {
    console.log('🔤 LanguageContext: Setting language to:', lang);
    setLoadingTranslations(true); // Immediately set loading state
    localStorage.setItem('appLanguage', lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    const loadTranslations = async () => {
      console.log('🔤 LanguageContext: Loading translations for language:', language);

      // Load the requested language translations (whether it's English or another language)
      if (loadedTranslationsCache[language] === null) {
        console.log(`🔤 LanguageContext: Loading ${language} translations...`);
        try {
          const response = await fetch(`./locales/${language}.json`);
          if (!response.ok) throw new Error(`Failed to load ${language} translations`);
          const data = await response.json();
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            loadedTranslationsCache[language] = data;
            console.log(`🔤 LanguageContext: ${language} translations loaded successfully, keys:`, Object.keys(data).length);
          } else {
            console.warn(`🔤 LanguageContext: ${language} translations loaded but are empty or not an object.`);
            loadedTranslationsCache[language] = language === 'en' ? {} : null;
          }
        } catch (error) {
          console.error(`🔤 LanguageContext: Error loading translations for ${language}:`, error);
          loadedTranslationsCache[language] = language === 'en' ? {} : null;
        }
      }

      // Only load English as fallback if we're using a different language and English isn't loaded yet
      if (language !== 'en' && loadedTranslationsCache.en === null) {
        console.log('🔤 LanguageContext: Loading English translations as fallback...');
        try {
          const responseEn = await fetch('./locales/en.json');
          if (!responseEn.ok) throw new Error('Failed to load English translations');
          const enData = await responseEn.json();
          if (enData && typeof enData === 'object' && Object.keys(enData).length > 0) {
            loadedTranslationsCache.en = enData;
            console.log('🔤 LanguageContext: English translations loaded successfully, keys:', Object.keys(enData).length);
          } else {
            console.warn("🔤 LanguageContext: English translations loaded but are empty or not an object.");
            loadedTranslationsCache.en = {};
          }
        } catch (error) {
          console.error("🔤 LanguageContext: Critical error: Failed to load English translations:", error);
          loadedTranslationsCache.en = {};
        }
      }
      
      const targetLangData = loadedTranslationsCache[language];
      const englishData = language !== 'en' ? loadedTranslationsCache.en : null;

      console.log('🔤 LanguageContext: Target language data available:', !!targetLangData);
      if (language !== 'en') {
        console.log('🔤 LanguageContext: English fallback data available:', !!englishData);
      }

      // Prioritize target language, then English (if not English), then empty
      if (targetLangData && Object.keys(targetLangData).length > 0) {
        console.log(`🔤 LanguageContext: Using ${language} translations`);
        setCurrentActiveTranslations(targetLangData);
      } else if (language !== 'en' && englishData && Object.keys(englishData).length > 0) {
        console.log(`🔤 LanguageContext: Falling back to English translations`);
        setCurrentActiveTranslations(englishData);
        console.warn(`🔤 LanguageContext: Translations for "${language}" not found or empty, falling back to English.`);
      } else {
        console.error("🔤 LanguageContext: No valid translations available. UI will show keys.");
        setCurrentActiveTranslations({}); 
      }
      
      setLoadingTranslations(false);
      console.log('🔤 LanguageContext: Translation loading completed');
    };

    loadTranslations();
  }, [language]); // Effect runs when language state changes
  
  const t = useCallback((key: string, options?: Record<string, string | number>): string => {
    let rawTranslation: RawTranslationValue | undefined;

    rawTranslation = currentActiveTranslations[key];

    // Fallback to English if key not found in current language's translations
    if (rawTranslation === undefined && language !== 'en') {
        const englishTranslations = loadedTranslationsCache.en;
        if (englishTranslations && englishTranslations[key] !== undefined) {
            rawTranslation = englishTranslations[key];
            console.log(`🔤 LanguageContext: Key "${key}" not found in ${language}, using English fallback`);
        }
    }
    
    // Ensure textForProcessing is always a string.
    // If rawTranslation is null, undefined, or any other type, convert to string, or use key as fallback.
    const textForProcessing: string = 
        (rawTranslation === null || rawTranslation === undefined) 
        ? key // Use the key itself as a fallback if no translation (even English) is found
        : String(rawTranslation); // Convert numbers/booleans to string

    if (rawTranslation === undefined) {
      console.warn(`🔤 LanguageContext: Translation key "${key}" not found in any language`);
    }

    const applyOptions = (text: string, opts?: Record<string, string | number>): string => {
      if (!opts) return text;
      return Object.entries(opts).reduce((str, [optKey, optValue]) => {
        return str.replace(new RegExp(`{${optKey}}`, 'g'), String(optValue));
      }, text);
    };

    return applyOptions(textForProcessing, options);
  }, [currentActiveTranslations, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations: currentActiveTranslations, t, loadingTranslations }}>
      {children}
    </LanguageContext.Provider>
  );
};
