const DISPLAY_NAME_KEY = "wealthplanner_display_name";

export function getDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setDisplayName(name: string) {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name.trim());
  } catch {
    // localStorage unavailable — no-op, name simply won't persist
  }
}

export function greetingWord(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 11) return "Selamat Pagi";
  if (h < 15) return "Selamat Siang";
  if (h < 18) return "Selamat Sore";
  return "Selamat Malam";
}

export function todayLabel(date: Date = new Date()): string {
  // Hasil: "Senin, 14 September 2026" — otomatis ikut tanggal device, tidak di-hardcode.
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
