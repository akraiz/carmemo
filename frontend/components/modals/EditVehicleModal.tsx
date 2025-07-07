import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vehicle, RecallInfo } from '../../types';
import { getISODateString } from '../../utils/dateUtils';
import { Icons } from '../Icon';
import { decodeVinMerged, validateVin } from '../../services/vinLookupService';
import { getRecallsByVinWithGemini, enrichBaselineSchedule } from '../../services/aiService'; 
import { useTranslation } from '../../hooks/useTranslation';
import useVehicleManager from '../../hooks/useVehicleManager';
import { TextField, Tabs, Tab, Box } from '@mui/material';
import Button from '../shared/Button';

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateVehicle: (vehicleData: Partial<Vehicle> & { id: string }) => void;
  vehicle: Vehicle;
}

type VehicleFormData = Omit<Vehicle, 'year' | 'currentMileage' | 'engineBrakeHP' | 'cylinders' | 'doors' | 'maintenanceSchedule'> & {
  year: string;
  currentMileage: string;
  engineBrakeHP?: string;
  cylinders?: string;
  doors?: string;
};

// Validation state interface
interface ValidationState {
  make: { isValid: boolean; message: string };
  model: { isValid: boolean; message: string };
  year: { isValid: boolean; message: string };
  currentMileage: { isValid: boolean; message: string };
}

const initialValidation: ValidationState = {
  make: { isValid: true, message: '' },
  model: { isValid: true, message: '' },
  year: { isValid: true, message: '' },
  currentMileage: { isValid: true, message: '' },
};

const bottomSheetVariants = {
  hidden: { y: "100%", opacity: 0.9 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: "spring" as const, stiffness: 130, damping: 22, duration: 0.35 } // Consistent with AddVehicleModal
  },
  exit: { 
    y: "100%", 
    opacity: 0.9, 
    transition: { duration: 0.25, ease: "anticipate" as const } // Consistent
  }
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeInOut" as const } }
};

