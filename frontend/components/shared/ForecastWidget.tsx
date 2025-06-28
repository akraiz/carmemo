import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { Icons } from '../Icon';
import { Vehicle, MaintenanceTask, TaskStatus } from '../../types';
import { formatDate, daysUntil } from '../../utils/dateUtils';

interface ForecastWidgetProps {
  vehicle: Vehicle;
  tasks: MaintenanceTask[];
  className?: string;
}

interface ForecastInsight {
  type: 'urgent' | 'upcoming' | 'forecasted' | 'completed';
  title: string;
  description: string;
  dueDate?: string;
  dueMileage?: number;
  confidence: number;
  icon: React.ReactNode;
  color: string;
  priority: number;
}

const ForecastWidget: React.FC<ForecastWidgetProps> = ({ 
  vehicle, 
  tasks, 
  className = "" 
}) => {
  const { t, language } = useTranslation();

  const generateForecastInsights = (): ForecastInsight[] => {
    const insights: ForecastInsight[] = [];
    const currentMileage = vehicle.currentMileage || 0;
    const currentDate = new Date();

    // Find urgent tasks (overdue or due within 7 days)
    const urgentTasks = tasks.filter(task => {
      if (task.status === TaskStatus.Overdue) return true;
      if (task.dueDate) {
        const days = daysUntil(task.dueDate);
        return days !== null && days <= 7 && days >= 0;
      }
      return false;
    });

    if (urgentTasks.length > 0) {
      const mostUrgent = urgentTasks[0];
      insights.push({
        type: 'urgent',
        title: t('forecast.urgentMaintenance'),
        description: t('forecast.urgentDescription', {
          task: t(mostUrgent.title),
          count: urgentTasks.length
        }),
        dueDate: mostUrgent.dueDate,
        dueMileage: mostUrgent.dueMileage,
        confidence: 95,
        icon: <Icons.AlertTriangle className="w-5 h-5" />,
        color: 'text-red-400',
        priority: 1
      });
    }

    // Find upcoming tasks (due within 30 days)
    const upcomingTasks = tasks.filter(task => {
      if (task.status !== TaskStatus.Upcoming) return false;
      if (task.dueDate) {
        const days = daysUntil(task.dueDate);
        return days !== null && days > 7 && days <= 30;
      }
      if (task.dueMileage) {
        const mileageDiff = task.dueMileage - currentMileage;
        const estimatedDays = mileageDiff / 50; // Assume 50 km/day average
        return estimatedDays > 7 && estimatedDays <= 30;
      }
      return false;
    });

    if (upcomingTasks.length > 0) {
      const nextUpcoming = upcomingTasks[0];
      insights.push({
        type: 'upcoming',
        title: t('forecast.upcomingMaintenance'),
        description: t('forecast.upcomingDescription', {
          task: t(nextUpcoming.title),
          count: upcomingTasks.length
        }),
        dueDate: nextUpcoming.dueDate,
        dueMileage: nextUpcoming.dueMileage,
        confidence: 85,
        icon: <Icons.Calendar className="w-5 h-5" />,
        color: 'text-yellow-400',
        priority: 2
      });
    }

    // Generate AI forecast based on vehicle patterns
    const forecastedTasks = generateForecastedTasks(vehicle, tasks, currentDate);
    if (forecastedTasks.length > 0) {
      const nextForecasted = forecastedTasks[0];
      insights.push({
        type: 'forecasted',
        title: t('forecast.aiPrediction'),
        description: t('forecast.forecastedDescription', {
          task: t(nextForecasted.title),
          estimatedDate: nextForecasted.estimatedDate,
          estimatedMileage: nextForecasted.estimatedMileage?.toLocaleString()
        }),
        dueDate: nextForecasted.estimatedDate,
        dueMileage: nextForecasted.estimatedMileage,
        confidence: nextForecasted.confidence,
        icon: <Icons.BarChart3 className="w-5 h-5" />,
        color: 'text-blue-400',
        priority: 3
      });
    }

    // Show completion rate
    const completedTasks = tasks.filter(task => task.status === TaskStatus.Completed);
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    
    if (completionRate > 0) {
      insights.push({
        type: 'completed',
        title: t('forecast.completionRate'),
        description: t('forecast.completionDescription', {
          rate: Math.round(completionRate),
          completed: completedTasks.length,
          total: tasks.length
        }),
        confidence: 100,
        icon: <Icons.CheckCircle className="w-5 h-5" />,
        color: 'text-green-400',
        priority: 4
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  };

  const generateForecastedTasks = (vehicle: Vehicle, tasks: MaintenanceTask[], currentDate: Date) => {
    // Simple forecasting logic - can be enhanced with more sophisticated AI
    const completedTasks = tasks.filter(task => task.status === TaskStatus.Completed);
    const currentMileage = vehicle.currentMileage || 0;
    const purchaseDate = vehicle.purchaseDate ? new Date(vehicle.purchaseDate) : new Date();
    const daysSincePurchase = Math.floor((currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const averageMilesPerDay = daysSincePurchase > 0 ? currentMileage / daysSincePurchase : 50;
    
    // Common maintenance intervals
    const maintenanceIntervals = [
      { task: 'maintenance.oilChange', interval: 5000, confidence: 90 },
      { task: 'maintenance.tireRotation', interval: 7500, confidence: 85 },
      { task: 'maintenance.airFilter', interval: 15000, confidence: 80 },
      { task: 'maintenance.brakeInspection', interval: 20000, confidence: 75 }
    ];

    return maintenanceIntervals.map(interval => {
      const lastCompleted = completedTasks.find(task => 
        task.title.includes(interval.task.split('.').pop() || '')
      );
      
      const lastMileage = lastCompleted?.dueMileage || 0;
      const nextMileage = lastMileage + interval.interval;
      const estimatedDays = (nextMileage - currentMileage) / averageMilesPerDay;
      const estimatedDate = new Date(currentDate);
      estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

      return {
        title: interval.task,
        estimatedDate: estimatedDate.toISOString().split('T')[0],
        estimatedMileage: nextMileage,
        confidence: interval.confidence
      };
    }).filter(task => task.estimatedMileage > currentMileage)
      .sort((a, b) => a.estimatedMileage - b.estimatedMileage);
  };

  const insights = generateForecastInsights();

  if (insights.length === 0) {
    return (
      <motion.div 
        className={`bg-[#2a2a2a]/50 border border-[#404040] rounded-lg p-4 ${className}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-center text-[#707070]">
          <Icons.BarChart3 className="w-5 h-5 mr-2" />
          <span className="text-sm">{t('forecast.noInsights')}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`bg-[#2a2a2a]/50 border border-[#404040] rounded-lg p-4 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white font-heading uppercase tracking-wide">
          {t('forecast.title')}
        </h3>
        <div className="flex items-center text-xs text-[#707070]">
          <Icons.BarChart3 className="w-3 h-3 mr-1" />
          {t('forecast.aiPowered')}
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <motion.div
            key={`${insight.type}-${index}`}
            className="flex items-start space-x-3 rtl:space-x-reverse"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className={`flex-shrink-0 mt-0.5 ${insight.color}`}>
              {insight.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">
                  {insight.title}
                </h4>
                <span className="text-xs text-[#707070]">
                  {insight.confidence}% {t('forecast.confidence')}
                </span>
              </div>
              <p className="text-xs text-[#a0a0a0] mt-1">
                {insight.description}
              </p>
              {(insight.dueDate || insight.dueMileage) && (
                <div className="flex items-center mt-2 text-xs text-[#707070]">
                  {insight.dueDate && (
                    <span className="flex items-center">
                      <Icons.Calendar className="w-3 h-3 mr-1" />
                      {formatDate(insight.dueDate, language)}
                    </span>
                  )}
                  {insight.dueMileage && (
                    <span className={`flex items-center ${insight.dueDate ? 'ml-3' : ''}`}>
                      <Icons.Car className="w-3 h-3 mr-1" />
                      {insight.dueMileage.toLocaleString()} {t('common.milesAbbr')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ForecastWidget; 