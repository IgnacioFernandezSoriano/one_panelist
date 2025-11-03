import { format, addDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export interface WeekInfo {
  weekNumber: number; // -2, -1, 0, +1, +2, +3, +4
  mondayDate: Date;
  startDate: Date;
  endDate: Date;
  label: string; // "04/11"
}

/**
 * Calculate 7 weeks centered on the risk date:
 * 2 weeks before + risk week + 4 weeks after
 */
export const calculateWeekRange = (riskDate: string | Date): WeekInfo[] => {
  const risk = typeof riskDate === 'string' ? new Date(riskDate) : riskDate;
  
  // Find Monday of the risk week (week 0)
  const riskMonday = startOfWeek(risk, { weekStartsOn: 1 });
  
  const weeks: WeekInfo[] = [];
  
  // Generate 7 weeks: -2, -1, 0, +1, +2, +3, +4
  for (let i = -2; i <= 4; i++) {
    const monday = addDays(riskMonday, i * 7);
    const sunday = endOfWeek(monday, { weekStartsOn: 1 });
    
    weeks.push({
      weekNumber: i,
      mondayDate: monday,
      startDate: monday,
      endDate: sunday,
      label: format(monday, 'dd/MM')
    });
  }
  
  return weeks;
};

/**
 * Get the week number for a date relative to a reference week
 * Returns -2, -1, 0, +1, +2, +3, +4, or null if outside range
 */
export const getWeekNumber = (date: Date, weekRange: WeekInfo[]): number | null => {
  for (const week of weekRange) {
    if (isWithinInterval(date, { start: week.startDate, end: week.endDate })) {
      return week.weekNumber;
    }
  }
  return null;
};

/**
 * Get Monday of the week for a given date
 */
export const getMondayOfWeek = (date: Date): Date => {
  return startOfWeek(date, { weekStartsOn: 1 });
};

/**
 * Check if a date is within a specific week
 */
export const isDateInWeek = (date: Date, weekInfo: WeekInfo): boolean => {
  return isWithinInterval(date, { start: weekInfo.startDate, end: weekInfo.endDate });
};
