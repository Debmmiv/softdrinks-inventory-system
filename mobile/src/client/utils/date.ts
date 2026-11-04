// ISO 8601 UTC timestamp for storing in SQLite
export function nowISO(): string {
  return new Date().toISOString();
}

// Human-readable date for display: "Nov 4, 2026 5:47 PM"
export function formatDisplayDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Short date for history list items: "Nov 4"
export function formatShortDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
}

// Returns ISO timestamp for N hours ago — used by downstream sync filter
export function hoursAgoISO(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}
