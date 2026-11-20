export const formatDateForInput = (dateString?: string | null): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000); // GMT+7
  return local.toISOString().split("T")[0];
};

export function formatDuration(seconds?: number): string {
  if (!seconds && seconds !== 0) return "--:--";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "--/--/----";

  const date = new Date(dateString);

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
