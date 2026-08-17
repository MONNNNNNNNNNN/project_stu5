/**
 * Dates as "1 Aug 2026" rather than the browser default.
 *
 * Bare toLocaleDateString() rendered "8/1/2026", which is 1 August to this app's Thai
 * audience and 8 January to a US browser — an unreadable ambiguity on a medical history
 * where the interval between measurements is the point. A named month removes the guess.
 */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
