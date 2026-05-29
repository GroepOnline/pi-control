/**
 * E2E test helpers — mock ExtensionAPI en context objects
 */

import { vi } from 'vitest';
import type { MockExtensionAPI } from './__mocks__/pi-coding-agent';

// Mock ExtensionAPI met alle benodigde methodes
export function createMockPi(overrides: Record<string, any> = {}): any {
  const tools: any[] = [];
  const activeToolNames = new Set<string>();
  const eventHandlers: Record<string, Function[]> = {};

  const mockPi: any = {
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

    // Helpers voor tests
    _emit: async (event: string, data: any, ctx?: any) => {
      const handlers = eventHandlers[event] || [];
      const results: any[] = [];
      for (const handler of handlers) {
        const result = await handler(data, ctx || createMockContext());
        results.push(result);
      }
      return results;
    },
    _tools: tools,
    _activeToolNames: activeToolNames,
    _eventHandlers: eventHandlers,

    ...overrides,
  };

  return mockPi;
}

// Mock context
export function createMockContext(overrides: Record<string, any> = {}): any {
  return {
    cwd: '/tmp/test',
    sessionManager: {
      getEntries: vi.fn(() => []),
      getBranch: vi.fn(() => []),
      getLeafId: vi.fn(() => 'leaf-1'),
      getSessionFile: vi.fn(() => '/tmp/test/session.json'),
    },
    modelRegistry: {
      getAll: vi.fn(() => [
        { id: 'claude-sonnet-4-20250514', provider: 'anthropic', name: 'Claude Sonnet' },
        { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o' },
      ]),
      find: vi.fn((provider: string, id: string) => {
        if (provider === 'anthropic' && id === 'claude-sonnet-4-20250514') {
          return { id, provider, name: 'Claude Sonnet' };
        }
        return undefined;
      }),
    },
    model: { id: 'claude-sonnet-4-20250514', provider: 'anthropic' },
    ui: {
      notify: vi.fn(),
      confirm: vi.fn(async () => true),
      setStatus: vi.fn(),
    },
    compact: vi.fn(),
    waitForIdle: vi.fn(async () => {}),
    ...overrides,
  };
}

export function createToolCallEvent(toolName: string, input: Record<string, any> = {}) {
  return { toolName, input, toolCallId: `tc-${Date.now()}` };
}
