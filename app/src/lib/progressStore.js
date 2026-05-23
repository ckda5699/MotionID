const STORAGE_KEY = "motion-id-progress-v1";

export function saveProgress(progress) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore private-mode or storage quota failures; the app still works in-memory.
  }
}

export function clearProgress() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore private-mode storage failures.
  }
}
