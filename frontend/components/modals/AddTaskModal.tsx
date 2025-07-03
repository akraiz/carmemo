import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MaintenanceTask, TaskCategory, TaskStatus, TaskImportance } from '../../types';
import { getISODateString, addMonths } from '../../utils/dateUtils';
import { useTranslation } from '../../hooks/useTranslation';
import { Button, Dialog, DialogTitle, DialogContent, IconButton, Typography, useTheme, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Icons } from '../Icon';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: MaintenanceTask) => void;
  vehicleId: string;
  task: MaintenanceTask | null;
  currentMileage?: number;
}

// --- Smart Urgency Calculation ---
function calculateUrgency(task: Partial<MaintenanceTask>, currentMileage?: number) {
  if (!task.dueDate && !task.dueMileage) {
    return {
      color: '#9E9E9E',
      icon: '📝',
      title: 'No Due Date',
      description: 'Add a due date or mileage for better tracking.'
    };
  }

  // Calculate mileage gap if we have both values
  let mileageGap = null;
  if (task.dueMileage && currentMileage) {
    mileageGap = task.dueMileage - currentMileage;
  }

  // Calculate date gap
  let daysUntilDue = null;
  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Determine urgency level
  if (task.status === TaskStatus.Overdue) {
    return {
      color: '#FF5252',
      icon: '🚨',
      title: 'Overdue',
      description: 'This task is overdue and needs immediate attention.'
    };
  }

  // Critical: Due within 1 week or 1000 miles
  if ((daysUntilDue !== null && daysUntilDue <= 7) || (mileageGap !== null && mileageGap <= 1000)) {
    return {
      color: '#FF5252',
      icon: '🚨',
      title: 'Critical',
      description: mileageGap !== null 
        ? `Due very soon! Only ${mileageGap.toLocaleString()} miles remaining.`
        : `Due in ${daysUntilDue} days!`
    };
  }

  // Soon: Due within 1 month or 5000 miles
  if ((daysUntilDue !== null && daysUntilDue <= 30) || (mileageGap !== null && mileageGap <= 5000)) {
    return {
      color: '#F7C843',
      icon: '⚠️',
      title: 'Soon',
      description: mileageGap !== null 
        ? `Coming up! ${mileageGap.toLocaleString()} miles to go.`
        : `Due in ${daysUntilDue} days.`
    };
  }

  // Upcoming: Everything else
  return {
    color: '#4CAF50',
    icon: '📅',
    title: 'Upcoming',
    description: mileageGap !== null 
      ? `${mileageGap.toLocaleString()} miles remaining.`
      : 'This task is coming up soon.'
  };
}

