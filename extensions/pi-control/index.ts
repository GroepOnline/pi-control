/**
 * pi-control — Pi agent CLI extension
 *
 * Beheer Pi's eigen runtime: sessies, modellen, tools, en workflows.
 *
 * Capabilities:
 *   /pi-demo    — Demonstreer een Pi workflow of feature
 *   /pi-verify  — Test een claim over Pi's gedrag
 *   /pi-qa      — Systematische QA van Pi functionaliteit
 *   pi_session  — Pi sessiebeheer (list, inspect, fork, switch, compact, label)
 *   pi_model    — Pi model configuratie (list, set, thinking, providers)
 *   pi_tool     — Pi toolbeheer (list, set_active, inspect)
 *   pi_state    — Pi toestandsbeheer (save, restore, diff, history)
 *   pi_verify   — Pi verificatie (session, model, tool, state)
 *
 * Guardrails:
 *   - tool_call blokkades (gevaarlijke commando's)
 *   - session lifecycle hooks
 *   - turn monitoring
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerPiDemoCommand } from "./commands/pi-demo";
import { registerPiVerifyCommand } from "./commands/pi-verify";
import { registerPiQaCommand } from "./commands/pi-qa";
import { registerPiTools } from "./tools";
import { registerGuardrails } from "./guardrails";

export default function (pi: ExtensionAPI) {
  // ── Slash commands ─────────────────────────────────────────────────
  registerPiDemoCommand(pi);       // /pi-demo
  registerPiVerifyCommand(pi);     // /pi-verify
  registerPiQaCommand(pi);         // /pi-qa

  // ── Custom tools voor de LLM ────────────────────────────────────────
  registerPiTools(pi);

  // ── Event guardrails ────────────────────────────────────────────────
  registerGuardrails(pi);

  // ── Startup melding ─────────────────────────────────────────────────
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(
      "pi-control geladen — /pi-demo, /pi-verify, /pi-qa, pi_* tools beschikbaar",
      "info",
    );
  });
}
