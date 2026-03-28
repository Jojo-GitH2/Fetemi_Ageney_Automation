/**
 * Returns the current local time formatted as "YYYY-MM-DDThh:mm"
 * for use as the `min` attribute on <input type="datetime-local">.
 */
export const getLocalMinTime = (): string => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

/**
 * Converts a UTC date string (from Supabase) to a readable local
 * date/time string using the user's browser locale.
 */
export const formatScheduledDate = (utcString: string): string => {
  return new Date(utcString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

/**
 * Returns the user's IANA timezone identifier, e.g. "Africa/Lagos".
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};
