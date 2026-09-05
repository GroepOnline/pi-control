# Architecture

`pi-control` is a thin, in-process Pi extension. It runs no daemon, hosts no control plane, and keeps no second copy of Pi's state — every read and write goes through the live Pi host.

```text
Pi host
  └─ extensions/pi-control/index.ts
       ├─ commands/        operator slash workflows (/pi-demo, /pi-verify, /pi-qa)
       ├─ tools.ts         five structured agent tools
       ├─ guardrails.ts    lifecycle + tool-call safety hooks
       └─ Pi context APIs  sessions, model, tools, state
skills/pi-control/SKILL.md  packaged operating guidance
```

## Module ownership

| Module | Owns | Never does |
| --- | --- | --- |
| `index.ts` | Extension bootstrap; registers commands, tools, guardrails | Holds no state of its own |
| `tools.ts` | `pi_session`, `pi_model`, `pi_tool`, `pi_state`, `pi_verify` | Bypasses Pi's own session/model/tool APIs |
| `guardrails.ts` | Denies destructive shell patterns and gates unsafe mutations before execution | Intercepts anything outside control/shell patterns |
| `commands/` | Operator workflows that compose the tools | Introduces separate state or side effects |
| `skills/pi-control` | The capture → change → verify → report discipline for agents | Loads tools itself; Pi does that from the manifest |

## Data flow

1. **Capture** — `pi_session inspect` / `pi_state save` record the current runtime state.
2. **Change** — `pi_session fork|switch|compact`, `pi_model set|thinking`, `pi_tool set_active`, `pi_state restore` mutate the live process.
3. **Verify** — `pi_verify session|model|tool|state` asserts observable expectations against the same process.
4. **Report** — evidence comes from tool outputs and session dumps, not from a parallel model of the world.

Guardrails sit in front of step 2: a denied mutation never reaches Pi's runtime.

## Boundaries

State that belongs to durable project work is intentionally outside this package — use [`@groeponline/pi-missions`](https://github.com/GroepOnline/pi-missions). Browser/terminal capture, QA evidence recipes, and showcase rendering belong to [`@groeponline/pi-agent-control-extension`](https://github.com/GroepOnline/pi-agent-control-extension). Operator cockpit surfaces (status bar, queue, Skill Studio) belong to [`@groeponline/pi-wishcraft`](https://github.com/GroepOnline/pi-wishcraft).

## Packaging

The npm package carries the extension entrypoint, the skill, and the hero assets declared in `package.json` (`pi.extensions`, `pi.skills`, `pi.image`). The [`verify:pi-package`](scripts/verify-pi-package-contract.mjs) gate validates the manifest, resource existence, public metadata, gallery preview format, Pi core peer-dependency rules, and the final packed tarball on every PR and before every publish.

## Testing

- `scripts/package-contract-runtime.test.mjs` — contract-parser regressions
- `extensions/pi-control/tests/` — extension unit tests (`npm test --prefix extensions/pi-control`)
- CI (`publish-npm.yml`) runs both plus the full gate, then publishes with provenance when the version is new
