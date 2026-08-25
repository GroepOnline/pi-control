/**
 * pi-control guardrails — event interceptie voor veiligheid en monitoring.
 *
 * Drie lagen van guardrails, gerouteerd op operatie type:
 *
 *   tool_call guard → blokkeer gevaarlijke bash commando's, bevestig sessie/model wijzigingen
 *   session lifecycle guard → bevestig destructieve sessie operaties (nieuw, fork)
 *   turn monitoring → log tool gebruik per turn voor analyse
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

const SAFE_DEV_LEAVES = new Set([
  "null",
  "stdout",
  "stderr",
  "stdin",
  "tty",
  "zero",
  "random",
  "urandom",
  "full",
]);

interface RedirectOperand {
  value: string;
  literal: boolean;
}

function isShellWordTerminator(char: string): boolean {
  return /\s/.test(char) || ";|&<>()".includes(char);
}

/**
 * Read one bash redirect operand without executing or expanding it.
 *
 * A word containing parameter/command expansion is deliberately marked
 * non-literal. Guardrails cannot know where such an operand resolves at
 * runtime, so redirect handling fails closed for it.
 */
function readRedirectOperand(cmd: string, start: number): RedirectOperand {
  let i = start;
  let value = "";
  let literal = true;
  let quote: "'" | '"' | null = null;
  let sawContent = false;

  while (i < cmd.length) {
    const char = cmd[i]!;

    if (quote === "'") {
      if (char === "'") {
        quote = null;
      } else {
        value += char;
        sawContent = true;
      }
      i += 1;
      continue;
    }

    if (quote === '"') {
      if (char === '"') {
        quote = null;
        i += 1;
        continue;
      }
      if (char === "$" || char === "`") literal = false;
      if (char === "\\" && i + 1 < cmd.length) {
        value += cmd[i + 1]!;
        sawContent = true;
        i += 2;
        continue;
      }
      value += char;
      sawContent = true;
      i += 1;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      i += 1;
      continue;
    }
    if (char === "$" || char === "`") literal = false;
    if (char === "\\" && i + 1 < cmd.length) {
      value += cmd[i + 1]!;
      sawContent = true;
      i += 2;
      continue;
    }
    if (isShellWordTerminator(char)) break;

    value += char;
    sawContent = true;
    i += 1;
  }

  // Empty words and unterminated quotes are parse failures: fail closed.
  if (!sawContent || quote !== null) literal = false;
  return { value, literal };
}

function redirectOperands(cmd: string): RedirectOperand[] {
  const operands: RedirectOperand[] = [];

  for (let i = 0; i < cmd.length; i += 1) {
    if (cmd[i] !== ">") continue;

    // Skip the second character of >> when the loop reaches it.
    if (i > 0 && cmd[i - 1] === ">") continue;

    let cursor = i + 1;
    if (cmd[cursor] === ">" || cmd[cursor] === "|") cursor += 1;
    while (cursor < cmd.length && /\s/.test(cmd[cursor]!)) cursor += 1;

    // >&1 / 2>&1 duplicates a file descriptor rather than writing a pathname.
    if (cmd[cursor] === "&" && /^[0-9-]$/.test(cmd[cursor + 1] ?? "")) continue;

    operands.push(readRedirectOperand(cmd, cursor));
  }

  return operands;
}

/** True when a redirect can write to an unsafe device or has an unknown target. */
export function isDangerousDevRedirect(cmd: string): boolean {
  for (const operand of redirectOperands(cmd)) {
    if (!operand.literal) return true;
    if (!operand.value.startsWith("/dev/")) continue;
    if (!isSafeDevTarget(operand.value.slice("/dev/".length))) return true;
  }
  return false;
}

function isSafeDevTarget(name: string): boolean {
  if (!name || name.includes("..")) return false;
  if (SAFE_DEV_LEAVES.has(name)) return true;
  if (name === "shm" || name.startsWith("shm/")) return true;
  if (/^pts\/[0-9]+$/.test(name)) return true;
  return false;
}

