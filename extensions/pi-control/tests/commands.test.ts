/**
 * E2E tests — slash commands
 * Test /pi-demo, /pi-verify, /pi-qa
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerPiDemoCommand } from '../commands/pi-demo';
import { registerPiVerifyCommand } from '../commands/pi-verify';
import { registerPiQaCommand } from '../commands/pi-qa';
import { createMockPi, createMockContext } from './helpers';

describe('/pi-demo', () => {
  let pi: any;
  let handler: Function;

  beforeEach(() => {
    pi = createMockPi();
    registerPiDemoCommand(pi);
    handler = pi.registerCommand.mock.calls[0][1].handler;
  });

  it('registreert pi-demo commando', () => {
    expect(pi.registerCommand).toHaveBeenCalledWith('pi-demo', expect.any(Object));
  });

  it('toont notificatie zonder args', async () => {
    const ctx = createMockContext();
    await handler('', ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining('Geef een beschrijving'), 'info');
  });

  it('toont notificatie zonder argumenten', async () => {
    const ctx = createMockContext();
    await handler(undefined, ctx);
    expect(ctx.ui.notify).toHaveBeenCalled();
  });

  it('stuurt user message met demo instructies', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ id: 'e1' }, { id: 'e2' }],
        getBranch: () => [{ id: 'e1' }, { id: 'e2' }],
      },
    });
    await handler('sessie forken', ctx);
    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('/pi-demo workflow gestart'),
        }),
      ]),
      { deliverAs: 'followUp' },
    );
  });

  it('bevat sessie info in message', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => Array(10).fill({ id: 'e' }),
        getBranch: () => Array(5).fill({ id: 'e' }),
      },
    });
    await handler('model wisselen', ctx);
    const call = pi.sendUserMessage.mock.calls[0];
    expect(call[0][0].text).toContain('Entries: 10');
    expect(call[0][0].text).toContain('Branch lengte: 5');
  });

  it('wacht op idle voor versturen', async () => {
    const ctx = createMockContext();
    await handler('test', ctx);
    expect(ctx.waitForIdle).toHaveBeenCalled();
  });
});

describe('/pi-verify', () => {
  let pi: any;
  let handler: Function;

  beforeEach(() => {
    pi = createMockPi();
    registerPiVerifyCommand(pi);
    handler = pi.registerCommand.mock.calls[0][1].handler;
  });

  it('registreert pi-verify commando', () => {
    expect(pi.registerCommand).toHaveBeenCalledWith('pi-verify', expect.any(Object));
  });

  it('toont notificatie zonder args', async () => {
    const ctx = createMockContext();
    await handler('', ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining('Geef een claim'), 'info');
  });

  it('stuurt verify instructies', async () => {
    const ctx = createMockContext();
    await handler('pi_session fork behoudt branch structuur', ctx);
    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('/pi-verify workflow gestart'),
        }),
      ]),
      { deliverAs: 'followUp' },
    );
  });

  it('bevat claim in message', async () => {
    const ctx = createMockContext();
    await handler('pi_model set werkt correct', ctx);
    const call = pi.sendUserMessage.mock.calls[0];
    expect(call[0][0].text).toContain('pi_model set werkt correct');
  });

  it('bevat verify protocol stappen', async () => {
    const ctx = createMockContext();
    await handler('test claim', ctx);
    const call = pi.sendUserMessage.mock.calls[0];
    expect(call[0][0].text).toContain('CONFIRMED');
    expect(call[0][0].text).toContain('REFUTED');
    expect(call[0][0].text).toContain('INCONCLUSIVE');
  });
});

describe('/pi-qa', () => {
  let pi: any;
  let handler: Function;

  beforeEach(() => {
    pi = createMockPi();
    registerPiQaCommand(pi);
    handler = pi.registerCommand.mock.calls[0][1].handler;
  });

  it('registreert pi-qa commando', () => {
    expect(pi.registerCommand).toHaveBeenCalledWith('pi-qa', expect.any(Object));
  });

  it('toont notificatie zonder args', async () => {
    const ctx = createMockContext();
    await handler('', ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.stringContaining('Geef een target'), 'info');
  });

  it('stuurt QA instructies', async () => {
    const ctx = createMockContext({
      sessionManager: {
        ...createMockContext().sessionManager,
        getEntries: () => [{ id: 'e1' }],
        getBranch: () => [{ id: 'e1' }],
      },
    });
    await handler('sessie fork functionaliteit', ctx);
    expect(pi.sendUserMessage).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('/pi-qa workflow gestart'),
        }),
      ]),
      { deliverAs: 'followUp' },
    );
  });

  it('bevat target in message', async () => {
    const ctx = createMockContext();
    await handler('model wisselen', ctx);
    const call = pi.sendUserMessage.mock.calls[0];
    expect(call[0][0].text).toContain('model wisselen');
  });

  it('bevat pi_* tools lijst', async () => {
    pi._tools.push(
      { name: 'pi_session', description: 'Session mgmt' },
      { name: 'pi_model', description: 'Model mgmt' },
    );
    const ctx = createMockContext();
    await handler('test alle tools', ctx);
    const call = pi.sendUserMessage.mock.calls[0];
    expect(call[0][0].text).toContain('pi_session');
    expect(call[0][0].text).toContain('pi_model');
  });

  it('bevat rapport formaat', async () => {
    const ctx = createMockContext();
    await handler('test', ctx);
    const call = pi.sendUserMessage.mock.calls[0];
    expect(call[0][0].text).toContain('PASS/FAIL');
    expect(call[0][0].text).toContain('Bewijs');
  });
});
