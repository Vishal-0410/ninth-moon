import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function normalizeMidnightToUTC(
  date: string | Date,
  timeZone: string
): string {
  const dateStr =
    typeof date === "string"
      ? date.split("T")[0]
      : date.toISOString().split("T")[0];

  const utcDate = fromZonedTime(`${dateStr} 00:00:00`, timeZone);

  return utcDate.toISOString();
}

export function localDateTimeToUTC(date: string, time: string, timeZone: string): string {
  
  const dateTime = `${date} ${time}:00`;
  const utcDate = fromZonedTime(dateTime, timeZone);
  return utcDate.toISOString();
}

export function utcToLocalDate(utcISO: string, timeZone: string): string {
  const zoned = toZonedTime(new Date(utcISO), timeZone);
  return zoned.toISOString().split("T")[0];
}
