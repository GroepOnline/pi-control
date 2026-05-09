/**
 * /pi-qa — Systematische QA test van Pi functionaliteit.
 *
 * Doorloopt gedefinieerde test stappen tegen Pi's runtime en rapporteert
 * PASS/FAIL met bewijs per stap.
 *
 * Targets (wat kan worden getest):
 *   - sessie: fork, switch, compact, navigateTree, label
 *   - model: setModel, setThinkingLevel, registerProvider
 *   - tools: setActiveTools, tool registratie
 *   - state: appendEntry, sendMessage, session state
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerPiQaCommand(pi: ExtensionAPI) {
  pi.registerCommand("pi-qa", {
    description:
      "Systematische QA test van Pi functionaliteit. " +
      "Usage: /pi-qa \"<target>\" of /pi-qa <PR-nummer>",
    handler: async (args, ctx) => {
      if (!args || args.trim().length === 0) {
        ctx.ui.notify(
          "Geef een target om te testen.\n" +
          "  /pi-qa \"sessie fork functionaliteit\"\n" +
          "  /pi-qa \"model wisselen\"\n" +
          '  /pi-qa "test alle pi_* tools"',
          "info",
        );
        return;
      }

      await ctx.waitForIdle();

      const entries = ctx.sessionManager.getEntries();
      const branch = ctx.sessionManager.getBranch();
      const tools = pi.getAllTools();
      const piTools = tools.filter((t) => t.name.startsWith("pi_"));

      pi.sendUserMessage(
        [
          {
            type: "text" as const,
            text: [
              `## /pi-qa workflow gestart`,
              ``,
              `**Target:** ${args}`,
              ``,
              `**Huidige context:**`,
              `- Sessie entries: ${entries.length}`,
              `- Branch lengte: ${branch.length}`,
              `- pi_* tools beschikbaar: ${piTools.map((t) => "\\`" + t.name + "\\`").join(", ")}`,
              ``,
              `Volg het pi-control QA protocol:`,
              `1. Parseer het target en bepaal test scope`,
              `2. Ontwerp test stappen (elke stap test één ding)`,
              `3. Voor elke stap: capture voor → execute → capture na → verify`,
              `4. Bij falen: documenteer met bewijs, ga verder`,
              `5. Rapporteer: tabel met PASS/FAIL per stap + bewijs`,
              ``,
              `**Rapport formaat:**`,
              "```",
              "| Stap | Status | Bewijs |",
              "|------|--------|--------|",
              "| ...  | PASS/FAIL | ... |",
              "```",
              ``,
              `De skill in .pi/skills/pi-control/SKILL.md bevat alle details.`,
            ].join("\n"),
          },
        ],
        { deliverAs: "followUp" },
      );
    },
  });
}
