import urRomanDict from "./ur-roman.json";

export const urRoman = urRomanDict;
export type I18nDictionary = typeof urRomanDict;

export function t(
  path: string,
  params?: Record<string, string | number>,
): string {
  const keys = path.split(".");
  let current: unknown = urRoman;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }

  if (typeof current !== "string") {
    return path;
  }

  let result = current;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
    }
  }

  return result;
}
