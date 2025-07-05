import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { LucideProps } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';
import { useTasks } from '../../contexts/TaskContext';
import { useToast } from '../../contexts/ToastContext';
import useVehicleManager from '../../hooks/useVehicleManager';
import { Vehicle, MaintenanceTask, TaskCategory, TaskStatus, TaskImportance, ExtractedReceiptInfo, FileAttachment } from '../../types';
import { TASK_STATUS_COLORS, TASK_IMPORTANCE_COLORS, DEFAULT_VEHICLE_IMAGE_URL } from '../../constants';
import { formatDate, getISODateString, isDateOverdue, daysUntil, timeAgo } from '../../utils/dateUtils';
import { Button, IconButton, TextField, Select, MenuItem, FormControl, InputLabel, Box } from '@mui/material';
import CompleteTaskModal from '../modals/CompleteTaskModal';
import { SiFord, SiToyota, SiHonda, SiBmw, SiMercedes, SiChevrolet, SiHyundai, SiKia, SiNissan, SiVolkswagen, SiAudi, SiMazda, SiJeep, SiSubaru, SiTesla, SiPorsche, SiJaguar, SiLandrover, SiMitsubishi, SiPeugeot, SiRenault, SiSuzuki, SiFiat, SiVolvo, SiCitroen, SiRam, SiMini, SiInfiniti, SiAcura, SiCadillac, SiChrysler, SiGmx, SiAlfaromeo, SiSmart, SiSaturn } from 'react-icons/si';
import { IconType } from 'react-icons';

// Animation Variants (moved from App.tsx)
const sectionVariants = {
  hidden: { opacity: 0, y: 20 }, // Reduced y
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 110, // Slightly adjusted
      damping: 22,    // Slightly adjusted
      delay: i * 0.07, // Faster stagger
      duration: 0.6   // Slightly faster overall feel
    }
  })
};

const cardVariants = {
    hidden: { opacity: 0, scale: 0.97, y: 15 }, // Reduced y, slightly less scale
    visible: (i = 0) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: "spring" as const,
            stiffness: 130, // Slightly more energetic
            damping: 18,    // Adjusted damping
            delay: i * 0.04, // Faster stagger
            duration: 0.4   // Slightly faster
        }
    }),
    exit: {
        opacity: 0,
        scale: 0.95, // Consistent with potential entry scale
        y: -5,       // Subtle exit
        transition: { duration: 0.2, ease: "easeOut" as const } // Simpler exit
    }
};

// VehicleDetailItem (moved from App.tsx)
const VehicleDetailItem: React.FC<{labelKey: string, value?: string | number | null; icon?: React.ReactElement<LucideProps>}> = ({labelKey, value, icon}) => {
    const { t } = useTranslation();
    if (!value && typeof value !== 'number') return null;
    return (
        <motion.div
            className="flex items-start py-3.5"
            variants={cardVariants} // Inherits refined cardVariants
        >
            {icon && <div className="me-3 text-[#F7C843] mt-1">{React.cloneElement(icon, { className: "w-4 h-4"})}</div>}
            <div className="flex-1">
                <dt className="font-semibold text-[16px] text-white uppercase tracking-wide font-heading">{t(labelKey)}</dt>
                <dd className="mt-0.5 font-normal text-[14px] text-[#B0B0B0] leading-[1.5]">{String(value)}</dd>
            </div>
        </motion.div>
    );
};

