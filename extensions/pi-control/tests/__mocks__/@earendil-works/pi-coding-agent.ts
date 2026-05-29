// Mock for @earendil-works/pi-coding-agent
// Provides stubs for types and functions used by pi-control

export type ExtensionAPI = any;

export function isToolCallEventType(type: string, event: any): boolean {
  return typeof event === 'object' && event !== null && event.toolName === type;
}

export class SessionManager {
  getEntries() { return []; }
  getBranch() { return []; }
  getLeafId() { return 'leaf-1'; }
  getSessionFile() { return '/tmp/session.json'; }
  static async list() { return []; }
}
