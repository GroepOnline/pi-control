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
        { pattern: />\s*\/dev\/(?!null\b|stdout\b|stderr\b|stdin\b|tty\b|zero\b|random\b|urandom\b|full\b|shm\b|pts\/)/, reason: "Directe schijf schrijven" },
        { pattern: /:\(\)\s*\{/, reason: "Fork bomb patroon" },
        { pattern: /wget\s+.*\||curl\s+.*\|/, reason: "Pipe van remote naar shell is onveilig" },
      ];

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
