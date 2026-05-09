/**
 * /pi-verify — Test een claim over Pi's gedrag.
 *
 * De LLM is een onderzoeker. Een conclusie "dit werkt niet" met helder
 * bewijs is even waardevol als "dit werkt".
 *
 * Voorbeelden van claims:
 *   - "pi_session fork maakt een nieuwe sessie met dezelfde entries"
 *   - "pi_model set wisselt naar het opgegeven model"
 *   - "compact behoudt de branch structuur"
 *   - "pi_verify detecteert correcte en incorrecte toestand"
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export function registerPiVerifyCommand(pi: ExtensionAPI) {
  pi.registerCommand("pi-verify", {
    description:
      "Test een claim over Pi's gedrag. " +
      "Usage: /pi-verify \"<claim om te testen>\"",
    handler: async (args, ctx) => {
      if (!args || args.trim().length === 0) {
        ctx.ui.notify(
          "Geef een claim om te testen.\n" +
          "  /pi-verify \"pi_session fork behoudt de branch structuur\"\n" +
          "  /pi-verify \"pi_model set werkt met een model ID\"",
          "info",
        );
        return;
      }

      await ctx.waitForIdle();

      pi.sendUserMessage(
        [
          {
            type: "text" as const,
            text: [
              `## /pi-verify workflow gestart`,
              ``,
              `**Claim:** ${args}`,
              ``,
              `**Rol:** Je bent een onderzoeker.`,
              `Als het gedrag de claim tegenspreekt, is dat een geldige bevinding.`,
              ``,
              `Volg het pi-control verify protocol:`,
              `1. Parseer de claim in commitments (evidence type, comparison)`,
              `2. Capture: leg relevante toestand vast met pi_session + pi_state`,
              `3. Voer de test uit`,
              `4. Capture na: leg de nieuwe toestand vast`,
              `5. Vergelijk voor/na met pi_state diff of pi_session inspect`,
              `6. Concludeer: CONFIRMED | REFUTED | INCONCLUSIVE met bewijs`,
              ``,
              `**BELANGRIJK:**`,
              `- Bij REFUTED: rapporteer verwacht vs waargenomen gedrag met bewijs`,
              `- Bij INCONCLUSIVE: rapporteer wat de test blokkeerde`,
              `- Fabricageer nooit bewijs. Als de test faalt, is dat de uitkomst.`,
            ].join("\n"),
          },
        ],
        { deliverAs: "followUp" },
      );
    },
  });
}
