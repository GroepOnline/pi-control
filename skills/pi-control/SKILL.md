---
name: pi-control
description: Control the live Pi agent runtime — sessions, models, tools, state, and verification. Use this to navigate Pi sessions, switch models, gate tools, snapshot state, and prove changes with evidence.
---

# Pi Control

Operate Pi's own runtime. Three routing decisions decide which tools and skills you load.

## Ground rules

1. **Real sessions, real state.** Pi's sessions, models, and tools are live. No mocks or fixtures.
2. **Commit to execute.** When you have a plan, run it. On failure: recover and retry.
3. **Tools are atomic.** One tool per operation. No cross-references needed.
4. **Isolate every operation.** Scope all sessions and output paths to a `RUN_ID`.

## Routing

Three independent lookups. Do all three, then load the tools and skills they produce.

### 1. Target route — what do you want to control?

| Target | Tool | Skill |
| --- | --- | --- |
| Pi sessions | `pi_session` | **pi-control-session** |
| Pi model | `pi_model` | **pi-control-model** |
| Pi tools | `pi_tool` | **pi-control-tools** |
| Pi state | `pi_state` | **pi-control-state** |
| Pi verification | `pi_verify` | **pi-control-verify** |

### 2. Stage route — what does the workflow need?

| Stage | Tools | When to load |
| --- | --- | --- |
| **Capture** (record current state) | `pi_session list`, `pi_state save` | Always — every workflow starts from current state |
| **Compose** (mutate sessions/state) | `pi_session fork`, `pi_session compact`, `pi_state restore` | When changing sessions or restoring state |
| **Verify** (check results) | `pi_verify`, `pi_session inspect` | Always — every workflow ends with verification |

### 3. Guard route — which safety is needed?

| Need | Guard |
| --- | --- |
| Block dangerous `bash` commands | `tool_call` guard |
| Confirm session mutations | `session_before_switch` guard |
| Automatic state tracking | `turn_start` + `turn_end` hooks |

## Workflow shape

```
Command (intent + commitments)
  → Target route (which aspect of Pi)
  → Capture (record current state)
  → Compose (change sessions/model/tools/state)
  → Verify (check against commitments)
  → Report
```

| Flow | Type | Shape |
| --- | --- | --- |
| New feature demo | Single | `pi_session fork` + `pi_model set` |
| Behavior verification | Comparison | `pi_verify` across sessions |
| QA test flow | Stepwise | `pi_session inspect` per step |

## Commands

### `/pi-demo`

Demonstrate a Pi workflow or feature. Accepts a session reference, a model switch, or a free-text description.

**Commitments:**
- [ ] **Scope**: which Pi aspect is demonstrated? (sessions, models, tools, workflows)
- [ ] **Model**: which model is used?
- [ ] **Verification**: how is success demonstrated?

### `/pi-verify`

Test a claim about Pi's behavior. You are a researcher, not an advocate. A conclusion of "this does not work" with clear evidence is as valuable as "this works".

**Commitments:**
- [ ] **Claim**: what is being tested?
- [ ] **Evidence type**: session state | tool output | model response
- [ ] **Comparison**: before/after or single state

### `/pi-qa`

Systematic QA test of Pi functionality. Walk the steps and report PASS/FAIL with evidence.

## Tool reference

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

### `pi_state` — snapshot, diff, restore

| Action | Description |
| --- | --- |
| `save` | Save a named snapshot (label, summary, data). |
| `restore` | Restore a saved snapshot. |
| `diff` | Compare two state snapshots. |
| `history` | Show the change history. |

### `pi_verify` — assert runtime expectations

| Action | Description |
| --- | --- |
| `session` | Assert session properties (entries, model, settings). |
| `model` | Assert the active model and thinking level. |
| `tool` | Assert tool output matched expectations. |
| `state` | Assert state snapshot properties. |

## Reporting

After every workflow, report:
- What happened (steps taken)
- What the evidence is (tool outputs, session dumps)
- Whether the commitments were met
- Any issues or deviations

## Do not

- Continue past a fatal error without a clear recovery strategy
- Ignore evidence that contradicts the claim
- Use hardcoded paths; always scope to `RUN_DIR`/`RUN_ID`
