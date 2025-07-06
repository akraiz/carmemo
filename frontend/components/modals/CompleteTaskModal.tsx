import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Typography } from '@mui/material';
import Button from '../shared/Button';
import CloseIcon from '@mui/icons-material/Close';
import { MaintenanceTask, Part, TaskStatus } from '../../types';
import { getISODateString } from '../../utils/dateUtils';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '../../hooks/useTranslation';
import { Tabs, Tab, Box, useTheme, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import { Icons } from '../Icon'; // Changed from import * as Icons to import { Icons }
import MenuItem from '@mui/material/MenuItem';

interface CompleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (task: Partial<MaintenanceTask>) => void;
  task: MaintenanceTask;
}

const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({ isOpen, onClose, onComplete, task }) => {
  const [cost, setCost] = useState(task.cost || '');
  const [notes, setNotes] = useState(task.notes || '');
  const [parts, setParts] = useState<Part[]>(task.parts || []);
  const [newPart, setNewPart] = useState<Part>({ name: '', quantity: 1 });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'parts'>('details');
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleAddPart = () => {
    if (!newPart.name.trim()) return;
    setParts([...parts, newPart]);
    setNewPart({ name: '', quantity: 1 });
  };

  const handleRemovePart = (idx: number) => {
    setParts(parts.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    onComplete({
      id: task.id,
      status: TaskStatus.Completed,
      completedDate: getISODateString(),
      cost: cost ? Number(cost) : undefined,
      notes: notes || undefined,
      parts: parts.length > 0 ? parts : undefined,
    });
    setIsSaving(false);
    onClose();
  };

  const handleSkipAndComplete = async () => {
    setIsSaving(true);
    onComplete({
      id: task.id,
      status: TaskStatus.Completed,
      completedDate: getISODateString(),
    });
    setIsSaving(false);
    onClose();
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'details' | 'parts') => {
    setActiveTab(newValue);
  };

  const renderDetailsTab = () => (
    <div className="space-y-4">
      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-white mb-2">{t('task.cost')}</label>
        <TextField
          id="cost"
          type="number"
          value={cost}
          onChange={e => setCost(e.target.value)}
          fullWidth
          variant="filled"
          InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
        />
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-white mb-2">{t('task.notes')}</label>
        <TextField
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          fullWidth
          multiline
          rows={3}
          variant="filled"
          InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
        />
      </div>
    </div>
  );

  const renderPartsTab = () => (
    <div className="space-y-4">
      <Typography variant="subtitle2" sx={{ mt: 0, mb: 2 }} className="text-white font-semibold uppercase tracking-wide">{t('completeTaskModal.partsUsed')}</Typography>
      {parts.map((part, idx) => (
        <div key={idx} className="flex items-center gap-3 mb-2">
          <Typography className="text-[#cfcfcf]">{part.name} (x{part.quantity})</Typography>
          <IconButton size="small" onClick={() => handleRemovePart(idx)} className="text-[#a0a0a0] hover:text-red-400">
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      ))}
      <div className="flex flex-col sm:flex-row gap-3 mt-4 items-end">
        <div className="flex-grow">
          <label htmlFor="newPartName" className="block text-sm font-medium text-white mb-2">{t('completeTaskModal.partName')}</label>
          <TextField
            id="newPartName"
            value={newPart.name}
            onChange={e => setNewPart({ ...newPart, name: e.target.value })}
            fullWidth
            size="small"
            variant="filled"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
        </div>
        <div>
          <label htmlFor="newPartQuantity" className="block text-sm font-medium text-white mb-2">{t('completeTaskModal.quantity')}</label>
          <TextField
            id="newPartQuantity"
            type="number"
            value={newPart.quantity}
            onChange={e => setNewPart({ ...newPart, quantity: Number(e.target.value) })}
            size="small"
            style={{ width: 80 }}
            variant="filled"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
        </div>
        <Button onClick={handleAddPart} variant="primary" size="small">{t('common.add')}</Button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50"
        initial="hidden" animate="visible" exit="exit"
      >
        <motion.div
          className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] p-4 pt-5 sm:p-6 md:p-8 rounded-t-2xl shadow-2xl w-full h-auto max-h-[90vh] flex flex-col border-t border-s border-e border-[#333333]"
          initial="hidden" animate="visible" exit="exit"
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <h2 className="text-xl md:text-2xl font-bold text-white font-heading uppercase tracking-wide text-start rtl:text-right">
              {t('completeTaskModal.title')}: {task.title}
            </h2>
            <Button
              onClick={onClose}
              variant="text"
              size="small"
              className="text-[#a0a0a0] hover:text-[#F7C843] p-1 md:p-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors"
              aria-label={t('common.closeModalAria')}
              sx={{ minWidth: 'auto' }}
            >
              <Icons.XMark className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
            </Button>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              aria-label={t('completeTaskModal.tabsAriaLabel')}
              sx={{
                '& .MuiTab-root': {
                  color: '#707070',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: { xs: '1rem', md: '1.1rem' },
                  '&.Mui-selected': {
                    color: '#F7C843',
                  },
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#F7C843',
                  height: 3,
                  borderRadius: 2,
                },
              }}
            >
              <Tab label={t('completeTaskModal.tabDetails')} value="details" />
              <Tab label={t('completeTaskModal.tabPartsUsed')} value="parts" />
            </Tabs>
          </Box>

          <div className="overflow-y-auto flex-grow pe-2 -me-2 scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#2a2a2a] pb-2">
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'parts' && renderPartsTab()}
          </div>

          <div className="mt-auto pt-4 md:pt-6 border-t border-[#333333] flex justify-end space-x-3 rtl:space-x-reverse flex-shrink-0">
            <Button onClick={handleSkipAndComplete} variant="outline" size="small" disabled={isSaving}>
              {t('completeTaskModal.skipAndComplete')}
            </Button>
            <Button onClick={handleSave} variant="primary" size="small" disabled={isSaving}>
              {t('common.save')}
            </Button>
          </div>
          <div className="pt-2 text-xs text-[#a0a0a0] text-center select-none">
            💡 {t('addTaskModal.saveTip', { ctrl: 'Ctrl', enter: 'Enter', esc: 'Esc' })}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 4, backgroundColor: theme.palette.background.paper, margin: 2, maxHeight: '80vh', minWidth: 360, display: 'flex', flexDirection: 'column' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
        <Typography variant="h6" className="text-white font-heading uppercase tracking-wide">
          {t('completeTaskModal.title')}: {task.title}
        </Typography>
        <IconButton onClick={onClose} size="large" sx={{ color: '#a0a0a0', '&:hover': { color: '#F7C843' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ flexGrow: 1, p: 0, pb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label={t('completeTaskModal.tabsAriaLabel')}
            sx={{
              '& .MuiTab-root': {
                color: '#707070',
                fontWeight: 700,
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '1rem',
                '&.Mui-selected': {
                  color: '#F7C843',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#F7C843',
                height: 3,
                borderRadius: 2,
              },
            }}
          >
            <Tab label={t('completeTaskModal.tabDetails')} value="details" />
            <Tab label={t('completeTaskModal.tabPartsUsed')} value="parts" />
          </Tabs>
        </Box>
        <div className="px-6 py-4 space-y-4">
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'parts' && renderPartsTab()}
        </div>
      </DialogContent>
      <DialogActions sx={{ pt: 2, pb: 2, px: 3, borderTop: '1px solid #333333', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={handleSkipAndComplete} variant="outline" size="small" disabled={isSaving}>
          {t('completeTaskModal.skipAndComplete')}
        </Button>
        <Button onClick={handleSave} variant="primary" size="small" disabled={isSaving}>
          {t('common.save')}
        </Button>
      </DialogActions>
      <div className="pt-2 text-xs text-[#a0a0a0] text-center select-none">
        💡 {t('addTaskModal.saveTip', { ctrl: 'Ctrl', enter: 'Enter', esc: 'Esc' })}
      </div>
    </Dialog>
  );
};

export default CompleteTaskModal; 