import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { Icons } from '../Icon';
import { Button } from '@mui/material';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  onUndo?: () => void;
  showUndo?: boolean;
  undoText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  type = 'danger',
  onConfirm,
  onCancel,
  onUndo,
  showUndo = false,
  undoText
}) => {
  const { t, language } = useTranslation();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  // Handle outside click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <Icons.AlertTriangle className="w-6 h-6 text-red-400" />,
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          border: 'border-red-500/20',
          bg: 'bg-red-500/10'
        };
      case 'warning':
        return {
          icon: <Icons.AlertTriangle className="w-6 h-6 text-yellow-400" />,
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          border: 'border-yellow-500/20',
          bg: 'bg-yellow-500/10'
        };
      case 'info':
        return {
          icon: <Icons.InformationCircle className="w-6 h-6 text-blue-400" />,
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          border: 'border-blue-500/20',
          bg: 'bg-blue-500/10'
        };
      default:
        return {
          icon: <Icons.AlertTriangle className="w-6 h-6 text-red-400" />,
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          border: 'border-red-500/20',
          bg: 'bg-red-500/10'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className={`relative max-w-md w-full mx-4 bg-[#1c1c1c] rounded-lg shadow-2xl border ${styles.border} ${styles.bg}`}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 mr-3">
                  {styles.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white font-heading">
                    {title}
                  </h3>
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <p className="text-sm text-[#cfcfcf] leading-relaxed">
                  {message}
                </p>
                {showUndo && (
                  <p className="text-xs text-[#F7C843] mt-2">{t('common.undoHint')}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
                {showUndo && onUndo && (
                  <Button
                    onClick={onUndo}
                    variant="outlined"
                    color="primary"
                    size="small"
                    sx={{ flex: 1, fontWeight: 'bold' }}
                  >
                    {undoText || t('common.undo')}
                  </Button>
                )}
                <Button
                  onClick={onCancel}
                  variant="outlined"
                  color="inherit"
                  size="small"
                  sx={{ flex: 1 }}
                >
                  {cancelText || t('common.cancel')}
                </Button>
                <Button
                  onClick={onConfirm}
                  variant="contained"
                  color={type === 'danger' ? 'error' : type === 'warning' ? 'warning' : 'primary'}
                  size="small"
                  sx={{ flex: 1, fontWeight: 'bold' }}
                >
                  {confirmText || t('common.confirm')}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog; 