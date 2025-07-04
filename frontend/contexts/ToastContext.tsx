import React, { createContext, useContext } from 'react';
import toast, { Toast } from 'react-hot-toast';
import { useTranslation } from '../hooks/useTranslation';
import { Vehicle, MaintenanceTask } from '../types';

interface ToastContextType {
  showVehicleAdded: (vehicle: Vehicle) => void;
  showVehicleUpdated: (vehicle: Vehicle) => void;
  showVehicleDeleted: (vehicle: Vehicle, onUndo: () => void) => void;
  showTaskAdded: (task: MaintenanceTask, vehicle: Vehicle) => void;
  showTaskUpdated: (task: MaintenanceTask, vehicle: Vehicle) => void;
  showTaskCompleted: (task: MaintenanceTask, vehicle: Vehicle) => void;
  showTaskDeleted: (task: MaintenanceTask, vehicle: Vehicle, onUndo: () => void) => void;
  showEnrichmentStarted: (vehicle: Vehicle) => void;
  showEnrichmentCompleted: (vehicle: Vehicle, tasksAdded: number) => void;
  showEnrichmentFailed: (vehicle: Vehicle, error?: string) => void;
  showRecallFetchStarted: (vehicle: Vehicle) => void;
  showRecallFetchCompleted: (vehicle: Vehicle, recallsFound: number) => void;
  showRecallFetchFailed: (vehicle: Vehicle, error?: string) => void;
  showVinDecoded: (vehicle: Vehicle, fieldsUpdated: string[]) => void;
  showVinDecodeFailed: (vin: string, error?: string) => void;
  showGenericSuccess: (message: string) => void;
  showGenericError: (message: string, details?: string) => void;
  showGenericInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  let hookIndex = 1;
  const hook = (desc: string) => {
    // eslint-disable-next-line no-console
    console.log(`[useToast] ${hookIndex++}. ${desc}`);
  };
  hook('useContext ToastContext');
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { t, language } = useTranslation();

  const showVehicleAdded = (vehicle: Vehicle) => {
    toast.success(
      t('toasts.vehicleAdded', {
        name: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
        year: vehicle.year
      }),
      {
        duration: 4000,
        icon: '🚗',
      }
    );
  };

  const showVehicleUpdated = (vehicle: Vehicle) => {
    toast.success(
      t('toasts.vehicleUpdated', {
        name: vehicle.nickname || `${vehicle.make} ${vehicle.model}`
      }),
      {
        duration: 3000,
        icon: '✏️',
      }
    );
  };

  const showVehicleDeleted = (vehicle: Vehicle, onUndo: () => void) => {
    toast(
      (toastInstance: Toast) => (
        <div className="flex items-center justify-between">
          <span>
            {t('toasts.vehicleDeleted', {
              name: vehicle.nickname || `${vehicle.make} ${vehicle.model}`
            })}
          </span>
          <button
            onClick={() => {
              onUndo();
              toast.dismiss(toastInstance.id);
            }}
            className="ml-3 text-[#F7C843] hover:text-[#e0b330] underline font-medium"
          >
            {t('common.undo')}
          </button>
        </div>
      ),
      {
        duration: 6000,
        icon: '🗑️',
      }
    );
  };

  const showTaskAdded = (task: MaintenanceTask, vehicle: Vehicle) => {
    toast.success(
      t('toasts.taskAdded', {
        task: t(task.title),
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString(language) : t('common.notApplicable')
      }),
      {
        duration: 4000,
        icon: '✅',
      }
    );
  };

  const showTaskUpdated = (task: MaintenanceTask, vehicle: Vehicle) => {
    toast.success(
      t('toasts.taskUpdated', {
        task: t(task.title),
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`
      }),
      {
        duration: 3000,
        icon: '✏️',
      }
    );
  };

  const showTaskCompleted = (task: MaintenanceTask, vehicle: Vehicle) => {
    toast.success(
      t('toasts.taskCompleted', {
        task: t(task.title),
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`
      }),
      {
        duration: 4000,
        icon: '🎉',
      }
    );
  };

