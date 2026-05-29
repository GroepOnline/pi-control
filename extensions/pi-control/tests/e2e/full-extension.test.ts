/**
 * E2E tests — Full extension lifecycle
 *
 * Tests the complete pi-control extension registration and interaction flow:
 * - Extension registers all components (tools, commands, guardrails, events)
 * - Tools produce correct outputs for all actions
 * - Guardrails intercept dangerous operations
 * - Commands generate proper LLM prompts
 * - Cross-component interactions work correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockPi, createMockContext, createToolCallEvent } from '../helpers';

vi.mock('typebox', () => ({
  Type: {
    Object: (props: any) => ({ type: 'object', properties: props }),
    Optional: (schema: any) => ({ ...schema, optional: true }),
    String: (opts?: any) => ({ type: 'string', ...opts }),
    Array: (items: any, opts?: any) => ({ type: 'array', items, ...opts }),
    Record: (keys: any, values: any, opts?: any) => ({ type: 'record', keys, values, ...opts }),
    Any: () => ({ type: 'any' }),
  },
}));

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
  isToolCallEventType: (type: string, event: any) => event?.toolName === type,
}));

vi.mock('../../commands/pi-demo', () => ({
  registerPiDemoCommand: (pi: any) => { pi.registerCommand('pi-demo', {}); },
}));

vi.mock('../../commands/pi-verify', () => ({
  registerPiVerifyCommand: (pi: any) => { pi.registerCommand('pi-verify', {}); },
}));

vi.mock('../../commands/pi-qa', () => ({
  registerPiQaCommand: (pi: any) => { pi.registerCommand('pi-qa', {}); },
}));

describe('E2E: Full pi-control extension lifecycle', () => {
  let pi: any;

  beforeEach(async () => {
    pi = createMockPi();
    const { default: registerExtension } = await import('../../index');
    registerExtension(pi);
  });

  describe('Extension registration', () => {
    it('registers all 5 pi_* tools', () => {
      const toolNames = pi._tools.map((t: any) => t.name);
      expect(toolNames).toEqual(['pi_session', 'pi_model', 'pi_tool', 'pi_state', 'pi_verify']);
    });

    it('registers all 3 slash commands', () => {
      const commands = pi.registerCommand.mock.calls.map((c: any) => c[0]);
      expect(commands).toEqual(['pi-demo', 'pi-verify', 'pi-qa']);
    });

    it('registers guardrail event handlers', () => {
      const events = pi.on.mock.calls.map((c: any) => c[0]);
      expect(events).toContain('tool_call');
      expect(events).toContain('session_before_switch');
      expect(events).toContain('session_before_fork');
      expect(events).toContain('turn_start');
      expect(events).toContain('turn_end');
      expect(events).toContain('session_shutdown');
    });

    it('registers session_start handler for startup notification', () => {
      const events = pi.on.mock.calls.map((c: any) => c[0]);
      expect(events).toContain('session_start');
    });
  });

  describe('E2E: Tool ↔ Guardrail interaction', () => {
    it('bash guard blocks dangerous commands even after tools are registered', async () => {
      const ctx = createMockContext({ ui: { confirm: async () => false, notify: vi.fn(), setStatus: vi.fn() } });
      const results = await pi._emit('tool_call', createToolCallEvent('bash', { command: 'rm -rf /' }), ctx);
      expect(results[0]).toEqual({ block: true, reason: expect.stringContaining('destructief') });
    });

    it('safe bash commands pass through guardrails', async () => {
      const results = await pi._emit('tool_call', createToolCallEvent('bash', { command: 'ls -la' }), createMockContext());
      expect(results[0]).toBeUndefined();
    });

    it('pi_session switch triggers session guard', async () => {
      const confirmSpy = vi.fn(async () => true);
      const ctx = createMockContext({ ui: { confirm: confirmSpy, notify: vi.fn(), setStatus: vi.fn() } });
      await pi._emit('tool_call', createToolCallEvent('pi_session', { action: 'switch' }), ctx);
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sessie wijziging'),
        expect.stringContaining('switch'),
      );
    });

    it('model set triggers model guard', async () => {
      const confirmSpy = vi.fn(async () => true);
      const ctx = createMockContext({ ui: { confirm: confirmSpy, notify: vi.fn(), setStatus: vi.fn() } });
      await pi._emit('tool_call', createToolCallEvent('pi_model', { action: 'set', provider: 'anthropic', modelId: 'claude-sonnet-4-20250514' }), ctx);
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Model wissel'),
        expect.stringContaining('claude-sonnet-4-20250514'),
      );
    });
  });

  describe('E2E: Tool execution after full registration', () => {
    it('pi_session list works', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_session');
      const result = await tool.execute('tc-1', { action: 'list' }, new AbortController().signal, undefined, ctx);
      expect(result.content[0].text).toContain('Beschikbare sessies');
    });

    it('pi_model list works', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_model');
      const result = await tool.execute('tc-1', { action: 'list' }, new AbortController().signal, undefined, ctx);
      expect(result.content[0].text).toContain('Beschikbare modellen');
    });

    it('pi_tool list works', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_tool');
      const result = await tool.execute('tc-1', { action: 'list' }, new AbortController().signal, undefined, ctx);
      expect(result.content[0].text).toContain('Tools');
    });

    it('pi_state save works', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_state');
      const result = await tool.execute('tc-1', { action: 'save', key: 'test-ckpt', data: { x: 1 } }, new AbortController().signal, undefined, ctx);
      expect(result.content[0].text).toContain('opgeslagen');
    });

    it('pi_verify session works', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_verify');
      const result = await tool.execute('tc-1', { action: 'session' }, new AbortController().signal, undefined, ctx);
      expect(result.content[0].text).toContain('Entries');
      expect(result.details.passed).toBe(true);
    });
  });

  describe('E2E: Turn monitoring flow', () => {
    it('logs tool usage per turn', async () => {
      await pi._emit('turn_end', {
        turnIndex: 1,
        toolResults: [
          { toolName: 'pi_session' },
          { toolName: 'bash' },
          { toolName: 'pi_model' },
        ],
      });
      expect(pi.appendEntry).toHaveBeenCalledWith('turn-1', expect.objectContaining({
        tools: ['pi_session', 'bash', 'pi_model'],
      }));
    });

    it('sets status on turn_start', async () => {
      const ctx = createMockContext();
      await pi._emit('turn_start', { turnIndex: 3 }, ctx);
      expect(ctx.ui.setStatus).toHaveBeenCalledWith('pi-control', 'Turn 3 gestart');
    });
  });

  describe('E2E: Session lifecycle with guardrails', () => {
    it('switch large session requires confirmation', async () => {
      const confirmSpy = vi.fn(async () => true);
      const ctx = createMockContext({
        sessionManager: {
          ...createMockContext().sessionManager,
          getEntries: () => Array(30).fill({ id: 'e' }),
        },
        ui: { confirm: confirmSpy, notify: vi.fn(), setStatus: vi.fn() },
      });
      await pi._emit('session_before_switch', { reason: 'new' }, ctx);
      expect(confirmSpy).toHaveBeenCalled();
    });

    it('switch large session cancelled by user', async () => {
      const ctx = createMockContext({
        sessionManager: {
          ...createMockContext().sessionManager,
          getEntries: () => Array(30).fill({ id: 'e' }),
        },
        ui: { confirm: async () => false, notify: vi.fn(), setStatus: vi.fn() },
      });
      const results = await pi._emit('session_before_switch', { reason: 'new' }, ctx);
      expect(results[0]).toEqual({ cancel: true });
    });

    it('fork large session requires confirmation', async () => {
      const confirmSpy = vi.fn(async () => true);
      const ctx = createMockContext({
        sessionManager: {
          ...createMockContext().sessionManager,
          getEntries: () => Array(60).fill({ id: 'e' }),
        },
        ui: { confirm: confirmSpy, notify: vi.fn(), setStatus: vi.fn() },
      });
      await pi._emit('session_before_fork', {}, ctx);
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe('E2E: Tool parameter validation', () => {
    it('all tools have required metadata', () => {
      for (const tool of pi._tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.label).toBeDefined();
        expect(typeof tool.label).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.parameters).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('pi_session rejects missing entryId for fork', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_session');
      const result = await tool.execute('tc', { action: 'fork' }, new AbortController().signal, undefined, ctx);
      expect(result.isError).toBe(true);
    });

    it('pi_session rejects missing sessionPath for switch', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_session');
      const result = await tool.execute('tc', { action: 'switch' }, new AbortController().signal, undefined, ctx);
      expect(result.isError).toBe(true);
    });

    it('pi_model rejects missing modelId for set', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_model');
      const result = await tool.execute('tc', { action: 'set' }, new AbortController().signal, undefined, ctx);
      expect(result.isError).toBe(true);
    });

    it('pi_model rejects unknown model', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_model');
      const result = await tool.execute('tc', { action: 'set', modelId: 'nonexistent-model' }, new AbortController().signal, undefined, ctx);
      expect(result.isError).toBe(true);
    });

    it('pi_tool rejects missing toolNames for set_active', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_tool');
      const result = await tool.execute('tc', { action: 'set_active' }, new AbortController().signal, undefined, ctx);
      expect(result.isError).toBe(true);
    });

    it('pi_state rejects missing key for restore', async () => {
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_state');
      const result = await tool.execute('tc', { action: 'restore' }, new AbortController().signal, undefined, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe('E2E: Error handling', () => {
    it('pi_session handles tool errors gracefully', async () => {
      const ctx = createMockContext();
      ctx.compact = () => { throw new Error('compact failed'); };
      const tool = pi._tools.find((t: any) => t.name === 'pi_session');
      const result = await tool.execute('tc', { action: 'compact' }, new AbortController().signal, undefined, ctx);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('pi_session error');
    });

    it('pi_model handles setModel failure', async () => {
      pi.setModel = async () => false;
      const ctx = createMockContext();
      const tool = pi._tools.find((t: any) => t.name === 'pi_model');
      const result = await tool.execute('tc', { action: 'set', modelId: 'claude-sonnet-4-20250514' }, new AbortController().signal, undefined, ctx);
      expect(result.isError).toBe(true);
    });
  });

  describe('E2E: Startup notification', () => {
    it('session_start sends notification', async () => {
      const ctx = createMockContext();
      await pi._emit('session_start', {}, ctx);
      expect(ctx.ui.notify).toHaveBeenCalledWith(
        expect.stringContaining('pi-control geladen'),
        'info',
      );
    });
  });
});
