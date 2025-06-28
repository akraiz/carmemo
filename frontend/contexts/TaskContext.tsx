import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { MaintenanceTask, TaskStatus, TaskCategory } from '../types';

interface TaskContextType {
  tasks: MaintenanceTask[];
  groupedTasks: {
    completed: MaintenanceTask[];
    upcoming: MaintenanceTask[];
    forecasted: MaintenanceTask[];
    overdue: MaintenanceTask[];
  };
  filter: {
    status?: TaskStatus;
    category?: TaskCategory;
  };
  setFilter: (filter: { status?: TaskStatus; category?: TaskCategory }) => void;
  upsertTask: (task: MaintenanceTask) => void;
  deleteTask: (id: string) => void;
  smartMatchAndArchive: (completedTask: MaintenanceTask) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    // Return a fallback instead of throwing to prevent hook order issues
    console.warn('useTasks must be used within TaskProvider');
    return {
      tasks: [],
      groupedTasks: { completed: [], upcoming: [], forecasted: [], overdue: [] },
      filter: { category: undefined, status: undefined },
      setFilter: () => {},
      upsertTask: () => {},
      deleteTask: () => {},
      smartMatchAndArchive: () => {},
    };
  }
  return context;
};

export const TaskProvider: React.FC<{ initialTasks: MaintenanceTask[]; children: ReactNode }> = ({ initialTasks, children }) => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks);
  const [filter, setFilter] = useState<{ status?: TaskStatus; category?: TaskCategory }>({});

  const groupedTasks = useMemo(() => {
    const filtered = tasks.filter(t =>
      (!filter.status || t.status === filter.status) &&
      (!filter.category || t.category === filter.category)
    );
    return {
      completed: filtered.filter(t => t.status === TaskStatus.Completed),
      upcoming: filtered.filter(t => t.status === TaskStatus.Upcoming),
      forecasted: filtered.filter(t => t.isForecast),
      overdue: filtered.filter(t => t.status === TaskStatus.Overdue),
    };
  }, [tasks, filter]);

  const upsertTask = (task: MaintenanceTask) => {
    setTasks(ts => {
      const idx = ts.findIndex(t => t.id === task.id);
      if (idx >= 0) {
        const copy = [...ts];
        copy[idx] = task;
        return copy;
      }
      return [...ts, task];
    });
  };

  const deleteTask = (id: string) => {
    setTasks(ts => ts.filter(t => t.id !== id));
  };

  // Smart matching: if a completed task matches a forecasted one (same title/category, dueMileage within ±500km), archive the forecasted
  const smartMatchAndArchive = (completedTask: MaintenanceTask) => {
    setTasks(ts => ts.map(t => {
      if (
        t.isForecast &&
        t.title.toLowerCase() === completedTask.title.toLowerCase() &&
        t.category === completedTask.category &&
        t.dueMileage && completedTask.dueMileage &&
        Math.abs(t.dueMileage - completedTask.dueMileage) <= 500
      ) {
        return { ...t, status: TaskStatus.Completed, archived: true };
      }
      return t;
    }));
  };

  return (
    <TaskContext.Provider value={{ tasks, groupedTasks, filter, setFilter, upsertTask, deleteTask, smartMatchAndArchive }}>
      {children}
    </TaskContext.Provider>
  );
}; 