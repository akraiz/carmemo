import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MaintenanceTask, TaskStatus, TaskCategory, TaskImportance, Vehicle, RecallInfo } from './types';
import { Icons } from './components/Icon';
import Header from './components/Header';
import VehicleSidebar from './components/VehicleSidebar';
import AddVehicleModal from './components/modals/AddVehicleModal';
import AddTaskModal from './components/modals/AddTaskModal';
import EditVehicleModal from './components/modals/EditVehicleModal';
import ViewRecallsModal from './components/modals/ViewRecallsModal'; 
import ErrorMessage from './components/shared/ErrorMessage';
import NoVehicleSelected from './components/shared/NoVehicleSelected';
import SelectVehiclePlaceholder from './components/shared/SelectVehiclePlaceholder';
import Tabs from './components/shared/Tabs';
import TimelineView from './components/views/TimelineView';
import AnalyticsView from './components/views/AnalyticsView';
import SettingsView from './components/views/SettingsView';
import VehicleInfoView from './components/views/VehicleInfoView';
import RecallsTest from './components/RecallsTest';
import FabButton from './components/shared/FabButton';
import OverdueAlertBanner from './components/shared/OverdueAlertBanner';
import useVehicleManagement from './hooks/useVehicleManagement';
import { useSettingsManager } from './hooks/useSettingsManager';
import { getISODateString, isDateOverdue } from './utils/dateUtils';
import { useTranslation } from './hooks/useTranslation';
import { useNotifications } from './contexts/NotificationContext';
import { useToast } from './contexts/ToastContext';
import Confetti from 'react-confetti';
import OcrStepModal from './components/shared/OcrStepModal';
import NotificationCenter from './components/shared/NotificationCenter';
import Material3BottomNav from './components/shared/Material3BottomNav';
import { TaskProvider } from './contexts/TaskContext';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { 
  DirectionsCar as CarIcon,
  Timeline as TimelineIcon,
  BarChart as AnalyticsIcon,
  Settings as SettingsIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import darkTheme from './theme';
import AddIcon from '@mui/icons-material/Add';

type Language = 'en' | 'ar';

function useIsMobile() {
  let hookIndex = 1;
  const hook = (desc: string) => {
    // eslint-disable-next-line no-console
    console.log(`[useIsMobile] ${hookIndex++}. ${desc}`);
  };
  hook('useState isMobile');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  hook('useEffect handleResize');
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

const App: React.FC = () => {
  let hookIndex = 1;
  const hook = (desc: string) => {
    // eslint-disable-next-line no-console
    console.log(`${hookIndex++}. ${desc}`);
  };
  hook('useVehicleManagement');
  const { vehicles, selectedVehicleId, error, ...rest } = useVehicleManagement();
  hook('useSettingsManager');
  const { settings } = useSettingsManager(); 
  hook('useTranslation');
  const { t, language, setLanguage, loadingTranslations } = useTranslation();
  hook('useState isSidebarOpen');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  hook('useState showOverdueBanner');
  const [showOverdueBanner, setShowOverdueBanner] = useState<string | null>(null); 
  hook('useState testMode');
  const [testMode, setTestMode] = useState(false);
  hook('useRef mainContentRef');
  const mainContentRef = useRef<HTMLDivElement>(null);
  hook('useState activeView');
  const [activeView, setActiveView] = useState<'vehicles' | 'timeline' | 'analytics' | 'settings' | 'test'>('vehicles');
  hook('useIsMobile');
  const isMobile = useIsMobile();
  hook('useToast');
  const toast = useToast();
  hook('useNotifications');
  const { addNotification, notifications, unreadCount, markAsRead } = useNotifications();
  hook('useState showNotifications');
  const [showNotifications, setShowNotifications] = useState(false);
  hook('useState showOCRModal');
  const [showOCRModal, setShowOCRModal] = useState(false);
  hook('useState addTaskMode');
  const [addTaskMode, setAddTaskMode] = useState<'manual' | 'past' | null>(null);
  hook('useState isFilterMenuOpen');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false); // Only one declaration
  hook('useState showConfetti');
  const [showConfetti, setShowConfetti] = useState(false);

  // Restore selectedVehicle declaration after all hooks
  const selectedVehicle: Vehicle | null = vehicles.find(v => v.id === selectedVehicleId || v._id === selectedVehicleId) || null;

  useEffect(() => {}, [isSidebarOpen, language]);

  useEffect(() => {
    if (!loadingTranslations) {
      const loadingScreenElement = document.getElementById('loading-screen');
      const loadingTextElement = document.querySelector('#loading-screen .loading-text');
      if (loadingTextElement) {
        loadingTextElement.textContent = t('loadingScreen.openingGarage');
      }
      if (loadingScreenElement) {
        const mainAnimationDuration = 2800;
        const fadeOutDuration = 500;
        const timer = setTimeout(() => {
          loadingScreenElement.style.opacity = '0';
          setTimeout(() => {
            loadingScreenElement.style.display = 'none';
          }, fadeOutDuration);
        }, mainAnimationDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [loadingTranslations, t]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    if (language === 'ar') {
        document.body.style.fontFamily = "'IBM Plex Sans Arabic', sans-serif";
    } else {
        document.body.style.fontFamily = "'Inter', sans-serif";
    }
  }, [language]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 't') {
        event.preventDefault();
        setTestMode(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [testMode]);

  useEffect(() => {
    if (!settings.notificationOptIn || settings.notificationPermissionStatus !== 'granted' || !selectedVehicle) {
      if(showOverdueBanner === selectedVehicle?.id) {
        setShowOverdueBanner(null); 
      }
      return;
    }
    const vehicleHasOverdueTasks = selectedVehicle.maintenanceSchedule.some(task => task.status === TaskStatus.Overdue);
    if (vehicleHasOverdueTasks) {
      if (showOverdueBanner !== selectedVehicle.id) { 
        setShowOverdueBanner(selectedVehicle.id);
        const overdueTask = selectedVehicle.maintenanceSchedule.find(task => task.status === TaskStatus.Overdue);
        if(overdueTask && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(t('notifications.overdueTaskTitle', {taskTitle: t(overdueTask.title)}), {
              body: t('notifications.overdueTaskBody', {
                  taskTitle: t(overdueTask.title),
                  vehicleName: selectedVehicle.nickname || `${selectedVehicle.make} ${selectedVehicle.model}`
              }),
            });
          } catch (error) {
            console.warn('Failed to show notification:', error);
          }
        }
      }
    } else {
      if (showOverdueBanner === selectedVehicle.id) { 
        setShowOverdueBanner(null);
      }
    }
  }, [selectedVehicle, settings.notificationOptIn, settings.notificationPermissionStatus, t, showOverdueBanner]);

  useEffect(() => {
    if (selectedVehicle) {
      const overdue = selectedVehicle.maintenanceSchedule.filter(t => t.status === TaskStatus.Overdue);
      const completed = selectedVehicle.maintenanceSchedule.filter(t => t.status === TaskStatus.Completed);
      if (overdue.length === 0 && completed.length > 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
      if (completed.length === 10) {
        toast.showGenericSuccess('10 tasks logged! 🚗');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    }
  }, [selectedVehicle, toast]);

  if (loadingTranslations) {
    return null;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const checkAndShowStreakNudge = (vehicle: { maintenanceSchedule?: MaintenanceTask[] }) => {
    if (!vehicle) return;
    const schedule = vehicle.maintenanceSchedule || [];
    let streak = 0;
    for (let i = schedule.length - 1; i >= 0; i--) {
      if (schedule[i].status === TaskStatus.Completed) {
        streak++;
      } else if (schedule[i].status === TaskStatus.Overdue) {
        break;
      }
    }
    if (streak >= 3) {
      const message = t('streakNudge.congrats', { count: streak });
      toast.showGenericSuccess(message);
      addNotification({
        title: t('streakNudge.title'),
        message,
      });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  };

  const handleOpenAddVehicle = () => rest.handleOpenAddVehicleModal();
  const handleCloseAddVehicle = () => rest.handleCloseAddVehicleModal();
  const handleOpenEditSelectedVehicle = () => { if (selectedVehicle) rest.handleOpenEditVehicleModal(selectedVehicle); };
  const handleCloseEditVehicle = () => rest.handleCloseEditVehicleModal();
  const handleOpenAddTaskForSelected = () => rest.handleOpenAddTaskModal();
  const handleCloseAddTask = () => rest.handleCloseAddTaskModal();
  const handleErrorClose = () => rest.setState((prev: any) => ({ ...prev, error: null }));
  const handleOpenEditTask = (task: MaintenanceTask) => { if (selectedVehicleId) rest.handleOpenAddTaskModal(task); };
  const handleViewSelectedVehicleRecalls = () => { if (selectedVehicle) rest.handleOpenViewRecallsModal(); };
  const handleFabClick = () => setAddTaskMode('manual');

  const tabItems = [
    { key: 'vehicles', label: t('tabs.vehicles'), icon: <CarIcon /> },
    { key: 'timeline', label: t('tabs.timeline'), icon: <TimelineIcon /> },
    { key: 'analytics', label: t('tabs.analytics'), icon: <AnalyticsIcon /> },
    { key: 'settings', label: t('tabs.settings'), icon: <SettingsIcon /> },
    ...(testMode ? [{ key: 'test', label: 'Test Recalls', icon: <BuildIcon /> }] : [])
  ];

  const renderActiveView = () => {
    switch(activeView) {
      case 'vehicles':
        if (!selectedVehicle && vehicles.length > 0) {
          return <SelectVehiclePlaceholder />;
        }
        if (!selectedVehicle) {
          return <NoVehicleSelected onAddVehicle={handleOpenAddVehicle} />;
        }
        return (
          <VehicleInfoView
            vehicle={selectedVehicle}
            onEditTask={handleOpenEditTask}
            onDeleteTask={rest.handleDeleteTask}
            onToggleTaskStatus={rest.handleToggleTaskStatus}
            onAddTask={handleOpenAddTaskForSelected}
            onEditVehicle={rest.handleOpenEditVehicleModal}
            onViewRecalls={handleViewSelectedVehicleRecalls}
            mainScrollRef={mainContentRef as React.RefObject<HTMLElement>}
            onUpdateVehiclePhoto={rest.handleUpdateVehiclePhoto}
          />
        );
      case 'timeline':
        return <TimelineView 
          vehicle={selectedVehicle} 
          onCompleteTask={rest.handleToggleTaskStatus}
          onEditTask={handleOpenEditTask}
          onDeleteTask={rest.handleDeleteTask}
          isFilterMenuOpen={isFilterMenuOpen}
          onOpenFilterMenu={() => setIsFilterMenuOpen(true)}
          onCloseFilterMenu={() => setIsFilterMenuOpen(false)}
        />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      case 'test':
        return <RecallsTest />;
      default:
        return <NoVehicleSelected onAddVehicle={handleOpenAddVehicle} />;
    }
  };

  const initialTasks = selectedVehicle?.maintenanceSchedule || [];
  const bottomNavHeight = 72;
  const isModalOpen = rest.showAddVehicleModal || rest.showEditVehicleModal || rest.showAddTaskModal || rest.showViewRecallsModal || showOCRModal || addTaskMode || isFilterMenuOpen;

  const handleUpdateVehiclePhotoFile = async (vehicleId: string, file: File) => {
    await rest.handleUpdateVehiclePhoto(vehicleId, file);
  };

  const handleAddVehicleWithId = async (vehicleData: Omit<Vehicle, 'id' | 'maintenanceSchedule'> & { initialMaintenanceTasks?: MaintenanceTask[], recalls?: RecallInfo[] }) => {
    await rest.handleAddVehicle(vehicleData);
    const latestVehicle = vehicles[vehicles.length - 1];
    return latestVehicle?.id;
  };

  useEffect(() => {
    if (error) {
      toast.showGenericError(t(error));
      handleErrorClose();
    }
  }, [error]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <TaskProvider initialTasks={initialTasks}>
        <div className="flex flex-col h-screen bg-[#121212] text-[#cfcfcf] overflow-hidden">
          <Header onToggleSidebar={toggleSidebar} currentLanguage={language as Language} onChangeLanguage={setLanguage}>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNotifications(true)} className="relative p-2 rounded-full hover:bg-[#232323] focus:outline-none" aria-label="Show notifications">
                <Icons.Bell className="w-6 h-6 text-[#F7C843]" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1c1c1c]" />}
              </button>
            </div>
          </Header>
          <div className={`flex flex-1 overflow-hidden ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
            <VehicleSidebar
              vehicles={vehicles}
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(id) => { 
                rest.handleSelectVehicle(id); 
                setActiveView('vehicles');
              }}
              onAddVehicle={handleOpenAddVehicle}
              onDeleteVehicle={rest.handleDeleteVehicle}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />
            <main ref={mainContentRef} className="flex-1 flex flex-col overflow-hidden bg-[#121212] relative">
                {!isMobile && (
                  <Tabs items={tabItems} activeTabKey={activeView} onTabChange={(key: string) => {
                    setActiveView(key as 'vehicles' | 'timeline' | 'analytics' | 'settings' | 'test');
                  }} />
                )}
                <div 
                  className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#121212] p-0"
                  style={{
                    paddingBottom: isMobile 
                      ? `${(activeView === 'vehicles' || activeView === 'timeline') ? 90 : bottomNavHeight + 16}px` 
                      : '16px'
                  }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeView + (selectedVehicle?.id || 'none')} 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="h-full" 
                        >
                             <div className={activeView === 'vehicles' || activeView === 'timeline' ? "p-0" : "p-4 sm:p-4 md:p-6"}>
                                {renderActiveView()}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
              {!isModalOpen && (
                <FabButton
                  onClick={handleFabClick}
                  icon={<AddIcon />}
                  ariaLabel={t('addTask')}
                  position={{ bottom: isMobile ? bottomNavHeight + 16 : 32, right: 32, zIndex: 1200 }}
                />
              )}
            </main>
          </div>
          {isMobile && (
            <Material3BottomNav 
              className={`bottom-nav ${isModalOpen ? 'hidden' : ''}`}
              items={tabItems}
              activeTabKey={activeView}
              onTabChange={(key: string) => {
                setActiveView(key as 'vehicles' | 'timeline' | 'analytics' | 'settings' | 'test');
              }}
            />
          )}
          <AnimatePresence>
            <AddVehicleModal
              isOpen={rest.showAddVehicleModal}
              onClose={handleCloseAddVehicle}
              onAddVehicle={handleAddVehicleWithId}
              onUploadVehicleImage={handleUpdateVehiclePhotoFile}
            />
            <AddTaskModal
              isOpen={rest.showAddTaskModal && !!selectedVehicleId && !!selectedVehicle}
              onClose={handleCloseAddTask}
              onSaveTask={rest.handleUpsertTask}
              vehicleId={selectedVehicleId || ''}
              task={rest.editingTask}
              currentMileage={selectedVehicle?.currentMileage}
            />
            <EditVehicleModal
              isOpen={rest.showEditVehicleModal && !!rest.editingVehicle}
              onClose={() => {
                handleCloseEditVehicle();
              }}
              onUpdateVehicle={rest.handleUpdateVehicle}
              vehicle={rest.editingVehicle || {
                id: '',
                make: '',
                model: '',
                year: 2000,
                vin: '',
                maintenanceSchedule: []
              }}
            />
            <ViewRecallsModal
              isOpen={rest.showViewRecallsModal && !!selectedVehicle}
              onClose={() => {
                rest.handleCloseViewRecallsModal();
              }}
              recalls={selectedVehicle?.recalls || []}
              vehicleNickname={selectedVehicle?.nickname || `${selectedVehicle?.make} ${selectedVehicle?.model}`}
            />
          </AnimatePresence>
          <OcrStepModal
            isOpen={showOCRModal}
            onClose={() => setShowOCRModal(false)}
            onSave={(ocrTask) => {
              handleOpenEditTask({
                id: self.crypto.randomUUID(),
                title: ocrTask.title || '',
                category: ocrTask.category || TaskCategory.Other,
                status: TaskStatus.Completed,
                completedDate: ocrTask.completedDate ? ocrTask.completedDate : new Date().toISOString().slice(0, 10),
                creationDate: ocrTask.completedDate ? ocrTask.completedDate : new Date().toISOString().slice(0, 10),
                cost: ocrTask.cost,
                notes: ocrTask.notes,
                receipts: ocrTask.imageUrl ? [{ id: self.crypto.randomUUID(), name: 'Receipt', url: ocrTask.imageUrl, type: 'image/jpeg', uploadedDate: new Date().toISOString() }] : [],
              });
            }}
          />
          <AddTaskModal
            isOpen={!!addTaskMode}
            onClose={() => setAddTaskMode(null)}
            onSaveTask={rest.handleUpsertTask}
            vehicleId={selectedVehicleId || ''}
            task={addTaskMode === 'past' ? {
              id: self.crypto.randomUUID(),
              title: '',
              category: TaskCategory.Other,
              status: TaskStatus.Completed,
              importance: TaskImportance.Recommended,
              completedDate: new Date().toISOString().slice(0, 10),
              creationDate: new Date().toISOString().slice(0, 10),
            } as MaintenanceTask : null}
            currentMileage={selectedVehicle?.currentMileage}
          />
          <NotificationCenter open={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onMarkRead={markAsRead} />
          <AnimatePresence>
            {isMobile && isFilterMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'transparent',
                  zIndex: 40,
                }}
                onClick={() => setIsFilterMenuOpen(false)}
              />
            )}
          </AnimatePresence>
          {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={120} recycle={false} />}
        </div>
      </TaskProvider>
    </ThemeProvider>
  );
};

export default App;