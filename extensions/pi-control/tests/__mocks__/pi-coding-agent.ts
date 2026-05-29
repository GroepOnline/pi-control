/**
 * Mock voor @earendil-works/pi-coding-agent
 * Simuleert de ExtensionAPI en SessionManager interfaces
 */

import { vi } from 'vitest';

export interface MockExtensionAPI {
  registerTool: ReturnType<typeof vi.fn>;
  registerCommand: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  getAllTools: ReturnType<typeof vi.fn>;
  getActiveTools: ReturnType<typeof vi.fn>;
  setActiveTools: ReturnType<typeof vi.fn>;
  setModel: ReturnType<typeof vi.fn>;
  getThinkingLevel: ReturnType<typeof vi.fn>;
  setThinkingLevel: ReturnType<typeof vi.fn>;
  setLabel: ReturnType<typeof vi.fn>;
  setSessionName: ReturnType<typeof vi.fn>;
  getSessionName: ReturnType<typeof vi.fn>;
  sendUserMessage: ReturnType<typeof vi.fn>;
  appendEntry: ReturnType<typeof vi.fn>;
}

export function isToolCallEventType(type: string, event: any): boolean {
  return event.toolName === type;
}

export class SessionManager {
  getEntries = vi.fn(() => []);
  getBranch = vi.fn(() => []);
  getLeafId = vi.fn(() => 'leaf-1');
  getSessionFile = vi.fn(() => '/tmp/test/session.json');
  static list = vi.fn(async () => []);
}

export function createMockExtensionAPI(): MockExtensionAPI {
  const tools: any[] = [];
  const activeToolNames = new Set<string>();
  const eventHandlers: Record<string, Function[]> = {};

  return {
    registerTool: vi.fn((tool: any) => {
      tools.push(tool);
      activeToolNames.add(tool.name);
    }),
    registerCommand: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers[event]) eventHandlers[event] = [];
      eventHandlers[event].push(handler);
    }),
    getAllTools: vi.fn(() => tools),
    getActiveTools: vi.fn(() => tools.filter(t => activeToolNames.has(t.name))),
    setActiveTools: vi.fn((names: string[]) => {
      activeToolNames.clear();
      names.forEach(n => activeToolNames.add(n));
    }),
    setModel: vi.fn(async () => true),
    getThinkingLevel: vi.fn(() => 'medium'),
    setThinkingLevel: vi.fn(),
    setLabel: vi.fn(),
    setSessionName: vi.fn(),
    getSessionName: vi.fn(() => 'test-session'),
    sendUserMessage: vi.fn(),
    appendEntry: vi.fn(),
  };
}
