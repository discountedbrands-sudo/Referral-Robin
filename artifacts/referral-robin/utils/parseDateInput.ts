/** Parse DD/MM/YYYY → ISO 8601 date string (end of that day UTC), or null on bad input */
export function parseDateInput(raw: string): string | null {
  const trimmed = raw.trim();
  // Accept DD/MM/YYYY or DD-MM-YYYY
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 23, 59, 59));
  if (
    isNaN(date.getTime()) ||
    date.getUTCDate() !== Number(d) ||
    date.getUTCMonth() !== Number(m) - 1
  ) return null;
  if (date <= new Date()) return null; // must be in the future
  return date.toISOString();
}

/** Format an ISO date string → DD/MM/YYYY for editing, or '' if absent */
export function formatDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}
