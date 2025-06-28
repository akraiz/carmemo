import React from 'react';
import { Icons } from '../Icon';

interface OverdueAlertBannerProps {
  vehicleName: string;
  overdueCount: number;
  onViewOverdue: () => void;
  className?: string;
  isFiltered: boolean;
  onClearFilter: () => void;
}

const OverdueAlertBanner: React.FC<OverdueAlertBannerProps> = ({
  vehicleName,
  overdueCount,
  onViewOverdue,
  className = '',
  isFiltered,
  onClearFilter,
}) => {
  const bannerClasses = isFiltered
    ? 'border-2 border-[#F9E4A9] bg-[rgba(249,228,169,0.1)]'
    : 'border-2 border-transparent';

  return (
    <section
      className={`flex items-center gap-4 p-3 mb-4 rounded-lg transition-all duration-200 cursor-pointer ${bannerClasses} ${className}`}
      role="region"
      aria-labelledby="overdue-section-heading"
      tabIndex={0}
      onClick={() => !isFiltered && onViewOverdue()}
    >
      <span className="flex-shrink-0">
        <span className="inline-flex items-center justify-center rounded-full bg-[#F9E4A9] w-10 h-10">
          <Icons.AlertTriangle className="w-6 h-6 text-[#8B5A00]" aria-hidden="true" />
        </span>
      </span>
      <div className="flex-1 min-w-0">
        <h2 id="overdue-section-heading" className="text-base font-bold text-white mb-0.5">
          Overdue Tasks
        </h2>
        <p className="text-sm text-[#bbbbbb] font-medium truncate">
          {vehicleName}
        </p>
      </div>
      {isFiltered ? (
        <button
          className="ml-2 flex items-center px-0 py-0 rounded-full bg-gray-600 text-white hover:bg-gray-500 min-w-[32px] min-h-[32px] justify-center shadow focus:outline-none focus:ring-2 focus:ring-white"
          onClick={(e) => {
            e.stopPropagation();
            onClearFilter();
          }}
          aria-label="Clear overdue filter"
          tabIndex={0}
          style={{ width: 32, height: 32 }}
        >
          <Icons.XMark className="w-5 h-5" />
        </button>
      ) : (
        <button
          className="ml-2 flex items-center px-0 py-0 rounded-full bg-[#F9E4A9] text-[#8B5A00] font-bold text-base min-w-[32px] min-h-[32px] justify-center shadow focus:outline-none focus:ring-2 focus:ring-[#F7C843]"
          onClick={(e) => {
            e.stopPropagation();
            onViewOverdue();
          }}
          aria-label="View overdue tasks in timeline"
          tabIndex={0}
          style={{ width: 32, height: 32 }}
        >
          {overdueCount}
        </button>
      )}
    </section>
  );
};

export default OverdueAlertBanner;
