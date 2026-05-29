/**
 * E2E tests — pi_* tools
 * Test alle 5 custom tools: pi_session, pi_model, pi_tool, pi_state, pi_verify
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
}));

const { registerPiTools } = await import('../tools');

describe('pi_session', () => {
  let pi: any;
  let tool: any;

  beforeEach(() => {
    pi = createMockPi();
    registerPiTools(pi);
    tool = pi._tools.find((t: any) => t.name === 'pi_session');
  });

  it('registreert pi_session tool', () => {
    expect(tool).toBeDefined();
    expect(tool.label).toBe('Pi Session');
    expect(tool.parameters).toBeDefined();
  });

  it('list retourneert beschikbare sessies', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'list' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Beschikbare sessies');
    expect(result.details.sessions).toBeDefined();
  });

  it('inspect retourneert sessie details', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'inspect' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Huidige sessie');
    expect(result.content[0].text).toContain('Totale entries');
    expect(result.details.entries).toBeDefined();
    expect(result.details.branch).toBeDefined();
    expect(result.details.leafId).toBeDefined();
  });

  it('fork vereist entryId', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'fork' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entryId is required');
  });

  it('fork met entryId triggert /fork', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'fork', entryId: 'entry-5' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Fork gestart');
    expect(pi.sendUserMessage).toHaveBeenCalledWith('/fork entry-5', { deliverAs: 'followUp' });
  });

  it('switch vereist sessionPath', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'switch' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sessionPath is required');
  });

  it('switch met sessionPath triggert /resume', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'switch', sessionPath: '/tmp/s.json' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Sessie wissel gestart');
    expect(pi.sendUserMessage).toHaveBeenCalledWith('/resume /tmp/s.json', { deliverAs: 'followUp' });
  });

  it('compact start compressie', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'compact' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Compressie gestart');
    expect(ctx.compact).toHaveBeenCalled();
  });

  it('compact met custom instructions', async () => {
    const ctx = createMockContext();
    await tool.execute('tc-1', { action: 'compact', compactInstructions: 'Focus on errors' }, new AbortController().signal, undefined, ctx);
    expect(ctx.compact).toHaveBeenCalledWith(expect.objectContaining({
      customInstructions: 'Focus on errors',
    }));
  });

  it('navigate vereist entryId', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'navigate' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('entryId is required');
  });

  it('navigate retourneert instructies', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'navigate', entryId: 'entry-3' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Navigeren naar entry entry-3');
  });

  it('label vereist entryId', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'label' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
  });

  it('label zet label op entry', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'label', entryId: 'e1', label: 'important' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Label "important" gezet');
    expect(pi.setLabel).toHaveBeenCalledWith('e1', 'important');
  });

  it('label wist label zonder param', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'label', entryId: 'e1' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Label gewist');
  });

  it('rename vereist name', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'rename' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
  });

  it('rename hernoemt sessie', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'rename', name: 'my-session' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Sessie hernoemd naar');
    expect(pi.setSessionName).toHaveBeenCalledWith('my-session');
  });

  it('vangt errors op', async () => {
    const ctx = createMockContext();
    ctx.compact = () => { throw new Error('compact failed'); };
    const result = await tool.execute('tc-1', { action: 'compact' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('pi_session error');
  });
});

describe('pi_model', () => {
  let pi: any;
  let tool: any;

  beforeEach(() => {
    pi = createMockPi();
    registerPiTools(pi);
    tool = pi._tools.find((t: any) => t.name === 'pi_model');
  });

  it('registreert pi_model tool', () => {
    expect(tool).toBeDefined();
    expect(tool.label).toBe('Pi Model');
  });

  it('list retourneert modellen', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'list' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Beschikbare modellen');
    expect(result.details.models).toHaveLength(2);
    expect(result.details.current).toBeDefined();
  });

  it('set vereist modelId', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'set' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('modelId is required');
  });

  it('set wisselt naar bestaand model', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'set', modelId: 'claude-sonnet-4-20250514' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Model gewisseld');
    expect(pi.setModel).toHaveBeenCalled();
  });

  it('set faalt bij onbekend model', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'set', modelId: 'unknown' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('niet gevonden');
  });

  it('set faalt als setModel false retourneert', async () => {
    pi.setModel = async () => false;
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'set', modelId: 'claude-sonnet-4-20250514' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Geen API key');
  });

  it('thinking vereist level', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'thinking' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
  });

  it('thinking wijzigt level', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'thinking', level: 'high' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Thinking level gewijzigd');
    expect(pi.setThinkingLevel).toHaveBeenCalledWith('high');
  });

  it('providers retourneert info', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'providers' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Providers');
  });
});

describe('pi_tool', () => {
  let pi: any;
  let tool: any;

  beforeEach(() => {
    pi = createMockPi();
    registerPiTools(pi);
    tool = pi._tools.find((t: any) => t.name === 'pi_tool');
  });

  it('registreert pi_tool tool', () => {
    expect(tool).toBeDefined();
    expect(tool.label).toBe('Pi Tool');
  });

  it('list retourneert alle tools', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'list' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Tools');
    expect(result.content[0].text).toContain('actief');
  });

  it('set_active vereist toolNames', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'set_active' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
  });

  it('set_active stelt tools in', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'set_active', toolNames: ['pi_session'] }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Actieve tools ingesteld');
    expect(pi.setActiveTools).toHaveBeenCalledWith(['pi_session']);
  });

  it('inspect vereist toolName', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'inspect' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
  });

  it('inspect retourneert details', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'inspect', toolName: 'pi_session' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Tool: pi_session');
    expect(result.details.tool).toBeDefined();
  });

  it('inspect faalt bij onbekende tool', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'inspect', toolName: 'unknown' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('niet gevonden');
  });
});

describe('pi_state', () => {
  let pi: any;
  let tool: any;

  beforeEach(() => {
    pi = createMockPi();
    registerPiTools(pi);
    tool = pi._tools.find((t: any) => t.name === 'pi_state');
  });

  it('registreert pi_state tool', () => {
    expect(tool).toBeDefined();
    expect(tool.label).toBe('Pi State');
  });

  it('save bewaart toestand', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'save', key: 'ckpt-1', data: { foo: 'bar' } }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Toestand "ckpt-1" opgeslagen');
    expect(pi.appendEntry).toHaveBeenCalledWith('ckpt-1', { foo: 'bar' });
  });

  it('save genereert key zonder param', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'save' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('opgeslagen');
    expect(pi.appendEntry).toHaveBeenCalledWith(expect.stringMatching(/^state-/), expect.any(Object));
  });

  it('restore vereist key', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'restore' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
  });

  it('restore vindt opgeslagen state', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ type: 'custom', customType: 'ckpt-1', data: { foo: 'bar' } }],
      },
    });
    const result = await tool.execute('tc-1', { action: 'restore', key: 'ckpt-1' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('gevonden');
    expect(result.details.data).toEqual({ foo: 'bar' });
  });

  it('restore faalt bij onbekende key', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'restore', key: 'x' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('niet gevonden');
  });

  it('diff vergelijkt huidige staat', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'diff' }, new AbortController().signal, undefined, ctx);
    // Returns either "Huidige sessie staat" or "Geen entry om te vergelijken" depending on entries
    expect(result.content[0].text).toBeDefined();
    expect(result.details).toBeDefined();
  });

  it('diff met key zoekt opgeslagen state', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ type: 'custom', customType: 'ckpt-1', data: {} }],
      },
    });
    const result = await tool.execute('tc-1', { action: 'diff', key: 'ckpt-1' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Diff met "ckpt-1"');
  });

  it('diff faalt bij onbekende key', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'diff', key: 'x' }, new AbortController().signal, undefined, ctx);
    expect(result.isError).toBe(true);
  });

  it('history retourneert state entries', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [
          { type: 'custom', customType: 'state-1', data: {} },
          { type: 'custom', customType: 'other', data: {} },
        ],
      },
    });
    const result = await tool.execute('tc-1', { action: 'history' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('State geschiedenis');
    expect(result.content[0].text).toContain('state-1');
  });

  it('history toont bericht bij geen entries', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'history' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('nog geen state');
  });
});

describe('pi_verify', () => {
  let pi: any;
  let tool: any;

  beforeEach(() => {
    pi = createMockPi();
    registerPiTools(pi);
    tool = pi._tools.find((t: any) => t.name === 'pi_verify');
  });

  it('registreert pi_verify tool', () => {
    expect(tool).toBeDefined();
    expect(tool.label).toBe('Pi Verify');
  });

  it('session verifieert properties', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'session' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Entries');
    expect(result.details.passed).toBe(true);
  });

  it('session met correcte expectations passeert', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ id: 'e1' }, { id: 'e2' }],
      },
    });
    const result = await tool.execute('tc-1', { action: 'session', expectations: { entries: 2 } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(true);
  });

  it('session met foute expectations faalt', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ id: 'e1' }],
      },
    });
    const result = await tool.execute('tc-1', { action: 'session', expectations: { entries: 5 } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(false);
    expect(result.details.failures.length).toBeGreaterThan(0);
  });

  it('session met entries.gt expectation', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
      },
    });
    const passed = await tool.execute('tc-1', { action: 'session', expectations: { 'entries.gt': 2 } }, new AbortController().signal, undefined, ctx);
    expect(passed.details.passed).toBe(true);
  });

  it('session met entries.lt expectation', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ id: 'e1' }],
      },
    });
    const result = await tool.execute('tc-1', { action: 'session', expectations: { 'entries.lt': 5 } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(true);
  });

  it('model verifieert configuratie', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'model' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Huidig model');
    expect(result.details.passed).toBe(true);
  });

  it('model met correcte expectations', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'model', expectations: { modelId: 'claude-sonnet-4-20250514' } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(true);
  });

  it('model met foute expectations faalt', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'model', expectations: { modelId: 'gpt-4o' } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(false);
  });

  it('tool verifieert actieve tools', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'tool' }, new AbortController().signal, undefined, ctx);
    expect(result.content[0].text).toContain('Tools');
    expect(result.details.passed).toBe(true);
  });

  it('tool met activeTools expectation', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'tool', expectations: { activeTools: ['pi_session'] } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(true);
  });

  it('tool met inactiveTools expectation', async () => {
    pi.getActiveTools = () => [];
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'tool', expectations: { inactiveTools: ['pi_session'] } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(true);
  });

  it('state verifieert custom entries', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ type: 'custom', customType: 'ckpt-1', data: {} }],
      },
    });
    const result = await tool.execute('tc-1', { action: 'state', expectations: { 'ckpt-1': true } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(true);
  });

  it('state faalt als state niet bestaat', async () => {
    const ctx = createMockContext();
    const result = await tool.execute('tc-1', { action: 'state', expectations: { 'nonexistent': true } }, new AbortController().signal, undefined, ctx);
    expect(result.details.passed).toBe(false);
  });
});
