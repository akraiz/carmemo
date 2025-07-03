import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vehicle, MaintenanceTask, TaskCategory, TaskStatus, RecallInfo } from '../../types';
import { COMMON_MAINTENANCE_PRESETS, MaintenanceTaskPreset } from '../../constants';
import { getISODateString, formatDate } from '../../utils/dateUtils';
import { decodeVinWithApiNinjas, decodeVinWithGeminiBackend, mergeVinResults, validateVin } from '../../services/vinLookupService';
import { getRecallsByVinWithGemini, enrichBaselineSchedule } from '../../services/aiService';
import { Icons, IconMap, DefaultTaskIcon } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';
import useVehicleManager, { mergeBaselineSchedule } from '../../hooks/useVehicleManager';
import { Button, TextField, Box } from '@mui/material';
import { buildApiUrl } from '../../config/api';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (vehicleData: Omit<Vehicle, 'id' | 'maintenanceSchedule'> & { initialMaintenanceTasks?: MaintenanceTask[], recalls?: RecallInfo[] }) => Promise<string | undefined>;
  onUploadVehicleImage?: (vehicleId: string, file: File) => Promise<void>;
}

interface WizardData {
  vin: string;
  make: string;
  model: string;
  year: string;
  nickname: string;
  currentMileage: string;
  purchaseDate: string;
  imageUrl?: string;
  initialMaintenanceTasks: Array<Partial<MaintenanceTask> & { tempId: string; isCustom?: boolean; titleKey?: string }>;
  recalls?: RecallInfo[]; 
  trim?: string;
  driveType?: string;
  primaryFuelType?: string;
  secondaryFuelType?: string;
  engineBrakeHP?: string;
  engineDisplacementL?: string;
  transmissionStyle?: string;
  gvwr?: string;
  cylinders?: string;
  electrificationLevel?: string;
  engineModel?: string;
  bodyClass?: string;
  doors?: string;
  engineConfiguration?: string;
  manufacturerName?: string;
  plantCountry?: string;
  plantState?: string;
  plantCity?: string;
}

const initialWizardData: WizardData = {
  vin: '', make: '', model: '', year: '', nickname: '',
  currentMileage: '', purchaseDate: getISODateString(new Date()), imageUrl: undefined,
  initialMaintenanceTasks: [], recalls: [], trim: '', driveType: '', primaryFuelType: '',
  secondaryFuelType: '', engineBrakeHP: undefined, engineDisplacementL: '',
  transmissionStyle: '', gvwr: '', cylinders: undefined, electrificationLevel: '',
  engineModel: '', bodyClass: '', doors: undefined, engineConfiguration: '',
  manufacturerName: '', plantCountry: '', plantState: '', plantCity: '',
};