const EditVehicleModal: React.FC<EditVehicleModalProps> = ({ isOpen, onClose, onUpdateVehicle, vehicle }) => {
  // Move all hooks to the top level
  const { t } = useTranslation();
  const [formData, setFormData] = useState<VehicleFormData | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'specs'>('basic');
  const [validation, setValidation] = useState<ValidationState>(initialValidation);
  const { vehicles, setState } = useVehicleManager();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Always call hooks before any return
  useEffect(() => {
    setFormData({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year ? vehicle.year.toString() : '',
      nickname: vehicle.nickname || '',
      vin: vehicle.vin || '',
      currentMileage: vehicle.currentMileage ? vehicle.currentMileage.toString() : '',
      purchaseDate: vehicle.purchaseDate || '',
      trim: vehicle.trim || '',
      driveType: vehicle.driveType || '',
      engineDisplacementL: vehicle.engineDisplacementL || '',
      cylinders: vehicle.cylinders ? vehicle.cylinders.toString() : '',
      engineBrakeHP: vehicle.engineBrakeHP ? vehicle.engineBrakeHP.toString() : '',
      transmissionStyle: vehicle.transmissionStyle || '',
      primaryFuelType: vehicle.primaryFuelType || '',
      bodyClass: vehicle.bodyClass || '',
      doors: vehicle.doors ? vehicle.doors.toString() : '',
      manufacturerName: vehicle.manufacturerName || '',
    });
  }, [vehicle]);

  // Early return after all hooks
  if (!isOpen || !formData) return null;

  const validateField = (name: keyof ValidationState, value: string) => {
    let message = '';
    let isValid = true;

    switch (name) {
      case 'make':
        if (!value.trim()) {
          message = t('addVehicleModal.error.makeModelYearRequired');
          isValid = false;
        }
        break;
      case 'model':
        if (!value.trim()) {
          message = t('addVehicleModal.error.makeModelYearRequired');
          isValid = false;
        }
        break;
      case 'year':
        if (!value.trim()) {
          message = t('addVehicleModal.error.makeModelYearRequired');
          isValid = false;
        }
        break;
      case 'currentMileage':
        if (!value.trim()) {
          message = t('addVehicleModal.error.currentMileageRequired');
          isValid = false;
        }
        break;
    }
    setValidation(prev => ({ ...prev, [name]: { isValid, message } }));
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? ({ ...prev, [name]: value }) : null);
    
    // Clear validation error when user starts typing
    if (validation[name as keyof ValidationState]) {
      setValidation(prev => ({
        ...prev,
        [name]: { isValid: true, message: '' }
      }));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setVehiclePhotoPreview(result);
        setFormData(prev => prev ? ({ ...prev, imageUrl: result }) : null);
      };
      reader.readAsDataURL(file);
    }
  };

  const enrichBaselineInBackground = async (make: string, model: string, year: number, vehicleId: string) => {
    try {
      console.log('[ENRICHMENT] Starting background enrichment for vehicle:', vehicleId);
      const baseline = await enrichBaselineSchedule(make, model, year);
      // Find the updated vehicle
      const updatedVehicle = vehicles.find(v => v.id === vehicleId);
      if (updatedVehicle) {
        // If enrichBaselineSchedule returns a schedule, merge it manually
        const mergedVehicle = { ...updatedVehicle, maintenanceSchedule: baseline };
        setState(prev => ({
          ...prev,
          vehicles: prev.vehicles.map(v => v.id === mergedVehicle.id ? mergedVehicle : v)
        }));
        console.log('[ENRICHMENT] Successfully enriched baseline for vehicle:', vehicleId);
      }
    } catch (err) {
      console.error('[ENRICHMENT] Failed to enrich baseline in background:', err);
    }
  };

  const handleSubmit = async () => {
    // Validate all required fields
    const makeValid = validateField('make', formData.make);
    const modelValid = validateField('model', formData.model);
    const yearValid = validateField('year', formData.year);
    const mileageValid = validateField('currentMileage', formData.currentMileage);

    if (!makeValid || !modelValid || !yearValid || !mileageValid) {
      setActiveTab('basic');
      return;
    }

    const finalVehicleData: Partial<Vehicle> & { id: string } = {
      ...formData,
      id: vehicle.id,
      year: parseInt(formData.year, 10),
      currentMileage: parseInt(formData.currentMileage, 10),
      engineBrakeHP: formData.engineBrakeHP ? parseInt(formData.engineBrakeHP, 10) : undefined,
      cylinders: formData.cylinders ? parseInt(formData.cylinders, 10) : undefined,
      doors: formData.doors ? parseInt(formData.doors, 10) : undefined,
    };
    setIsSubmitting(true);
    try {
      // Update vehicle first (this is the critical user action)
      await onUpdateVehicle(finalVehicleData);
      // Show success message if recalls were updated, then close modal after a delay
      setTimeout(() => {
        onClose();
      }, 2000);
      // Only trigger baseline enrichment if make, model, or year changed
      const makeChanged = formData.make !== vehicle.make;
      const modelChanged = formData.model !== vehicle.model;
      const yearChanged = parseInt(formData.year, 10) !== vehicle.year;
      if (makeChanged || modelChanged || yearChanged) {
        enrichBaselineInBackground(finalVehicleData.make as string, finalVehicleData.model as string, finalVehicleData.year as number, finalVehicleData.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBasicInfoTab = () => (
    <motion.div className="space-y-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}> {/* Changed md:space-y-5 to space-y-4 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <div> {/* Wrapper div for Make field */}
                <label htmlFor="make" className="block text-sm font-medium text-white mb-2">{t('vehicle.make')} *</label>
                <TextField
                fullWidth
                // label={t('vehicle.make')}
                name="make"
                id="make"
                value={formData.make}
                onChange={handleInputChange}
                onBlur={() => validateField('make', formData.make)}
                required
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
                />
                {!validation.make.isValid && <p className="text-sm text-red-400 mt-1">{validation.make.message}</p>}
            </div>
            <div> {/* Wrapper div for Model field */}
                <label htmlFor="model" className="block text-sm font-medium text-white mb-2">{t('vehicle.model')} *</label>
                <TextField
                fullWidth
                // label={t('vehicle.model')}
                name="model"
                id="model"
                value={formData.model}
                onChange={handleInputChange}
                onBlur={() => validateField('model', formData.model)}
                required
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
                />
                {!validation.model.isValid && <p className="text-sm text-red-400 mt-1">{validation.model.message}</p>}
            </div>
            <div> {/* Wrapper div for Year field */}
                <label htmlFor="year" className="block text-sm font-medium text-white mb-2">{t('vehicle.year')} *</label>
                <TextField
                fullWidth
                // label={t('vehicle.year')}
                name="year"
                id="year"
                type="number"
                value={formData.year}
                onChange={handleInputChange}
                onBlur={() => validateField('year', formData.year)}
                required
                placeholder={t('common.yearPlaceholder')}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
                />
                {!validation.year.isValid && <p className="text-sm text-red-400 mt-1">{validation.year.message}</p>}
            </div>
            <div> {/* Wrapper div for Nickname field */}
                <label htmlFor="nickname" className="block text-sm font-medium text-white mb-2">{t('vehicle.nickname')}</label>
                <TextField
                fullWidth
                // label={t('vehicle.nickname')}
                name="nickname"
                id="nickname"
                value={formData.nickname || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
                />
            </div>
             <div> {/* Wrapper div for Current Mileage field */}
               <label htmlFor="currentMileage" className="block text-sm font-medium text-white mb-2">{t('vehicle.currentMileage')} *</label>
               <TextField
                  fullWidth
                  // label={t('vehicle.currentMileage')}
                  name="currentMileage"
                  id="currentMileage"
                  type="number"
                  value={formData.currentMileage}
                  onChange={handleInputChange}
                  onBlur={() => validateField('currentMileage', formData.currentMileage)}
                  required
                  variant="filled"
                  size="small"
                  InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                  // Removed InputLabelProps as label is now external
              />
              {!validation.currentMileage.isValid && <p className="text-sm text-red-400 mt-1">{validation.currentMileage.message}</p>}
             </div>
            <div> {/* Wrapper div for Purchase Date field */}
                <label htmlFor="purchaseDate" className="block text-sm font-medium text-white mb-2">{t('vehicle.purchaseDate')}</label>
                <TextField
                    fullWidth
                    // label={t('vehicle.purchaseDate')}
                    name="purchaseDate"
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate || ''}
                    onChange={handleInputChange}
                    variant="filled"
                    size="small"
                    InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                    // Removed InputLabelProps as label is now external, InputLabelProps={{ shrink: true }}
                />
            </div>
        </Box>
    </motion.div>
  );

  const renderSpecificationsTab = () => (
     <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-4" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}> {/* Changed gap-y-3 to gap-y-4 */}
        <div> {/* Wrapper div for Trim field */}
            <label htmlFor="trim" className="block text-sm font-medium text-white mb-2">{t('vehicle.trim')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.trim')}
                name="trim"
                id="trim"
                value={formData.trim || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
        <div> {/* Wrapper div for Drive Type field */}
            <label htmlFor="driveType" className="block text-sm font-medium text-white mb-2">{t('vehicle.driveType')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.driveType')}
                name="driveType"
                id="driveType"
                value={formData.driveType || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
        <div> {/* Wrapper div for Engine Displacement field */}
            <label htmlFor="engineDisplacementL" className="block text-sm font-medium text-white mb-2">{t('vehicle.engineDisplacementL')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.engineDisplacementL')}
                name="engineDisplacementL"
                id="engineDisplacementL"
                value={formData.engineDisplacementL || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
         <div> {/* Wrapper div for Cylinders field */}
            <label htmlFor="cylinders" className="block text-sm font-medium text-white mb-2">{t('vehicle.cylinders')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.cylinders')}
                name="cylinders"
                id="cylinders"
                type="number"
                value={formData.cylinders || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
        <div> {/* Wrapper div for Engine Brake HP field */}
            <label htmlFor="engineBrakeHP" className="block text-sm font-medium text-white mb-2">{t('vehicle.engineBrakeHP')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.engineBrakeHP')}
                name="engineBrakeHP"
                id="engineBrakeHP"
                type="number"
                value={formData.engineBrakeHP || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
         <div> {/* Wrapper div for Transmission Style field */}
            <label htmlFor="transmissionStyle" className="block text-sm font-medium text-white mb-2">{t('vehicle.transmissionStyle')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.transmissionStyle')}
                name="transmissionStyle"
                id="transmissionStyle"
                value={formData.transmissionStyle || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
        <div> {/* Wrapper div for Primary Fuel Type field */}
            <label htmlFor="primaryFuelType" className="block text-sm font-medium text-white mb-2">{t('vehicle.primaryFuelType')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.primaryFuelType')}
                name="primaryFuelType"
                id="primaryFuelType"
                value={formData.primaryFuelType || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
        <div> {/* Wrapper div for Body Class field */}
            <label htmlFor="bodyClass" className="block text-sm font-medium text-white mb-2">{t('vehicle.bodyClass')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.bodyClass')}
                name="bodyClass"
                id="bodyClass"
                value={formData.bodyClass || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
         <div> {/* Wrapper div for Doors field */}
            <label htmlFor="doors" className="block text-sm font-medium text-white mb-2">{t('vehicle.doors')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.doors')}
                name="doors"
                id="doors"
                type="number"
                value={formData.doors || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
        <div> {/* Wrapper div for Manufacturer Name field */}
            <label htmlFor="manufacturerName" className="block text-sm font-medium text-white mb-2">{t('vehicle.manufacturerName')}</label>
            <TextField
                fullWidth
                // label={t('vehicle.manufacturerName')}
                name="manufacturerName"
                id="manufacturerName"
                value={formData.manufacturerName || ''}
                onChange={handleInputChange}
                variant="filled"
                size="small"
                InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
                // Removed InputLabelProps as label is now external
            />
        </div>
    </motion.div>
  );

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        variants={bottomSheetVariants} initial="hidden" animate="visible" exit="exit"
        className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] p-4 pt-5 sm:p-6 md:p-8 rounded-t-2xl shadow-2xl w-full h-[90vh] flex flex-col border-t border-s border-e border-[#333333]"
      >
        <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
            <h2 className="text-xl md:text-2xl font-bold text-white font-heading uppercase tracking-wide text-start rtl:text-right">{t('editVehicleModal.title')}: <span className="text-[#F7C843]">{vehicle.nickname || `${vehicle.make} ${vehicle.model}`}</span></h2>
            <Button onClick={onClose} className="text-[#a0a0a0] hover:text-[#F7C843] p-1 md:p-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors" aria-label={t('common.closeModalAria')} variant="text" size="small" sx={{ minWidth: 'auto' }}>
                <Icons.XMark className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5}/>
            </Button>
        </div>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            aria-label={t('editVehicleModal.tabsAriaLabel')}
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
            <Tab label={t('editVehicleModal.tabBasicInfo')} value="basic" />
            <Tab label={t('editVehicleModal.tabSpecifications')} value="specs" />
          </Tabs>
        </Box>

        <div className="overflow-y-auto flex-grow pe-2 -me-2 scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#2a2a2a] pb-2">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: activeTab === 'basic' ? -15 : 15 }}
                    animate={{ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 110, damping: 18 } }}
                    exit={{ opacity: 0, x: activeTab === 'basic' ? 15 : -15, transition: { duration: 0.15 } }}
                >
                    {activeTab === 'basic' && renderBasicInfoTab()}
                    {activeTab === 'specs' && renderSpecificationsTab()}
                </motion.div>
            </AnimatePresence>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-[#333333] flex justify-end space-x-3 rtl:space-x-reverse flex-shrink-0">
          <Button type="button" onClick={onClose} variant="outline" size="small">
            {t('common.cancel')}
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            variant="primary"
            size="small"
            disabled={isSubmitting}
          >
            {isSubmitting ? t('common.processing') : t('common.saveChanges')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EditVehicleModal;
