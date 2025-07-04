import React from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../Icon'; 
import { useTranslation } from '../../hooks/useTranslation';
import useSettingsManager from '../../hooks/useSettingsManager';
import { SessionInfo } from '../SessionInfo'; 

const SettingsView: React.FC = () => {
  const { t, setLanguage, language } = useTranslation();
  const { settings, setNotificationOptIn, requestNotificationPermission } = useSettingsManager();

  const handleOptInChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setNotificationOptIn(checked);
    if (checked && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        requestNotificationPermission();
      });
    }
  };

  const getPermissionStatusText = () => {
    switch (settings.notificationPermissionStatus) {
      case 'granted':
        return t('settings.permissionGranted');
      case 'denied':
        return t('settings.permissionDenied');
      default:
        return t('settings.permissionDefault');
    }
  };

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-2 md:px-0 space-y-4 md:space-y-6 bg-[#1c1c1c] rounded-lg shadow-xl border border-[#333333] h-full text-start"
      style={{ paddingBottom: '80px' }}
      initial={{ opacity: 0, scale: 0.98 }} // Subtle scale
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }} // Quicker, easeOut
    >
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 font-heading uppercase">
          {t('settingsView.titleActual')}
        </h2>

        <div className="bg-[#2a2a2a]/50 p-4 md:p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-[#F7C843] mb-3 font-heading">
            {t('settings.notifications.title')}
          </h3>
          <p className="text-sm text-[#cfcfcf] mb-4">
            {t('settings.notifications.description')}
          </p>

          <div className="flex items-center justify-between py-3 border-b border-[#404040]">
            <label htmlFor="notificationOptIn" className="text-sm font-medium text-white cursor-pointer">
              {t('settings.notifications.enableOptIn')}
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="notificationOptIn"
                checked={settings.notificationOptIn} 
                onChange={handleOptInChange}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-[#404040] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F7C843] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-[#a0a0a0] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F7C843]"></div>
            </label>
          </div>

          <div className="py-3 mt-2">
            <p className="text-sm text-[#cfcfcf] mb-1">{t('settings.notifications.permissionStatusLabel')}</p>
            <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold
                    ${settings.notificationPermissionStatus === 'granted' ? 'bg-green-500/80 text-green-100' : 
                    settings.notificationPermissionStatus === 'denied' ? 'bg-red-500/80 text-red-100' : 
                    'bg-[#404040]/80 text-[#cfcfcf]'}`}>
                    {getPermissionStatusText()}
                </span>
            </div>
            {settings.notificationPermissionStatus === 'denied' && (
              <div className="mt-2 text-xs text-red-400">
                {t('settings.notifications.deniedHelpText')}
              </div>
            )}
          </div>
        </div>
        
        {/* Language Switcher Section */}
        <div className="bg-[#2a2a2a]/50 p-4 md:p-6 rounded-lg shadow mt-6">
          <h3 className="text-lg font-semibold text-[#F7C843] mb-3 font-heading">
            {t('settings.language.title')}
          </h3>
          <p className="text-sm text-[#cfcfcf] mb-4">
            {t('settings.language.description')}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors border-2 ${language === 'en' ? 'bg-[#F7C843] text-black border-[#F7C843]' : 'bg-[#232323] text-[#cfcfcf] border-[#404040] hover:bg-[#333333]'}`}
              aria-label="Switch to English"
            >
              <Icons.Languages className="w-5 h-5" /> EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors border-2 ${language === 'ar' ? 'bg-[#F7C843] text-black border-[#F7C843]' : 'bg-[#232323] text-[#cfcfcf] border-[#404040] hover:bg-[#333333]'}`}
              aria-label="Switch to Arabic"
            >
              <Icons.Languages className="w-5 h-5" /> AR
            </button>
          </div>
        </div>

        {/* Session Information Section */}
        <div className="bg-[#2a2a2a]/50 p-4 md:p-6 rounded-lg shadow mt-6">
          <h3 className="text-lg font-semibold text-[#F7C843] mb-3 font-heading">
            Session Information
          </h3>
          <p className="text-sm text-[#cfcfcf] mb-4">
            Your session ID is used to keep your vehicle data separate from other users.
          </p>
          <SessionInfo />
        </div>
      </div>
    </motion.div>
  );
};

export default SettingsView;