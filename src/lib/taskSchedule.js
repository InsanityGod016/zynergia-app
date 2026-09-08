const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

export function taskScheduleDate(dateValue, timeValue) {
  const dateMatch = DATE_PATTERN.exec(String(dateValue || ''));
  const timeMatch = TIME_PATTERN.exec(String(timeValue || ''));
  if (!dateMatch || !timeMatch) return null;

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText, secondText = '0'] = timeMatch;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  if (hour > 23 || minute > 59 || second > 59) return null;

  const result = new Date(year, month - 1, day, hour, minute, second, 0);
  if (
    result.getFullYear() !== year
    || result.getMonth() !== month - 1
    || result.getDate() !== day
  ) return null;
  return result;
}

export function defaultTaskSchedule(now = new Date()) {
  const result = new Date(now);
  result.setMinutes(result.getMinutes() + 60, 0, 0);
  return {
    date: `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}`,
    time: `${pad(result.getHours())}:${pad(result.getMinutes())}`,
  };
}

export function isFutureTaskSchedule(dateValue, timeValue, now = new Date()) {
  const scheduledAt = taskScheduleDate(dateValue, timeValue);
  return Boolean(scheduledAt && scheduledAt > now);
}