const bottomSheetVariants = {
  hidden: { y: "100%", opacity: 0.9 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: "spring" as const, stiffness: 130, damping: 22, duration: 0.35 } // Crisper spring
  },
  exit: { 
    y: "100%", 
    opacity: 0.9, 
    transition: { duration: 0.25, ease: "anticipate" as const } // Quicker exit
  }
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeInOut" as const } }
};

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ isOpen, onClose, onAddVehicle, onUploadVehicleImage }) => {
  const { t, language } = useTranslation();
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData);
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [isFetchingRecalls, setIsFetchingRecalls] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showCustomInitialTaskForm, setShowCustomInitialTaskForm] = useState(false);

  const totalSteps = 4;

  useEffect(() => {
    if (isOpen) {
      setWizardStep(0);
      setWizardData(initialWizardData);
      setVinError(null);
      setIsDecodingVin(false);
      setIsFetchingRecalls(false);
      setShowManualEntry(false);
      setShowCustomInitialTaskForm(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWizardData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = async () => {
    setVinError(null);
    if (wizardStep === 0 && !showManualEntry) {
      if (!wizardData.vin.trim()) {
        setVinError(t('addVehicleModal.vinError.enterVinOrManual'));
        return;
      }
      
      // Validate VIN format before attempting to decode
      if (!validateVin(wizardData.vin.trim())) {
        setVinError(t('addVehicleModal.vinError.invalidVinFormat') || 'Invalid VIN format. VIN must be exactly 17 characters and contain only letters and numbers (excluding I, O, Q).');
        return;
      }
      try {
        setIsDecodingVin(true);
        // Call both endpoints in parallel and merge
        const [vinNinjas, vinGemini] = await Promise.all([
          decodeVinWithApiNinjas(wizardData.vin.trim()),
          decodeVinWithGeminiBackend(wizardData.vin.trim())
        ]);
        const merged = mergeVinResults(vinNinjas, vinGemini);
        setIsDecodingVin(false);

        if (merged && (merged.year || merged.make || merged.model)) {
          setWizardData(prev => ({
              ...prev,
              make: merged.make || prev.make,
              model: merged.model || prev.model,
              year: (vinNinjas && typeof vinNinjas.year !== 'undefined' && vinNinjas.year !== null) ? String(vinNinjas.year) : (merged.year ? String(merged.year) : ''),
              vin: merged.vin || prev.vin, 
              trim: merged.trim || prev.trim,
              driveType: merged.driveType || prev.driveType,
              primaryFuelType: merged.primaryFuelType || prev.primaryFuelType,
              secondaryFuelType: merged.secondaryFuelType || prev.secondaryFuelType,
              engineBrakeHP: merged.engineBrakeHP?.toString() || prev.engineBrakeHP,
              engineDisplacementL: merged.engineDisplacementL || prev.engineDisplacementL,
              transmissionStyle: merged.transmissionStyle || prev.transmissionStyle,
              cylinders: merged.cylinders?.toString() || prev.cylinders,
              bodyClass: merged.bodyClass || prev.bodyClass,
              doors: merged.doors?.toString() || prev.doors,
              manufacturerName: merged.manufacturerName || prev.manufacturerName,
              plantCountry: merged.plantCountry || prev.plantCountry,
              plantState: merged.plantState || prev.plantState,
              plantCity: merged.plantCity || prev.plantCity,
              engineModel: merged.engineModel || prev.engineModel,
              engineConfiguration: merged.engineConfiguration || prev.engineConfiguration,
              electrificationLevel: merged.electrificationLevel || prev.electrificationLevel,
              gvwr: merged.gvwr || prev.gvwr,
              recalls: [] // Always reset recalls before fetching
          }));
          // Fetch recalls for the decoded VIN
          setIsFetchingRecalls(true);
          const recallsResponse = await fetch(buildApiUrl(`/recall/${wizardData.vin}`));
          let recalls: RecallInfo[] = [];
          if (recallsResponse.ok) {
            recalls = await recallsResponse.json();
          }
          setWizardData(prev => ({ ...prev, recalls: recalls || [] }));
          setIsFetchingRecalls(false);
          setWizardStep(1);
        } else {
          setVinError(t('addVehicleModal.vinError.decodeFailed') || 'Could not decode VIN. Please check the VIN number or enter vehicle details manually.');
          setShowManualEntry(true);
        }
      } catch (err) {
        setIsDecodingVin(false);
        console.error('VIN decode error:', err);
      }
      return;
    }

    if (wizardStep === 0 && showManualEntry) {
        if (!wizardData.make || !wizardData.model || !wizardData.year) {
            setVinError(t('addVehicleModal.vinError.manualMakeModelYearRequired'));
            return;
        }
    }
    if (wizardStep < totalSteps - 1) {
      setWizardStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (wizardStep > 0) {
      setWizardStep(prev => prev - 1);
    }
  };

  const handleAddInitialTaskPreset = (preset: MaintenanceTaskPreset) => {
    if (preset.key === "OTHER") {
        setShowCustomInitialTaskForm(true);
        setWizardData(prev => ({
          ...prev,
          initialMaintenanceTasks: [
            ...prev.initialMaintenanceTasks,
            { tempId: self.crypto.randomUUID(), title: '', category: TaskCategory.Other, completedDate: getISODateString(), isCustom: true, titleKey: 'taskPresets.other.title' }
          ]
        }));
        return;
    }
    setWizardData(prev => ({
      ...prev,
      initialMaintenanceTasks: [
        ...prev.initialMaintenanceTasks,
        {
          tempId: self.crypto.randomUUID(),
          title: preset.title,
          titleKey: preset.title,
          category: preset.category,
          completedDate: getISODateString(),
        }
      ]
    }));
  };

  const handleInitialTaskChange = (index: number, field: keyof MaintenanceTask, value: any) => {
    setWizardData(prev => {
      const tasks = [...prev.initialMaintenanceTasks];
      tasks[index] = { ...tasks[index], [field]: value };
      if (field === 'title' && tasks[index].isCustom) {
          tasks[index].titleKey = undefined;
      }
      return { ...prev, initialMaintenanceTasks: tasks };
    });
  };

  const handleRemoveInitialTask = (tempIdToRemove: string) => {
    const taskBeingRemoved = wizardData.initialMaintenanceTasks.find(task => task.tempId === tempIdToRemove);
    setWizardData(prev => ({
      ...prev,
      initialMaintenanceTasks: prev.initialMaintenanceTasks.filter((task) => task.tempId !== tempIdToRemove)
    }));
    if (taskBeingRemoved?.isCustom) {
        setShowCustomInitialTaskForm(false);
    }
  };

  const handleSaveCustomInitialTask = () => {
    const customTaskIndex = wizardData.initialMaintenanceTasks.findIndex(t => t.isCustom && !t.title);
    if (customTaskIndex !== -1 && !wizardData.initialMaintenanceTasks[customTaskIndex].title) {
        alert(t('addVehicleModal.customTaskTitleError'));
        return;
    }
    setShowCustomInitialTaskForm(false);
     setWizardData(prev => {
        const tasks = [...prev.initialMaintenanceTasks];
        const taskToFinalize = tasks.find(t => t.isCustom && t.title);
        if (taskToFinalize) {
            taskToFinalize.isCustom = false; 
            taskToFinalize.titleKey = undefined; 
        }
        return {...prev, initialMaintenanceTasks: tasks};
     });
  };

  const handleSubmit = async () => {
    if (!wizardData.make || !wizardData.model || !wizardData.year) {
        alert(t('addVehicleModal.error.makeModelYearRequired'));
        setWizardStep(showManualEntry || !wizardData.vin ? 0 : 1);
        return;
    }
    if (!wizardData.currentMileage) {
        alert(t('addVehicleModal.error.currentMileageRequired'));
        setWizardStep(2);
        return;
    }

    const finalVehicleData: Omit<Vehicle, 'id' | 'maintenanceSchedule'> & { initialMaintenanceTasks?: MaintenanceTask[], recalls?: RecallInfo[] } = {
      vin: wizardData.vin, make: wizardData.make, model: wizardData.model,
      year: parseInt(wizardData.year, 10), nickname: wizardData.nickname,
      currentMileage: parseInt(wizardData.currentMileage, 10),
      purchaseDate: wizardData.purchaseDate,
      recalls: wizardData.recalls, 
      initialMaintenanceTasks: wizardData.initialMaintenanceTasks
        .filter(task => task.title)
        .map(task => ({
          id: typeof task.id === 'string' && task.id.trim().length > 0 ? task.id : self.crypto.randomUUID(),
          title: task.titleKey || task.title!, 
          category: task.category || TaskCategory.Other,
          status: TaskStatus.Completed,
          completedDate: task.completedDate || getISODateString(),
          creationDate: getISODateString(),
          notes: task.notes,
          cost: task.cost ? parseFloat(task.cost.toString()) : undefined,
          dueMileage: task.dueMileage ? parseInt(task.dueMileage.toString()) : undefined,
      }) as MaintenanceTask),
      trim: wizardData.trim,
      driveType: wizardData.driveType,
      primaryFuelType: wizardData.primaryFuelType,
      secondaryFuelType: wizardData.secondaryFuelType,
      engineBrakeHP: wizardData.engineBrakeHP ? parseInt(wizardData.engineBrakeHP) : undefined,
      engineDisplacementL: wizardData.engineDisplacementL,
      transmissionStyle: wizardData.transmissionStyle,
      cylinders: wizardData.cylinders ? parseInt(wizardData.cylinders) : undefined,
      bodyClass: wizardData.bodyClass,
      doors: wizardData.doors ? parseInt(wizardData.doors) : undefined,
      manufacturerName: wizardData.manufacturerName,
    };
    
    const vehicleId = await onAddVehicle(finalVehicleData);
    onClose();
  };

  const renderProgressBar = () => (
    <div className="w-full mb-6 md:mb-8 text-start rtl:text-right">
      <div className="bg-[#2a2a2a] rounded-full h-2 md:h-2.5">
        <motion.div
          className="bg-[#F7C843] h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((wizardStep + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.4, ease: "circOut" }} // Enhanced ease
        ></motion.div>
      </div>
      <p className="text-xs text-center text-[#707070] mt-1.5 md:mt-2 font-medium">{t('addVehicleModal.stepProgress', { current: wizardStep + 1, total: totalSteps })}</p>
    </div>
  );

  const renderStep0_VinOrManual = () => (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-start rtl:text-right">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-1.5 font-heading uppercase">{t('addVehicleModal.step0.title')}</h3>
      <p className="text-sm text-[#cfcfcf] mb-5 md:mb-6">{t('addVehicleModal.step0.description')}</p>
      {!showManualEntry && (
        <div className="mb-4 md:mb-5">
          <TextField
            fullWidth
            label={t('addVehicleModal.step0.vinLabel')}
            name="vin"
            id="vin"
            value={wizardData.vin}
            onChange={handleInputChange}
            placeholder={t('addVehicleModal.step0.vinPlaceholder')}
            inputProps={{ maxLength: 17 }}
            aria-describedby="vin-error"
            variant="outlined"
            size="small"
          />
          {(isDecodingVin || isFetchingRecalls) && <p className="text-sm text-[#F7C843] mt-1.5 flex items-center"><Icons.Wrench className="animate-spin w-4 h-4 me-2 rtl:ms-2 rtl:me-0" /> {isDecodingVin ? t('addVehicleModal.step0.decodingVin') : t('addVehicleModal.step0.fetchingRecalls')}</p>}
          {vinError && <p id="vin-error" className="text-sm text-red-400 mt-1.5">{vinError}</p>}
        </div>
      )}
       <Button
          variant="text"
          color="primary"
          size="small"
          onClick={() => { setShowManualEntry(!showManualEntry); setVinError(null); if (showManualEntry) setWizardData(prev => ({...prev, vin: ''})); }}
          sx={{ textTransform: 'none', fontSize: '0.875rem', mb: 3 }}
        >
          {t(showManualEntry ? 'addVehicleModal.step0.tryVinInstead' : 'addVehicleModal.step0.enterManually')}
      </Button>

      {showManualEntry && (
        <motion.div
            className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t border-[#333333]"
            initial={{ opacity:0, height: 0 }} animate={{ opacity:1, height: 'auto', transition: {duration: 0.25} }} // Quicker reveal
        >
          <TextField
            fullWidth
            label={t('vehicle.make')}
            name="make"
            id="make"
            value={wizardData.make}
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
            value={wizardData.model}
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
            value={wizardData.year}
            onChange={handleInputChange}
            required
            placeholder={t('common.yearPlaceholder')}
            variant="outlined"
            size="small"
          />
           {vinError && showManualEntry && <p className="text-sm text-red-400 mt-1">{vinError}</p>}
        </motion.div>
      )}
    </motion.div>
  );

  const renderStep1_DetailsAndPhoto = () => (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-start rtl:text-right">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-1 font-heading uppercase">{t('addVehicleModal.step1.title')}</h3>
      <p className="text-sm text-[#cfcfcf] mb-5 md:mb-6">{t('addVehicleModal.step1.description')}</p>
      
      {wizardData.recalls && wizardData.recalls.length > 0 && (
        <motion.div 
            className="mb-4 md:mb-5 p-3 bg-red-700/30 border border-red-600/50 rounded-lg flex items-center text-red-200 shadow-md"
            initial={{opacity: 0, y: -10}} animate={{opacity:1, y: 0, transition: {duration: 0.25}}}
        >
            <Icons.AlertTriangle className="w-5 h-5 me-2.5 rtl:ms-2.5 rtl:me-0 text-red-300 flex-shrink-0" />
            <span className="text-sm font-medium">{t('addVehicleModal.recallsFound', { count: wizardData.recalls.length })}</span>
        </motion.div>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          label={t('vehicle.make')}
          name="make"
          id="make"
          value={wizardData.make}
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
          value={wizardData.model}
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
          value={wizardData.year}
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
          value={wizardData.nickname}
          onChange={handleInputChange}
          placeholder={t('addVehicleModal.step1.nicknamePlaceholder')}
          variant="outlined"
          size="small"
        />
         <TextField
            fullWidth
            label={t('vehicle.trim')}
            name="trim"
            id="trim"
            value={wizardData.trim || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
         <TextField
            fullWidth
            label={t('vehicle.manufacturerName')}
            name="manufacturerName"
            id="manufacturerName"
            value={wizardData.manufacturerName || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
         <TextField
            fullWidth
            label={t('vehicle.driveType')}
            name="driveType"
            id="driveType"
            value={wizardData.driveType || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
         <TextField
            fullWidth
            label={t('vehicle.primaryFuelType')}
            name="primaryFuelType"
            id="primaryFuelType"
            value={wizardData.primaryFuelType || ''}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
        />
      </Box>
    </motion.div>
  );

  const renderStep2_Essentials = () => (
     <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-start rtl:text-right">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-1 font-heading uppercase">{t('addVehicleModal.step2.title')}</h3>
      <p className="text-sm text-[#cfcfcf] mb-5 md:mb-6">{t('addVehicleModal.step2.description')}</p>
      <div className="space-y-4 md:space-y-5">
        <TextField
            fullWidth
            label={t('vehicle.currentMileage')}
            name="currentMileage"
            id="currentMileage"
            type="number"
            value={wizardData.currentMileage}
            onChange={handleInputChange}
            required
            placeholder={t('addVehicleModal.step2.mileagePlaceholder')}
            variant="outlined"
            size="small"
        />
        <TextField
            fullWidth
            label={t('vehicle.purchaseDate')}
            name="purchaseDate"
            id="purchaseDate"
            type="date"
            value={wizardData.purchaseDate}
            onChange={handleInputChange}
            variant="outlined"
            size="small"
            InputLabelProps={{ shrink: true }}
        />
        <p className="text-xs text-[#707070] mt-1.5">{t('addVehicleModal.step2.purchaseDateNote')}</p>
      </div>
    </motion.div>
  );

const renderStep3_InitialLog = () => (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-start rtl:text-right">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-1 font-heading uppercase">{t('addVehicleModal.step3.title')}</h3>
      <p className="text-sm text-[#cfcfcf] mb-5 md:mb-6">{t('addVehicleModal.step3.description')}</p>
      
      <div className="space-y-4 md:space-y-5">
        {wizardData.initialMaintenanceTasks.map((task, index) => {
          const TaskIconComponent = (task.titleKey && IconMap[COMMON_MAINTENANCE_PRESETS.find(p => p.title === task.titleKey)?.iconName || 'Wrench']) || DefaultTaskIcon;
          
          return (
            <motion.div key={index} className="p-4 bg-[#2a2a2a] rounded-lg border border-[#404040]">
              <div className="flex items-center gap-3 mb-3">
                <TaskIconComponent className="w-6 h-6 text-[#F7C843]" />
                <div className="flex-1">
                  <h4 className="font-semibold text-white">{task.titleKey ? t(task.titleKey) : task.title}</h4>
                  <p className="text-sm text-[#a0a0a0]">{task.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField
                  fullWidth
                  label={t('addVehicleModal.step3.mileageAtCompletionLabel')}
                  name={`task-mileage-${index}`}
                  id={`task-mileage-${index}`}
                  type="number"
                  value={task.dueMileage || ''}
                  onChange={(e) => handleInitialTaskChange(index, 'dueMileage', e.target.value)}
                  placeholder={t('addVehicleModal.step2.mileagePlaceholder')}
                  variant="outlined"
                  size="small"
                />
                 <TextField
                    fullWidth
                    label={t('task.cost')}
                    name={`task-cost-${index}`}
                    id={`task-cost-${index}`}
                    type="number"
                    value={task.cost || ''}
                    onChange={(e) => handleInitialTaskChange(index, 'cost', e.target.value)}
                    placeholder="e.g., 50.00"
                    variant="outlined"
                    size="small"
                />
                <TextField
                    fullWidth
                    label={t('task.notesLabel')}
                    name={`task-notes-${index}`}
                    id={`task-notes-${index}`}
                    value={task.notes || ''}
                    onChange={(e) => handleInitialTaskChange(index, 'notes', e.target.value)}
                    rows={2}
                    multiline
                    variant="outlined"
                    size="small"
                />
                 <Button 
                   type="button" 
                   onClick={handleSaveCustomInitialTask} 
                   variant="contained"
                   color="primary"
                   size="small"
                   sx={{ mt: 1 }}
                 >
                   {t('addVehicleModal.step3.saveCustomEntryButton')}
                 </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  if (!isOpen) return null;

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
            <h2 className="text-xl md:text-2xl font-bold text-white font-heading uppercase tracking-wide text-start rtl:text-right">{t('addVehicleModal.title')}</h2>
            <Button 
              onClick={onClose} 
              variant="outlined"
              color="primary"
              className="text-[#a0a0a0] hover:text-[#F7C843] p-1 md:p-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors" 
              aria-label={t('common.closeModalAria')}
              sx={{ minWidth: 'auto' }}
            >
              <Icons.XMark className="w-5 h-5 md:w-6 md:w-6" strokeWidth={2.5}/>
            </Button>
        </div>

        <div className="mb-6 md:mb-8 flex-shrink-0">
          {renderProgressBar()}
        </div>
        

        <div className="overflow-y-auto flex-grow pe-2 -me-2 rtl:pe-0 rtl:ps-2 scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#2a2a2a] pb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={wizardStep}
              initial={{ opacity: 0, x: (language === 'ar' ? -1 : 1) * (wizardStep % 2 === 0 ? 30 : -30) }} // Energetic x shift
              animate={{ opacity: 1, x: 0, transition: { type: "spring", stiffness: 120, damping: 18 } }} // Spring transition
              exit={{ opacity: 0, x: (language === 'ar' ? -1 : 1) * (wizardStep % 2 === 0 ? -30 : 30), transition: { duration: 0.2 } }}
            >
              {wizardStep === 0 && renderStep0_VinOrManual()}
              {wizardStep === 1 && renderStep1_DetailsAndPhoto()}
              {wizardStep === 2 && renderStep2_Essentials()}
              {wizardStep === 3 && renderStep3_InitialLog()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-[#333333] flex justify-between items-center flex-shrink-0">
          <div className="rtl:order-2"> 
            {wizardStep > 0 && (
              <Button 
                type="button" 
                onClick={handlePrevStep} 
                variant="outlined"
                color="inherit"
                size="small"
                sx={{ fontWeight: 'bold' }}
              >
                {t('common.back')}
              </Button>
            )}
          </div>
          <div className="rtl:order-1"> 
            {wizardStep < totalSteps - 1 && (
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={isDecodingVin || isFetchingRecalls || (wizardStep === 0 && !showManualEntry && !wizardData.vin.trim())}
                variant="contained"
                color="primary"
                size="small"
                sx={{ fontWeight: 'bold' }}
              >
                {isDecodingVin || isFetchingRecalls ? t('common.processing') : t('common.next')}
              </Button>
            )}
            {wizardStep === totalSteps - 1 && (
              <Button 
                type="button" 
                onClick={handleSubmit} 
                variant="contained"
                color="success"
                size="small"
                sx={{ fontWeight: 'bold' }}
              >
                {t('addVehicleModal.finishAndSaveButton')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddVehicleModal;
