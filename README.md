# @groeponline/pi-control

Pi-native runtime control and QA for operators and coding agents. `pi-control` exposes a small control plane for sessions, models, active tools, saved state, verification workflows, and guardrails without replacing Pi's agent runtime.

[![npm](https://img.shields.io/npm/v/@groeponline/pi-control.svg)](https://www.npmjs.com/package/@groeponline/pi-control) [![Pi package](https://img.shields.io/badge/Pi-package-9b59b6.svg)](https://pi.dev/packages/@groeponline/pi-control) ![License](https://img.shields.io/badge/license-MIT-green.svg)

## Install

```bash
pi install npm:@groeponline/pi-control
```

For one session only:

```bash
pi -e npm:@groeponline/pi-control
```

## What it gives you

| Surface | Purpose |
| --- | --- |
| `/pi-demo` | Demonstrate a concrete Pi workflow or feature with explicit verification. |
| `/pi-verify` | Test claims about Pi runtime behavior and report evidence. |
| `/pi-qa` | Run a structured QA flow and report PASS/FAIL evidence. |
| `pi_session` | List, inspect, fork, switch, compact, label, and rename sessions. |
| `pi_model` | List/switch models, inspect providers, and change thinking level. |
| `pi_tool` | Inspect the tool inventory and change the active tool set. |
| `pi_state` | Save, apply, diff, and inspect runtime state history. |
| `pi_verify` | Verify session, tool-output, and behavioral expectations. |
| Guardrails | Lifecycle and tool-call hooks for bounded operator workflows. |
| `skills/pi-control` | Packaged operating guidance for control/verify/QA workflows. |

## Operating model

`pi-control` acts on Pi's live runtime state. It does not create a second session store, model router, or remote control service. A normal workflow is capture → change → verify → report, with evidence coming from the same Pi process being controlled.

State-changing tools should be used deliberately: switching models, changing active tools, restoring state, or moving between sessions affects the current Pi process. The packaged skill documents the expected capture/verify discipline.

## Package layout

```text
extensions/pi-control/
  index.ts
  tools.ts
  guardrails.ts
  commands/
skills/pi-control/SKILL.md
```

Pi loads both the extension and the skill from the package manifest. The npm package carries the `pi-package`, `pi-extension`, and `pi-skill` discovery keywords.

## Development

Package boundary check:

```bash
npm run pack:check
```

Extension tests:

```bash
cd extensions/pi-control
npm install
npm test
```

## Source and issues

- Pi catalog: <https://pi.dev/packages/@groeponline/pi-control>
- Source: <https://github.com/GroepOnline/pi-control>
- Issues: <https://github.com/GroepOnline/pi-control/issues>

## License

MIT © GroepOnline
