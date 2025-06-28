import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '@mui/material';

interface FabButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  active?: boolean;
  position?: {
    bottom?: number;
    right?: number;
    left?: number;
    zIndex?: number;
  };
}

const FabButton = React.forwardRef<HTMLButtonElement, FabButtonProps>(
  ({ onClick, icon, ariaLabel, disabled = false, className = "", active = false, position = {} }, ref) => {
    const { t, language } = useTranslation();
    const isRTL = language === 'ar';

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!disabled) {
          onClick();
        }
      }
    };

    const defaultPosition = { bottom: 24, [isRTL ? 'left' : 'right']: 24, zIndex: 40 };
    const mergedPosition = { ...defaultPosition, ...position };

    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          position: 'fixed',
          bottom: mergedPosition.bottom,
          [isRTL ? 'left' : 'right']: mergedPosition[isRTL ? 'left' : 'right'],
          zIndex: mergedPosition.zIndex,
        }}
      >
        <Button
          ref={ref}
          onClick={onClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          variant="contained"
          startIcon={icon}
          aria-label={ariaLabel}
          aria-pressed={active}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            py: 1.5,
            px: 3,
            borderRadius: '28px',
            backgroundColor: '#F7C843',
            color: '#0f0f0f',
            boxShadow: '0 4px 10px rgba(247, 200, 67, 0.3)',
            '&:hover': {
              backgroundColor: '#F7C843',
              transform: 'scale(1.02)',
              boxShadow: '0 6px 15px rgba(247, 200, 67, 0.4)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed',
            },
            '&:focus': {
              outline: 'none',
              ring: 4,
              ringColor: 'rgba(247, 200, 67, 0.3)',
              ringOffset: 2,
              ringOffsetColor: '#0f0f0f',
            },
          }}
        >
          {t('task.newTask')}
        </Button>
      </motion.div>
    );
  }
);

FabButton.displayName = 'FabButton';

export default FabButton;