// Get category visual context
function getCategoryContext(category: TaskCategory | undefined) {
  const contexts: Partial<Record<TaskCategory, { icon: string; color: string; description: string; priority: 'high' | 'medium' | 'low' }>> = {
    [TaskCategory.BrakeService]: {
      icon: '🛑',
      color: '#FF5252',
      description: 'Critical Safety Component',
      priority: 'high'
    },
    [TaskCategory.OilChange]: {
      icon: '🛢️',
      color: '#FF9800',
      description: 'Engine Health',
      priority: 'medium'
    },
    [TaskCategory.TireRotation]: {
      icon: '🛞',
      color: '#2196F3',
      description: 'Tire Wear & Safety',
      priority: 'medium'
    },
    [TaskCategory.BatteryService]: {
      icon: '🔋',
      color: '#9C27B0',
      description: 'Electrical System',
      priority: 'medium'
    },
    [TaskCategory.EngineTuneUp]: {
      icon: '⚙️',
      color: '#FF5722',
      description: 'Engine Performance',
      priority: 'high'
    },
    [TaskCategory.Inspection]: {
      icon: '🔍',
      color: '#607D8B',
      description: 'Safety & Compliance',
      priority: 'high'
    },
    [TaskCategory.FluidCheck]: {
      icon: '💧',
      color: '#00BCD4',
      description: 'Fluid Levels',
      priority: 'medium'
    },
    [TaskCategory.AirFilter]: {
      icon: '🌬️',
      color: '#8BC34A',
      description: 'Air Quality',
      priority: 'low'
    },
    [TaskCategory.WiperBlades]: {
      icon: '🌧️',
      color: '#607D8B',
      description: 'Visibility',
      priority: 'low'
    },
    [TaskCategory.Engine]: {
      icon: '🔥',
      color: '#FF5722',
      description: 'Engine System',
      priority: 'high'
    },
    [TaskCategory.EngineAirIntake]: {
      icon: '💨',
      color: '#795548',
      description: 'Air Intake System',
      priority: 'medium'
    },
    [TaskCategory.EngineIgnition]: {
      icon: '⚡',
      color: '#FFC107',
      description: 'Ignition System',
      priority: 'high'
    },
    [TaskCategory.EngineInspection]: {
      icon: '🔧',
      color: '#FF9800',
      description: 'Engine Inspection',
      priority: 'medium'
    },
    [TaskCategory.Brakes]: {
      icon: '🛑',
      color: '#F44336',
      description: 'Brake System',
      priority: 'high'
    },
    [TaskCategory.BrakesFluids]: {
      icon: '🛑',
      color: '#E91E63',
      description: 'Brake Fluids',
      priority: 'high'
    },
    [TaskCategory.Tires]: {
      icon: '🛞',
      color: '#2196F3',
      description: 'Tire System',
      priority: 'medium'
    },
    [TaskCategory.TiresSuspension]: {
      icon: '🛞',
      color: '#3F51B5',
      description: 'Tires & Suspension',
      priority: 'medium'
    },
    [TaskCategory.Transmission]: {
      icon: '⚙️',
      color: '#FF9800',
      description: 'Transmission System',
      priority: 'high'
    },
    [TaskCategory.CoolingSystem]: {
      icon: '🌡️',
      color: '#FF5722',
      description: 'Cooling System',
      priority: 'high'
    },
    [TaskCategory.Electrical]: {
      icon: '⚡',
      color: '#FFC107',
      description: 'Electrical System',
      priority: 'medium'
    },
    [TaskCategory.Safety]: {
      icon: '🛡️',
      color: '#F44336',
      description: 'Safety System',
      priority: 'high'
    }
  };

  // Return the specific context or a default fallback
  return contexts[category || TaskCategory.Other] || {
    icon: '🔧',
    color: '#9E9E9E',
    description: 'General Maintenance',
    priority: 'low' as const
  };
}

const UrgencyIndicatorCard = ({ task, currentMileage }: { task: Partial<MaintenanceTask>, currentMileage?: number }) => {
  const urgency = calculateUrgency(task, currentMileage);
  const categoryContext = getCategoryContext(task.category);
  
  return (
    <div className={`p-3 rounded-lg border ${urgency.color === '#f44336' ? 'bg-red-900/20 border-red-500/40' : urgency.color === '#ff9800' ? 'bg-orange-900/20 border-orange-500/40' : 'bg-blue-900/20 border-blue-500/40'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-lg ${urgency.color === '#f44336' ? 'bg-red-500' : urgency.color === '#ff9800' ? 'bg-orange-500' : 'bg-blue-500'}`}>
          {urgency.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-white font-medium">{urgency.title}</h3>
          <p className="text-[#a0a0a0] text-sm">{urgency.description}</p>
        </div>
      </div>
      
      {/* Category context for safety-critical tasks */}
      {categoryContext.priority === 'high' && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#404040]/30">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${categoryContext.color === '#f44336' ? 'bg-red-500' : categoryContext.color === '#ff9800' ? 'bg-orange-500' : 'bg-blue-500'}`}>
            {categoryContext.icon}
          </div>
          <span className="text-[#a0a0a0] text-xs">
            {categoryContext.description}
          </span>
        </div>
      )}
    </div>
  );
};