// VehicleInfoViewProps (moved from App.tsx)
export interface VehicleInfoViewProps { 
  vehicle: Vehicle;
  onEditTask: (task: MaintenanceTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskStatus: (taskId: string, newStatus?: TaskStatus, skipEdit?: boolean) => void;
  onAddTask: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onViewRecalls: () => void; 
  mainScrollRef?: React.RefObject<HTMLElement>;
  onUpdateVehiclePhoto: (vehicleId: string, file: File) => void; 
}

const BACKEND_BASE_URL = 'http://localhost:3001';

const makeIconMap: Record<string, IconType> = {
  ford: SiFord,
  toyota: SiToyota,
  honda: SiHonda,
  bmw: SiBmw,
  mercedes: SiMercedes,
  chevrolet: SiChevrolet,
  hyundai: SiHyundai,
  kia: SiKia,
  nissan: SiNissan,
  volkswagen: SiVolkswagen,
  audi: SiAudi,
  mazda: SiMazda,
  jeep: SiJeep,
  subaru: SiSubaru,
  tesla: SiTesla,
  porsche: SiPorsche,
  jaguar: SiJaguar,
  landrover: SiLandrover,
  mitsubishi: SiMitsubishi,
  peugeot: SiPeugeot,
  renault: SiRenault,
  suzuki: SiSuzuki,
  fiat: SiFiat,
  volvo: SiVolvo,
  citroen: SiCitroen,
  ram: SiRam,
  mini: SiMini,
  infiniti: SiInfiniti,
  acura: SiAcura,
  cadillac: SiCadillac,
  chrysler: SiChrysler,
  gmc: SiGmx,
  alfaromeo: SiAlfaromeo,
  smart: SiSmart,
  saturn: SiSaturn,
};

const getBrandIcon = (make?: string) => {
  if (!make) return Icons.Car;
  const key = make.toLowerCase().replace(/[^a-z]/g, '');
  return makeIconMap[key] || Icons.Car;
};

const getVehicleImageUrl = (vehicle: Vehicle) => {
  if (vehicle.imageId) return `${BACKEND_BASE_URL}/api/vehicles/${vehicle._id}/image`;
  return null; // Use icon fallback
};

// VehicleInfoView Component (moved from App.tsx)
const VehicleInfoView: React.FC<VehicleInfoViewProps> = ({ 
    vehicle, onEditTask, onDeleteTask, onToggleTaskStatus, 
    onAddTask, onEditVehicle, onViewRecalls, mainScrollRef,
    onUpdateVehiclePhoto
}) => {
  const [showAllSpecs, setShowAllSpecs] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const { t, language } = useTranslation();
  const vehicleManager = useVehicleManager();
  const {
    showCompleteTaskModal,
    completingTask,
    handleCloseCompleteTaskModal,
    handleCompleteTask,
  } = vehicleManager as ReturnType<typeof useVehicleManager> & {
    showCompleteTaskModal: boolean;
    completingTask: MaintenanceTask | null;
    handleCloseCompleteTaskModal: () => void;
    handleCompleteTask: (taskUpdate: Partial<MaintenanceTask>) => void;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    const handleScroll = () => {
        if (showExportDropdown) {
            setShowExportDropdown(false);
        }
    };

    const scrollableElement = mainScrollRef?.current;
    if (scrollableElement) {
        scrollableElement.addEventListener("scroll", handleScroll);
    }

    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        if (scrollableElement) {
            scrollableElement.removeEventListener("scroll", handleScroll);
        }
    };
  }, [showExportDropdown, mainScrollRef]);

  const sortedTasks = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return (vehicle.maintenanceSchedule || [])
      .filter(task => {
        // Only show tasks that are not completed or skipped.
        if (task.status === TaskStatus.Completed || task.status === TaskStatus.Skipped) {
          return false;
        }

        const isDueThisMonth = task.dueDate && (new Date(task.dueDate) >= startOfMonth && new Date(task.dueDate) <= endOfMonth);
        const isCurrentlyOverdue = task.dueDate && isDateOverdue(task.dueDate);

        // The main filter condition: task must be overdue or due this month.
        const timelineFilter = isDueThisMonth || isCurrentlyOverdue;

        return timelineFilter;
      })
      .sort((a, b) => {
        const statusOrder = [TaskStatus.Overdue, TaskStatus.Upcoming, TaskStatus.InProgress, TaskStatus.Completed, TaskStatus.Skipped];
        const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        if (statusDiff !== 0) return statusDiff;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
      });
  }, [vehicle.maintenanceSchedule, t]);

  const generateExportContent = (format: 'txt' | 'csv' | 'json'): string => {
     if (format === 'json') {
      const vehicleToExport = {
        ...vehicle,
        maintenanceSchedule: vehicle.maintenanceSchedule.map(task => ({
          ...task,
          title: t(task.title), 
          category: t(`taskCategories.${task.category || ''}` as any, { defaultValue: task.category }),
        }))
      };
      return JSON.stringify(vehicleToExport, null, 2);
    } else if (format === 'csv') {
      let csvContent = `${t('export.csvHeader.id')},${t('export.csvHeader.title')},${t('export.csvHeader.category')},${t('export.csvHeader.status')},${t('export.csvHeader.importance')},${t('export.csvHeader.dueDate')},${t('export.csvHeader.dueMileage')},${t('export.csvHeader.completedDate')},${t('export.csvHeader.cost')},${t('export.csvHeader.notes')},${t('export.csvHeader.parts')},${t('export.csvHeader.creationDate')},${t('export.csvHeader.recurrence')}\n`;
      (vehicle.maintenanceSchedule || []).forEach(task => {
        const partsString = (task.parts || []).map(p => `${p.quantity}x ${p.name}${p.partNumber ? ` (${p.partNumber})` : ''}`).join('; ');
        const row = [
          task.id,
          t(task.title),
          t(`taskCategories.${task.category || ''}` as any, { defaultValue: task.category }),
          t(`taskStatuses.${task.status || ''}` as any, { defaultValue: task.status }),
          t(`taskImportances.${task.importance || TaskImportance.Recommended}` as any, { defaultValue: task.importance || TaskImportance.Recommended }),
          task.dueDate ? formatDate(task.dueDate, language) : '',
          task.dueMileage || '',
          task.completedDate ? formatDate(task.completedDate, language) : '',
          task.cost || '',
          task.notes || '',
          partsString,
          formatDate(task.creationDate, language),
          task.recurrenceInterval || ''
        ].map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',');
        csvContent += row + '\n';
      });
      return csvContent;
    } else { // txt format
      let txtContent = `${t('export.txtHeader.logFor')}: ${vehicle.nickname || `${vehicle.make} ${vehicle.model} (${vehicle.year})`}\n`;
      txtContent += `${t('export.txtHeader.currentMileage')}: ${vehicle.currentMileage?.toLocaleString(language) || t('common.notApplicable')} ${t('common.miles')}\n`;
      txtContent += `VIN: ${vehicle.vin || t('common.notApplicable')}\n\n`;

      txtContent += `${t('export.txtHeader.vehicleSpecs')}:\n`;
      const specsToTxt = [
        { labelKey: 'vehicle.trim', value: vehicle.trim },
        { labelKey: 'vehicle.driveType', value: vehicle.driveType },
        { labelKey: 'vehicle.primaryFuelType', value: vehicle.primaryFuelType },
        { labelKey: 'vehicle.engineDisplacementL', value: vehicle.engineDisplacementL },
        { labelKey: 'vehicle.engineBrakeHP', value: vehicle.engineBrakeHP ? `${vehicle.engineBrakeHP} HP` : null },
        { labelKey: 'vehicle.cylinders', value: vehicle.cylinders },
      ];
      specsToTxt.forEach(spec => {
        if (spec.value) {
          txtContent += `${t(spec.labelKey)}: ${spec.value}\n`;
        }
      });
      txtContent += "\n";

      txtContent += `${t('maintenance.timelineTitle')}:\n`;
      txtContent += "--------------------------------------\n";
      (vehicle.maintenanceSchedule || []).forEach(task => {
        txtContent += `${t('task.title')}: ${t(task.title)}\n`;
        txtContent += `${t('task.category')}: ${t(`taskCategories.${task.category || ''}` as any, { defaultValue: task.category })}\n`;
        txtContent += `${t('task.status')}: ${t(`taskStatuses.${task.status || ''}` as any, { defaultValue: task.status })}\n`;
        if (task.dueDate) txtContent += `${t('task.dueDate')}: ${formatDate(task.dueDate, language)}\n`;
        if (task.dueMileage) txtContent += `${t('task.dueMileage')}: ${task.dueMileage.toLocaleString(language)} ${t('common.miles')}\n`;
        if (task.completedDate) txtContent += `${t('task.completedDate')}: ${formatDate(task.completedDate, language)}\n`;
        if (task.cost) txtContent += `${t('task.cost')}: $${task.cost.toFixed(2)}\n`;
        if (task.notes) txtContent += `${t('task.notes')}: ${task.notes}\n`;
        txtContent += "--------------------------------------\n";
      });
      return txtContent;
    }
  };

  const handleExport = (format: 'txt' | 'csv' | 'json') => {
    const content = generateExportContent(format);
    const safeNickname = vehicle.nickname ? vehicle.nickname.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
    const safeMakeModel = `${vehicle.make || ''}_${vehicle.model || ''}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const baseFilename = safeNickname || safeMakeModel;
    const filename = `${baseFilename}_maintenance_log.${format}`;
    const blob = new Blob([content], { type: `text/${format === 'json' ? 'json' : format};charset=utf-8;` });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };
  
  const basicSpecs = [
    { labelKey: 'vehicle.vin', value: vehicle.vin, icon: <Icons.Wrench /> },
    { labelKey: 'vehicle.currentMileageLabel', value: `${vehicle.currentMileage?.toLocaleString(language) || t('common.notApplicable')} ${t('common.milesAbbr')}`, icon: <Icons.Fuel /> },
    { labelKey: 'vehicle.trim', value: vehicle.trim, icon: <Icons.Car /> },
    { labelKey: 'vehicle.driveType', value: vehicle.driveType, icon: <Icons.Settings2 /> },
    { labelKey: 'vehicle.engineDisplacementL', value: vehicle.engineDisplacementL, icon: <Icons.Wrench /> },
  ];

  const allSpecs = [
    ...basicSpecs,
    { labelKey: 'vehicle.primaryFuelType', value: vehicle.primaryFuelType, icon: <Icons.Fuel /> },
    { labelKey: 'vehicle.secondaryFuelType', value: vehicle.secondaryFuelType, icon: <Icons.Fuel /> },
    { labelKey: 'vehicle.engineBrakeHP', value: vehicle.engineBrakeHP ? `${vehicle.engineBrakeHP} HP` : null, icon: <Icons.Wrench /> },
    { labelKey: 'vehicle.transmissionStyle', value: vehicle.transmissionStyle, icon: <Icons.Settings2 /> },
    { labelKey: 'vehicle.gvwr', value: vehicle.gvwr, icon: <Icons.Car /> },
    { labelKey: 'vehicle.cylinders', value: vehicle.cylinders, icon: <Icons.Wrench /> },
    { labelKey: 'vehicle.electrificationLevel', value: vehicle.electrificationLevel, icon: <Icons.Battery /> },
    { labelKey: 'vehicle.engineModel', value: vehicle.engineModel, icon: <Icons.Wrench /> },
    { labelKey: 'vehicle.bodyClass', value: vehicle.bodyClass, icon: <Icons.Car /> },
    { labelKey: 'vehicle.doors', value: vehicle.doors, icon: <Icons.Car /> },
    { labelKey: 'vehicle.engineConfiguration', value: vehicle.engineConfiguration, icon: <Icons.Wrench /> },
    { labelKey: 'vehicle.manufacturerName', value: vehicle.manufacturerName, icon: <Icons.Car /> },
    { labelKey: 'vehicle.plantCountry', value: vehicle.plantCountry, icon: <Icons.Car /> },
    { labelKey: 'vehicle.plantState', value: vehicle.plantState, icon: <Icons.Car /> },
    { labelKey: 'vehicle.plantCity', value: vehicle.plantCity, icon: <Icons.Car /> },
  ];

  const specsToDisplay = showAllSpecs ? allSpecs : basicSpecs.slice(0, 5);

  const imageUrl = getVehicleImageUrl(vehicle);
  const BrandIcon = getBrandIcon(vehicle.make);

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-2 md:px-0 space-y-4 md:space-y-6 pt-6 md:pt-8"
      style={{ paddingBottom: '120px' }}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.08 } } }} 
    >
      {/* Vehicle Header Section */}
      <motion.section variants={sectionVariants} aria-labelledby="vehicle-header" className="bg-[#1c1c1c] p-4 md:p-6 rounded-xl shadow-xl border border-[#333333]">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6">
          <div className="relative group flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={vehicle.nickname || vehicle.model}
                className="w-28 h-28 md:w-36 md:h-36 rounded-lg object-cover border-2 border-[#333333] shadow-lg"
              />
            ) : (
              <BrandIcon size={144} color="#9ca3af" />
            )}
          </div>
          <div className="flex-grow text-center sm:text-start">
            <h2 id="vehicle-header" className="font-bold text-[28px] tracking-[0.5px] text-[#FFD700] font-heading">
              {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
            </h2>
            <p className="font-normal text-[14px] text-[#B0B0B0] leading-[1.5]">{vehicle.year}</p>
            {vehicle.recalls && vehicle.recalls.length > 0 && (
                <Button 
                    onClick={onViewRecalls}
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<Icons.AlertTriangle className="w-3.5 h-3.5" />}
                    aria-label={t('vehicle.viewRecallsAria', { count: vehicle.recalls.length })}
                    sx={{ mt: 2, fontWeight: 'bold' }}
                >
                    {t('vehicle.recallAlertBadge', { count: vehicle.recalls.length })}
                </Button>
            )}
            <div className="mt-3 md:mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                <Button 
                  onClick={() => onEditVehicle(vehicle)} 
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<Icons.Pencil className="w-3.5 h-3.5" />}
                  aria-label={t('vehicle.editDetailsAria')}
                  sx={{ fontWeight: 'bold' }}
                >
                  {t('vehicle.editDetails')}
                </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 md:mt-5 border-t border-[#333333] pt-4 md:pt-5">
            <h3 className="font-semibold text-[16px] text-white uppercase tracking-wide mb-2 font-heading">{t('vehicle.specifications')}</h3>
            <motion.dl 
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-0"
                initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } }}} 
            >
              {specsToDisplay.map((item, idx) => (
                <VehicleDetailItem key={item.labelKey || `spec-${idx}`} labelKey={item.labelKey} value={item.value} icon={item.icon} />
              ))}
            </motion.dl>
            {allSpecs.length > basicSpecs.slice(0,5).length && ( 
                <Button 
                    onClick={() => setShowAllSpecs(!showAllSpecs)} 
                    variant="text"
                    color="primary"
                    size="small"
                    endIcon={<Icons.ChevronDown className={`w-3 h-3 transition-transform ${showAllSpecs ? 'rotate-180' : ''}`} />}
                    sx={{ mt: 2, fontSize: '0.75rem', fontWeight: 'medium' }}
                >
                    {showAllSpecs ? t('common.showLess') : t('common.showAll')}
                </Button>
            )}
        </div>
      </motion.section>

      {/* Maintenance Tasks Section */}
      <motion.section variants={sectionVariants} aria-labelledby="maintenance-section-title">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-3 md:mb-4">
          <h3 id="maintenance-section-title" className="text-xl md:text-2xl font-semibold text-white font-heading uppercase tracking-wide">Next Maintenance</h3>
          {sortedTasks.filter(t => t.status === TaskStatus.Upcoming || t.status === TaskStatus.Overdue).length === 0 ? (
            <span className="text-sm text-[#a0a0a0] mt-1 sm:mt-0">All caught up!</span>
          ) : (
            <p className="text-sm text-[#a0a0a0] mt-1 sm:mt-0">{t('maintenance.upcomingTasksCount', { count: sortedTasks.filter(t => t.status === TaskStatus.Upcoming || t.status === TaskStatus.Overdue).length })}</p>
          )}
        </div>

        {sortedTasks.length === 0 ? (
          <motion.div 
            className="text-center py-8 md:py-12 bg-[#1c1c1c] rounded-lg border border-dashed border-[#333333]"
            initial={{opacity:0, y:20}} animate={{opacity:1, y:0, transition: {delay:0.1, duration:0.3}}}
          >
            <Icons.Search className="w-12 h-12 text-[#404040] mx-auto mb-3" strokeWidth={1}/>
            <p className="text-[#a0a0a0]">{`Your ${vehicle.make} ${vehicle.model} is up to date with maintenance.`}</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
                initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 }}}}> 
              {sortedTasks.map((task, index) => (
                <motion.div 
                    key={task.id}
                    variants={cardVariants}
                    custom={index}
                    layout
                    className={`bg-[#1c1c1c] p-4 flex flex-col justify-between`}
                    style={{
                      borderLeft: `4px solid ${(TASK_STATUS_COLORS[task.status]?.border || '').replace('border-', '').replace('[#', '#').replace(']', '')}`,
                      border: '1px solid #333333',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                >
                    <div className="flex justify-between items-start mb-2">
                        <h4 className={`font-semibold ${TASK_STATUS_COLORS[task.status]?.text || 'text-white'}`}>{t(task.title)}</h4>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${TASK_STATUS_COLORS[task.status]?.pillBg || 'bg-[#404040]'} ${TASK_STATUS_COLORS[task.status]?.pillText || 'text-[#cfcfcf]'}`}>{t(`taskStatuses.${task.status || ''}` as any, { defaultValue: task.status })}</span>
                    </div>
                    <p className="font-normal text-[14px] text-[#B0B0B0] leading-[1.5] mb-1">
                      {t(`taskCategories.${task.category || ''}` as any) !== `taskCategories.${task.category || ''}`
                        ? t(`taskCategories.${task.category || ''}` as any)
                        : (task.category || 'Other')}
                    </p>
                    {task.dueDate && (
                        <p className="text-xs text-[#a0a0a0]">
                            {t('task.dueDateLabel')}{' '}
                            <span className={isDateOverdue(task.dueDate) && task.status !== TaskStatus.Completed ? 'text-red-400 font-semibold' : 'text-[#cfcfcf]'}>
                                {formatDate(task.dueDate, language)}
                            </span>
                        </p>
                    )}
                    {task.dueMileage && <p className="text-xs text-[#a0a0a0]">{t('task.dueMileage')}: {task.dueMileage.toLocaleString(language)} {t('common.milesAbbr')}</p>}
                    {task.completedDate && <p className="text-xs text-green-400">{t('task.completedDateLabel')} {formatDate(task.completedDate, language)}</p>}
                    {task.notes && <p className="text-xs text-[#707070] mt-2 line-clamp-2" title={task.notes}>{task.notes}</p>}
                    <div className="mt-3 pt-3 border-t border-[#333333]/50 flex items-center justify-end space-x-2 rtl:space-x-reverse">
                        <Button onClick={() => onToggleTaskStatus(task.id)} variant="contained" color={task.status === TaskStatus.Completed ? 'warning' : 'success'} size="small" sx={{ fontWeight: 'bold' }}>
                            {task.status === TaskStatus.Completed ? t('task.markPending') : t('task.markDone')}
                        </Button>
                        <Button onClick={() => onEditTask(task)} variant="outlined" color="primary" size="small" startIcon={<Icons.Pencil className="w-3 h-3" />} sx={{ fontWeight: 'bold' }}>
                            {t('common.edit')}
                        </Button>
                        <Button onClick={() => onDeleteTask(task.id)} variant="outlined" color="error" size="small" startIcon={<Icons.Trash className="w-3 h-3" />} sx={{ fontWeight: 'bold' }}>
                            {t('common.delete')}
                        </Button>
                    </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.section>
      <CompleteTaskModal
        isOpen={showCompleteTaskModal}
        onClose={handleCloseCompleteTaskModal}
        onComplete={handleCompleteTask}
        task={completingTask || { id: '', title: '', category: TaskCategory.Other, status: TaskStatus.Upcoming, creationDate: '' }}
      />
    </motion.div>
  );
};

export default VehicleInfoView;