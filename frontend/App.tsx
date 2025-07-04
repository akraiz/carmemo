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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
}

const App: React.FC = () => {
  // --- All hooks at the top, no conditionals, no early returns ---
  const { 
    vehicles, selectedVehicleId, error, 
    setShowAddVehicleModal, setShowAddTaskModal, setShowEditVehicleModal, setShowViewRecallsModal,
    showAddVehicleModal, showAddTaskModal, showEditVehicleModal, showViewRecallsModal,
    handleAddVehicle, handleDeleteVehicle, handleSelectVehicle, handleOpenAddTaskModal, handleUpsertTask, handleDeleteTask, handleToggleTaskStatus, handleUpdateVehiclePhoto, handleOpenViewRecallsModal, handleOpenEditVehicleModal, editingTask, editingVehicle, handleUpdateVehicle
  } = useVehicleManagement();
  const { settings } = useSettingsManager(); 
  const { t, language, setLanguage, loadingTranslations } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOverdueBanner, setShowOverdueBanner] = useState<string | null>(null); 
  const [testMode, setTestMode] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'vehicles' | 'timeline' | 'analytics' | 'settings' | 'test'>('vehicles');
  const isMobile = useIsMobile();
  const toast = useToast();
  const { addNotification, notifications, unreadCount, markAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [addTaskMode, setAddTaskMode] = useState<'manual' | 'past' | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Restore selectedVehicle declaration after all hooks
  const selectedVehicle: Vehicle | null = vehicles.find(v => v.id === selectedVehicleId || v._id === selectedVehicleId) || null;

  // --- Event Handlers and Effects (unchanged) ---
  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleFilterTasks = (filter: string) => {
    setIsFilterMenuOpen(false);
    setActiveView('timeline'); // Assuming timeline is the default view for filtering
    // Implement actual filtering logic here
  };

  const handleTabChange = (key: string) => {
    setActiveView(key as 'vehicles' | 'timeline' | 'analytics' | 'settings' | 'test');
  };

  const handleCloseModals = () => {
    setShowAddVehicleModal(false);
    setShowAddTaskModal(false);
    setShowEditVehicleModal(false);
    setShowViewRecallsModal(false);
    setIsFilterMenuOpen(false);
    setShowOCRModal(false);
  };

  const handleShowNotifications = () => {
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  const handleShowOCRModal = () => {
    setShowOCRModal(true);
  };

  const handleCloseOCRModal = () => {
    setShowOCRModal(false);
  };

  const handleTestMode = () => {
    setTestMode(!testMode);
  };

  useEffect(() => {
    if (selectedVehicle) {
      setActiveView('timeline'); // Default to timeline for selected vehicle
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (selectedVehicle) {
      // fetchTasks(selectedVehicle.id); // Removed as per edit hint
      // fetchRecalls(selectedVehicle.id); // Removed as per edit hint
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (testMode) {
      // Simulate fetching data for test mode
      const mockVehicles = [
        { id: '1', make: 'Toyota', model: 'Camry', year: 2020, vin: 'JTEBU5JRX00000000', maintenanceSchedule: [] },
        { id: '2', make: 'Honda', model: 'Civic', year: 2019, vin: 'JTEBU5JRX00000001', maintenanceSchedule: [] },
      ];
      // setVehicles(mockVehicles); // Removed as per edit hint
      // setSelectedVehicleId('1'); // Removed as per edit hint
    }
  }, [testMode]);

  useEffect(() => {
    if (selectedVehicle) {
      const overdueTasks = selectedVehicle?.maintenanceSchedule.filter(task => isDateOverdue(task.dueDate));
      if (overdueTasks.length > 0) {
        setShowOverdueBanner(`You have ${overdueTasks.length} overdue tasks.`);
      } else {
        setShowOverdueBanner(null);
      }
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (showOverdueBanner) {
      const timer = setTimeout(() => {
        setShowOverdueBanner(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showOverdueBanner]);

  useEffect(() => {
    if (showNotifications) {
      const timer = setTimeout(() => {
        setShowNotifications(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // --- Main render logic ---
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <TaskProvider initialTasks={selectedVehicle?.maintenanceSchedule || []}>
        {loadingTranslations ? null : (
          !selectedVehicle ? (
            <div>
              <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} currentLanguage={language as Language} onChangeLanguage={setLanguage} />
              <VehicleSidebar
                vehicles={vehicles}
                selectedVehicleId={null}
                onSelectVehicle={handleSelectVehicle}
                onAddVehicle={() => setShowAddVehicleModal(true)}
                onDeleteVehicle={() => {}} // No delete vehicle in this view
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
              />
              <main>
                <Tabs items={[{ key: 'vehicles', label: 'Vehicles', icon: <span>🚗</span> }]} activeTabKey={'vehicles'} onTabChange={key => setActiveView(key as typeof activeView)} />
                <NoVehicleSelected onAddVehicle={() => setShowAddVehicleModal(true)} />
              </main>
            </div>
          ) : (
            <div className="flex flex-col h-screen bg-[#121212] text-[#cfcfcf] overflow-hidden">
              <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} currentLanguage={language as Language} onChangeLanguage={setLanguage}>
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
                  onSelectVehicle={handleSelectVehicle}
                  onAddVehicle={() => setShowAddVehicleModal(true)}
                  onDeleteVehicle={handleDeleteVehicle}
                  isOpen={isSidebarOpen}
                  onClose={() => setIsSidebarOpen(false)}
                />
                <main ref={mainContentRef} className="flex-1 flex flex-col overflow-hidden bg-[#121212] relative">
                  <Tabs
                    items={[
                      { key: 'vehicles', label: t('tabs.vehicles'), icon: <CarIcon /> },
                      { key: 'timeline', label: t('tabs.timeline'), icon: <TimelineIcon /> },
                      { key: 'analytics', label: t('tabs.analytics'), icon: <AnalyticsIcon /> },
                      { key: 'settings', label: t('tabs.settings'), icon: <SettingsIcon /> },
                      ...(testMode ? [{ key: 'test', label: 'Test Recalls', icon: <BuildIcon /> }] : [])
                    ]}
                    activeTabKey={activeView}
                    onTabChange={(key: string) => setActiveView(key as typeof activeView)}
                  />
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#121212] p-0" style={{ paddingBottom: isMobile ? ((activeView === 'vehicles' || activeView === 'timeline') ? 90 : 88) : 16 }}>
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
                          {activeView === 'vehicles' && (
                            !selectedVehicle && vehicles.length > 0 ? <SelectVehiclePlaceholder /> :
                            !selectedVehicle ? <NoVehicleSelected onAddVehicle={() => setShowAddVehicleModal(true)} /> :
                            <VehicleInfoView
                              vehicle={selectedVehicle}
                              onEditTask={handleOpenAddTaskModal}
                              onDeleteTask={handleDeleteTask}
                              onToggleTaskStatus={handleToggleTaskStatus}
                              onAddTask={handleOpenAddTaskModal}
                              onEditVehicle={handleOpenEditVehicleModal}
                              onViewRecalls={handleOpenViewRecallsModal}
                              mainScrollRef={mainContentRef as React.RefObject<HTMLElement>}
                              onUpdateVehiclePhoto={handleUpdateVehiclePhoto}
                            />
                          )}
                          {activeView === 'timeline' && (
                            <TimelineView
                              vehicle={selectedVehicle}
                              onCompleteTask={handleToggleTaskStatus}
                              onEditTask={handleOpenAddTaskModal}
                              onDeleteTask={handleDeleteTask}
                              isFilterMenuOpen={isFilterMenuOpen}
                              onOpenFilterMenu={() => setIsFilterMenuOpen(true)}
                              onCloseFilterMenu={() => setIsFilterMenuOpen(false)}
                            />
                          )}
                          {activeView === 'analytics' && <AnalyticsView />}
                          {activeView === 'settings' && <SettingsView />}
                          {activeView === 'test' && <RecallsTest />}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <FabButton
                    onClick={() => setAddTaskMode('manual')}
                    icon={<AddIcon />}
                    ariaLabel={t('addTask')}
                    position={{ bottom: isMobile ? 88 : 32, right: 32, zIndex: 1200 }}
                  />
                </main>
              </div>
              {isMobile && (
                <Material3BottomNav
                  className={`bottom-nav ${isSidebarOpen ? 'hidden' : ''}`}
                  items={[
                    { key: 'vehicles', label: t('tabs.vehicles'), icon: <CarIcon /> },
                    { key: 'timeline', label: t('tabs.timeline'), icon: <TimelineIcon /> },
                    { key: 'analytics', label: t('tabs.analytics'), icon: <AnalyticsIcon /> },
                    { key: 'settings', label: t('tabs.settings'), icon: <SettingsIcon /> },
                    ...(testMode ? [{ key: 'test', label: 'Test Recalls', icon: <BuildIcon /> }] : [])
                  ]}
                  activeTabKey={activeView}
                  onTabChange={(key: string) => setActiveView(key as typeof activeView)}
                />
              )}
              <AnimatePresence>
                <AddVehicleModal
                  isOpen={showAddVehicleModal}
                  onClose={() => setShowAddVehicleModal(false)}
                  onAddVehicle={handleAddVehicle}
                  onUploadVehicleImage={handleUpdateVehiclePhoto}
                />
                <AddTaskModal
                  isOpen={showAddTaskModal}
                  onClose={() => setShowAddTaskModal(false)}
                  onSaveTask={handleUpsertTask}
                  vehicleId={selectedVehicleId || ''}
                  task={editingTask}
                  currentMileage={selectedVehicle?.currentMileage}
                />
                <EditVehicleModal
                  isOpen={showEditVehicleModal}
                  onClose={() => setShowEditVehicleModal(false)}
                  onUpdateVehicle={handleUpdateVehicle}
                  vehicle={editingVehicle || { id: '', make: '', model: '', year: 2000, vin: '', maintenanceSchedule: [] }}
                />
                <ViewRecallsModal
                  isOpen={showViewRecallsModal}
                  onClose={() => setShowViewRecallsModal(false)}
                  recalls={selectedVehicle?.recalls || []}
                  vehicleNickname={selectedVehicle?.nickname || `${selectedVehicle?.make} ${selectedVehicle?.model}`}
                />
              </AnimatePresence>
              <OcrStepModal
                isOpen={showOCRModal}
                onClose={() => setShowOCRModal(false)}
                onSave={(ocrTask) => {
                  handleOpenAddTaskModal({
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
                onSaveTask={handleUpsertTask}
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
          )
        )}
      </TaskProvider>
    </ThemeProvider>
  );
};

export default App;