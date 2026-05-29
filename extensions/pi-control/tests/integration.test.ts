/**
 * E2E integration tests — volledige pi-control flow
 * Test de index.ts registratie en samenwerking tussen tools/guardrails
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockPi, createMockContext } from './helpers';

// Mock externe dependencies
vi.mock('@sinclair/typebox', () => ({
  Type: {
    Object: (props: any) => ({ type: 'object', properties: props }),
    Optional: (schema: any) => ({ ...schema, optional: true }),
    String: (opts?: any) => ({ type: 'string', ...opts }),
    Array: (items: any, opts?: any) => ({ type: 'array', items, ...opts }),
    Record: (keys: any, values: any, opts?: any) => ({ type: 'record', keys, values, ...opts }),
    Any: () => ({ type: 'any' }),
  },
}));

vi.mock('@earendil-works/pi-ai', () => ({
  StringEnum: (values: readonly string[]) => ({ type: 'string', enum: values }),
}));

vi.mock('@earendil-works/pi-coding-agent', () => ({
  SessionManager: { list: async () => [] },
  isToolCallEventType: (type: string, event: any) => event.toolName === type,
}));

vi.mock('../commands/pi-demo', () => ({
  registerPiDemoCommand: (pi: any) => { pi.registerCommand('pi-demo', {}); },
}));

vi.mock('../commands/pi-verify', () => ({
  registerPiVerifyCommand: (pi: any) => { pi.registerCommand('pi-verify', {}); },
}));

vi.mock('../commands/pi-qa', () => ({
  registerPiQaCommand: (pi: any) => { pi.registerCommand('pi-qa', {}); },
}));

describe('pi-control integratie', () => {
  let pi: any;

  beforeEach(async () => {
    pi = createMockPi();
    // Dynamische import om de index te laden met onze mocks
    const { default: registerExtension } = await import('../index');
    registerExtension(pi);
  });

  it('registreert alle 5 tools', () => {
    const toolNames = pi._tools.map((t: any) => t.name);
    expect(toolNames).toContain('pi_session');
    expect(toolNames).toContain('pi_model');
    expect(toolNames).toContain('pi_tool');
    expect(toolNames).toContain('pi_state');
    expect(toolNames).toContain('pi_verify');
  });

  it('registreert alle 3 commando\'s', () => {
    const commandNames = pi.registerCommand.mock.calls.map((c: any) => c[0]);
    expect(commandNames).toContain('pi-demo');
    expect(commandNames).toContain('pi-verify');
    expect(commandNames).toContain('pi-qa');
  });

  it('registreert event handlers', () => {
    const events = pi.on.mock.calls.map((c: any) => c[0]);
    expect(events).toContain('tool_call');
    expect(events).toContain('session_before_switch');
    expect(events).toContain('session_before_fork');
    expect(events).toContain('turn_start');
    expect(events).toContain('turn_end');
    expect(events).toContain('session_shutdown');
    expect(events).toContain('session_start');
  });

  it('session_start toont startup melding', async () => {
    const ctx = createMockContext();
    await pi._emit('session_start', {}, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining('pi-control geladen'),
      'info',
    );
  });

  it('tools werken na volledige registratie', async () => {
    const ctx = createMockContext();
    const tool = pi._tools.find((t: any) => t.name === 'pi_session');
    const result = await tool.execute('tc-1', { action: 'list' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Beschikbare sessies');
  });

  it('guardrails werken na volledige registratie', async () => {
    const ctx = createMockContext({ ui: { confirm: async () => false, notify: vi.fn(), setStatus: vi.fn() } });
    const results = await pi._emit('tool_call', {
      toolName: 'bash',
      input: { command: 'rm -rf /' },
      toolCallId: 'tc-1',
    }, ctx);
    expect(results[0]).toEqual({ block: true, reason: expect.stringContaining('destructief') });
  });

  it('turn monitoring logt na volledige registratie', async () => {
    await pi._emit('turn_end', {
      turnIndex: 1,
      toolResults: [{ toolName: 'pi_session' }],
    });
    expect(pi.appendEntry).toHaveBeenCalledWith('turn-1', expect.objectContaining({
      tools: ['pi_session'],
    }));
  });

  it('alle tools hebben execute functie', () => {
    for (const tool of pi._tools) {
      expect(typeof tool.execute).toBe('function');
      expect(tool.name).toBeDefined();
      expect(tool.label).toBeDefined();
      expect(tool.description).toBeDefined();
      expect(tool.parameters).toBeDefined();
    }
  });

  it('alle tools hebben validatie (required params)', async () => {
    const ctx = createMockContext();
    // Test dat tools fouten geven bij ontbrekende verplichte params
    const sessionTool = pi._tools.find((t: any) => t.name === 'pi_session');
    const forkResult = await sessionTool.execute('tc', { action: 'fork' }, new AbortController().signal, undefined, ctx);
    expect(forkResult.isError).toBe(true);

    const switchResult = await sessionTool.execute('tc', { action: 'switch' }, new AbortController().signal, undefined, ctx);
    expect(switchResult.isError).toBe(true);

    const modelTool = pi._tools.find((t: any) => t.name === 'pi_model');
    const setResult = await modelTool.execute('tc', { action: 'set' }, new AbortController().signal, undefined, ctx);
    expect(setResult.isError).toBe(true);
  });
});
