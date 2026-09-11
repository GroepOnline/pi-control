<p align="center">
  <img src="https://raw.githubusercontent.com/GroepOnline/pi-control/main/docs/images/pi-control-hero.svg" alt="Pi Control: inspect, change, verify" width="100%">
</p>

<h1 align="center">Pi Control</h1>

<p align="center"><strong>Inspect the live Pi process, change it deliberately, and verify the result.</strong><br>Control sessions, models, tools and saved runtime state from the same process your agent is already using.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@groeponline/pi-control"><img src="https://img.shields.io/npm/v/@groeponline/pi-control.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@groeponline/pi-control"><img src="https://img.shields.io/npm/dm/@groeponline/pi-control.svg?label=downloads" alt="npm downloads"></a>
  <a href="https://pi.dev/packages/@groeponline/pi-control"><img src="https://img.shields.io/badge/Pi-package-9b59b6.svg" alt="Pi package"></a>
  <a href="https://github.com/GroepOnline/pi-control/actions/workflows/publish-npm.yml"><img src="https://github.com/GroepOnline/pi-control/actions/workflows/publish-npm.yml/badge.svg" alt="verify"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT license"></a>
</p>

## Start in 10 seconds

```bash
pi install npm:@groeponline/pi-control
```

Try it for one session first:

```bash
pi -e npm:@groeponline/pi-control
```

Pi loads the extension and its packaged operating skill automatically.

## Three useful things to do first

### Verify what Pi is actually running

```json
{"tool":"pi_verify","action":"session","expectations":{"entries.gt":5}}
```

### Change thinking level and prove it stuck

```json
{"tool":"pi_model","action":"thinking","level":"high"}
{"tool":"pi_verify","action":"model","expectations":{"thinkingLevel":"high"}}
```

### Gate the toolset for a bounded run

```json
{"tool":"pi_tool","action":"set_active","tools":["read","bash"]}
```

`set_active` replaces the full active tool set, so inspect first and keep the set as small as the task allows.

## What it controls

- **Sessions** — inspect, fork, switch, compact, navigate, label and rename.
- **Models** — list providers, switch model and change thinking level.
- **Tools** — inspect and replace the active tool set.
- **State** — save, diff and restore named runtime snapshots.
- **Verification** — assert session, model, tool and state expectations against the live process.
- **Guardrails** — block destructive shell and unsafe mutation patterns before execution.

There is no daemon and no second state store. Pi Control works against Pi's own session tree, model registry, tool inventory and runtime state.

## Commands

| Command | Purpose |
| --- | --- |
| `/pi-demo` | Demonstrate a concrete Pi workflow or feature with explicit scope, model, and verification commitments. |
| `/pi-verify` | Test a claim about Pi runtime behavior and report evidence. A well-evidenced "this does not work" is as valuable as a pass. |
| `/pi-qa` | Run a structured QA flow step by step and report PASS/FAIL with evidence. |

## Agent tools

### `pi_session` — manage sessions

| Action | Description |
| --- | --- |
| `list` | List available sessions. |
| `inspect` | Show current session details (entry count, branch, model). |
| `fork` | Fork from an entry into a new session. |
| `switch` | Switch to another session. |
| `compact` | Compact the current session. |
| `navigate` | Move through the session tree. |
| `label` | Set or clear a label on an entry. |
| `rename` | Rename the session. |

### `pi_model` — control model and thinking

| Action | Description |
| --- | --- |
| `list` | List available models. |
| `providers` | Show registered providers. |
| `set` | Switch the active model. |
| `thinking` | Change the thinking level. |

### `pi_tool` — gate the active toolset

| Action | Description |
| --- | --- |
| `list` | Show all tools and their active/inactive status. |
| `inspect` | Show details for a specific tool. |
| `set_active` | Replace the complete active tool set. |

> `set_active` is a **replacement**, not a toggle: it defines the full set of active tools. Inspect first, then set the smallest set you need.

### `pi_state` — snapshot, diff, restore

| Action | Description |
| --- | --- |
| `save` | Save a named snapshot of runtime state (label, summary, data). |
| `restore` | Restore a saved snapshot. |
| `diff` | Compare two state snapshots. |
| `history` | Show the change history. |