export function registerGuardrails(pi: ExtensionAPI) {
  // ── Tool call guard — blokkeer gevaarlijke bash commando's ──────────
  // Checkt welke tool wordt aangeroepen en of die veilig is.
  // Dit is de eerste guard laag: target-specifieke veiligheidschecks.
  pi.on("tool_call", async (event, ctx) => {
    // Bash guard: blokkeer destructieve commando's
    if (isToolCallEventType("bash", event)) {
      const cmd = event.input.command ?? "";

      // Gevaarlijke patronen
      const dangerous = [
        { pattern: /rm\s+-rf\s+\//, reason: "rm -rf / is destructief voor het hele systeem" },
        { pattern: /rm\s+-rf\s+~/, reason: "rm -rf ~ is destructief voor je home directory" },
        { pattern: /mkfs/, reason: "mkfs formatteert een schijf" },
        { pattern: /dd\s+if=/, reason: "dd if= kan schijven overschrijven" },
        { pattern: /:\(\)\s*\{/, reason: "Fork bomb patroon" },
        { pattern: /wget\s+.*\||curl\s+.*\|/, reason: "Pipe van remote naar shell is onveilig" },
      ];

      if (isDangerousDevRedirect(cmd)) {
        const reason = "Directe schijf schrijven";
        const ok = await ctx.ui.confirm(
          "⚠️  Gevaarlijk commando gedetecteerd",
          `${reason}\n\nCommando: ${cmd.slice(0, 200)}\n\nToestaan?`,
        );
        if (!ok) {
          return { block: true, reason };
        }
      }

      for (const { pattern, reason } of dangerous) {
        if (pattern.test(cmd)) {
          // Vraag gebruiker om bevestiging
          const ok = await ctx.ui.confirm(
            "⚠️  Gevaarlijk commando gedetecteerd",
            `${reason}\n\nCommando: ${cmd.slice(0, 200)}\n\nToestaan?`,
          );
          if (!ok) {
            return { block: true, reason };
          }
        }
      }
    }

    // pi_session guard: bevestig bij sessie wissel/fork
    // Tweede guard laag: bevestig destructieve sessie operaties
    // voordat ze uitgevoerd worden.
    if (isToolCallEventType("pi_session", event)) {
      const action = event.input.action;

      if (action === "switch" || action === "fork") {
        const ok = await ctx.ui.confirm(
          "🔄 Sessie wijziging",
          `Weet je zeker dat je een sessie ${action} wilt uitvoeren?\n\nDit kan de huidige sessie beïnvloeden.`,
        );
        if (!ok) {
          return { block: true, reason: "Sessie wijziging geannuleerd door gebruiker" };
        }
      }
    }

    // pi_model guard: bevestig bij model wissel
    // Derde guard laag: model wissels hebben kosten implicaties,
    // dus vraag altijd bevestiging.
    if (isToolCallEventType("pi_model", event)) {
      if (event.input.action === "set") {
        const ok = await ctx.ui.confirm(
          "🤖 Model wissel",
          `Wissel naar model ${event.input.provider ?? "?"}/${event.input.modelId ?? "?"}?\n\n` +
          "Dit kan de kosten en responskwaliteit beïnvloeden.",
        );
        if (!ok) {
          return { block: true, reason: "Model wissel geannuleerd door gebruiker" };
        }
      }
    }
  });

  // ── Session lifecycle guard ─────────────────────────────────────────
  pi.on("session_before_switch", async (event, ctx) => {
    if (event.reason === "new") {
      const entries = ctx.sessionManager.getEntries().length;
      if (entries > 20) {
        const ok = await ctx.ui.confirm(
          "🆕 Nieuwe sessie",
          `Er zijn ${entries} entries in de huidige sessie.\n` +
          "Deze gaan verloren als je een nieuwe start.\n\n" +
          "Wil je eerst compacteren of een label zetten?",
        );
        if (!ok) {
          return { cancel: true };
        }
      }
    }
  });

  pi.on("session_before_fork", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries().length;
    if (entries > 50) {
      const ok = await ctx.ui.confirm(
        "🍴 Fork grote sessie",
        `Deze sessie heeft ${entries} entries.\n` +
        "Een fork maakt een nieuwe sessie aan.\n\nDoorgaan?",
      );
      if (!ok) {
        return { cancel: true };
      }
    }
  });

  // ── Turn monitoring — log tool gebruik voor analyse ────────────────
  // Houdt per turn bij welke tools zijn gebruikt.
  // Dit is de 'capture' van pi-control — in plaats van terminal output
  // wordt tool usage gelogd.
  pi.on("turn_start", async (_event, ctx) => {
    ctx.ui.setStatus("pi-control", `Turn ${_event.turnIndex} gestart`);
  });

  pi.on("turn_end", async (event, _ctx) => {
    pi.appendEntry(`turn-${event.turnIndex}`, {
      timestamp: new Date().toISOString(),
      tools: event.toolResults?.map((r) => r.toolName) ?? [],
    });
  });

  pi.on("session_shutdown", async () => {
    // Cleanup — opruimen bij sessie shutdown
  });
}
