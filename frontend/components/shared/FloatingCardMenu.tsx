// FloatingCardMenu.tsx - Floating action card for desktop FAB menu
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../Icon';
import { Button } from '@mui/material';
import { useMediaQuery, useTheme } from '@mui/material';

interface FloatingCardMenuProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  onScan: () => void;
  onAdd: () => void;
  onLogPast: () => void;
}

const FloatingCardMenu: React.FC<FloatingCardMenuProps> = ({ anchorRef, open, onClose, onScan, onAdd, onLogPast }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Position the card above the FAB
  const [position, setPosition] = React.useState<{bottom: number, right: number}>({ bottom: 100, right: 32 });
  
  // Calculate position once when opening
  useEffect(() => {
    if (open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        bottom: window.innerHeight - rect.top + 12, // 12px gap
        right: window.innerWidth - rect.right + 0, // align right
      });
    }
  }, [open]); // Only recalculate when opening

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Responsive width: wider on mobile, standard on desktop
  const cardWidth = isMobile ? Math.min(380, window.innerWidth - 32) : 380;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      style={{
        position: 'fixed',
        zIndex: 60,
        bottom: position.bottom,
        right: position.right,
        width: cardWidth,
        maxWidth: 'calc(100vw - 32px)', // Ensure it doesn't overflow screen
      }}
      className="bg-[#1c1c1c] border border-[#333333] rounded-2xl shadow-lg p-4 flex flex-col gap-3"
    >
      <Button
        variant="contained"
        fullWidth
        size="large"
        startIcon={<Icons.Camera className="w-6 h-6 md:w-7 md:h-7 text-[#0f0f0f]" />}
        onClick={onScan}
        sx={{
          justifyContent: 'flex-start',
          textAlign: 'left',
          py: isMobile ? 2.5 : 3,
          px: isMobile ? 3 : 4,
          borderRadius: 4,
          backgroundColor: '#FFD02F',
          '&:hover': {
            backgroundColor: '#FFD02F',
          },
          color: '#0f0f0f',
          fontSize: isMobile ? '0.875rem' : '1rem',
          fontWeight: 500,
          textTransform: 'none',
          gap: isMobile ? 2 : 3,
        }}
      >
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="font-medium">Add task automatically from your receipt.</span>
        </div>
      </Button>
      <Button
        variant="contained"
        fullWidth
        size="large"
        startIcon={<Icons.PlusCircle className="w-6 h-6 md:w-7 md:h-7 text-[#0f0f0f]" />}
        onClick={onAdd}
        sx={{
          justifyContent: 'flex-start',
          textAlign: 'left',
          py: isMobile ? 2.5 : 3,
          px: isMobile ? 3 : 4,
          borderRadius: 4,
          backgroundColor: '#FFD02F',
          '&:hover': {
            backgroundColor: '#FFD02F',
          },
          color: '#0f0f0f',
          fontSize: isMobile ? '0.875rem' : '1rem',
          fontWeight: 500,
          textTransform: 'none',
          gap: isMobile ? 2 : 3,
        }}
      >
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="font-medium">Create a new maintenance task.</span>
        </div>
      </Button>
      <Button
        variant="contained"
        fullWidth
        size="large"
        startIcon={<Icons.Calendar className="w-6 h-6 md:w-7 md:h-7 text-[#0f0f0f]" />}
        onClick={onLogPast}
        sx={{
          justifyContent: 'flex-start',
          textAlign: 'left',
          py: isMobile ? 2.5 : 3,
          px: isMobile ? 3 : 4,
          borderRadius: 4,
          backgroundColor: '#FFD02F',
          '&:hover': {
            backgroundColor: '#FFD02F',
          },
          color: '#0f0f0f',
          fontSize: isMobile ? '0.875rem' : '1rem',
          fontWeight: 500,
          textTransform: 'none',
          gap: isMobile ? 2 : 3,
        }}
      >
        <div className="flex flex-col items-start min-w-0 flex-1">
          <span className="font-medium">For work done outside the app.</span>
        </div>
      </Button>
      <Button
        variant="text"
        color="inherit"
        fullWidth
        size="large"
        onClick={onClose}
        sx={{ 
          mt: 2, 
          textAlign: 'center',
          color: '#cfcfcf',
          fontSize: isMobile ? '0.875rem' : '1rem',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)'
          }
        }}
      >
        Cancel
      </Button>
    </motion.div>
  );
};

export default FloatingCardMenu; 