import { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    console.warn('useTranslation must be used within LanguageProvider');
    return {
      t: (key: string, options?: any) => key,
      language: 'en',
      setLanguage: () => {},
      loadingTranslations: false,
    };
  }
  return context;
};