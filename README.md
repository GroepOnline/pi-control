<p align="center">
  <img src="https://raw.githubusercontent.com/GroepOnline/pi-control/main/docs/images/pi-control-hero.svg" alt="pi-control: capture, change, verify, evidence" width="100%">
</p>

# @groeponline/pi-control

**A Pi extension that gives humans and coding agents a control plane over the live Pi process** — agent sessions, model switching, tool gating, saved runtime state, QA verification, and guardrails — with every change backed by evidence from the same process it controls.

`pi-control` does not replace Pi's agent runtime, spawn daemons, or mirror state into a second store. It operates directly on Pi's own session tree, model registry, tool inventory, and state history, then verifies what actually happened.

[![npm](https://img.shields.io/npm/v/@groeponline/pi-control.svg)](https://www.npmjs.com/package/@groeponline/pi-control) [![downloads](https://img.shields.io/npm/dm/@groeponline/pi-control.svg?label=downloads)](https://www.npmjs.com/package/@groeponline/pi-control) [![Pi package](https://img.shields.io/badge/Pi-package-9b59b6.svg)](https://pi.dev/packages/@groeponline/pi-control) [![verify](https://github.com/GroepOnline/pi-control/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/GroepOnline/pi-control/actions/workflows/publish-npm.yml) ![License](https://img.shields.io/badge/license-MIT-green.svg)

## At a glance

- **5 agent tools** — `pi_session`, `pi_model`, `pi_tool`, `pi_state`, `pi_verify`
- **3 operator commands** — `/pi-demo`, `/pi-verify`, `/pi-qa`
- **Guardrails** — destructive shell and unsafe mutation patterns are denied before execution
- **1 packaged skill** — `pi-control` operating discipline (capture → change → verify → report)
- **No telemetry, no daemon, no second runtime** — in-process against the live Pi host

## Install

Persistent (all Pi sessions):

```bash
pi install npm:@groeponline/pi-control
```

One session only:

```bash
pi -e npm:@groeponline/pi-control
```

Pi loads both the extension and the packaged skill from the package manifest — no extra configuration.

## Quick start

**Verify a claim about the runtime:**

```json
{"tool":"pi_verify","action":"session","expectations":{"entries.gt":5}}
```

**Switch model and thinking level, then confirm:**

```json
{"tool":"pi_model","action":"thinking","level":"high"}
```

```json
{"tool":"pi_verify","action":"model","expectations":{"thinkingLevel":"high"}}
```

**Snapshot state before a risky change, restore it after:**

```json
{"tool":"pi_state","action":"save","key":"before-refactor","data":{"phase":"baseline"}}
```

```json
{"tool":"pi_state","action":"restore","key":"before-refactor"}
```

**Gate the toolset for a bounded run:**

```json
{"tool":"pi_tool","action":"set_active","tools":["read","bash"]}
```

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
