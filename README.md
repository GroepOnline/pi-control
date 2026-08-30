<p align="center">
  <img src="https://raw.githubusercontent.com/GroepOnline/pi-control/main/docs/images/pi-control-hero.svg" alt="pi-control: capture, change, verify, evidence" width="100%">
</p>

# @groeponline/pi-control

Operate Pi without building a second runtime. `pi-control` gives humans and agents a compact control plane over the **live Pi process** — sessions, models, tools, saved state, verification, and guardrails — then makes every change prove itself with evidence.

[![npm](https://img.shields.io/npm/v/@groeponline/pi-control.svg)](https://www.npmjs.com/package/@groeponline/pi-control) [![downloads](https://img.shields.io/npm/dm/@groeponline/pi-control.svg?label=downloads)](https://www.npmjs.com/package/@groeponline/pi-control) [![Pi package](https://img.shields.io/badge/Pi-package-9b59b6.svg)](https://pi.dev/packages/@groeponline/pi-control) ![License](https://img.shields.io/badge/license-MIT-green.svg)

## Install

```bash
pi install npm:@groeponline/pi-control
```

For one session only:

```bash
pi -e npm:@groeponline/pi-control
```

[Architecture](ARCHITECTURE.md) · [Changelog](CHANGELOG.md) · [Issues](https://github.com/GroepOnline/pi-control/issues)

## Where it fits

`pi-control` owns **Pi runtime control and verification**: sessions, models, active tools, saved state, and assertions about the current Pi process. It is not the capture/showcase package. For browser/terminal capture, QA evidence recipes, Skill Studio, and showcase rendering use [`@groeponline/pi-agent-control-extension`](https://github.com/GroepOnline/pi-agent-control-extension).

The wider flow is `idea (wishcraft) -> durable mission (missions) -> execution run (orchestrator) -> runtime/evidence verification (pi-control / pi-agent-control-extension)`.

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

## Tool examples

Agent tools accept structured arguments. These examples show the minimum useful shape rather than pseudocode hidden behind a slash command.

```json
{"tool":"pi_session","action":"inspect"}
```

```json
{"tool":"pi_model","action":"thinking","level":"high"}
```

```json
{"tool":"pi_tool","action":"inspect","toolName":"bash"}
```

```json
{"tool":"pi_state","action":"save","key":"before-refactor","data":{"phase":"baseline"}}
```

```json
{"tool":"pi_verify","action":"session","expectations":{"entries.gt":5}}
```

For state-changing operations, inspect first, make the smallest change, then verify. `pi_tool set_active` replaces the complete active-tool set, so it should never be used as an additive toggle by assumption.

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
npm ci
npm test
```

## Privacy and telemetry

`pi-control` does not collect telemetry or send runtime data to external services. It operates on the local Pi process and any state or evidence it handles remains under the operator's control.

## Source and issues

- Pi catalog: <https://pi.dev/packages/@groeponline/pi-control>
- Source: <https://github.com/GroepOnline/pi-control>
- Issues: <https://github.com/GroepOnline/pi-control/issues>

## License

MIT © GroepOnline