  const showTaskDeleted = (task: MaintenanceTask, vehicle: Vehicle, onUndo: () => void) => {
    toast(
      (toastInstance: Toast) => (
        <div className="flex items-center justify-between">
          <span>
            {t('toasts.taskDeleted', {
              task: t(task.title),
              vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`
            })}
          </span>
          <button
            onClick={() => {
              onUndo();
              toast.dismiss(toastInstance.id);
            }}
            className="ml-3 text-[#F7C843] hover:text-[#e0b330] underline font-medium"
          >
            {t('common.undo')}
          </button>
        </div>
      ),
      {
        duration: 6000,
        icon: '🗑️',
      }
    );
  };

  const showEnrichmentStarted = (vehicle: Vehicle) => {
    toast.loading(
      t('toasts.enrichmentStarted', {
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`
      }),
      {
        duration: Infinity,
        icon: '🔧',
      }
    );
  };

  const showEnrichmentCompleted = (vehicle: Vehicle, tasksAdded: number) => {
    toast.success(
      t('toasts.enrichmentCompleted', {
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
        count: tasksAdded
      }),
      {
        duration: 4000,
        icon: '✨',
      }
    );
  };

  const showEnrichmentFailed = (vehicle: Vehicle, error?: string) => {
    toast.error(
      t('toasts.enrichmentFailed', {
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
        error: error || t('common.unknownError')
      }),
      {
        duration: 5000,
        icon: '❌',
      }
    );
  };

  const showRecallFetchStarted = (vehicle: Vehicle) => {
    toast.loading(
      t('toasts.recallFetchStarted', {
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`
      }),
      {
        duration: Infinity,
        icon: '🔍',
      }
    );
  };

  const showRecallFetchCompleted = (vehicle: Vehicle, recallsFound: number) => {
    toast.success(
      t('toasts.recallFetchCompleted', {
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
        count: recallsFound
      }),
      {
        duration: 4000,
        icon: recallsFound > 0 ? '⚠️' : '✅',
      }
    );
  };

  const showRecallFetchFailed = (vehicle: Vehicle, error?: string) => {
    toast.error(
      t('toasts.recallFetchFailed', {
        vehicle: vehicle.nickname || `${vehicle.make} ${vehicle.model}`,
        error: error || t('common.unknownError')
      }),
      {
        duration: 5000,
        icon: '❌',
      }
    );
  };

  const showVinDecoded = (vehicle: Vehicle, fieldsUpdated: string[]) => {
    toast.success(
      t('toasts.vinDecoded', {
        fields: fieldsUpdated.join(', '),
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year
      }),
      {
        duration: 4000,
        icon: '🔍',
      }
    );
  };

  const showVinDecodeFailed = (vin: string, error?: string) => {
    toast.error(
      t('toasts.vinDecodeFailed', {
        vin: vin.substring(0, 8) + '...',
        error: error || t('common.unknownError')
      }),
      {
        duration: 5000,
        icon: '❌',
      }
    );
  };

  const showGenericSuccess = (message: string) => {
    toast.success(message, { duration: 3000 });
  };

  const showGenericError = (message: string, details?: string) => {
    toast.error(
      details ? `${message}: ${details}` : message,
      { duration: 5000 }
    );
  };

  const showGenericInfo = (message: string) => {
    toast(message, { duration: 3000 });
  };

  const value: ToastContextType = {
    showVehicleAdded,
    showVehicleUpdated,
    showVehicleDeleted,
    showTaskAdded,
    showTaskUpdated,
    showTaskCompleted,
    showTaskDeleted,
    showEnrichmentStarted,
    showEnrichmentCompleted,
    showEnrichmentFailed,
    showRecallFetchStarted,
    showRecallFetchCompleted,
    showRecallFetchFailed,
    showVinDecoded,
    showVinDecodeFailed,
    showGenericSuccess,
    showGenericError,
    showGenericInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}; 