const ModernTaskForm = ({ task, onSave, onClose, currentMileage }: { task: MaintenanceTask | null, onSave: (task: MaintenanceTask) => void, onClose: () => void, currentMileage?: number }) => {
  const { t, language } = useTranslation();
  const [taskData, setTaskData] = useState<Partial<MaintenanceTask>>(task || {
    title: '',
    category: TaskCategory.Other,
    status: TaskStatus.Upcoming,
    importance: TaskImportance.Recommended,
    dueDate: getISODateString(addMonths(new Date(),1)),
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState({
    title: { isValid: true, message: '' },
    dueMileage: { isValid: true, message: '' }
  });

  useEffect(() => {
    if (task) {
      setTaskData(task);
    } else {
      setTaskData({
        title: '',
        category: TaskCategory.Other,
        status: TaskStatus.Upcoming,
        importance: TaskImportance.Recommended,
        dueDate: getISODateString(addMonths(new Date(),1)),
      });
    }
  }, [task]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [taskData]);

  // Validate form
  const validateForm = () => {
    const newValidation = {
      title: { isValid: true, message: '' },
      dueMileage: { isValid: true, message: '' }
    };

    // Title validation
    if (!taskData.title?.trim()) {
      newValidation.title = { isValid: false, message: t('addTaskModal.titleRequired') };
    }

    // Mileage validation
    if (taskData.dueMileage && currentMileage && taskData.dueMileage <= currentMileage) {
      newValidation.dueMileage = { isValid: false, message: t('addTaskModal.mileageMustBeHigher') };
    }

    setValidation(newValidation);
    return newValidation.title.isValid && newValidation.dueMileage.isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validation[name as keyof typeof validation]) {
      setValidation(prev => ({
        ...prev,
        [name]: { isValid: true, message: '' }
      }));
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const finalTask: MaintenanceTask = {
        ...(task?.id ? { id: task.id } : {}),
        creationDate: task?.creationDate || getISODateString(),
        ...taskData,
        title: taskData.title,
        category: taskData.category || TaskCategory.Other,
        status: taskData.status || TaskStatus.Upcoming,
        cost: taskData.cost ? Number(taskData.cost) : undefined,
        dueMileage: taskData.dueMileage ? Number(taskData.dueMileage) : undefined,
      } as MaintenanceTask;
      
      await onSave(finalTask);
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate mileage helper text
  const getMileageHelperText = () => {
    if (!taskData.dueMileage || !currentMileage) return '';
    
    const gap = taskData.dueMileage - currentMileage;
    if (gap <= 0) return '';
    
    // Estimate months based on average 500 miles/month
    const estimatedMonths = Math.round(gap / 500);
    return `${gap.toLocaleString()} miles to go (≈${estimatedMonths} months at current rate)`;
  };

  return (
    <div className="space-y-4">
      {/* Title Field */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t('task.title')} *
        </label>
        <input
          type="text"
          name="title"
          value={taskData.title || ''}
          onChange={handleChange}
          className={`w-full px-3 py-2 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#707070] focus:outline-none focus:ring-2 focus:ring-[#F7C843] focus:border-transparent ${
            !validation.title.isValid ? 'border-red-500' : 'border-[#404040]'
          }`}
          placeholder={t('task.titlePlaceholder')}
        />
        {!validation.title.isValid && (
          <p className="text-red-400 text-sm mt-1">{validation.title.message}</p>
        )}
      </div>
      
      {/* Date and Mileage Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {t('task.dueDate')}
          </label>
          <input
            type="date"
            name="dueDate"
            value={taskData.dueDate ? String(taskData.dueDate).substring(0,10) : ''}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F7C843] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            {t('task.dueMileage')}
          </label>
          <input
            type="number"
            name="dueMileage"
            value={taskData.dueMileage || ''}
            onChange={handleChange}
            placeholder={t('addTaskModal.dueMileagePlaceholder')}
            className={`w-full px-3 py-2 bg-[#2a2a2a] border rounded-lg text-white placeholder-[#707070] focus:outline-none focus:ring-2 focus:ring-[#F7C843] focus:border-transparent ${
              !validation.dueMileage.isValid ? 'border-red-500' : 'border-[#404040]'
            }`}
          />
          {!validation.dueMileage.isValid && (
            <p className="text-red-400 text-sm mt-1">{validation.dueMileage.message}</p>
          )}
          {getMileageHelperText() && (
            <p className="text-[#a0a0a0] text-sm mt-1">{getMileageHelperText()}</p>
          )}
          <p className="text-[#707070] text-xs mt-1">
            {t('addTaskModal.currentMileageShort')}: {currentMileage?.toLocaleString(language) || t('common.notApplicable')}
          </p>
        </div>
      </div>
      
      {/* Urgency Indicator */}
      <UrgencyIndicatorCard task={taskData} currentMileage={currentMileage} />
      
      {/* Advanced Options */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-[#F7C843] hover:text-[#ffd700] transition-colors"
        >
          {showAdvanced ? <ExpandLessIcon className="w-4 h-4 mr-1" /> : <ExpandMoreIcon className="w-4 h-4 mr-1" />}
          {showAdvanced ? t('addTaskModal.hideMoreOptions') : t('addTaskModal.showMoreOptions')}
        </button>
        
        {showAdvanced && (
          <div className="space-y-3 pl-4 border-l-2 border-[#404040]">
            {/* Category Selector */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('task.category')}
              </label>
              <select
                name="category"
                value={taskData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F7C843] focus:border-transparent"
              >
                {Object.values(TaskCategory).map(category => (
                  <option key={category} value={category}>
                    {t(`taskCategories.${(category || '').replace(/\s+/g, '')}` as any) || category || 'Other'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Importance Selector */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('task.importance')}
              </label>
              <select
                name="importance"
                value={taskData.importance}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#F7C843] focus:border-transparent"
              >
                {Object.values(TaskImportance).map(importance => (
                  <option key={importance} value={importance}>
                    {t(`taskImportances.${(importance || '').replace(/\s+/g, '')}` as any) || importance || 'Recommended'}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Notes Field */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('task.notes')}
              </label>
              <textarea
                name="notes"
                value={taskData.notes || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-white placeholder-[#707070] focus:outline-none focus:ring-2 focus:ring-[#F7C843] focus:border-transparent resize-none"
                placeholder={t('task.notesPlaceholder')}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-[#404040]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="px-4 py-2 border border-[#404040] text-white rounded-lg hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-[#F7C843] text-black font-medium rounded-lg hover:bg-[#ffd700] transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : t('common.save')}
        </button>
      </div>
      
      {/* Keyboard shortcuts hint */}
      <p className="text-[#707070] text-xs text-center">
        💡 Tip: Press Ctrl+Enter to save, Esc to cancel
      </p>
    </div>
  );
};

const bottomSheetVariants = {
  hidden: { y: "100%", opacity: 0.9 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: "spring" as const, stiffness: 130, damping: 22, duration: 0.35 }
  },
  exit: { 
    y: "100%", 
    opacity: 0.9, 
    transition: { duration: 0.25, ease: "anticipate" as const }
  }
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeInOut" as const } }
};

const ModernTaskEditModal: React.FC<AddTaskModalProps> = (props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isOpen, onClose, task, onSaveTask, currentMileage } = props;

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Mobile: use custom bottom sheet, Desktop: use Dialog
  if (isMobile) {
    return (
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          variants={bottomSheetVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] p-4 pt-5 sm:p-6 md:p-8 rounded-t-2xl shadow-2xl w-full h-auto max-h-[90vh] flex flex-col border-t border-s border-e border-[#333333]"
        >
          <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
            <h2 className="text-xl md:text-2xl font-bold text-white font-heading uppercase tracking-wide">
              {task ? 'Edit Task' : 'Add Task'}
            </h2>
            <Button 
              onClick={onClose} 
              variant="outlined"
              color="primary"
              className="text-[#a0a0a0] hover:text-[#F7C843] p-1 md:p-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors" 
              aria-label="Close"
              sx={{ minWidth: 'auto' }}
            >
              <Icons.XMark className="w-5 h-5 md:w-6 md:w-6" strokeWidth={2.5}/>
            </Button>
          </div>

          <div className="overflow-y-auto flex-grow pe-2 -me-2 scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#2a2a2a] pb-2">
            <ModernTaskForm task={task} onSave={onSaveTask} onClose={onClose} currentMileage={currentMileage} />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullScreen={false}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: 4,
          backgroundColor: theme.palette.background.paper,
          margin: 2,
          maxHeight: '80vh',
          minWidth: 360,
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
        <Typography variant="h6">
          {task ? 'Edit Task' : 'Add Task'}
        </Typography>
        <IconButton onClick={onClose} size="large">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <ModernTaskForm task={task} onSave={onSaveTask} onClose={onClose} currentMileage={currentMileage} />
      </DialogContent>
    </Dialog>
  );
};

export default ModernTaskEditModal;
