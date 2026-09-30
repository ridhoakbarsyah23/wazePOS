export const dayInMilliseconds = 86_400_000;

export const jakartaDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dateKey(date: Date) {
  const parts = Object.fromEntries(
    jakartaDateFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function startOfJakartaDay(date: Date) {
  return new Date(`${dateKey(date)}T00:00:00+07:00`);
}
