// ONE timestamp formatter for the whole app. Backend sends UTC ISO strings; show them in IST.
export const fmt = (ts?: string | null): string => {
  if (!ts) return "";
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(ts) && ts.includes("T");
  const d = new Date(hasZone ? ts : `${ts}Z`);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

export const STRONG_THRESHOLD = 0.25;

// Backend facts look like "text | When: ... | Involving: ..." -- show only the text part.
export const cleanFactText = (text?: string | null): string => (text ? text.split("|")[0].trim() : "");
