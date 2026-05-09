/**
 * /pi-demo — Demonstreer een Pi workflow of feature.
 *
 * Demonstreert hoe Pi zelf werkt: sessie beheer, model wissels,
 * tool gebruik, en workflow automatisering.
 *
 * Het parsed het argument, toont het plan, en geeft de LLM de opdracht
 * om de demo uit te voeren met de pi_* tools en pi-control skills.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerPiDemoCommand(pi: ExtensionAPI) {
  pi.registerCommand("pi-demo", {
    description:
      "Demonstreer een Pi workflow of feature. " +
      "Usage: /pi-demo \"sessie forken en model wisselen\" of " +
      "/pi-demo \"hoe werkt compact voor grote sessies\"",
    handler: async (args, ctx) => {
      if (!args || args.trim().length === 0) {
        ctx.ui.notify(
          "Geef een beschrijving van wat je wilt demonstreren.\n" +
          "  /pi-demo \"sessie forken met /fork\"\n" +
          "  /pi-demo \"model wisselen en thinking level aanpassen\"\n" +
          "  /pi-demo \"tools activeren/deactiveren\"",
          "info",
        );
        return;
      }

      await ctx.waitForIdle();

      // Huidige sessie-info voor context
      const entries = ctx.sessionManager.getEntries();
      const branch = ctx.sessionManager.getBranch();

      pi.sendUserMessage(
        [
          {
            type: "text" as const,
            text: [
              `## /pi-demo workflow gestart`,
              ``,
              `**Te demonstreren:** ${args}`,
              ``,
              `**Huidige sessie:**`,
              `- Entries: ${entries.length}`,
              `- Branch lengte: ${branch.length}`,
              ``,
              `Volg het pi-control demo protocol:`,
              `1. Parseer de demo scope in commitments`,
              `2. Bepaal welke pi_* tools nodig zijn (sessie, model, tools, state)`,
              `3. Capture: leg huidige toestand vast met pi_state + pi_session inspect`,
              `4. Voer de demo uit met de relevante tools`,
              `5. Verify: controleer of de commitments zijn nagekomen`,
              `6. Rapporteer met bewijs (tool outputs, state diffs)`,
              ``,
              `De skill in .pi/skills/pi-control/SKILL.md bevat de routing details.`,
              `De tools in de pi-control extensie geven de mechanische uitvoering.`,
            ].join("\n"),
          },
        ],
        { deliverAs: "followUp" },
      );
    },
  });
}
