# pi-control

Pi-native runtime control and QA for operators and coding agents. The package exposes tools and commands for managing Pi sessions, models, active tools, state, verification flows, and guardrails, plus a companion skill.

## Install

```bash
pi install npm:@groeponline/pi-control
```

For one session only:

```bash
pi -e npm:@groeponline/pi-control
```

## Included surfaces

- `/pi-demo` — demonstrate a concrete Pi workflow or feature.
- `/pi-verify` — verify claims about Pi runtime behavior.
- `/pi-qa` — structured QA for Pi functionality.
- `pi_session` — inspect, fork, switch, compact, label, and rename sessions.
- `pi_model` — list/switch models and manage thinking level.
- `pi_tool` — inspect and change active tools.
- `pi_state` — save, restore, diff, and inspect runtime state.
- `pi_verify` — verify session, model, tool, and state expectations.
- Guardrails and lifecycle hooks for safer agent operation.
- `skills/pi-control` — operator guidance for using the extension effectively.

## Pi package metadata

This repository is published as `@groeponline/pi-control` and carries the `pi-package` keyword required for Pi package-gallery discovery. Pi loads `extensions/pi-control/index.ts` and the bundled skills directory from the package manifest.

## Source

Maintained by GroepOnline. Source and issue tracking live in this repository.
