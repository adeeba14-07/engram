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
