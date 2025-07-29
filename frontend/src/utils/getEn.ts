export function getEn(field: string | { en?: string; [key: string]: any } | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && field.en) return field.en;
  return Object.values(field)[0] || "";
} 