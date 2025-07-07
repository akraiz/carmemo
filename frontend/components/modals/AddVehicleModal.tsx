import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Vehicle, RecallInfo } from '../../types';
import { getISODateString } from '../../utils/dateUtils';
import { decodeVinWithApiNinjas, decodeVinWithGeminiBackend, mergeVinResults, validateVin } from '../../services/vinLookupService';
import { Icons } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';
import { TextField, Box } from '@mui/material';
import Button from '../shared/Button';
import { buildApiUrl } from '../../config/api';
import { SessionService } from '../../services/sessionService';
import { useToast } from '../../contexts/ToastContext';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (vehicleData: Omit<Vehicle, 'id' | 'maintenanceSchedule'> & { recalls?: RecallInfo[] }) => Promise<string | undefined>;
}

interface WizardData {
  vin: string;
  make: string;
  model: string;
  year: string;
  nickname: string;
  currentMileage: string;
  purchaseDate: string;
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

// Validation state interface
interface ValidationState {
  vin: { isValid: boolean; message: string };
  make: { isValid: boolean; message: string };
  model: { isValid: boolean; message: string };
  year: { isValid: boolean; message: string };
  currentMileage: { isValid: boolean; message: string };
}

const initialWizardData: WizardData = {
  vin: '', make: '', model: '', year: '', nickname: '',
  currentMileage: '', purchaseDate: getISODateString(new Date()),
  recalls: [], trim: '', driveType: '', primaryFuelType: '',
  secondaryFuelType: '', engineBrakeHP: undefined, engineDisplacementL: '',
  transmissionStyle: '', gvwr: '', cylinders: undefined, electrificationLevel: '',
  engineModel: '', bodyClass: '', doors: undefined, engineConfiguration: '',
  manufacturerName: '', plantCountry: '', plantState: '', plantCity: '',
};

const initialValidation: ValidationState = {
  vin: { isValid: true, message: '' },
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

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ isOpen, onClose, onAddVehicle }) => {
  // Move all hooks to the top level
  const { t, language } = useTranslation();
  const { showGenericError } = useToast();
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData);
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [isFetchingRecalls, setIsFetchingRecalls] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [validation, setValidation] = useState<ValidationState>(initialValidation);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  useEffect(() => {
    if (isOpen) {
      setWizardStep(0);
      setWizardData(initialWizardData);
      setIsDecodingVin(false);
      setIsFetchingRecalls(false);
      setShowManualEntry(false);
      setValidation(initialValidation);
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
    setValidation(prev => ({ ...prev, [name]: { ...prev[name as keyof ValidationState], message: '' } }));
  };

       const validateField = (name: keyof ValidationState, value: string) => {
    let message = '';
    let isValid = true;

    switch (name) {
      case 'vin':
        if (!value.trim()) {
          message = t('addVehicleModal.vinError.enterVinOrManual');
          isValid = false;
        } else if (!validateVin(value.trim())) {
          message = t('addVehicleModal.vinError.invalidVinFormat') || 'Invalid VIN format. VIN must be exactly 17 characters and contain only letters and numbers (excluding I, O, Q).';
          isValid = false;
        }
        break;
      case 'make':
        if (!value.trim()) {
          message = t('addVehicleModal.vinError.manualMakeModelYearRequired');
          isValid = false;
        }
        break;
      case 'model':
        if (!value.trim()) {
          message = t('addVehicleModal.vinError.manualMakeModelYearRequired');
          isValid = false;
        }
        break;
      case 'year':
        if (!value.trim()) {
          message = t('addVehicleModal.vinError.manualMakeModelYearRequired');
          isValid = false;
        } else {
          const yearNum = parseInt(value, 10);
          if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2026) {
            message = 'Invalid year: must be between 1900 and 2026';
            isValid = false;
          }
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

  const validateVinAsync = async (vin: string) => {
    if (!vin.trim()) return false;
    if (!validateVin(vin.trim())) return false;
    
    try {
      const sessionId = SessionService.getSessionId();
      const checkDuplicate = await fetch(buildApiUrl(`/vehicles/vin/${vin.trim()}?sessionId=${encodeURIComponent(sessionId)}`));
      if (checkDuplicate.ok) {
        const data = await checkDuplicate.json();
        if (data && data.data) {
          setValidation(prev => ({ 
            ...prev, 
            vin: { 
              isValid: false, 
              message: 'A vehicle with this VIN already exists in your garage.' 
            } 
          }));
          return false;
        }
      }
      return true;
    } catch (err) {
      console.error('VIN validation error:', err);
      return false;
    }
  };

  const handleNextStep = async () => {
    // Always validate all required fields for the current step before proceeding
    let allValid = true;
    let newValidation = { ...validation };
    if (wizardStep === 0 && showManualEntry) {
      // Manual entry: validate make, model, year
      (['make', 'model', 'year'] as (keyof ValidationState)[]).forEach((field) => {
        const isValid = validateField(field, wizardData[field as keyof WizardData] as string);
        if (!isValid) allValid = false;
        newValidation[field] = { ...validation[field], isValid };
      });
    } else if (wizardStep === 1) {
      // Step 1: validate make, model, year (again, in case user changed)
      (['make', 'model', 'year'] as (keyof ValidationState)[]).forEach((field) => {
        const isValid = validateField(field, wizardData[field as keyof WizardData] as string);
        if (!isValid) allValid = false;
        newValidation[field] = { ...validation[field], isValid };
      });
    } else if (wizardStep === 2) {
      // Step 2: validate currentMileage
      const isValid = validateField('currentMileage', wizardData.currentMileage);
      if (!isValid) allValid = false;
      newValidation.currentMileage = { ...validation.currentMileage, isValid };
    }
    setValidation(newValidation);
    if (!allValid) return;

    if (wizardStep === 0 && !showManualEntry) {
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
          setValidation(prev => ({
            ...prev,
            vin: {
              isValid: false,
              message: t('addVehicleModal.vinError.decodeFailed') || 'Could not decode VIN. Please check the VIN number or enter vehicle details manually.'
            }
          }));
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
            setValidation(prev => ({
              ...prev,
              make: { isValid: false, message: t('addVehicleModal.vinError.manualMakeModelYearRequired') },
              model: { isValid: false, message: t('addVehicleModal.vinError.manualMakeModelYearRequired') },
              year: { isValid: false, message: t('addVehicleModal.vinError.manualMakeModelYearRequired') }
            }));
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



  const handleSubmit = async () => {
    let allValid = true;
    for (const key in validation) {
      if (validation.hasOwnProperty(key)) {
        const field = validation[key as keyof ValidationState];
        if (!field.isValid) {
          allValid = false;
          break;
        }
      }
    }

    if (!allValid) {
      return;
    }

    if (!wizardData.make || !wizardData.model || !wizardData.year) {
        setValidation(prev => ({
          ...prev,
          make: { isValid: false, message: t('addVehicleModal.vinError.manualMakeModelYearRequired') },
          model: { isValid: false, message: t('addVehicleModal.vinError.manualMakeModelYearRequired') },
          year: { isValid: false, message: t('addVehicleModal.vinError.manualMakeModelYearRequired') }
        }));
        setWizardStep(showManualEntry || !wizardData.vin ? 0 : 1);
        return;
    }
    if (!wizardData.currentMileage) {
        setValidation(prev => ({
          ...prev,
          currentMileage: { isValid: false, message: t('addVehicleModal.error.currentMileageRequired') }
        }));
        setWizardStep(2);
        return;
    }

    const finalVehicleData: Omit<Vehicle, 'id' | 'maintenanceSchedule'> & { recalls?: RecallInfo[] } = {
      vin: wizardData.vin, make: wizardData.make, model: wizardData.model,
      year: parseInt(wizardData.year, 10), nickname: wizardData.nickname,
      currentMileage: parseInt(wizardData.currentMileage, 10),
      purchaseDate: wizardData.purchaseDate,
      recalls: wizardData.recalls, 
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
    
    // Clean the payload to remove empty string fields
    const cleanedVehicleData = Object.fromEntries(
      Object.entries(finalVehicleData).filter(([_, v]) => v !== "")
    );
    setIsSubmitting(true);
    try {
      const vehicleId = await onAddVehicle(cleanedVehicleData as Omit<Vehicle, 'id' | 'maintenanceSchedule'> & { recalls?: RecallInfo[] });
      onClose();
    } catch (err: any) {
      showGenericError(t('addVehicleModal.error.failedToAddVehicle'), err?.message || undefined);
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="space-y-4"> {/* Adjusted from mb-4 md:mb-5 to space-y-4 */}
          <div>
            <label htmlFor="vin" className="block text-sm font-medium text-white mb-2">VIN *</label>
            <TextField
              fullWidth
              id="vin"
              name="vin"
              value={wizardData.vin}
              onChange={handleInputChange}
              onBlur={() => {
                validateField('vin', wizardData.vin);
                if (wizardData.vin.trim()) {
                  validateVinAsync(wizardData.vin);
                }
              }}
              placeholder={t('addVehicleModal.step0.vinPlaceholder')}
              inputProps={{ maxLength: 17 }}
              aria-describedby="vin-error"
              variant="filled"
              size="small"
              InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
            />
            {(isDecodingVin || isFetchingRecalls) && <p className="text-sm text-[#F7C843] mt-1.5 flex items-center"><Icons.Wrench className="animate-spin w-4 h-4 me-2 rtl:ms-2 rtl:me-0" /> {isDecodingVin ? t('addVehicleModal.step0.decodingVin') : t('addVehicleModal.step0.fetchingRecalls')}</p>}
            {!validation.vin.isValid && <p id="vin-error" className="text-sm text-red-400 mt-1.5">{validation.vin.message}</p>}
          </div>
        </div>
      )}
       <Button
          variant="text"
          color="primary"
          size="small"
          onClick={() => { setShowManualEntry(!showManualEntry); setValidation(prev => ({ ...prev, vin: { ...prev.vin, message: '' } })); if (showManualEntry) setWizardData(prev => ({...prev, vin: ''})); }}
          sx={{ textTransform: 'none', fontSize: '0.875rem', mb: 3 }}
        >
          {t(showManualEntry ? 'addVehicleModal.step0.tryVinInstead' : 'addVehicleModal.step0.enterManually')}
      </Button>

      {showManualEntry && (
        <motion.div
            className="space-y-4 pt-3 md:pt-4 border-t border-[#333333]" // Ensure space-y-4 and consistent pt
            initial={{ opacity:0, height: 0 }} animate={{ opacity:1, height: 'auto', transition: {duration: 0.25} }}
        >
          <div>
            <label htmlFor="make" className="block text-sm font-medium text-white mb-2">Make *</label>
            <TextField
              fullWidth
              id="make"
              name="make"
              value={wizardData.make}
              onChange={handleInputChange}
              onBlur={() => validateField('make', wizardData.make)}
              required
              variant="filled"
              size="small"
              InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
              placeholder="e.g., Ford"
            />
            {!validation.make.isValid && <p className="text-sm text-red-400 mt-1">{validation.make.message}</p>}
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-white mb-2">Model *</label>
            <TextField
              fullWidth
              id="model"
              name="model"
              value={wizardData.model}
              onChange={handleInputChange}
              onBlur={() => validateField('model', wizardData.model)}
              required
              variant="filled"
              size="small"
              InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
              placeholder="e.g., F-150"
            />
            {!validation.model.isValid && <p className="text-sm text-red-400 mt-1">{validation.model.message}</p>}
          </div>
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-white mb-2">Year *</label>
            <TextField
              fullWidth
              id="year"
              name="year"
              type="number"
              value={wizardData.year}
              onChange={handleInputChange}
              onBlur={() => validateField('year', wizardData.year)}
              required
              placeholder={t('common.yearPlaceholder')}
              variant="filled"
              size="small"
              InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
            />
            {!validation.year.isValid && <p className="text-sm text-red-400 mt-1">{validation.year.message}</p>}
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  const renderStep1_Details = () => (
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

      <div className="space-y-4"> {/* Ensure this wrapper is space-y-4 */}
        <div>
          <label htmlFor="make" className="block text-sm font-medium text-white mb-2">Make *</label>
          <TextField
            fullWidth
            id="make"
            name="make"
            value={wizardData.make}
            onChange={handleInputChange}
            required
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
            placeholder="e.g., Ford"
          />
        </div>
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-white mb-2">Model *</label>
          <TextField
            fullWidth
            id="model"
            name="model"
            value={wizardData.model}
            onChange={handleInputChange}
            required
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
            placeholder="e.g., F-150"
          />
        </div>
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-white mb-2">Year *</label>
          <TextField
            fullWidth
            id="year"
            name="year"
            type="number"
            value={wizardData.year}
            onChange={handleInputChange}
            required
            placeholder={t('common.yearPlaceholder')}
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
        </div>
        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-white mb-2">Nickname</label>
          <TextField
            fullWidth
            id="nickname"
            name="nickname"
            value={wizardData.nickname}
            onChange={handleInputChange}
            placeholder={t('addVehicleModal.step1.nicknamePlaceholder')}
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
        </div>
         <div>
           <label htmlFor="trim" className="block text-sm font-medium text-white mb-2">Trim</label>
           <TextField
            fullWidth
            id="trim"
            name="trim"
            value={wizardData.trim || ''}
            onChange={handleInputChange}
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
         </div>
         <div>
           <label htmlFor="manufacturerName" className="block text-sm font-medium text-white mb-2">Manufacturer Name</label>
           <TextField
            fullWidth
            id="manufacturerName"
            name="manufacturerName"
            value={wizardData.manufacturerName || ''}
            onChange={handleInputChange}
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
         </div>
         <div>
           <label htmlFor="driveType" className="block text-sm font-medium text-white mb-2">Drive Type</label>
           <TextField
            fullWidth
            id="driveType"
            name="driveType"
            value={wizardData.driveType || ''}
            onChange={handleInputChange}
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
         </div>
         <div>
           <label htmlFor="primaryFuelType" className="block text-sm font-medium text-white mb-2">Primary Fuel Type</label>
           <TextField
            fullWidth
            id="primaryFuelType"
            name="primaryFuelType"
            value={wizardData.primaryFuelType || ''}
            onChange={handleInputChange}
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
         </div>
      </div>
    </motion.div>
  );

  const renderStep2_Essentials = () => (
     <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-start rtl:text-right">
      <h3 className="text-lg md:text-xl font-semibold text-white mb-1 font-heading uppercase">{t('addVehicleModal.step2.title')}</h3>
      <p className="text-sm text-[#cfcfcf] mb-5 md:mb-6">{t('addVehicleModal.step2.description')}</p>
      <div className="space-y-4"> {/* Adjusted from md:space-y-5 to space-y-4 */}
        <div>
          <label htmlFor="currentMileage" className="block text-sm font-medium text-white mb-2">Current Mileage *</label>
          <TextField
            fullWidth
            id="currentMileage"
            name="currentMileage"
            type="number"
            value={wizardData.currentMileage}
            onChange={handleInputChange}
            onBlur={() => validateField('currentMileage', wizardData.currentMileage)}
            required
            placeholder={t('addVehicleModal.step2.mileagePlaceholder')}
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
          {!validation.currentMileage.isValid && <p className="text-sm text-red-400 mt-1">{validation.currentMileage.message}</p>}
        </div>
        <div>
          <label htmlFor="purchaseDate" className="block text-sm font-medium text-white mb-2">Purchase Date *</label>
          <TextField
            fullWidth
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            value={wizardData.purchaseDate}
            onChange={handleInputChange}
            variant="filled"
            size="small"
            InputProps={{ disableUnderline: true, sx: { borderRadius: 1.5, background: '#232323', border: '1px solid #404040', input: { color: '#fff', paddingTop: '16.5px', paddingBottom: '16.5px', alignItems: 'center' } } }}
          />
        </div>
        <p className="text-xs text-[#707070] mt-1.5">{t('addVehicleModal.step2.purchaseDateNote')}</p>
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
              variant="text"
              size="small"
              className="text-[#a0a0a0] hover:text-[#F7C843] p-1 md:p-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors" 
              aria-label={t('common.closeModalAria')}
              sx={{ minWidth: 'auto' }}
            >
              <Icons.XMark className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5}/>
            </Button>
        </div>

        <div className="mb-6 md:mb-8 flex-shrink-0">
          {renderProgressBar()}
        </div>
        
        <div className="overflow-y-auto flex-grow pe-2 -me-2 rtl:pe-0 rtl:ps-2 scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#2a2a2a] pb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={wizardStep}
              initial={{ opacity: 0, x: (language === 'ar' ? -1 : 1) * (wizardStep % 2 === 0 ? 30 : -30) }}
              animate={{ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 120, damping: 18 } }}
              exit={{ opacity: 0, x: (language === 'ar' ? -1 : 1) * (wizardStep % 2 === 0 ? -30 : 30), transition: { duration: 0.2 } }}
            >
              {wizardStep === 0 && renderStep0_VinOrManual()}
              {wizardStep === 1 && renderStep1_Details()}
              {wizardStep === 2 && renderStep2_Essentials()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-[#333333] flex justify-between items-center flex-shrink-0">
          <div className="rtl:order-2"> 
            {wizardStep > 0 && (
              <Button 
                type="button" 
                onClick={handlePrevStep} 
                variant="outline"
                size="small"
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
                disabled={isDecodingVin || isFetchingRecalls}
                variant="primary"
                size="small"
              >
                {isDecodingVin || isFetchingRecalls ? t('common.processing') : t('common.next')}
              </Button>
            )}
            {wizardStep === totalSteps - 1 && (
              <Button 
                type="button" 
                onClick={handleSubmit} 
                variant="primary"
                size="small"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('common.processing') : t('addVehicleModal.finishAndSaveButton')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddVehicleModal;
