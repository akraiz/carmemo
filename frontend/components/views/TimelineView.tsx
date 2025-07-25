import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Popover,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import FilterListIcon from '@mui/icons-material/FilterList';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {
  CheckCircle,
  Wrench,
  RotateCcw,
  Shield,
  FileText,
  Car,
  X,
} from 'lucide-react';
import {
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TaskAlt as TaskAltIcon,
} from '@mui/icons-material';

import {
  Vehicle,
  MaintenanceTask,
  TaskCategory,
  TaskStatus,
} from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { useToast } from '../../contexts/ToastContext';
import { isDateOverdue, daysUntil, getPredictiveDueText, getShortRelativeDate, formatDate } from '../../utils/dateUtils';
import { IconMap, DefaultTaskIcon } from '../Icon';
import OverdueAlertBanner from '../shared/OverdueAlertBanner';
// REMOVE: import useVehicleManagement from '../../hooks/useVehicleManagement';

const FilterIcon = () => <FilterListIcon sx={{ fontSize: 20 }} />;

// --- TYPES & CONSTANTS ---
// This is no longer needed as we filter by category directly
// and handle 'overdue' with a separate boolean state.

// --- HOOKS ---
const useSmartTaskGrouping = (
  tasks: MaintenanceTask[],
  isOverdueFiltered: boolean,
  activeCategory: TaskCategory | null
) => {
  const filtered = useMemo(() => {
    let tempTasks = tasks;

    // 1. Apply overdue filter first if it's active
    if (isOverdueFiltered) {
      tempTasks = tempTasks.filter(
        (t) => t.status === TaskStatus.Overdue
      );
    }

    // 2. Then, apply category filter if it's active
    if (activeCategory) {
      tempTasks = tempTasks.filter((t) => t.category === activeCategory);
    }
    
    return tempTasks;
  }, [tasks, isOverdueFiltered, activeCategory]);

  return useMemo(
    () => ({
      upcoming: filtered
        .filter((t) => t.status !== TaskStatus.Completed)
        .sort(
          (a, b) =>
            new Date(a.dueDate || 0).getTime() -
            new Date(b.dueDate || 0).getTime()
        ),
      completed: filtered
        .filter((t) => t.status === TaskStatus.Completed)
        .sort(
          (a, b) =>
            new Date(b.completedDate || 0).getTime() -
            new Date(a.completedDate || 0).getTime()
        ),
    }),
    [filtered]
  );
};

// A simple hook to detect mobile screen sizes
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

// --- PROPS INTERFACE ---
interface TimelineViewProps {
  vehicle: Vehicle | null;
  onCompleteTask?: (taskId: string) => void;
  onEditTask?: (task: MaintenanceTask) => void;
  onDeleteTask?: (taskId: string) => void;
  isFilterMenuOpen: boolean;
  onOpenFilterMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onCloseFilterMenu: () => void;
  refreshVehicleData?: () => void; // Add this prop
}

// Remove bottomSheetVariants and backdropVariants

// --- LOCAL COMPONENTS ---
const SegmentedToggle: React.FC<{
  activeTab: 'upcoming' | 'completed';
  onTabChange: (tab: 'upcoming' | 'completed') => void;
  upcomingCount: number;
  completedCount: number;
}> = ({ activeTab, onTabChange, upcomingCount, completedCount }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const activeColor = theme.palette.primary.main;
  const inactiveColor = theme.palette.text.secondary;

  const tabStyle = {
    borderRadius: 0,
    backgroundColor: 'transparent !important',
    padding: '12px 20px',
    fontWeight: 400,
    fontSize: '14px',
    letterSpacing: 'normal',
    textTransform: 'none' as const,
    color: inactiveColor,
    borderBottom: '2px solid transparent',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05) !important',
    },
  };

  const activeTabStyle = {
    ...tabStyle,
    borderBottom: `2px solid ${activeColor}`,
    color: activeColor,
    fontWeight: 600,
    backgroundColor: 'transparent !important',
    '&:hover': {
      backgroundColor: 'transparent !important',
    },
  };
  
  const countStyle = {
    marginLeft: '8px',
    fontWeight: 600,
    color: inactiveColor,
    display: 'inline',
  };

  const activeCountStyle = {
    ...countStyle,
    color: activeColor,
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Button 
        onClick={() => onTabChange('upcoming')} 
        sx={activeTab === 'upcoming' ? activeTabStyle : tabStyle}
      >
        {t('timeline.upcoming')} <Typography component="span" sx={activeTab === 'upcoming' ? activeCountStyle : countStyle}>{upcomingCount}</Typography>
      </Button>
      <Button
        onClick={() => onTabChange('completed')} 
        sx={activeTab === 'completed' ? activeTabStyle : tabStyle}
      >
        {t('timeline.completed')} <Typography component="span" sx={activeTab === 'completed' ? activeCountStyle : countStyle}>{completedCount}</Typography>
      </Button>
    </Box>
  );
};

