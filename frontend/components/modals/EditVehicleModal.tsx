import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vehicle, RecallInfo } from '../../types';
import { getISODateString } from '../../utils/dateUtils';
import { Icons } from '../Icon';
import { decodeVinMerged, validateVin } from '../../services/vinLookupService';
import { getRecallsByVinWithGemini, enrichBaselineSchedule } from '../../services/aiService'; 
import { useTranslation } from '../../hooks/useTranslation';
import useVehicleManager from '../../hooks/useVehicleManager';
import { Button, TextField, Tabs, Tab, Box } from '@mui/material';

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
  const { vehicles, setState } = useVehicleManager();

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? ({ ...prev, [name]: value }) : null);
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

  const handleSubmit = async () => {
    if (!formData.make || !formData.model || !formData.year) {
      alert(t('addVehicleModal.error.makeModelYearRequired'));
      setActiveTab('basic');
      return;
    }
    if (!formData.currentMileage) {
      alert(t('addVehicleModal.error.currentMileageRequired'));
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
    
    // Update vehicle first (this is the critical user action)
    onUpdateVehicle(finalVehicleData);
    
    // Show success message if recalls were updated, then close modal after a delay
    setTimeout(() => {
      onClose();
    }, 2000);

    // Trigger baseline enrichment in the background (non-blocking)
    enrichBaselineInBackground(finalVehicleData.make as string, finalVehicleData.model as string, finalVehicleData.year as number, finalVehicleData.id);
  };

  // Fix enrichment logic to only return Vehicle objects
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

  const renderBasicInfoTab = () => (
    <motion.div className="space-y-4 md:space-y-5" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label={t('vehicle.make')}
              name="make"
              id="make"
              value={formData.make}
              onChange={handleInputChange}
              required
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label={t('vehicle.model')}
              name="model"
              id="model"
              value={formData.model}
              onChange={handleInputChange}
              required
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label={t('vehicle.year')}
              name="year"
              id="year"
              type="number"
              value={formData.year}
              onChange={handleInputChange}
              required
              placeholder={t('common.yearPlaceholder')}
              variant="outlined"
              size="small"
            />
            <TextField
              fullWidth
              label={t('vehicle.nickname')}
              name="nickname"
              id="nickname"
              value={formData.nickname || ''}
              onChange={handleInputChange}
              variant="outlined"
              size="small"
            />
             <TextField
                fullWidth
                label={t('vehicle.currentMileage')}
                name="currentMileage"
                id="currentMileage"
                type="number"
                value={formData.currentMileage}
                onChange={handleInputChange}
                required
                variant="outlined"
                size="small"
            />
            <TextField
                fullWidth
                label={t('vehicle.purchaseDate')}
                name="purchaseDate"
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate || ''}
                onChange={handleInputChange}
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
            />
        </Box>
    </motion.div>
  );

  const renderSpecificationsTab = () => (
     <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 md:gap-x-6 gap-y-3 md:gap-y-5" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <TextField
            fullWidth
            label={t('vehicle.trim')}
            name="trim"
            id="trim"
            value={formData.trim || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
        <TextField
            fullWidth
            label={t('vehicle.driveType')}
            name="driveType"
            id="driveType"
            value={formData.driveType || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
        <TextField
            fullWidth
            label={t('vehicle.engineDisplacementL')}
            name="engineDisplacementL"
            id="engineDisplacementL"
            value={formData.engineDisplacementL || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
         <TextField
            fullWidth
            label={t('vehicle.cylinders')}
            name="cylinders"
            id="cylinders"
            type="number"
            value={formData.cylinders || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
        <TextField
            fullWidth
            label={t('vehicle.engineBrakeHP')}
            name="engineBrakeHP"
            id="engineBrakeHP"
            type="number"
            value={formData.engineBrakeHP || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
         <TextField
            fullWidth
            label={t('vehicle.transmissionStyle')}
            name="transmissionStyle"
            id="transmissionStyle"
            value={formData.transmissionStyle || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
        <TextField
            fullWidth
            label={t('vehicle.primaryFuelType')}
            name="primaryFuelType"
            id="primaryFuelType"
            value={formData.primaryFuelType || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
        <TextField
            fullWidth
            label={t('vehicle.bodyClass')}
            name="bodyClass"
            id="bodyClass"
            value={formData.bodyClass || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
         <TextField
            fullWidth
            label={t('vehicle.doors')}
            name="doors"
            id="doors"
            type="number"
            value={formData.doors || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
        <TextField
            fullWidth
            label={t('vehicle.manufacturerName')}
            name="manufacturerName"
            id="manufacturerName"
            value={formData.manufacturerName || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
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
            <h2 className="text-xl md:text-2xl font-bold text-white font-heading uppercase tracking-wide">{t('editVehicleModal.title')}: <span className="text-[#F7C843]">{vehicle.nickname || `${vehicle.make} ${vehicle.model}`}</span></h2>
            <Button onClick={onClose} className="text-[#a0a0a0] hover:text-[#F7C843] p-1 md:p-1.5 rounded-full hover:bg-[#2a2a2a]" aria-label={t('common.closeModalAria')} variant="outlined">
                <Icons.XMark className="w-5 h-5 md:w-6 md:w-6" strokeWidth={2.5}/>
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
                '&.Mui-selected': {
                  color: '#F7C843',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#F7C843',
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
                    animate={{ opacity: 1, x: 0, transition: { type: "spring", stiffness: 110, damping: 18 } }}
                    exit={{ opacity: 0, x: activeTab === 'basic' ? 15 : -15, transition: { duration: 0.15 } }}
                >
                    {activeTab === 'basic' && renderBasicInfoTab()}
                    {activeTab === 'specs' && renderSpecificationsTab()}
                </motion.div>
            </AnimatePresence>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-[#333333] flex justify-end space-x-3 rtl:space-x-reverse flex-shrink-0">
          <Button type="button" onClick={onClose} variant="outlined" color="inherit" size="small">
            {t('common.cancel')}
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            variant="contained"
            color="primary"
            size="small"
          >
            {t('common.saveChanges')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EditVehicleModal;
