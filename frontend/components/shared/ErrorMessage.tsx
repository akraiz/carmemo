import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';
import { IconButton } from '@mui/material';

interface ErrorMessageProps {
  message: string;
  onClose: () => void;
  details?: string;
  type?: 'error' | 'warning' | 'info';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onClose, 
  details, 
  type = 'error',
  autoClose = false,
  autoCloseDelay = 5000
}) => {
  const { t } = useTranslation();

  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          icon: 'text-amber-500',
          iconBg: 'bg-amber-500/20'
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          icon: 'text-blue-500',
          iconBg: 'bg-blue-500/20'
        };
      default:
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          icon: 'text-red-500',
          iconBg: 'bg-red-500/20'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <Icons.AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Icons.InformationCircle className="w-5 h-5" />;
      default:
        return <Icons.XCircle className="w-5 h-5" />;
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 ${styles.bg} ${styles.border} border rounded-lg shadow-xl backdrop-blur-sm`}
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 p-2 rounded-full ${styles.iconBg} ${styles.icon}`}>
              {getIcon()}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-semibold ${type === 'error' ? 'text-red-200' : type === 'warning' ? 'text-amber-200' : 'text-blue-200'}`}>
                {t('common.error')}
              </h3>
              <p className="mt-1 text-sm text-[#cfcfcf]">
                {message}
              </p>
              {type === 'error' && (
                <p className="text-xs text-[#F7C843] mt-2">{t('common.errorHint')}</p>
              )}
              {type === 'warning' && (
                <p className="text-xs text-[#F7C843] mt-2">{t('common.warningHint')}</p>
              )}
              {details && (
                <details className="mt-2">
                  <summary className="text-xs text-[#a0a0a0] cursor-pointer hover:text-[#cfcfcf] transition-colors">
                    {t('common.showDetails')}
                  </summary>
                  <p className="mt-1 text-xs text-[#a0a0a0] whitespace-pre-wrap">
                    {details}
                  </p>
                </details>
              )}
            </div>
            <div className="ml-3 flex-shrink-0">
              <IconButton
                onClick={onClose}
                color="inherit"
                size="small"
                aria-label={t('common.closeErrorAria')}
              >
                <Icons.XMark className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
          {autoClose && (
            <div className="mt-3">
              <div className="w-full bg-black/20 rounded-full h-1">
                <motion.div
                  className="h-1 bg-[#F7C843] rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorMessage;
