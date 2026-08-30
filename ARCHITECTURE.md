# Architecture

`pi-control` is a thin in-process Pi extension. It does not run a daemon or hosted control plane.

```text
Pi host
  -> extensions/pi-control/index.ts
       -> commands/        operator slash workflows
       -> tools.ts         structured agent tools
       -> guardrails.ts    mutation / shell safety checks
       -> Pi context APIs  session, model, tools, state
```

## Ownership

- `pi_session` inspects or changes the active Pi session.
- `pi_model` controls the selected model and thinking level.
- `pi_tool` inspects or replaces the active tool set.
- `pi_state` stores small named snapshots used by control workflows.
- `pi_verify` asserts observable runtime conditions after a change.
- Guardrails intercept unsafe control/shell patterns before execution.

State that belongs to durable project work is intentionally outside this package; use `pi-missions`. Multi-agent execution belongs to `pi-agent-orchestrator`. Browser/terminal capture and evidence/showcase workflows belong to `pi-agent-control-extension`.
