import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { Icons } from '../Icon';
import { TaskStatus } from '../../types';

export type TimelineView = 'all' | 'upcoming' | 'completed' | 'forecasted' | 'recalls' | 'urgent';
export type TimelineSort = 'dueDate' | 'mileage' | 'status' | 'priority' | 'category';

interface TimelineFiltersProps {
  currentView: TimelineView;
  currentSort: TimelineSort;
  onViewChange: (view: TimelineView) => void;
  onSortChange: (sort: TimelineSort) => void;
  showCompleted: boolean;
  onToggleCompleted: () => void;
  className?: string;
}

const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  currentView,
  currentSort,
  onViewChange,
  onSortChange,
  showCompleted,
  onToggleCompleted,
  className = ""
}) => {
  const { t, language } = useTranslation();
  const [search, setSearch] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const categoryOptions = [
    { value: 'all', label: t('timeline.categoryAll'), icon: Icons.ListTodo },
    { value: 'oil', label: t('taskCategories.OilChange'), icon: Icons.OilCan },
    { value: 'tire', label: t('taskCategories.TireRotation'), icon: Icons.Tire },
    { value: 'brake', label: t('taskCategories.BrakeService'), icon: Icons.Brake },
    { value: 'battery', label: t('taskCategories.BatteryService'), icon: Icons.Battery },
    { value: 'inspection', label: t('taskCategories.Inspection'), icon: Icons.Wrench },
    { value: 'other', label: t('taskCategories.Other'), icon: Icons.Wrench },
  ];
  const selectedCategory = categoryOptions.find(opt => opt.value === currentView) || categoryOptions[0];

  const viewOptions = [
    { value: 'all' as TimelineView, label: t('timeline.showAll'), icon: Icons.ListTodo, color: 'text-blue-400' },
    { value: 'urgent' as TimelineView, label: t('timeline.showUrgent'), icon: Icons.AlertTriangle, color: 'text-red-400' },
    { value: 'upcoming' as TimelineView, label: t('timeline.showUpcoming'), icon: Icons.Calendar, color: 'text-yellow-400' },
    { value: 'forecasted' as TimelineView, label: t('timeline.showForecastedOnly'), icon: Icons.BarChart3, color: 'text-purple-400' },
    { value: 'recalls' as TimelineView, label: t('timeline.showRecalls'), icon: Icons.AlertTriangle, color: 'text-orange-400' },
    { value: 'completed' as TimelineView, label: t('timeline.showCompletedOnly'), icon: Icons.CheckCircle, color: 'text-green-400' }
  ];

  const sortOptions = [
    { value: 'dueDate' as TimelineSort, label: t('timeline.sortByDueDate'), icon: Icons.Calendar },
    { value: 'mileage' as TimelineSort, label: t('timeline.sortByMileage'), icon: Icons.Car },
    { value: 'status' as TimelineSort, label: t('timeline.sortByStatus'), icon: Icons.CheckCircle },
    { value: 'priority' as TimelineSort, label: t('timeline.sortByPriority'), icon: Icons.AlertTriangle },
    { value: 'category' as TimelineSort, label: t('timeline.sortByCategory'), icon: Icons.Wrench }
  ];

  const getCurrentViewOption = () => {
    return viewOptions.find(option => option.value === currentView) || viewOptions[0];
  };

  const getCurrentSortOption = () => {
    return sortOptions.find(option => option.value === currentSort) || sortOptions[0];
  };

  const currentSortOption = getCurrentSortOption();

  return (
    <div className={`flex flex-row items-center gap-4 p-4 bg-[#2a2a2a]/50 border border-[#404040] rounded-lg ${className}`}>
      {/* Search Bar */}
      <div className="flex items-center gap-2 flex-1">
        <Icons.Search className="w-5 h-5 text-[#F7C843]" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('timeline.searchPlaceholder')}
          className="bg-[#1c1c1c] border border-[#404040] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F7C843]/30 focus:border-[#F7C843] w-full"
        />
      </div>
      {/* Category Dropdown */}
      <div className="relative min-w-[180px]">
        <button
          onClick={() => setIsCategoryOpen(v => !v)}
          className="flex items-center gap-2 bg-[#1c1c1c] border border-[#404040] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#F7C843]/30 focus:border-[#F7C843] w-full"
        >
          <selectedCategory.icon className="w-4 h-4 text-[#F7C843]" />
          <span>{t('timeline.filterCategory', { category: selectedCategory.label })}</span>
          <Icons.ChevronDown className={`w-4 h-4 text-[#707070] transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {isCategoryOpen && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-1 bg-[#1c1c1c] border border-[#404040] rounded-md shadow-lg z-10"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onViewChange(option.value as TimelineView);
                    setIsCategoryOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm hover:bg-[#2a2a2a] transition-colors ${
                    currentView === option.value ? 'text-[#F7C843] bg-[#F7C843]/10' : 'text-white'
                  }`}
                >
                  <option.icon className="w-4 h-4 mr-2 text-[#F7C843]" />
                  {option.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TimelineFilters; 