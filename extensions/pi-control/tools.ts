/**
 * pi-control custom tools — laat de LLM Pi's eigen runtime beheren.
 *
 * Tools voor Pi agent control:
 *   pi_session  — Pi sessiebeheer (lijst, inspecteer, fork, switch, compact, label, rename)
 *   pi_model    — Pi model configuratie (lijst, wissel, thinking level)
 *   pi_tool     — Pi toolbeheer (lijst, activeer/deactiveer, inspecteer)
 *   pi_state    — Pi toestandsbeheer (bewaar, herstel, diff, geschiedenis)
 *   pi_verify   — Pi verificatie (sessie, model, tool, state check)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { StringEnum } from "@earendil-works/pi-ai";
import { SessionManager } from "@earendil-works/pi-coding-agent";

export function registerPiTools(pi: ExtensionAPI) {
  // ── pi_session — Sessiebeheer ─────────────────────────────────────
  pi.registerTool({
    name: "pi_session",
    label: "Pi Session",
    description:
      "Manage Pi sessions: list, inspect, fork, switch, compact, navigate tree, " +
      "set labels, and rename sessions. " +
      "Pi sessiebeheer — lijst, inspecteer, fork, switch, compact, en label sessies. " +
      "in plaats van terminals te controleren, beheer je Pi's sessies.",
    promptSnippet: "List, inspect, fork, switch, compact, or label Pi sessions",
    promptGuidelines: [
      "Use pi_session to manage Pi's own sessions — the session tree is Pi's equivalent of terminal state.",
      "Use pi_session list to discover available sessions before switching.",
      "Use pi_session inspect to check current session details (entries, branch, leafId).",
      "Use pi_session fork to create a branch from a specific entry before making changes.",
      "Use pi_session compact when a session grows large and needs summarization.",
      "Use pi_session label to bookmark important entries for later navigation.",
      "Use pi_session rename to give sessions meaningful names.",
      "Always use RUN_ID prefixes for session identifiers to avoid collisions.",
    ],
    parameters: Type.Object({
      action: StringEnum([
        "list", "inspect", "fork", "switch", "compact",
        "navigate", "label", "rename",
      ] as const),
      entryId: Type.Optional(Type.String({ description: "Entry ID for fork/navigate/label operations" })),
      sessionPath: Type.Optional(Type.String({ description: "Session file path for switch" })),
      label: Type.Optional(Type.String({ description: "Label text (omit to clear a label)" })),
      name: Type.Optional(Type.String({ description: "New session name for rename" })),
      compactInstructions: Type.Optional(Type.String({
        description: "Custom instructions for compaction summarizer",
      })),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      try {
        switch (params.action) {
          // ── list ─────────────────────────────────────────────────
          case "list": {
            const sessions = await SessionManager.list(ctx.cwd);
            const lines = sessions.map((s, i) =>
              `${i + 1}. ${s.file}${s.name ? ` (${s.name})` : ""}`
            );
            return {
              content: [{
                type: "text" as const,
                text:
                  `**Beschikbare sessies (${sessions.length}):**\n` +
                  (lines.length > 0 ? lines.join("\n") : "(geen sessies gevonden)"),
              }],
              details: { sessions },
            };
          }

          // ── inspect ──────────────────────────────────────────────
          case "inspect": {
            const entries = ctx.sessionManager.getEntries();
            const branch = ctx.sessionManager.getBranch();
            const leafId = ctx.sessionManager.getLeafId();
            const tools = pi.getAllTools();
            const activeNames = pi.getActiveTools().map((t) => t.name);

            return {
              content: [{
                type: "text" as const,
                text: [
                  `**Huidige sessie:**`,
                  `- Session file: ${ctx.sessionManager.getSessionFile() ?? "ephemeral"}`,
                  `- Totale entries: ${entries.length}`,
                  `- Branch entries: ${branch.length}`,
                  `- Leaf ID: ${leafId}`,
                  `- Actieve tools: ${activeNames.length}`,
                  `- Beschikbare pi_* tools: ${tools.filter((t) => t.name.startsWith("pi_")).length}`,
                ].join("\n"),
              }],
              details: { entries, branch, leafId, activeTools: activeNames },
            };
          }

          // ── fork ─────────────────────────────────────────────────
          case "fork": {
            if (!params.entryId) throw new Error("entryId is required for fork");
            onUpdate?.({ content: [{ type: "text" as const, text: `Fork starten vanaf entry ${params.entryId}...` }] });

            // fork is alleen beschikbaar in command handlers, niet in tool execute.
            // We sturen een user message om de fork te triggeren.
            pi.sendUserMessage(`/fork ${params.entryId}`, { deliverAs: "followUp" });

            return {
              content: [{
                type: "text" as const,
                text: `🔄 Fork gestart vanaf entry ${params.entryId}. Dit wordt afgehandeld via /fork.`,
              }],
              details: { action: "fork", entryId: params.entryId },
            };
          }

          // ── switch ───────────────────────────────────────────────
          case "switch": {
            if (!params.sessionPath) throw new Error("sessionPath is required for switch");
            onUpdate?.({ content: [{ type: "text" as const, text: `Schakelen naar sessie ${params.sessionPath}...` }] });

            // switchSession is alleen beschikbaar in command handlers.
            // We sturen een user message om de sessie wissel te triggeren.
            pi.sendUserMessage(`/resume ${params.sessionPath}`, { deliverAs: "followUp" });

            return {
              content: [{
                type: "text" as const,
                text: `🔄 Sessie wissel gestart naar: ${params.sessionPath}. Dit wordt afgehandeld via /resume.`,
              }],
              details: { action: "switch", sessionPath: params.sessionPath },
            };
          }

          // ── compact ──────────────────────────────────────────────
          case "compact": {
            onUpdate?.({ content: [{ type: "text" as const, text: "Sessie compacteren..." }] });

            ctx.compact({
              customInstructions: params.compactInstructions,
              onComplete: (_result) => {
                ctx.ui.notify("Compressie voltooid", "success");
              },
              onError: (error) => {
                ctx.ui.notify(`Compressie mislukt: ${error.message}`, "error");
              },
            });

            return {
              content: [{
                type: "text" as const,
                text: "⏳ Compressie gestart. Dit verloopt asynchroon en wordt gemeld zodra klaar.",
              }],
              details: { action: "compact" },
            };
          }

          // ── navigate ─────────────────────────────────────────────
          case "navigate": {
            if (!params.entryId) throw new Error("entryId is required for navigate");
            onUpdate?.({ content: [{ type: "text" as const, text: `Navigeren naar entry ${params.entryId}...` }] });

            // navigateTree is alleen beschikbaar in command handlers.
            // We instrueren de gebruiker om /tree te gebruiken.
            return {
              content: [{
                type: "text" as const,
                text: [
                  `🌳 Navigeren naar entry ${params.entryId}:`,
                  `Gebruik /tree om naar deze entry te navigeren, of klik op de entry in de tree view.`,
                  `Entry ID: ${params.entryId}`,
                ].join("\n"),
              }],
              details: { action: "navigate", entryId: params.entryId },
            };
          }

          // ── label ────────────────────────────────────────────────
          case "label": {
            if (!params.entryId) throw new Error("entryId is required for label");
            pi.setLabel(params.entryId, params.label);
            const msg = params.label
              ? `✅ Label "${params.label}" gezet op entry ${params.entryId}`
              : `✅ Label gewist van entry ${params.entryId}`;
            return {
              content: [{ type: "text" as const, text: msg }],
              details: { action: "label", entryId: params.entryId, label: params.label ?? null },
            };
          }

          // ── rename ───────────────────────────────────────────────
          case "rename": {
            if (!params.name) throw new Error("name is required for rename");
            pi.setSessionName(params.name);
            const currentName = pi.getSessionName();
            return {
              content: [{
                type: "text" as const,
                text: `✅ Sessie hernoemd naar: "${currentName}"`,
              }],
              details: { action: "rename", name: currentName },
            };
          }
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `pi_session error: ${err.message}` }],
          details: { error: err.message },
          isError: true,
        };
      }
    },
  });

  // ── pi_model — Modelbeheer ────────────────────────────────────────
  pi.registerTool({
    name: "pi_model",
    label: "Pi Model",
    description:
      "Manage Pi's model and provider configuration: list available models, " +
      "switch models, change thinking level, and view registered providers. " +
      "Pi model configuratie — lijst modellen, wissel model, pas thinking level aan. " +
      "stuur je Pi's model configuratie.",
    promptSnippet: "List models, switch models, or change thinking level in Pi",
    promptGuidelines: [
      "Use pi_model list to discover available models before switching.",
      "Use pi_model set to change the active model.",
      "Use pi_model thinking to adjust the thinking level for reasoning models.",
      "Use pi_model providers to see configured providers.",
    ],
    parameters: Type.Object({
      action: StringEnum(["list", "set", "thinking", "providers"] as const),
      modelId: Type.Optional(Type.String({ description: "Model ID for set action (e.g. 'claude-sonnet-4-20250514')" })),
      provider: Type.Optional(Type.String({ description: "Provider name for set action (e.g. 'anthropic')" })),
      level: Type.Optional(StringEnum(["off", "minimal", "low", "medium", "high", "xhigh"] as const)),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      try {
        switch (params.action) {
          case "list": {
            const allModels = ctx.modelRegistry.getAll();
            const currentModel = ctx.model;
            const lines = allModels.map((m) => {
              const isCurrent = m.id === currentModel?.id && m.provider === currentModel?.provider;
              return `${isCurrent ? "→ " : "  "}${m.provider}/${m.id}${m.name ? ` (${m.name})` : ""}`;
            });
            return {
              content: [{
                type: "text" as const,
                text: `**Beschikbare modellen (${allModels.length}):**\n${lines.join("\n")}`,
              }],
              details: { models: allModels, current: currentModel },
            };
          }

          case "set": {
            if (!params.modelId) throw new Error("modelId is required for set");
            const provider = params.provider ?? "anthropic";
            const model = ctx.modelRegistry.find(provider, params.modelId);
            if (!model) {
              return {
                content: [{
                  type: "text" as const,
                  text: `❌ Model ${provider}/${params.modelId} niet gevonden. Gebruik pi_model list om beschikbare modellen te zien.`,
                }],
                details: { error: "model not found" },
                isError: true,
              };
            }
            const success = await pi.setModel(model);
            if (!success) {
              return {
                content: [{
                  type: "text" as const,
                  text: `❌ Geen API key beschikbaar voor model ${provider}/${params.modelId}`,
                }],
                details: { error: "no API key" },
                isError: true,
              };
            }
            return {
              content: [{
                type: "text" as const,
                text: `✅ Model gewisseld naar: ${provider}/${params.modelId}`,
              }],
              details: { action: "set", model: model },
            };
          }

          case "thinking": {
            if (!params.level) throw new Error("level is required for thinking");
            const previous = pi.getThinkingLevel();
            pi.setThinkingLevel(params.level);
            return {
              content: [{
                type: "text" as const,
                text: `✅ Thinking level gewijzigd: ${previous} → ${params.level}`,
              }],
              details: { action: "thinking", previous, current: params.level },
            };
          }

          case "providers": {
            const line = "Providers worden beheerd via pi.registerProvider() in extensies. " +
              "Gebruik ctx.modelRegistry voor de actuele lijst.";
            return {
              content: [{ type: "text" as const, text: line }],
              details: {},
            };
          }
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `pi_model error: ${err.message}` }],
          details: { error: err.message },
          isError: true,
        };
      }
    },
  });

  // ── pi_tool — Toolbeheer ──────────────────────────────────────────
  pi.registerTool({
    name: "pi_tool",
    label: "Pi Tool",
    description:
      "Manage Pi's active tools: list all tools with their status, " +
      "activate/deactivate tools, and inspect tool details. " +
      "Pi toolbeheer — lijst alle tools, activeer of deactiveer ze, inspecteer details. " +
      "in plaats van drivers te kiezen, beheer je welke tools de LLM heeft.",
    promptSnippet: "List, activate, or deactivate Pi tools that the LLM can call",
    promptGuidelines: [
      "Use pi_tool list to see all available tools and which are active.",
      "Use pi_tool set_active to enable or disable specific tools.",
      "Use pi_tool inspect to see details of a specific tool.",
      "Be careful when deactivating built-in tools — the LLM may need them.",
    ],
    parameters: Type.Object({
      action: StringEnum(["list", "set_active", "inspect"] as const),
      toolNames: Type.Optional(Type.Array(Type.String(), {
        description: "Tool names for set_active (the only tools that will be active)",
      })),
      toolName: Type.Optional(Type.String({ description: "Tool name for inspect" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      try {
        switch (params.action) {
          case "list": {
            const all = pi.getAllTools();
            const active = pi.getActiveTools();
            const activeNames = new Set(active.map((t) => t.name));
            const lines = all.map((t) => {
              const status = activeNames.has(t.name) ? "✅ actief" : "⬜ inactief";
              return `${status} — **${t.name}**: ${t.description?.split("\n")[0] ?? "(geen beschrijving)"}`;
            });
            return {
              content: [{
                type: "text" as const,
                text: `**Tools (${active.length}/${all.length} actief):**\n${lines.join("\n")}`,
              }],
              details: { all, active: activeNames },
            };
          }

          case "set_active": {
            if (!params.toolNames || params.toolNames.length === 0) {
              throw new Error("toolNames is required for set_active");
            }
            pi.setActiveTools(params.toolNames);
            const active = pi.getActiveTools();
            return {
              content: [{
                type: "text" as const,
                text: `✅ Actieve tools ingesteld (${active.length} tools actief): ${active.map((t) => t.name).join(", ")}`,
              }],
              details: { action: "set_active", active: active.map((t) => t.name) },
            };
          }

          case "inspect": {
            if (!params.toolName) throw new Error("toolName is required for inspect");
            const all = pi.getAllTools();
            const tool = all.find((t) => t.name === params.toolName);
            if (!tool) {
              return {
                content: [{ type: "text" as const, text: `❌ Tool "${params.toolName}" niet gevonden` }],
                details: { error: "tool not found" },
                isError: true,
              };
            }
            const isActive = pi.getActiveTools().some((t) => t.name === tool.name);
            return {
              content: [{
                type: "text" as const,
                text: [
                  `**Tool: ${tool.name}**`,
                  `- Status: ${isActive ? "✅ actief" : "⬜ inactief"}`,
                  `- Beschrijving: ${tool.description ?? "(geen)"}`,
                  `- Parameters: ${tool.parameters ? Object.keys(tool.parameters.properties ?? {}).join(", ") : "(geen)"}`,
                ].join("\n"),
              }],
              details: { tool, isActive },
            };
          }
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `pi_tool error: ${err.message}` }],
          details: { error: err.message },
          isError: true,
        };
      }
    },
  });

  // ── pi_state — Toestandsbeheer ────────────────────────────────────
  pi.registerTool({
    name: "pi_state",
    label: "Pi State",
    description:
      "Save and restore Pi session state. Can save labels, session names, " +
      "and structured data via appendEntry. " +
      "Pi toestandsbeheer — bewaar, herstel, vergelijk en inspecteer Pi sessie toestand. " +
      "te monteren, monteer en bewaar je Pi's sessie toestand.",
    promptSnippet: "Save, restore, diff, or inspect Pi session state",
    promptGuidelines: [
      "Use pi_state save to snapshot current state before making changes.",
      "Use pi_state restore to go back to a saved state point.",
      "Use pi_state diff to compare current state against a saved checkpoint.",
      "Use pi_state history to see the state change log for the session.",
      "State is persisted via pi.appendEntry and survives session restarts.",
    ],
    parameters: Type.Object({
      action: StringEnum(["save", "restore", "diff", "history"] as const),
      key: Type.Optional(Type.String({ description: "State key/name for save/restore/diff" })),
      data: Type.Optional(Type.Any({ description: "JSON-serializable data to save" })),
      entryId: Type.Optional(Type.String({ description: "Entry ID for diff/history targeting" })),
    }),
    async execute(_toolCallId, params, _signal, onUpdate, ctx) {
      try {
        switch (params.action) {
          case "save": {
            const stateKey = params.key ?? `state-${Date.now()}`;
            const data = params.data ?? {
              timestamp: new Date().toISOString(),
              entries: ctx.sessionManager.getEntries().length,
              leafId: ctx.sessionManager.getLeafId(),
              sessionFile: ctx.sessionManager.getSessionFile(),
            };
            pi.appendEntry(stateKey, data);
            return {
              content: [{
                type: "text" as const,
                text: `✅ Toestand "${stateKey}" opgeslagen:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``,
              }],
              details: { action: "save", key: stateKey, data },
            };
          }

          case "restore": {
            if (!params.key) throw new Error("key is required for restore");
            const stateKey = params.key;
            // Zoek opgeslagen state in session
            for (const entry of ctx.sessionManager.getEntries()) {
              if (entry.type === "custom" && entry.customType === stateKey) {
                return {
                  content: [{
                    type: "text" as const,
                    text: `✅ Toestand "${stateKey}" gevonden:\n\`\`\`json\n${JSON.stringify(entry.data, null, 2)}\n\`\`\``,
                  }],
                  details: { action: "restore", key: stateKey, data: entry.data },
                };
              }
            }
            return {
              content: [{ type: "text" as const, text: `❌ Toestand "${stateKey}" niet gevonden in sessie` }],
              details: { error: "state not found" },
              isError: true,
            };
          }

          case "diff": {
            if (!params.key) {
              // Vergelijk huidige met een specifieke entry als die gegeven is
              const entries = ctx.sessionManager.getEntries();
              const targetEntry = params.entryId
                ? entries.find((e) => (e as any).id === params.entryId)
                : entries[entries.length - 1];
              return {
                content: [{
                  type: "text" as const,
                  text: targetEntry
                    ? `**Huidige sessie staat:**\n- Entries: ${entries.length}\n- Branch: ${ctx.sessionManager.getBranch().length}\n- Leaf: ${ctx.sessionManager.getLeafId()}`
                    : "Geen entry om te vergelijken",
                }],
                details: { entries, target: targetEntry },
              };
            }
            // Zoek bewaarde state voor diff
            for (const entry of ctx.sessionManager.getEntries()) {
              if (entry.type === "custom" && entry.customType === params.key) {
                return {
                  content: [{
                    type: "text" as const,
                    text: `**Diff met "${params.key}":**\nOpgeslagen toestand gevonden — vergelijk handmatig via pi_session inspect.`,
                  }],
                  details: { savedState: entry.data, currentState: { entries: ctx.sessionManager.getEntries().length } },
                };
              }
            }
            return {
              content: [{ type: "text" as const, text: `❌ Geen opgeslagen toestand "${params.key}" om mee te vergelijken` }],
              details: { error: "state not found" },
              isError: true,
            };
          }

          case "history": {
            const entries = ctx.sessionManager.getEntries();
            const customEntries = entries.filter((e) => e.type === "custom");
            const stateEntries = customEntries.filter((e) => (e as any).customType?.startsWith("state-"));
            const lines = stateEntries.map((e, i) => {
              const entry = e as any;
              return `${i + 1}. **${entry.customType}** — ${JSON.stringify(entry.data)}`;
            });
            return {
              content: [{
                type: "text" as const,
                text: `**State geschiedenis (${stateEntries.length} entries):**\n${
                  lines.length > 0 ? lines.join("\n") : "(nog geen state opgeslagen)"
                }`,
              }],
              details: { stateEntries },
            };
          }
        }
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `pi_state error: ${err.message}` }],
          details: { error: err.message },
          isError: true,
        };
      }
    },
  });

  // ── pi_verify — Verificatie ────────────────────────────────────────
  pi.registerTool({
    name: "pi_verify",
    label: "Pi Verify",
    description:
      "Verify Pi's state against expectations: check session properties, " +
      "tool outputs, and model configuration. " +
      "Pi verificatie — controleer sessie, model, tool en state tegen verwachtingen. " +
      "te controleren, verifieer je Pi's interne toestand.",
    promptSnippet: "Check Pi session state, model config, or tool output against expectations",
    promptGuidelines: [
      "Use pi_verify session to check specific session properties.",
      "Use pi_verify model to confirm the model and thinking level are correct.",
      "Use pi_verify tool to check if specific tools are active.",
      "Use pi_verify state to compare current state against expectations.",
      "Report FAIL if any expectation is not met, with the actual vs expected values.",
    ],
    parameters: Type.Object({
      action: StringEnum(["session", "model", "tool", "state"] as const),
      expectations: Type.Optional(Type.Record(Type.String(), Type.Any(), {
        description: "Expected state key-value pairs to check against. " +
          "E.g. {'entries.gt': 5, 'modelId': 'claude-sonnet-4-20250514'}",
      })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      try {
        const checks: string[] = [];
        const failures: string[] = [];

        switch (params.action) {
          case "session": {
            const entries = ctx.sessionManager.getEntries();
            const branch = ctx.sessionManager.getBranch();
            checks.push(`✅ Entries: ${entries.length}`);
            checks.push(`✅ Branch lengte: ${branch.length}`);
            checks.push(`✅ Sessie bestand: ${ctx.sessionManager.getSessionFile() ?? "ephemeral"}`);

            if (params.expectations) {
              for (const [key, value] of Object.entries(params.expectations)) {
                if (key === "entries" && entries.length !== value) {
                  failures.push(`Entries: verwacht ${value}, werkelijk ${entries.length}`);
                }
                if (key === "entries.gt" && entries.length <= value) {
                  failures.push(`Entries: verwacht > ${value}, werkelijk ${entries.length}`);
                }
                if (key === "entries.lt" && entries.length >= value) {
                  failures.push(`Entries: verwacht < ${value}, werkelijk ${entries.length}`);
                }
              }
            }
            break;
          }

          case "model": {
            const currentModel = ctx.model;
            const thinkingLevel = pi.getThinkingLevel();
            checks.push(`✅ Huidig model: ${currentModel?.provider}/${currentModel?.id}`);
            checks.push(`✅ Thinking level: ${thinkingLevel}`);

            if (params.expectations) {
              for (const [key, value] of Object.entries(params.expectations)) {
                if (key === "modelId" && currentModel?.id !== value) {
                  failures.push(`Model ID: verwacht "${value}", werkelijk "${currentModel?.id}"`);
                }
                if (key === "provider" && currentModel?.provider !== value) {
                  failures.push(`Provider: verwacht "${value}", werkelijk "${currentModel?.provider}"`);
                }
                if (key === "thinkingLevel" && thinkingLevel !== value) {
                  failures.push(`Thinking level: verwacht "${value}", werkelijk "${thinkingLevel}"`);
                }
              }
            }
            break;
          }

          case "tool": {
            const all = pi.getAllTools();
            const active = pi.getActiveTools();
            const activeNames = new Set(active.map((t) => t.name));
            checks.push(`✅ Tools: ${active.size}/${all.length} actief`);

            if (params.expectations) {
              for (const [key, value] of Object.entries(params.expectations)) {
                if (key === "activeTools") {
                  const expected = Array.isArray(value) ? value : [value];
                  for (const name of expected) {
                    if (!activeNames.has(name)) {
                      failures.push(`Tool "${name}" is niet actief`);
                    } else {
                      checks.push(`✅ Tool "${name}" is actief`);
                    }
                  }
                }
                if (key === "inactiveTools") {
                  const expected = Array.isArray(value) ? value : [value];
                  for (const name of expected) {
                    if (activeNames.has(name)) {
                      failures.push(`Tool "${name}" is actief, maar zou inactief moeten zijn`);
                    } else {
                      checks.push(`✅ Tool "${name}" is inactief (zoals verwacht)`);
                    }
                  }
                }
              }
            }
            break;
          }

          case "state": {
            const entries = ctx.sessionManager.getEntries();
            const customEntries = entries.filter((e) => e.type === "custom");
            checks.push(`✅ Custom entries: ${customEntries.length}`);

            if (params.expectations) {
              for (const [key, value] of Object.entries(params.expectations)) {
                const found = customEntries.some((e) => (e as any).customType === key);
                if (value === true && !found) {
                  failures.push(`State "${key}" is niet gevonden in sessie`);
                } else if (value === false && found) {
                  failures.push(`State "${key}" is gevonden, maar zou niet moeten bestaan`);
                } else {
                  checks.push(`✅ State "${key}": ${found ? "gevonden" : "niet aanwezig (zoals verwacht)"}`);
                }
              }
            }
            break;
          }
        }

        const passed = failures.length === 0;
        return {
          content: [
            { type: "text" as const, text: checks.join("\n") },
            ...(failures.length > 0
              ? [{ type: "text" as const, text: `\n❌ **${failures.length} verificatie(s) mislukt:**\n${failures.join("\n")}` }]
              : [{ type: "text" as const, text: "\n✅ **Alle verificaties geslaagd**" }]),
          ],
          details: { action: params.action, checks, failures, passed },
        };
      } catch (err: any) {
        return {
          content: [{ type: "text" as const, text: `pi_verify error: ${err.message}` }],
          details: { error: err.message },
          isError: true,
        };
      }
    },
  });
}
