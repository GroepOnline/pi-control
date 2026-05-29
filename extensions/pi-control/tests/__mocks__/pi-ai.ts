/**
 * Mock voor @earendil-works/pi-ai
 * Simuleert StringEnum utility
 */

export function StringEnum<T extends readonly string[]>(values: T) {
  return {
    type: 'string' as const,
    enum: values,
  };
}
