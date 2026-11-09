// Time and Timezone utilities (Asia/Kolkata: UTC+05:30)

export const TIMEZONE = 'Asia/Kolkata';
export const IST_OFFSET_MINUTES = 330; // 5 hours 30 mins

/**
 * Returns current UTC timestamp in seconds (integer)
 */
export function nowUtc(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Converts UTC timestamp (in seconds) to Asia/Kolkata date components
 */
export function getIstComponents(utcSeconds: number): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  minutesOfDay: number;
  timeString: string; // HH:MM
} {
  const d = new Date((utcSeconds + IST_OFFSET_MINUTES * 60) * 1000);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const minutesOfDay = hours * 60 + minutes;
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours,
    minutes,
    minutesOfDay,
    timeString,
  };
}

/**
 * Parses "HH:MM" into minutes of day (0 - 1439)
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Checks if target delivery time (minutes from midnight IST) falls before curfew.
 * Handles curfews like 23:30 or post-midnight curfews (e.g. 01:00).
 */
export function isBeforeCurfew(
  nowUtcSeconds: number,
  deliveryDurationMinutes: number,
  curfewTimeStr: string,
  bufferMinutes: number = 0
): { beforeCurfew: boolean; minutesUntilCurfew: number; estimatedArrivalIst: string } {
  const istNow = getIstComponents(nowUtcSeconds);
  const currentMinutes = istNow.minutesOfDay;
  const curfewMinutes = parseTimeToMinutes(curfewTimeStr);

  const arrivalMinutes = currentMinutes + deliveryDurationMinutes + bufferMinutes;

  // If curfew is normal daytime/late evening (e.g. 22:30, 23:30)
  // and we are ordering before curfew
  let minutesUntilCurfew = curfewMinutes - arrivalMinutes;

  // Handle midnight wrap if curfew is late evening vs early morning
  if (curfewMinutes < currentMinutes && curfewMinutes < 360) {
    // e.g. curfew is 01:00 AM (60 mins) and current is 23:45 (1425 mins)
    minutesUntilCurfew = (curfewMinutes + 1440) - arrivalMinutes;
  }

  const arrivalH = Math.floor((arrivalMinutes % 1440) / 60);
  const arrivalM = arrivalMinutes % 60;
  const estimatedArrivalIst = `${arrivalH.toString().padStart(2, '0')}:${arrivalM.toString().padStart(2, '0')}`;

  return {
    beforeCurfew: minutesUntilCurfew > 0,
    minutesUntilCurfew,
    estimatedArrivalIst,
  };
}