### `pi_verify` — assert runtime expectations

| Action | Description |
| --- | --- |
| `session` | Assert session properties (entry counts, model, settings). |
| `model` | Assert the active model and thinking level. |
| `tool` | Assert tool output matched expectations. |
| `state` | Assert state snapshot properties. |

## Guardrails

Lifecycle and tool-call hooks deny unsafe control patterns **before execution**, including:

- destructive filesystem operations (`rm -rf /`, `rm -rf ~`, `mkfs`, `dd if=`)
- fork-bomb patterns and remote-to-shell piping (`curl … | sh`, `wget … | sh`)
- unsafe session mutations, gated behind explicit confirmation hooks

The operating rule the skill enforces: **inspect first, make the smallest change, then verify.**

## The operating loop

```text
capture (pi_session inspect / pi_state save)
  → change (fork / switch / set / thinking / set_active)
    → verify (pi_verify)
      → report (evidence from the same Pi process)
```

Every state-changing action is deliberate: switching models, replacing tools, restoring state, or moving between sessions affects the current Pi process. The packaged `pi-control` skill documents this discipline for agents.

## Where it fits

`pi-control` owns **runtime control and verification**. The wider GroepOnline Pi suite:

| Package | Role |
| --- | --- |
| [`@groeponline/pi-wishcraft`](https://github.com/GroepOnline/pi-wishcraft) | Operator cockpit: powerline status bar, session queue, Skill Studio, ideas inbox |
| [`@groeponline/pi-missions`](https://github.com/GroepOnline/pi-missions) | Durable missions that survive context resets |
| [`@groeponline/pi-agent-control-extension`](https://github.com/GroepOnline/pi-agent-control-extension) | Browser/terminal capture, QA evidence recipes, showcase rendering |
| [`@groeponline/pi-tools`](https://github.com/GroepOnline/pi-tools) | Shared Pi tooling |

The flow: `idea (pi-wishcraft) → durable mission (pi-missions) → execution → runtime & evidence verification (pi-control / pi-agent-control-extension)`.

## Package layout

```text
extensions/pi-control/
  index.ts        extension entrypoint — registers commands, tools, guardrails
  tools.ts        the five structured agent tools
  guardrails.ts   lifecycle and tool-call safety hooks
  commands/       /pi-demo, /pi-verify, /pi-qa
skills/pi-control/
  SKILL.md        packaged operating guidance
```

## Development

```bash
# package contract (manifest, resources, Pi peer rules, tarball contents)
npm run verify:package

# extension unit tests
npm ci --prefix extensions/pi-control
npm test --prefix extensions/pi-control
```

The `verify:pi-package` gate validates the npm/Pi package contract end to end: manifest, declared resources, public metadata, gallery preview format, Pi core peer-dependency rules, and the final packed tarball. CI runs it on every PR and before every publish.

## Privacy and telemetry

`pi-control` collects no telemetry and sends nothing to external services. It operates on the local Pi process; all state and evidence stays under the operator's control.

## FAQ

**Does it change how Pi works by default?**
No. It adds commands, tools, and guardrails on top of the standard runtime. Anything that mutates state happens only when a tool call or command asks for it.

**Can I use the tools without the commands?**
Yes. The commands are operator workflows on top of the same five tools; agents can call the tools directly.

**Does it work with any model?**
`pi_model` operates on whatever models and providers your Pi installation has registered. It switches and verifies; it does not bundle providers.

**Where does state live?**
In Pi's own runtime state, managed through `pi_state` snapshots. There is no external database or sidecar.

## Links

- Pi catalog: <https://pi.dev/packages/@groeponline/pi-control>
- npm: <https://www.npmjs.com/package/@groeponline/pi-control>
- Source: <https://github.com/GroepOnline/pi-control>
- Issues: <https://github.com/GroepOnline/pi-control/issues>
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) · Changelog: [CHANGELOG.md](CHANGELOG.md)

## License

MIT © [GroepOnline](https://github.com/GroepOnline)
