# Compound Engineering overlay (fix-ce-pi-control-gates)

This directory is the **repo overlay**. Portable `ce-*` skills use these files.
The native Cursor plugin is Cursor-only and is not Pi's fallback.

| File | Role |
| --- | --- |
| `config.yaml` | Tracked. CE reads `docs_root` from here. |
| `config.local.yaml` | Gitignored live settings. |
| `config.local.example.yaml` | Upstream template. |
| `artifacts/` | CE plans/solutions/ideation. Not operator `docs/`. |

Portable skills: `~/.agents/skills/ce-*` plus `lfg`, routed by
`compound-engineering-meta`. Native Cursor plugin is Cursor-only fallback
for checkouts without this directory. Cursor workspaces disable it in
`.cursor/settings.json`. Pi, Codex, and Claude never enable that plugin.
