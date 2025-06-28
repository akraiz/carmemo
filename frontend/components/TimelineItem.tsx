import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MaintenanceTask, RecallInfo, TaskStatus, TaskImportance } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { formatDate, timeAgo, isDateOverdue, daysUntil, getISODateString } from '../utils/dateUtils';
import { Icons, IconMap, DefaultTaskIcon } from './Icon'; 
import { TASK_STATUS_COLORS, TASK_IMPORTANCE_COLORS, COMMON_MAINTENANCE_PRESETS } from '../constants';
import { useTasks } from '../contexts/TaskContext';
import { useToast } from '../contexts/ToastContext';
import { Button, IconButton } from '@mui/material';

type TimelineEvent = 
  | ({ itemType: 'task' } & MaintenanceTask)
  | ({ itemType: 'recall' } & RecallInfo);

interface TimelineItemProps {
  item: TimelineEvent;
  vehicle?: import('../types').Vehicle | null;
}

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  visible: { 
    opacity: 1, y: 0, scale: 1, 
    transition: { type: "spring" as const, stiffness: 110, damping: 18, duration: 0.35 }
  },
  exit: {
    opacity: 0, y: -10, scale: 0.95,
    transition: { duration: 0.2 }
  }
};

const TimelineItem: React.FC<TimelineItemProps> = ({ item, vehicle }) => {
  const { t, language } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [swipeAction, setSwipeAction] = useState<'none' | 'done' | 'delete'>('none');
  const { upsertTask, deleteTask, smartMatchAndArchive } = useTasks();
  const toast = useToast();

  const effectiveVehicle = vehicle || { id: '', make: '', model: '', year: 0, vin: '', maintenanceSchedule: [] };

  // Swipe gesture logic using framer-motion drag
  const handleDragEnd = (event: any, info: any, task: MaintenanceTask) => {
    if (info.offset.x > 80) {
      setSwipeAction('done');
      setTimeout(() => {
        upsertTask({ ...task, status: TaskStatus.Completed });
        smartMatchAndArchive({ ...task, status: TaskStatus.Completed });
        toast.showGenericSuccess('Task completed! 👍');
        setSwipeAction('none');
      }, 200);
    } else if (info.offset.x < -80) {
      setSwipeAction('delete');
      setTimeout(() => {
        deleteTask(task.id);
        toast.showGenericSuccess('Task deleted successfully');
        setSwipeAction('none');
      }, 200);
    } else {
      setSwipeAction('none');
    }
  };

  const renderTaskContent = (task: MaintenanceTask) => {
    const preset = COMMON_MAINTENANCE_PRESETS.find(p => p.title === task.title || p.category === task.category);
    const IconComponent = preset ? IconMap[preset.iconName] || DefaultTaskIcon : IconMap[task.category] || DefaultTaskIcon;
    const statusConfig = TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS[TaskStatus.Upcoming];
    const importanceClass = TASK_IMPORTANCE_COLORS[task.importance || TaskImportance.Recommended] || 'border-[#333333]';
    const hasImage = (task.receipts && task.receipts.length > 0) || (task.photos && task.photos.length > 0);
    const imageUrl = task.receipts && task.receipts.length > 0
      ? task.receipts[0].url
      : (task.photos && task.photos.length > 0 ? task.photos[0].url : undefined);
    // Special styling for overdue forecasted tasks
    const overdueForecastClass = task.isForecast && task.status === TaskStatus.Overdue ? 'border-red-500 shadow-red-500/30' : '';

    return (
      <motion.div
        className={`relative overflow-visible mb-4`}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => handleDragEnd(e, info, task)}
        animate={swipeAction === 'done' ? { x: 100, opacity: 0 } : swipeAction === 'delete' ? { x: -100, opacity: 0 } : { x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Swipe background actions */}
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none z-0">
          <div className="flex-1 flex items-center pl-4">
            <Icons.CheckCircle className="w-7 h-7 text-green-500 opacity-70" />
          </div>
          <div className="flex-1 flex items-center justify-end pr-4">
            <Icons.Trash className="w-7 h-7 text-red-500 opacity-70" />
          </div>
        </div>
        {/* Card content */}
        <div
          className={`relative z-10 bg-[#1c1c1c] p-4 flex items-center gap-3 hover:shadow-xl transition-shadow duration-200`}
          style={{
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            borderLeft: `4px solid ${statusConfig.border.replace('border-', '').replace('[#', '#').replace(']', '')}`,
            border: 'none',
          }}
        >
          <div className="flex-shrink-0 flex flex-col items-center justify-center">
            <span className={`w-14 h-14 rounded-full flex items-center justify-center ring-2 ring-[#1c1c1c] ${task.status === TaskStatus.Completed ? 'bg-green-500 ring-green-600' : task.status === TaskStatus.Overdue ? 'bg-red-500 ring-red-600' : 'bg-[#F7C843] ring-[#e0b330]'}`}> 
              <IconComponent className="w-8 h-8 text-[#0f0f0f]" strokeWidth={2.5}/>
            </span>
            {hasImage && task.status === TaskStatus.Completed && imageUrl && (
              <img src={imageUrl} alt="Receipt" className="w-8 h-8 rounded mt-1 border border-[#333333] object-cover" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className={`text-[15px] font-semibold ${statusConfig.text} ${typeof window !== 'undefined' && window.innerWidth >= 768 ? '' : 'truncate'}`}>{t(task.title || (task as any).item || 'Untitled Task')}</h4>
              {/* Only show one tag at a time: Overdue > Upcoming > Forecasted */}
              {task.status === TaskStatus.Overdue ? (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-red-600 text-white">Overdue</span>
              ) : task.status === TaskStatus.Upcoming ? (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-[#F7C843] text-[#0f0f0f]">Upcoming</span>
              ) : task.isForecast ? (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-blue-700 text-blue-100">Planned</span>
              ) : null}
            </div>
            <p className="text-[13px] text-[#bbbbbb] mb-1 truncate">{t('task.category')}: {t(`taskCategories.${((task.category || 'Other') + '').replace(/\s+/g, '')}` as any, {defaultValue: task.category || 'Other'})}</p>
            {task.dueDate && (
              <p className="text-[13px] font-semibold text-[#F7C843] mb-1">
                Due: <span className={isDateOverdue(task.dueDate) && task.status !== TaskStatus.Completed ? 'text-red-400 font-bold' : 'text-[#F7C843] font-bold'}>{formatDate(task.dueDate, language)}</span>
              </p>
            )}
            {task.dueMileage && <p className="text-[13px] font-semibold text-[#F7C843] mb-1">Due Mileage: <span className="text-white">{task.dueMileage.toLocaleString(language)} {t('common.milesAbbr')}</span></p>}
            {task.completedDate && <p className="text-[13px] text-green-400 mb-1">{t('task.completedDateLabel')} {formatDate(task.completedDate, language)}</p>}
            {task.cost && <p className="text-[13px] text-[#bbbbbb] mb-1">{t('task.cost')}: ${task.cost.toFixed(2)}</p>}
            {task.notes && <p className="text-[13px] text-[#bbbbbb] mt-1 line-clamp-2" title={task.notes}>{task.notes}</p>}
          </div>
          {/* Primary action button, 3-dot menu for others */}
          <div className="flex flex-col items-end gap-2 ml-2">
            <Button
              onClick={() => {
                const newStatus = task.status === TaskStatus.Completed ? TaskStatus.Upcoming : TaskStatus.Completed;
                upsertTask({ ...task, status: newStatus });
                if (newStatus === TaskStatus.Completed) {
                  smartMatchAndArchive({ ...task, status: TaskStatus.Completed });
                  toast.showGenericSuccess('Nice work! Task completed. 👍');
                }
              }}
              variant="contained"
              color="primary"
              size="small"
              sx={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                borderRadius: '50%',
                backgroundColor: '#F7C843',
                color: '#0f0f0f',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                '&:hover': {
                  backgroundColor: '#ffe082',
                  transform: 'scale(1.08)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
              aria-label={task.status === TaskStatus.Completed ? 'Mark as Pending' : 'Mark as Done'}
              title={task.status === TaskStatus.Completed ? 'Mark as Pending' : 'Mark as Done'}
            >
              {task.status === TaskStatus.Completed ? <Icons.XCircle className="w-6 h-6" /> : <Icons.CheckCircle className="w-6 h-6" />}
            </Button>
            
            <IconButton
              onClick={() => setShowMenu(v => !v)}
              color="primary"
              size="small"
              aria-label={t('common.moreOptions')}
              sx={{ width: 44, height: 44 }}
            >
              <Icons.Menu className="w-6 h-6" />
            </IconButton>
          </div>
        </div>
        
        {/* Menu dropdown */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute right-0 mt-2 w-32 bg-[#232323] border border-[#333333] rounded-lg shadow-lg z-50"
            >
              <Button
                fullWidth
                variant="text"
                color="inherit"
                size="small"
                onClick={() => { setShowMenu(false); upsertTask(task); }}
                sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 2, py: 1, fontSize: '0.875rem' }}
              >
                {t('common.edit')}
              </Button>
              <Button
                fullWidth
                variant="text"
                color="error"
                size="small"
                onClick={() => { setShowMenu(false); deleteTask(task.id); toast.showGenericSuccess('Task deleted successfully'); }}
                sx={{ justifyContent: 'flex-start', textAlign: 'left', px: 2, py: 1, fontSize: '0.875rem' }}
              >
                {t('common.delete')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Card hover effect for desktop */}
        <style>{`
          @media (min-width: 768px) {
            .bg-\[\#1c1c1c\]:hover {
              box-shadow: 0 4px 32px 0 rgba(247,200,67,0.10), 0 1.5px 8px 0 rgba(0,0,0,0.10);
              border-color: #F7C843;
              transform: translateY(-1px);
              transition: box-shadow 0.18s, border-color 0.18s, transform 0.18s;
            }
          }
        `}</style>
      </motion.div>
    );
  };

  const renderRecallContent = (recall: RecallInfo) => {
    return (
      <>
        <div className="absolute -start-[calc(0.5rem+1px)] md:-start-[calc(0.75rem+1px)] top-3 w-4 h-4 md:w-5 md:h-5 bg-red-600 rounded-full flex items-center justify-center ring-2 ring-[#1c1c1c] ring-red-700">
            <Icons.AlertTriangle className="w-2 h-2 md:w-2.5 md:h-2.5 text-red-100" strokeWidth={3}/>
        </div>
        <div className="bg-red-700/30 p-3.5 md:p-4 rounded-lg shadow-lg border border-red-600/50">
          {recall.component && <h4 className="text-base md:text-lg font-semibold text-red-200 mb-1.5">{t('viewRecallsModal.component')}: {recall.component}</h4>}
          {recall.nhtsaCampaignNumber || recall.id ? <p className="text-xs text-red-300 mb-0.5">{t('viewRecallsModal.recallID')}: {recall.nhtsaCampaignNumber || recall.id}</p> : null}
          {recall.reportReceivedDate && <p className="text-xs text-red-300 mb-2">{t('viewRecallsModal.reportedDate')}: {formatDate(recall.reportReceivedDate, language)} ({timeAgo(recall.reportReceivedDate, language)})</p>}
          {recall.summary && <div className="mb-2"><p className="text-xs font-semibold text-red-400 uppercase tracking-wider">{t('viewRecallsModal.summary')}</p><p className="text-sm text-red-200 whitespace-pre-wrap">{recall.summary}</p></div>}
          {recall.consequence && <div className="mb-2"><p className="text-xs font-semibold text-red-400 uppercase tracking-wider">{t('viewRecallsModal.consequence')}</p><p className="text-sm text-red-200 whitespace-pre-wrap">{recall.consequence}</p></div>}
          {recall.remedy && <div><p className="text-xs font-semibold text-red-400 uppercase tracking-wider">{t('viewRecallsModal.remedy')}</p><p className="text-sm text-red-200 whitespace-pre-wrap">{recall.remedy}</p></div>}
        </div>
      </>
    );
  };

  return (
    <div className="relative my-2">
      {item.itemType === 'task' ? renderTaskContent(item) : renderRecallContent(item)}
    </div>
  );
};

export default TimelineItem;
