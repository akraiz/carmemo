import React from 'react';
import { Icons } from './Icon';
import { useTranslation } from '../hooks/useTranslation';
import { Note } from 'phosphor-react';

type Language = 'en' | 'ar';

interface HeaderProps {
  onToggleSidebar: () => void;
  currentLanguage: Language;
  onChangeLanguage: (lang: Language) => void;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, currentLanguage, onChangeLanguage, children }) => {
  const { t } = useTranslation();

  const toggleLanguage = () => {
    console.log('🏷️ Header: Switching language to:', currentLanguage === 'en' ? 'ar' : 'en');
    onChangeLanguage(currentLanguage === 'en' ? 'ar' : 'en');
  };

  return (
    <header className="bg-[#1c1c1c] text-white p-3 md:p-4 shadow-2xl flex items-center justify-between sticky top-0 z-40 border-b border-[#333333]">
      <div className="flex items-center">
        <div className="flex items-center space-x-1 rtl:space-x-reverse">
          <button
            onClick={onToggleSidebar}
            className="p-2 me-2 text-[#FFD02F] hover:text-[#F7C843] transition-colors rounded-full hover:bg-[#2a2a2a] focus:outline-none"
            aria-label={t('header.toggleSidebarAria')}
            data-testid="note-menu"
            style={{ minWidth: 32, marginRight: currentLanguage === 'ar' ? 0 : 4, marginLeft: currentLanguage === 'ar' ? 4 : 0 }}
          >
            <Note
              size={32}
              weight="fill"
              color="currentColor"
            />
          </button>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight font-heading uppercase text-white">{t('app.name')}</h1>
        </div>
      </div>
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <Icons.UserCircle className="w-6 h-6 md:w-7 md:h-7 text-[#a0a0a0] hover:text-[#F7C843] transition-colors cursor-pointer" strokeWidth={1.5}/>
        {children}
      </div>
    </header>
  );
};

export default Header; 