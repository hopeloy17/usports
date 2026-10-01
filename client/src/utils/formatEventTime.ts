export function formatEventDateTime(dateTime: string): string {
    const eventDate = new Date(dateTime);
    const now = new Date();
    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() ===b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() +1);

    const timeStr = eventDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    if (isSameDay(eventDate, now)) {
        return `Today @ ${timeStr}`;
    }
    if (isSameDay(eventDate, tomorrow)) {
        return `Tomorrow @ ${timeStr}`;
    }

    const dateStr = eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
    return `${dateStr} @ ${timeStr}`
}