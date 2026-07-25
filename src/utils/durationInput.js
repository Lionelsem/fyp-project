export const formatDurationInput = (rawValue, previousValue = "") => {
  const rawText = String(rawValue || "");
  const previousText = String(previousValue || "");

  // When the generated colon is deleted, also remove the preceding minute
  // digit so Backspace continues to work naturally on mobile keyboards.
  if (previousText.endsWith(":") && rawText === previousText.slice(0, -1)) {
    return rawText.replace(/\D/g, "").slice(0, -1);
  }

  const digits = rawText.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

export const isValidDurationInput = (value) =>
  !value || /^\d{2}:[0-5]\d$/.test(String(value));
