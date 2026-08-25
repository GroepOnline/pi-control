import { describe, expect, it } from 'vitest';
import { isDangerousDevRedirect } from '../guardrails';

describe('device redirect parser', () => {
  it('allows only fully literal safe redirect targets', () => {
    const allowed = [
      'echo x > /dev/null',
      'echo x 2>"/dev/null"',
      "echo x > '/dev/shm/output'",
      'echo x > /dev/pts/0',
      'echo x > /tmp/output',
      'echo x 2>&1',
    ];

    for (const command of allowed) {
      expect(isDangerousDevRedirect(command), command).toBe(false);
    }
  });

  it('blocks quoted unsafe device targets', () => {
    const blocked = [
      'echo x > "/dev/sda"',
      "echo x > '/dev/nvme0n1'",
      'echo x 2>"/dev/vdb"',
    ];

    for (const command of blocked) {
      expect(isDangerousDevRedirect(command), command).toBe(true);
    }
  });

  it('fails closed for expanded or unparseable redirect operands', () => {
    const blocked = [
      "echo x > /dev/shm/$(printf '../sda')",
      'echo x > "/dev/shm/$TARGET"',
      'echo x > "$OUTPUT"',
      'echo x > `mktemp`',
      'echo x > "/dev/sda',
    ];

    for (const command of blocked) {
      expect(isDangerousDevRedirect(command), command).toBe(true);
    }
  });

  it('rejects traversal and prefix collisions in safe-device names', () => {
    const blocked = [
      'echo x > /dev/shm/../sda',
      'echo x > /dev/pts/../sda',
      'echo x > /dev/zero-backup',
      'echo x > /dev/ttyUSB0',
    ];

    for (const command of blocked) {
      expect(isDangerousDevRedirect(command), command).toBe(true);
    }
  });
});