const OutlookStyleTaskCard: React.FC<{
  task: MaintenanceTask;
  onComplete: (task: MaintenanceTask) => void;
  onEdit: (task: MaintenanceTask) => void;
  onDelete: (taskId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ task, onComplete, onEdit, onDelete, isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isOverdue = task.status !== TaskStatus.Completed && task.dueDate ? isDateOverdue(task.dueDate) : false;
  const [showFullNote, setShowFullNote] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);
  const [noteClamped, setNoteClamped] = useState(false);

  useEffect(() => {
    if (noteRef.current) {
      setNoteClamped(noteRef.current.scrollHeight > noteRef.current.clientHeight + 2);
    }
  }, [task.notes, showFullNote]);
  
  const TaskIcon = IconMap[task.category] || DefaultTaskIcon;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onToggleExpand();
  };

  const handleComplete = (e: React.MouseEvent) => { e.stopPropagation(); onComplete({ ...task, status: TaskStatus.Completed }); };
  const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(task); };
  const handleDeleteClick = (e: React.MouseEvent) => { e.stopPropagation(); setShowDeleteDialog(true); };
  const handleDeleteConfirm = () => { onDelete(task.id); setShowDeleteDialog(false); };

  return (
    <>
      <Box sx={{ 
        backgroundColor: 'background.paper', 
        borderRadius: 2, 
        mb: 2, 
        overflow: 'hidden', 
        border: '1px solid', 
        borderColor: isExpanded ? 'primary.main' : 'transparent', 
        transition: 'border-color 0.3s ease' 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, px: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } }} onClick={handleCardClick}>
          {/* Status Dot */}
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isOverdue ? '#F9E4A9' : 'transparent' }} />
          
          {/* Icon */}
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TaskIcon style={{ color: '#FFFFFF' }} />
          </Box>

          {/* Main Content */}
          <Box flex={1} minWidth={0}>
            <Typography variant="body1" sx={{ fontWeight: 500, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {task.title.startsWith('task.') ? t(task.title) : task.title}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 400, color: 'primary.main' }}>
              {task.status !== TaskStatus.Completed
                ? getPredictiveDueText(task.dueDate)
                : (task.completedDate
                    ? `${t('timeline.completedOn')} ${formatDate(task.completedDate)}`
                    : t('timeline.completed'))}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 400, color: '#A0A0A0' }}>
              {t(`taskCategories.${(task.category || '').replace(/[-\s]+/g, '')}` as any, { defaultValue: task.category || 'Other' })}
            </Typography>
            {task.status === TaskStatus.Completed && task.cost !== undefined && (
              <Typography variant="body2" sx={{ fontWeight: 400, color: '#bbbbbb' }}>
                Cost: ${task.cost.toFixed(2)}
              </Typography>
            )}
            {task.status === TaskStatus.Completed && task.notes && (
              <div
                ref={noteRef}
                style={{
                  fontWeight: 400,
                  color: '#bbbbbb',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-line',
                  display: '-webkit-box',
                  WebkitLineClamp: showFullNote ? 'unset' : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: showFullNote ? 'visible' : 'hidden',
                  textOverflow: showFullNote ? 'unset' : 'ellipsis',
                  cursor: noteClamped ? 'pointer' : 'default',
                  fontSize: '1rem',
                  marginBottom: 0
                }}
              >
                Note: {task.notes}
              </div>
            )}
          </Box>

          {/* Timestamp */}
          <Typography variant="caption" sx={{ color: '#A0A0A0', alignSelf: 'flex-start', mt: 0.5 }}>
            {getShortRelativeDate(task.dueDate || task.creationDate)}
          </Typography>
        </Box>

        {/* Expanded Actions Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
              <Divider />
              <Box sx={{ padding: '8px 16px', display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                {task.status !== TaskStatus.Completed && (
                  <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={handleComplete} color="success" size="small">
                    {t('timeline.complete')}
                  </Button>
                )}
                <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit} color="primary" size="small">
                  {t('timeline.edit')}
                </Button>
                <IconButton onClick={handleDeleteClick} color="error" size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>{t('timeline.deleteTask')}</DialogTitle>
        <DialogContent><Typography>{t('timeline.deleteConfirmation')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>{t('timeline.cancel')}</Button>
          <Button onClick={handleDeleteConfirm} color="error">{t('timeline.delete')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const EmptyState: React.FC<{
  message: string;
  onClearFilter?: () => void;
}> = ({ message, onClearFilter }) => {
  const { t } = useTranslation();
  return (
  <Box textAlign="center" py={10} px={2}>
    <TaskAltIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
    <Typography variant="h6" color="text.primary" gutterBottom>{message}</Typography>
    <Typography color="text.secondary">{t('timeline.tryAdjusting')}</Typography>
    {onClearFilter && <Button variant="outlined" onClick={onClearFilter} sx={{ mt: 2 }}>{t('timeline.clearFilter')}</Button>}
  </Box>
  );
};

// --- MAIN COMPONENT: TimelineView ---
const TimelineView: React.FC<TimelineViewProps> = ({
  vehicle,
  onCompleteTask,
  onEditTask,
  onDeleteTask,
  isFilterMenuOpen,
  onOpenFilterMenu,
  onCloseFilterMenu,
  refreshVehicleData, // Use this prop
}) => {
  // DEBUG LOGGING START
  // Import TaskStatus if not already
  // import { TaskStatus } from '../../types';
  // We'll try to get TaskStatus.Overdue value for comparison
  let taskStatusOverdueValue = undefined;
  try {
    // @ts-ignore
    taskStatusOverdueValue = TaskStatus?.Overdue;
  } catch (e) {}
  const { t } = useTranslation();
  const theme = useTheme();
  const toast = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  const [activeCategory, setActiveCategory] = useState<TaskCategory | null>(null);
  const [isUpcomingOverdueFiltered, setIsUpcomingOverdueFiltered] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [headerBottom, setHeaderBottom] = useState(0);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const tasks = vehicle?.maintenanceSchedule || [];
  const upcoming = useMemo(() => {
    let filtered = tasks.filter((t) => t.status !== TaskStatus.Completed);
    if (isUpcomingOverdueFiltered) {
      filtered = filtered.filter(
        (t) => t.status !== TaskStatus.Completed && t.dueDate && isDateOverdue(t.dueDate)
      );
    }
    if (activeCategory) {
      filtered = filtered.filter((t) => t.category === activeCategory);
    }
    return filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1; // a goes after b
      if (!b.dueDate) return -1; // b goes after a
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [tasks, isUpcomingOverdueFiltered, activeCategory]);
  const completed = useMemo(() => {
    let filtered = tasks.filter((t) => t.status === TaskStatus.Completed);
    if (activeCategory) {
      filtered = filtered.filter((t) => t.category === activeCategory);
    }
    return filtered.sort((a, b) => new Date(b.completedDate || 0).getTime() - new Date(a.completedDate || 0).getTime());
  }, [tasks, activeCategory]);

  const dynamicFilters = useMemo(() => {
    const baseTasks = activeTab === 'upcoming' 
      ? (vehicle?.maintenanceSchedule || []).filter(t => t.status !== TaskStatus.Completed) 
      : (vehicle?.maintenanceSchedule || []).filter(t => t.status === TaskStatus.Completed);
      
    const tasksToSourceCategories = isUpcomingOverdueFiltered
      ? baseTasks.filter(t => t.dueDate && isDateOverdue(t.dueDate))
      : baseTasks;

    const categories = [...new Set(tasksToSourceCategories.map(t => t.category))];
    
    return categories
      .filter(category => category && category.trim() !== '') // Filter out empty categories
      .map(category => {
        const Icon = IconMap[category] || DefaultTaskIcon;
        return {
          id: category,
          label: t(`taskCategories.${(category || '').replace(/[\s-]/g, '')}` as any) || category || 'Other',
          icon: <Icon />
        };
      });
  }, [activeTab, vehicle?.maintenanceSchedule, isUpcomingOverdueFiltered, t]);

  const handleOpenFilterMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    onOpenFilterMenu(event);
  };

  const handleCloseFilterMenu = () => {
    setAnchorEl(null);
    onCloseFilterMenu();
  };

  const handleApplyCategoryFilter = (category: TaskCategory | null) => {
    setActiveCategory(category);
    handleCloseFilterMenu();
  };
  
  const handleToggleOverdueFilter = () => {
    setIsUpcomingOverdueFiltered(prev => !prev);
  };

  // Replace handleToggleTask to only trigger the completion modal, not update status or show toast
  const handleToggleTask = (taskId: string) => {
    // Instead of updating status and showing toast, call onCompleteTask with the taskId only if you want to open the modal
    onCompleteTask?.(taskId);
    // REMOVE: toast.showGenericSuccess('Task status updated!');
  };

  const renderContent = () => {
    if (!vehicle) {
      return (
        <EmptyState
          message={t('timelineView.noVehicleSelected')}
        />
      );
    }

    const tasksToShow = activeTab === 'upcoming' ? upcoming : completed;
    
    // Safety check: filter out tasks with empty IDs and ensure all tasks have valid IDs
    const validTasks = tasksToShow.map(task => {
      // Handle both 'id' and '_id' fields from backend
      let taskId = task.id || task._id;
      
      if (!taskId || taskId.toString().trim() === '') {
        console.warn('Found task with empty ID:', task);
        // Generate a new ID for tasks without one
        taskId = self.crypto.randomUUID();
        return { ...task, id: taskId };
      }
      
      // Ensure the task has an 'id' field for consistency
      return task.id && task.id.trim().length > 0 ? task : { ...task, id: taskId };
    }).filter(task => task && task.id); // Final safety check

    if (validTasks.length === 0) {
      const message = activeTab === 'upcoming' 
        ? t('timelineView.noUpcomingTasks')
        : t('timelineView.noCompletedTasks');
      return (
        <EmptyState
          message={message}
          onClearFilter={() => {
            setActiveCategory(null);
            setIsUpcomingOverdueFiltered(false);
          }}
        />
      );
    }
    return (
      <AnimatePresence>
        {validTasks.map((task: MaintenanceTask) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <OutlookStyleTaskCard
              task={task}
              onComplete={(task) => onEditTask && onEditTask({ ...task, status: TaskStatus.Completed })}
              onEdit={onEditTask!}
              onDelete={onDeleteTask!}
              isExpanded={expandedTaskId === task.id}
              onToggleExpand={() =>
                setExpandedTaskId((prev) => (prev === task.id ? null : task.id))
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>
    );
  };
  
  useEffect(() => {
    if (headerRef.current && containerRef.current) {
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const headerTop = headerRef.current.getBoundingClientRect().top;
      const headerHeight = headerRef.current.offsetHeight;
      
      setHeaderBottom(headerTop - containerTop + headerHeight);
    }
  }, [headerRef.current, containerRef.current]);

  // Replace the overdue banner logic to match the visual indicator (solid point) logic
  // Show the banner if any task is overdue by date (not completed and dueDate in the past)
  const overdueTasks = vehicle && vehicle.maintenanceSchedule
    ? vehicle.maintenanceSchedule.filter(
        t => t.status !== TaskStatus.Completed && t.dueDate && isDateOverdue(t.dueDate)
      )
    : [];

  return (
    <Box ref={containerRef} sx={{ p: 2, pb: isMobile ? '72px' : '80px', backgroundColor: '#121212', minHeight: '100%', position: 'relative' }}>
      <Box
        ref={headerRef}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          gap: 1,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          position: 'relative',
          zIndex: 20
        }}
      >
        <SegmentedToggle
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          upcomingCount={upcoming.length}
          completedCount={completed.length}
        />
        <Box>
          {activeCategory ? (
            <Button
              variant="contained"
              onClick={() => handleApplyCategoryFilter(null)}
              endIcon={<HighlightOffIcon />}
              sx={{
                borderRadius: '2px',
                padding: '8px 12px',
                fontSize: '14px',
                textTransform: 'none',
                backgroundColor: 'primary.main',
                boxShadow: 'none',
              }}
            >
              {t(`taskCategories.${(activeCategory || '').replace(/[\s-]/g, '')}` as any) || activeCategory || 'Other'}
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={handleOpenFilterMenu}
              sx={{
                border: 'none',
                backgroundColor: theme.palette.background.paper,
                borderRadius: '2px',
                padding: '8px 12px',
                fontSize: '14px',
                color: theme.palette.text.secondary,
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                },
              }}
            >
              Filter
            </Button>
          )}
        </Box>
      </Box>

      {activeTab === 'upcoming' && vehicle && vehicle.maintenanceSchedule && overdueTasks.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <OverdueAlertBanner
            vehicleName={vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
            overdueCount={overdueTasks.length}
            onViewOverdue={() => setIsUpcomingOverdueFiltered(true)}
            isFiltered={isUpcomingOverdueFiltered}
            onClearFilter={() => setIsUpcomingOverdueFiltered(false)}
          />
        </Box>
      )}

      {renderContent()}

      {/* Add extra bottom spacer for FAB on mobile */}
      {isMobile && <div style={{ height: 48 }} />}

      {/* NEW: Dropdown Filter Menu */}
      {isMobile ? (
        <AnimatePresence>
          {isFilterMenuOpen && (
            <>
              {/* Local, positioned backdrop */}
              <motion.div
                key="filter-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  zIndex: 45, // Below menu panel (50)
                }}
                onClick={handleCloseFilterMenu}
              />
              {/* Menu Panel */}
              <motion.div
                key="filter-menu-panel"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: headerBottom,
                  left: 0,
                  right: 0,
                  backgroundColor: '#1E1E1E',
                  zIndex: 50,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                <List>
                  {dynamicFilters.map((filter) => (
                    <ListItemButton
                      key={filter.id}
                      onClick={() => handleApplyCategoryFilter(filter.id)}
                      selected={activeCategory === filter.id}
                    >
                      <ListItemIcon sx={{ color: activeCategory === filter.id ? 'primary.main' : 'inherit' }}>
                        {filter.icon}
                      </ListItemIcon>
                      <ListItemText primary={filter.label} />
                    </ListItemButton>
                  ))}
                </List>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      ) : (
        <Popover
          open={isFilterMenuOpen}
          anchorEl={anchorEl}
          onClose={handleCloseFilterMenu}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            sx: { 
              backgroundColor: '#1E1E1E',
              borderRadius: '8px',
              marginTop: '8px'
            }
          }}
        >
          <List sx={{ minWidth: 240 }}>
            {dynamicFilters.map((filter) => (
              <ListItemButton
                key={filter.id}
                onClick={() => handleApplyCategoryFilter(filter.id)}
                selected={activeCategory === filter.id}
              >
                <ListItemIcon sx={{ color: activeCategory === filter.id ? 'primary.main' : 'inherit' }}>
                  {filter.icon}
                </ListItemIcon>
                <ListItemText primary={filter.label} />
              </ListItemButton>
            ))}
          </List>
        </Popover>
      )}
    </Box>
  );
};

export default TimelineView;
