import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Vehicle, MaintenanceTask, TaskStatus, TaskCategory } from '../../types';
import { Icons } from '../Icon'; 
import { useTranslation } from '../../hooks/useTranslation';
import { CANONICAL_TASK_CATEGORIES } from '../../constants';
import { isDateOverdue } from '../../utils/dateUtils';

interface AnalyticsViewProps {
  vehicle: Vehicle | null;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ vehicle }) => {
  const { t } = useTranslation();

  const analytics = useMemo(() => {
    if (!vehicle) return null;
    
    const allTasks = vehicle.maintenanceSchedule || [];
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t: MaintenanceTask) => t.status === TaskStatus.Completed).length;
    // Updated overdue logic to match TimelineView
    const overdueTasks = allTasks.filter(
      (t: MaintenanceTask) => t.status !== TaskStatus.Completed && t.dueDate && isDateOverdue(t.dueDate)
    ).length;
    const upcomingTasks = allTasks.filter((t: MaintenanceTask) => t.status === TaskStatus.Upcoming).length;
    
    const totalCost = allTasks
      .filter((t: MaintenanceTask) => t.cost && t.status === TaskStatus.Completed)
      .reduce((sum: number, t: MaintenanceTask) => sum + (t.cost || 0), 0);
    
    const categoryBreakdown = CANONICAL_TASK_CATEGORIES.map(category => ({
      category,
      count: allTasks.filter((t: MaintenanceTask) => t.category === category).length,
      completed: allTasks.filter((t: MaintenanceTask) => t.category === category && t.status === TaskStatus.Completed).length
    })).filter(item => item.count > 0);

    const monthlySpending = Array.from({ length: 12 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const monthTasks = allTasks.filter((t: MaintenanceTask) => 
        t.status === TaskStatus.Completed && 
        t.completedDate && 
        t.cost &&
        new Date(t.completedDate) >= monthStart &&
        new Date(t.completedDate) <= monthEnd
      );
      
      return {
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        spending: monthTasks.reduce((sum: number, t: MaintenanceTask) => sum + (t.cost || 0), 0),
        tasks: monthTasks.length
      };
    }).reverse();

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      upcomingTasks,
      totalCost,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : '0',
      categoryBreakdown,
      monthlySpending,
      averageCost: completedTasks > 0 ? (totalCost / completedTasks).toFixed(2) : '0'
    };
  }, [vehicle]);

  const StatCard: React.FC<{ title: React.ReactNode; value: React.ReactNode; subtitle?: string; icon: React.ReactElement; color: string }> = ({ title, value, subtitle, icon, color }) => (
    <motion.div 
      className="bg-[#1c1c1c] p-4 rounded-lg border border-[#333333] hover:border-[#404040] transition-colors"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#a0a0a0] font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-[#707070] mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {React.cloneElement(icon, { className: "w-6 h-6 text-white" } as any)}
        </div>
      </div>
    </motion.div>
  );

  const ProgressBar: React.FC<{ value: number; max: number; color: string; label: React.ReactNode }> = ({ value, max, color, label }) => (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#cfcfcf]">{label}</span>
        <span className="text-[#a0a0a0]">{value}/{max}</span>
      </div>
      <div className="w-full bg-[#2a2a2a] rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );

  if (!vehicle) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center h-full text-center bg-[#1c1c1c] rounded-lg shadow-xl border border-dashed border-[#333333]"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <Icons.BarChart3 className="w-16 h-16 text-[#404040] mb-4" strokeWidth={1} />
        <h2 className="text-xl md:text-2xl font-bold text-[#cfcfcf] mb-2 font-heading uppercase">
          {t('analytics.noDataTitle')}
        </h2>
        <p className="text-sm text-[#707070] max-w-md">
          {t('analytics.noDataDescription')}
        </p>
      </motion.div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center text-[#a0a0a0]">
        <span className="text-6xl mb-4">📊</span>
        <h2 className="text-xl font-bold mb-2">{t('analytics.emptyTitle')}</h2>
        <p className="text-base">{t('analytics.emptyHint')}</p>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-2 md:px-0 space-y-4 md:space-y-6"
      style={{ paddingBottom: '80px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Sticky summary bar for key stats */}
      <div className="sticky top-0 z-10 bg-[#1c1c1c]/95 py-2 px-2 rounded-b-lg shadow-md flex flex-wrap gap-2 justify-between items-center border-b border-[#333333] mb-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Icons.BarChart3 className="w-5 h-5 text-[#F7C843]" />
          <span className="font-bold text-[#F7C843] text-base md:text-lg">
            {t('analytics.title')} - {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
          </span>
        </div>
        <div className="flex gap-2 text-xs md:text-sm text-[#a0a0a0]">
          <span>{t('analytics.totalTasks')}: <b className="text-white">{analytics.totalTasks}</b></span>
          <span>{t('analytics.completedTasks')}: <b className="text-green-400">{analytics.completedTasks}</b></span>
          <span>{t('analytics.overdueTasks')}: <b className="text-red-400">{analytics.overdueTasks}</b></span>
        </div>
      </div>
      {/* Key Statistics - single column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
        <StatCard
          title={<>{t('analytics.totalTasks')} <span title={t('analytics.totalTasksTooltip')}><Icons.InformationCircle className="w-4 h-4 text-[#F7C843] inline" /></span></>}
          value={analytics.totalTasks}
          icon={<Icons.ListTodo />}
          color="bg-blue-500"
        />
        <StatCard
          title={<>{t('analytics.completedTasks')} <span title={t('analytics.completedTasksTooltip')}><Icons.InformationCircle className="w-4 h-4 text-[#F7C843] inline" /></span></>}
          value={analytics.completedTasks}
          subtitle={`${analytics.completionRate}% ${t('analytics.completionRate')}`}
          icon={<Icons.CheckCircle />}
          color="bg-green-500"
        />
        <StatCard
          title={<>{t('analytics.overdueTasks')} <span title={t('analytics.overdueTasksTooltip')}><Icons.InformationCircle className="w-4 h-4 text-[#F7C843] inline" /></span></>}
          value={analytics.overdueTasks}
          icon={<Icons.AlertTriangle />}
          color="bg-red-500"
        />
        <StatCard
          title={t('analytics.totalSpent')}
          value={<div className="flex items-center gap-2">
            <span>{`$${analytics.totalCost.toFixed(2)}`}</span>
            <span className="ml-1" title={t('analytics.totalSpentTooltip')}><Icons.InformationCircle className="w-4 h-4 text-[#F7C843] inline" /></span>
          </div>}
          subtitle={`${t('analytics.averageCost')}: $${analytics.averageCost}`}
          icon={<Icons.DollarSign />}
          color="bg-yellow-500"
        />
      </div>
      {/* Task Status Breakdown and Monthly Spending - single column on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
        {/* Task Status Breakdown */}
        <motion.div 
          className="bg-[#1c1c1c] p-4 rounded-lg border border-[#333333]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 font-heading">
            {t('analytics.taskStatusBreakdown')}
          </h3>
          <ProgressBar
            value={analytics.completedTasks}
            max={analytics.totalTasks}
            color="bg-green-500"
            label={<>{t('analytics.completed')} <span title={t('analytics.completedTooltip')}><Icons.InformationCircle className="w-4 h-4 text-[#F7C843] inline" /></span></>}
          />
          <ProgressBar
            value={analytics.overdueTasks}
            max={analytics.totalTasks}
            color="bg-red-500"
            label={<>{t('analytics.overdue')} <span title={t('analytics.overdueTooltip')}><Icons.InformationCircle className="w-4 h-4 text-[#F7C843] inline" /></span></>}
          />
          <ProgressBar
            value={analytics.upcomingTasks}
            max={analytics.totalTasks}
            color="bg-yellow-500"
            label={<>{t('analytics.upcoming')} <span title={t('analytics.upcomingTooltip')}><Icons.InformationCircle className="w-4 h-4 text-[#F7C843] inline" /></span></>}
          />
        </motion.div>
        {/* Monthly Spending */}
        <motion.div 
          className="bg-[#1c1c1c] p-4 rounded-lg border border-[#333333]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-base md:text-lg font-semibold text-white mb-3 font-heading">
            {t('analytics.monthlySpending')}
          </h3>
          <div className="flex flex-col gap-2">
            {analytics.monthlySpending.map((m, idx) => (
              <div key={m.month} className="flex items-center justify-between text-xs md:text-sm">
                <span className="text-[#cfcfcf]">{m.month}</span>
                <span className="font-bold text-[#F7C843]">${m.spending.toFixed(2)}</span>
                <span className="text-[#a0a0a0]">({m.tasks} {t('analytics.tasks')})</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      {/* Category Breakdown - single column on mobile */}
      <motion.div 
        className="bg-[#1c1c1c] p-4 rounded-lg border border-[#333333]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="text-base md:text-lg font-semibold text-white mb-3 font-heading">
          {t('analytics.categoryBreakdown')}
        </h3>
        <div className="flex flex-col gap-2">
          {analytics.categoryBreakdown.map((cat, idx) => (
            <div key={cat.category} className="flex items-center justify-between text-xs md:text-sm">
              <span className="text-[#cfcfcf]">{t(`taskCategories.${cat.category}`)}</span>
              <span className="font-bold text-[#F7C843]">{cat.count}</span>
              <span className="text-green-400">{cat.completed} {t('analytics.completed')}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnalyticsView;