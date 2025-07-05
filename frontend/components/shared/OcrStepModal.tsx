import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';
import { MaintenanceTask, TaskCategory } from '../../types';
import { CANONICAL_TASK_CATEGORIES } from '../../constants';
import { Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface OcrStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<MaintenanceTask> & { imageUrl: string }) => void;
}

const OcrStepModal: React.FC<OcrStepModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [fields, setFields] = useState({
    title: '',
    completedDate: '',
    cost: '',
    category: TaskCategory.OilChange as TaskCategory,
    notes: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setImage(null);
      setFields({ title: '', completedDate: '', cost: '', category: TaskCategory.OilChange, notes: '' });
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        // Simulate OCR extraction (placeholder)
        setTimeout(() => {
          setFields({
            title: 'Oil Change',
            completedDate: new Date().toISOString().slice(0, 10),
            cost: '120',
            category: TaskCategory.OilChange,
            notes: 'Service at QuickLube',
          });
          setStep(2);
        }, 1200);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any) => {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  const handleConfirm = () => {
    if (image) {
      onSave({
        ...fields,
        cost: fields.cost && !isNaN(Number(fields.cost)) ? Number(fields.cost) : undefined,
        category: fields.category || TaskCategory.Other,
        completedDate: fields.completedDate || new Date().toISOString().slice(0, 10),
        imageUrl: image
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="bg-[#1c1c1c] rounded-xl p-6 shadow-2xl text-white max-w-sm w-full">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('Scan Service Receipt')}</h2>
          <button className="text-[#a0a0a0]" onClick={onClose}><Icons.XMark className="w-6 h-6" /></button>
        </div>
        {step === 1 && (
          <div className="flex flex-col items-center">
            <Icons.Camera className="w-14 h-14 text-[#F7C843] mb-4" />
            <p className="mb-3">{t('Upload or take a photo of your service receipt')}</p>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="mb-4"
            />
            {image && <img src={image} alt="Preview" className="rounded-lg border border-[#333333] mb-3 max-h-40" />}
            <Button 
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => fileInputRef.current?.click()}
              sx={{ fontWeight: 'bold' }}
            >
              {t('Select Image')}
            </Button>
          </div>
        )}
        {step === 2 && (
          <div>
            <p className="mb-2 text-[#F7C843] font-medium">{t('Preview & Extracted Info')}</p>
            {image && <img src={image} alt="Preview" className="rounded-lg border border-[#333333] mb-3 max-h-40 mx-auto" />}
            <div className="space-y-2">
              <TextField
                fullWidth
                label={t('Task Title')}
                name="title"
                value={fields.title}
                onChange={handleEditField}
                variant="outlined"
                size="small"
              />
              <TextField
                fullWidth
                label={t('Date')}
                name="completedDate"
                type="date"
                value={fields.completedDate}
                onChange={handleEditField}
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label={t('Cost')}
                name="cost"
                type="number"
                value={fields.cost}
                onChange={handleEditField}
                variant="outlined"
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>{t('Category')}</InputLabel>
                <Select
                  name="category"
                  value={fields.category}
                  onChange={handleEditField}
                  label={t('Category')}
                >
                  {CANONICAL_TASK_CATEGORIES.map(cat => (
                    <MenuItem key={cat} value={cat}>
                      {t(`taskCategories.${(cat || '').replace(/\s+/g, '')}` as any) || cat || 'Other'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label={t('Notes')}
                name="notes"
                value={fields.notes}
                onChange={handleEditField}
                multiline
                rows={3}
                variant="outlined"
                size="small"
              />
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outlined" color="inherit" size="small" onClick={handleBack}>
                {t('Back')}
              </Button>
              <Button variant="contained" color="primary" size="small" onClick={handleNext}>
                {t('Next')}
              </Button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <p className="mb-2 text-[#F7C843] font-medium">{t('Confirm & Save')}</p>
            {image && <img src={image} alt="Preview" className="rounded-lg border border-[#333333] mb-3 max-h-40 mx-auto" />}
            <div className="space-y-2 text-sm">
              <p><strong>{t('Task Title')}:</strong> {fields.title}</p>
              <p><strong>{t('Date')}:</strong> {fields.completedDate}</p>
              <p><strong>{t('Cost')}:</strong> {fields.cost ? `$${fields.cost}` : t('Not specified')}</p>
              <p><strong>{t('Category')}:</strong> {t(`taskCategories.${(fields.category || '').replace(/\s+/g, '')}` as any) || fields.category || 'Other'}</p>
              {fields.notes && <p><strong>{t('Notes')}:</strong> {fields.notes}</p>}
            </div>
            <div className="flex justify-between mt-4">
              <Button variant="outlined" color="inherit" size="small" onClick={handleBack}>
                {t('Back')}
              </Button>
              <Button variant="contained" color="success" size="small" onClick={handleConfirm}>
                {t('Confirm & Save')}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OcrStepModal; 