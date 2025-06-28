export const formatDate = (dateString?: string | Date, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  try {
    return date.toLocaleDateString(locale, { ...defaultOptions, ...options });
  } catch (e) {
    console.warn(`Error formatting date with locale ${locale}, falling back to default.`, e);
    return date.toLocaleDateString(undefined, { ...defaultOptions, ...options });
  }
};

export const formatDateTime = (dateString?: string | Date, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
   try {
    return date.toLocaleString(locale, { ...defaultOptions, ...options }); // Use toLocaleString for date and time
  } catch (e) {
    console.warn(`Error formatting datetime with locale ${locale}, falling back to default.`, e);
    return date.toLocaleString(undefined, { ...defaultOptions, ...options });
  }
};

export const getISODateString = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isDateOverdue = (dateString?: string | Date): boolean => {
  if (!dateString) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const dueDate = new Date(dateString);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
};

export const daysUntil = (dateString?: string | Date): number | null => {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureDate = new Date(dateString);
  futureDate.setHours(0, 0, 0, 0);

  const diffTime = futureDate.getTime() - today.getTime();
  if (diffTime < 0) return 0; 

  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// timeAgo might need more sophisticated i18n for plurals and word order.
// For now, it remains primarily number-based with English suffixes.
// A library like `date-fns` with locale support would be better for full i18n here.
export const timeAgo = (dateString?: string | Date, locale: string = 'en-US'): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30); 
  const years = Math.round(days / 365); 

  // Basic structure, not fully localized for word order or plurals in all languages
  if (locale.startsWith('ar')) {
    if (seconds < 5) return "الآن";
    if (seconds < 60) return `منذ ${seconds} ثوان`;
    if (minutes < 60) return `منذ ${minutes} دقائق`;
    if (hours < 24) return `منذ ${hours} ساعات`;
    if (days < 7) return `منذ ${days} أيام`;
    if (weeks < 5) return `منذ ${weeks} أسابيع`;
    if (months < 12) return `منذ ${months} أشهر`;
    return `منذ ${years} سنوات`;
  }

  // English fallback
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
};

// New function for predictive, human-friendly date strings
export const getPredictiveDueText = (dateString?: string | Date, locale: string = 'en-US'): string => {
  if (!dateString) return "No due date";
  
  const dueDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If overdue
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays === 1) return "Overdue by 1 day";
    if (overdueDays < 7) return `Overdue by ${overdueDays} days`;
    if (overdueDays < 30) return `Overdue by ${Math.ceil(overdueDays / 7)} weeks`;
    if (overdueDays < 365) return `Overdue by ${Math.ceil(overdueDays / 30)} months`;
    return `Overdue by ${Math.ceil(overdueDays / 365)} years`;
  }
  
  // If due today
  if (diffDays === 0) return "Due today";
  
  // If due tomorrow
  if (diffDays === 1) return "Due tomorrow";
  
  // If due this week
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  
  // If due this month
  if (diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return `Due in ${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  
  // If due this year
  if (diffDays <= 365) {
    const months = Math.ceil(diffDays / 30);
    return `Due in ≈ ${months} month${months > 1 ? 's' : ''}`;
  }
  
  // If due next year or later
  const years = Math.ceil(diffDays / 365);
  return `Due in ≈ ${years} year${years > 1 ? 's' : ''}`;
};

export const getShortRelativeDate = (dateString?: string | Date): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - taskDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Within the last 6 days
  if (diffDays > 0 && diffDays < 7) {
    return formatDate(date, undefined, { weekday: 'long' });
  }

  // For today, future dates, or dates older than a week
  return formatDate(date, undefined, { month: 'short', day: 'numeric' });
};