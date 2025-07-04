import { useContext } from 'react';
import { LanguageContext } from '../contexts/LanguageContext';

export function useTranslation() {
  let hookIndex = 1;
  const hook = (desc: string) => {
    // eslint-disable-next-line no-console
    console.log(`[useTranslation] ${hookIndex++}. ${desc}`);
  };
  hook('useContext LanguageContext');
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return ctx;
}