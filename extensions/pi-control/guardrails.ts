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

export type PolicyDecision =
  | { kind: "allow" }
  | { kind: "deny"; reason: string }
  | { kind: "require_approval"; title: string; reason: string; deniedReason: string };

const ALLOW: PolicyDecision = { kind: "allow" };

const DANGEROUS_BASH_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /rm\s+-rf\s+\//, reason: "rm -rf / is destructief voor het hele systeem" },
  { pattern: /rm\s+-rf\s+~/, reason: "rm -rf ~ is destructief voor je home directory" },
  { pattern: /mkfs/, reason: "mkfs formatteert een schijf" },
  { pattern: /dd\s+if=/, reason: "dd if= kan schijven overschrijven" },
  { pattern: /:\(\)\s*\{/, reason: "Fork bomb patroon" },
  { pattern: /wget\s+.*\||curl\s+.*\|/, reason: "Pipe van remote naar shell is onveilig" },
];

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

export function evaluateBashPolicy(command: string): PolicyDecision {
  if (isDangerousDevRedirect(command)) {
    const reason = "Directe schijf schrijven";
    return {
      kind: "require_approval",
      title: "⚠️  Gevaarlijk commando gedetecteerd",
      reason,
      deniedReason: reason,
    };
  }

  for (const { pattern, reason } of DANGEROUS_BASH_PATTERNS) {
    if (pattern.test(command)) {
      return {
        kind: "require_approval",
        title: "⚠️  Gevaarlijk commando gedetecteerd",
        reason,
        deniedReason: reason,
      };
    }
  }
  return ALLOW;
}

export function evaluateSessionToolPolicy(action: string | undefined): PolicyDecision {
  if (action !== "switch" && action !== "fork") return ALLOW;
  return {
    kind: "require_approval",
    title: "🔄 Sessie wijziging",
    reason: `Weet je zeker dat je een sessie ${action} wilt uitvoeren?\n\nDit kan de huidige sessie beïnvloeden.`,
    deniedReason: "Sessie wijziging geannuleerd door gebruiker",
  };
}

export function evaluateModelToolPolicy(
  action: string | undefined,
  provider: string | undefined,
  modelId: string | undefined,
): PolicyDecision {
  if (action !== "set") return ALLOW;
  return {
    kind: "require_approval",
    title: "🤖 Model wissel",
    reason: `Wissel naar model ${provider ?? "?"}/${modelId ?? "?"}?\n\nDit kan de kosten en responskwaliteit beïnvloeden.`,
    deniedReason: "Model wissel geannuleerd door gebruiker",
  };
}

async function enforcePolicyDecision(
  decision: PolicyDecision,
  confirm: ((title: string, message: string) => Promise<boolean>) | undefined,
  detail?: string,
): Promise<{ block: true; reason: string } | undefined> {
  if (decision.kind === "allow") return undefined;
  if (decision.kind === "deny") return { block: true, reason: decision.reason };
  if (!confirm) {
    return { block: true, reason: `${decision.deniedReason} (approval unavailable)` };
  }

  const message = detail
    ? `${decision.reason}\n\n${detail}\n\nToestaan?`
    : decision.reason;
  try {
    const approved = await confirm(decision.title, message);
    return approved ? undefined : { block: true, reason: decision.deniedReason };
  } catch {
    return { block: true, reason: `${decision.deniedReason} (approval unavailable)` };
  }
}

export function registerGuardrails(pi: ExtensionAPI) {
  // ── Tool call guard — blokkeer gevaarlijke bash commando's ──────────
  // Checkt welke tool wordt aangeroepen en of die veilig is.
  // Dit is de eerste guard laag: target-specifieke veiligheidschecks.
  pi.on("tool_call", async (event, ctx) => {
    const confirm = typeof ctx.ui?.confirm === "function"
      ? ctx.ui.confirm.bind(ctx.ui)
      : undefined;

    if (isToolCallEventType("bash", event)) {
      const command = event.input.command ?? "";
      return enforcePolicyDecision(
        evaluateBashPolicy(command),
        confirm,
        `Commando: ${command.slice(0, 200)}`,
      );
    }

    if (isToolCallEventType("pi_session", event)) {
      return enforcePolicyDecision(
        evaluateSessionToolPolicy(event.input.action),
        confirm,
      );
    }

    if (isToolCallEventType("pi_model", event)) {
      return enforcePolicyDecision(
        evaluateModelToolPolicy(
          event.input.action,
          event.input.provider,
          event.input.modelId,
        ),
        confirm,
      );
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
