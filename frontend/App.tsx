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
import Material3BottomNav from './components/shared/Material3BottomNav'; // Import the new component
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

// Import Language type
type Language = 'en' | 'ar';

// Responsive hook for mobile detection
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

// --- Main App Component ---
const App: React.FC = () => {
  // 🔍 HOOK ORDER DEBUGGING - Add counter and logs before every hook
  let hookIndex = 1;
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useVehicleManagement`);
  const { vehicles, selectedVehicleId, error, ...rest } = useVehicleManagement();
  const selectedVehicle: Vehicle | null = vehicles.find(v => v.id === selectedVehicleId || v._id === selectedVehicleId) || null;
  console.log('vehicles:', vehicles);
  console.log('selectedVehicleId:', selectedVehicleId);
  console.log('selectedVehicle:', selectedVehicle);

  console.log(`[HOOK ORDER] #${hookIndex++}: useSettingsManager`);
  const { settings } = useSettingsManager(); 

  console.log(`[HOOK ORDER] #${hookIndex++}: useTranslation`);
  const { t, language, setLanguage, loadingTranslations } = useTranslation();
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useState isSidebarOpen`);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useState appRendered`);
  const [appRendered, setAppRendered] = useState(false); // New state for app rendering
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useState showOverdueBanner`);
  const [showOverdueBanner, setShowOverdueBanner] = useState<string | null>(null); 
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useState testMode`);
  const [testMode, setTestMode] = useState(false); // Temporary test mode
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useRef mainContentRef`);
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useState activeView`);
  const [activeView, setActiveView] = useState<'vehicles' | 'timeline' | 'analytics' | 'settings' | 'test'>('vehicles');

  // Responsive FAB menu state
  console.log(`[HOOK ORDER] #${hookIndex++}: useIsMobile`);
  const isMobile = useIsMobile();

  console.log(`[HOOK ORDER] #${hookIndex++}: useToast`);
  const toast = useToast();
  
  // Consolidate all notification hooks into a single call
  console.log(`[HOOK ORDER] #${hookIndex++}: useNotifications`);
  const { addNotification, notifications, unreadCount, markAsRead } = useNotifications();

  // Notification state
  console.log(`[HOOK ORDER] #${hookIndex++}: useState showNotifications`);
  const [showNotifications, setShowNotifications] = useState(false);

  // OCR Step Modal state
  console.log(`[HOOK ORDER] #${hookIndex++}: useState showOCRModal`);
  const [showOCRModal, setShowOCRModal] = useState(false);
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useState addTaskMode`);
  const [addTaskMode, setAddTaskMode] = useState<'manual' | 'past' | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Confetti state
  console.log(`[HOOK ORDER] #${hookIndex++}: useState showConfetti`);
  const [showConfetti, setShowConfetti] = useState(false);

  // New state for the global filter menu control
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  console.log(`[HOOK ORDER] #${hookIndex++}: useEffect sidebar tracking`);
  // 🔍 DIAGNOSTIC - Track sidebar state changes
  useEffect(() => {
    // Sidebar state tracking
  }, [isSidebarOpen, language]);

  console.log(`[HOOK ORDER] #${hookIndex++}: useEffect loading screen`);
  useEffect(() => {
    if (!loadingTranslations) { // Wait for translations to be loaded
      const loadingScreenElement = document.getElementById('loading-screen');
      const loadingTextElement = document.querySelector('#loading-screen .loading-text');
  
      if (loadingTextElement) {
        loadingTextElement.textContent = t('loadingScreen.openingGarage');
      }
  
      if (loadingScreenElement) {
        // Delay to allow CSS animations to run and text to update
        // Shutter animation is 2.5s + 0.5s delay = 3s total.
        // Text animation is 1s + 1.2s delay = 2.2s total.
        // We want to hide it after the shutter animation is mostly done.
        const mainAnimationDuration = 2800; // ms, time for CSS garage door animation to complete
        const fadeOutDuration = 500;    // ms, for opacity transition
        
        const timer = setTimeout(() => {
          loadingScreenElement.style.opacity = '0';
          setTimeout(() => {
            loadingScreenElement.style.display = 'none';
            setAppRendered(true); // Render the React app
          }, fadeOutDuration);
        }, mainAnimationDuration);
        
        return () => clearTimeout(timer); // Cleanup timer if component unmounts
      } else {
        // If loading screen element is not found, render app immediately
        setAppRendered(true);
      }
    }
  }, [loadingTranslations, t]);
  
  console.log(`[HOOK ORDER] #${hookIndex++}: useEffect language setup`);
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    if (language === 'ar') {
        document.body.style.fontFamily = "'IBM Plex Sans Arabic', sans-serif";
    } else {
        document.body.style.fontFamily = "'Inter', sans-serif";
    }
  }, [language]);

  // Keyboard shortcut for test mode (Ctrl+T)
  console.log(`[HOOK ORDER] #${hookIndex++}: useEffect keyboard shortcuts`);
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

  console.log(`[HOOK ORDER] #${hookIndex++}: useEffect overdue banner`);
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

  console.log(`[HOOK ORDER] #${hookIndex++}: useEffect overdue completion (PROBLEMATIC HOOK)`);
  // When all overdue tasks are completed or 10+ tasks are logged:
  useEffect(() => {
    console.log('[DEBUG] Inside useEffect #34 - overdue completion');
    if (selectedVehicle) {
      const overdue = selectedVehicle.maintenanceSchedule.filter(t => t.status === TaskStatus.Overdue);
      const completed = selectedVehicle.maintenanceSchedule.filter(t => t.status === TaskStatus.Completed);
      if (overdue.length === 0 && completed.length > 0) {
        // Removed toast for all overdue tasks completed
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

  console.log(`[HOOK ORDER] #${hookIndex++}: EARLY RETURN CHECK - appRendered: ${appRendered}`);
  // ⚠️ CRITICAL: This early return is AFTER all hooks - this is correct!
  if (!appRendered) {
    console.log('[HOOK ORDER] Early return triggered - app not rendered yet');
    return null;
  }

  // 🔍 DIAGNOSTIC - Consultant's Checklist #3
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Streak nudge logic: show a toast if 3+ tasks completed in a row without any overdue
  const checkAndShowStreakNudge = (vehicle: { maintenanceSchedule?: MaintenanceTask[] }) => {
    if (!vehicle) return;
    const schedule = vehicle.maintenanceSchedule || [];
    // Find the last streak of completed tasks (no overdue in between)
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
  
  const handleOpenEditSelectedVehicle = () => {
    if (selectedVehicle) rest.handleOpenEditVehicleModal(selectedVehicle);
  };
  const handleCloseEditVehicle = () => rest.handleCloseEditVehicleModal();
  
  const handleOpenAddTaskForSelected = () => rest.handleOpenAddTaskModal();
  const handleCloseAddTask = () => rest.handleCloseAddTaskModal();

  const handleErrorClose = () => rest.setState((prev: any) => ({ ...prev, error: null }));

  const handleOpenEditTask = (task: MaintenanceTask) => {
    if (selectedVehicleId) rest.handleOpenAddTaskModal(task);
  };

  const handleViewSelectedVehicleRecalls = () => {
    if (selectedVehicle) rest.handleOpenViewRecallsModal();
  };

  // FAB handler: open AddTaskModal directly
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
  
  // Get selected vehicle's tasks for TaskProvider
  const initialTasks = selectedVehicle?.maintenanceSchedule || [];

  // Define Bottom Nav height
  const bottomNavHeight = 72;
  const isModalOpen = rest.showAddVehicleModal || rest.showEditVehicleModal || rest.showAddTaskModal || rest.showViewRecallsModal || rest.showOCRModal || addTaskMode || isFilterSheetOpen;

  // Wrapper to upload vehicle photo as File for AddVehicleModal
  const handleUpdateVehiclePhotoFile = async (vehicleId: string, file: File) => {
    await rest.handleUpdateVehiclePhoto(vehicleId, file);
  };

  // Ensure handleAddVehicle returns Promise<string | undefined> for AddVehicleModal
  const handleAddVehicleWithId = async (vehicleData: Omit<Vehicle, 'id' | 'maintenanceSchedule'> & { initialMaintenanceTasks?: MaintenanceTask[], recalls?: RecallInfo[] }) => {
    await rest.handleAddVehicle(vehicleData);
    // Find the newly added vehicle's id
    const latestVehicle = vehicles[vehicles.length - 1];
    return latestVehicle?.id;
  };

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
                {/* Desktop Tabs */}
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

              {/* FAB and Menu */}
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
          
          {/* Mobile Bottom Navigation */}
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

          {/* Modals */}
          <AnimatePresence>
            {rest.showAddVehicleModal && (
              <AddVehicleModal
                isOpen={rest.showAddVehicleModal}
                onClose={handleCloseAddVehicle}
                onAddVehicle={handleAddVehicleWithId}
                onUploadVehicleImage={handleUpdateVehiclePhotoFile}
              />
            )}
            {rest.showAddTaskModal && selectedVehicleId && selectedVehicle && (
              <AddTaskModal
                isOpen={rest.showAddTaskModal}
                onClose={handleCloseAddTask}
                onSaveTask={rest.handleUpsertTask}
                vehicleId={selectedVehicleId}
                task={rest.editingTask}
                currentMileage={selectedVehicle.currentMileage}
              />
            )}
            {rest.showEditVehicleModal && rest.editingVehicle && (
                <EditVehicleModal
                    isOpen={rest.showEditVehicleModal}
                    onClose={() => {
                      handleCloseEditVehicle();
                    }}
                    onUpdateVehicle={rest.handleUpdateVehicle}
                    vehicle={rest.editingVehicle}
                />
            )}
            {rest.showViewRecallsModal && selectedVehicle && (
                <ViewRecallsModal
                    isOpen={rest.showViewRecallsModal}
                    onClose={() => {
                      rest.handleCloseViewRecallsModal();
                    }}
                    recalls={selectedVehicle.recalls || []}
                    vehicleNickname={selectedVehicle.nickname || `${selectedVehicle.make} ${selectedVehicle.model}`}
                />
            )}
          </AnimatePresence>

          <OcrStepModal
            isOpen={rest.showOCRModal}
            onClose={() => rest.setShowOCRModal(false)}
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

          {addTaskMode && (
            <AddTaskModal
              isOpen={true}
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
          )}

          {error && <ErrorMessage message={t(error)} onClose={handleErrorClose} />}

          <NotificationCenter open={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} onMarkRead={markAsRead} />

          {/* Layer 1: The Invisible Click Catcher */}
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
                  zIndex: 40, // Above content, below menu panel
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