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
  // --- Only useState and useRef hooks for isolation ---
  // const { vehicles, selectedVehicleId, error, ...rest } = useVehicleManagement(); // TEMPORARILY DISABLED
  // const { settings } = useSettingsManager(); // TEMPORARILY DISABLED
  // const { t, language, setLanguage, loadingTranslations } = useTranslation(); // TEMPORARILY DISABLED
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOverdueBanner, setShowOverdueBanner] = useState<string | null>(null); 
  const [testMode, setTestMode] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'vehicles' | 'timeline' | 'analytics' | 'settings' | 'test'>('vehicles');
  // const isMobile = useIsMobile(); // TEMPORARILY DISABLED
  // const toast = useToast(); // TEMPORARILY DISABLED
  // const { addNotification, notifications, unreadCount, markAsRead } = useNotifications(); // TEMPORARILY DISABLED
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [addTaskMode, setAddTaskMode] = useState<'manual' | 'past' | null>(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // --- All hooks above this line ---

  // Enable only useVehicleManagement for the next test
  // const { vehicles, selectedVehicleId, error, ...rest } = useVehicleManagement();
  // const { settings } = useSettingsManager();
  // const { t, language, setLanguage, loadingTranslations } = useTranslation();
  // const isMobile = useIsMobile();
  // const toast = useToast();
  // const { addNotification, notifications, unreadCount, markAsRead } = useNotifications();

  // Minimal render for isolation
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <TaskProvider initialTasks={[]}> {/* Use empty array for now */}
        <div>
          <Header onToggleSidebar={() => {}} currentLanguage="en" onChangeLanguage={() => {}} />
          <VehicleSidebar vehicles={[]} selectedVehicleId={null} onSelectVehicle={() => {}} onAddVehicle={() => {}} onDeleteVehicle={() => {}} isOpen={false} onClose={() => {}} />
          <main>
            <Tabs items={[{ key: 'vehicles', label: 'Vehicles', icon: <span>🚗</span> }]} activeTabKey={'vehicles'} onTabChange={() => {}} />
            <VehicleInfoView
              vehicle={{
                id: '',
                make: '',
                model: '',
                year: 2000,
                vin: '',
                maintenanceSchedule: []
              }}
              onEditTask={() => {}}
              onDeleteTask={() => {}}
              onToggleTaskStatus={() => {}}
              onAddTask={() => {}}
              onEditVehicle={() => {}}
              onViewRecalls={() => {}}
              mainScrollRef={{} as React.RefObject<HTMLElement>}
              onUpdateVehiclePhoto={() => {}}
            />
          </main>
        </div>
      </TaskProvider>
    </ThemeProvider>
  );
};

export default App;