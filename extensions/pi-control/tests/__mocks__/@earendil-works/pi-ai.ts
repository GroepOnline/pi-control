// Mock for @earendil-works/pi-ai
// Provides stub for StringEnum used by pi-control tools

export function StringEnum<T extends readonly string[]>(values: T) {
  return {
    type: 'string',
    enum: values,
  };
}
