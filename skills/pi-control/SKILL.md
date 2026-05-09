---
name: pi-control
description: Control Pi agent sessions, models, tools, and workflows. Gebruik dit om Pi's gedrag te beheren, sessies te navigeren, en workflows te automatiseren.
---

# Pi Control

Beheer Pi's eigen runtime. Drie routing beslissingen bepalen welke tools en vaardigheden je laadt.

## Grondregels

1. **Echte sessies, echte toestand.** Pi's sessies, modellen, en tools zijn live. Geen mocks of fixtures.
2. **Commit to execute.** Als je een plan hebt, voer het uit. Bij fouten: herstel en retry.
3. **Tools zijn atomisch.** Eén tool per operatie. Geen cross-referentie nodig.
4. **Isoleer elke operatie.** Gebruik `RUN_ID` voor alle sessions en output paden.

## Routing

Drie onafhankelijke lookups. Doe alle drie, laad dan de tools en vaardigheden die ze produceren.

### 1. Target route — wat wil je controleren?

| Target | Tools | Vaardigheid |
|---|---|---|
| Pi sessies | `pi_session` | **pi-control-session** |
| Pi model | `pi_model` | **pi-control-model** |
| Pi tools | `pi_tool` | **pi-control-tools** |
| Pi staat | `pi_state` | **pi-control-state** |
| Pi verifiëren | `pi_verify` | **pi-control-verify** |

### 2. Stage route — wat heeft de workflow nodig?

| Stage | Tools | Wanneer laden |
|---|---|---|
| **Capture** (sessie/state vastleggen) | `pi_session list`, `pi_state save` | Altijd — elke workflow begint met huidige toestand |
| **Compose** (sessie manipuleren) | `pi_session fork`, `pi_session compact`, `pi_state apply` | Als je sessies wijzigt of state herstelt |
| **Verify** (controleren) | `pi_verify`, `pi_session inspect` | Altijd — elke workflow eindigt met verificatie |

### 3. Guard route — welke beveiliging is nodig?

| Behoefte | Guard |
|---|---|
| Blokkeer gevaarlijke `bash` commando's | `tool_call` guard |
| Bevestig sessie-wijzigingen | `session_before_switch` guard |
| Automatische state tracking | `turn_start` + `turn_end` hooks |

## Workflow vorm

```
Command (intent + commitments)
  → Target route (welk aspect van Pi)
  → Capture (huidige toestand vastleggen)
  → Compose (sessie/model/tools wijzigen)
  → Verify (controleren tegen commitments)
  → Report
```

### Layout default

| Flow | Type | Vorm |
|---|---|---|
| Nieuwe feature demo | Enkelvoudig | `pi_session fork` + `pi_model set` |
| Gedragsverificatie | Vergelijking | `pi_verify` op meerdere sessies |
| QA test flow | Stapsgewijs | `pi_session inspect` per stap |

## Commando's

### `/pi-demo`

Demonstreer een Pi workflow of feature. Accepteert een sessie referentie, een model wissel, of een vrije tekst beschrijving.

**Commitments:**
- [ ] **Scope**: Welk Pi aspect wordt gedemonstreerd? (sessies, modellen, tools, workflows)
- [ ] **Model**: Welk model wordt gebruikt?
- [ ] **Verificatie**: Hoe wordt aangetoond dat het werkt?

### `/pi-verify`

Test een claim over Pi's gedrag. Je bent een onderzoeker, geen advocaat. Een conclusie "dit werkt niet" met helder bewijs is even waardevol als "dit werkt".

**Commitments:**
- [ ] **Claim**: Wat wordt er getest?
- [ ] **Evidence type**: sessie state | tool output | model response
- [ ] **Vergelijking**: voor/na of enkele staat

### `/pi-qa`

Systematische QA test van Pi functionaliteit. Doorloop stappen, rapporteer PASS/FAIL met bewijs.

## Tools referentie

### pi_session

Beheer Pi sessies. Lijst, inspecteer, fork, switch, compact, en navigeer de sessieboom.

| Operatie | Beschrijving |
|---|---|
| `list` | Toon alle beschikbare sessies |
| `inspect` | Toon huidige sessie details (aantal entries, branch, model) |
| `fork` | Fork vanaf een entry in een nieuwe sessie |
| `switch` | Schakel naar een andere sessie |
| `compact` | Compacteer huidige sessie |
| `label` | Zet of wis een label op een entry |
| `rename` | Hernoem de sessie |

### pi_model

Beheer Pi's model en provider configuratie.

| Operatie | Beschrijving |
|---|---|
| `list` | Toon beschikbare modellen |
| `set` | Wissel van model |
| `thinking` | Wijzig thinking level |
| `providers` | Toon geregistreerde providers |

### pi_tool

Beheer Pi's active tools.

| Operatie | Beschrijving |
|---|---|
| `list` | Toon alle tools en hun status (actief/inactief) |
| `set_active` | Activeer of deactiveer tools |
| `inspect` | Toon details van een specifieke tool |

### pi_state

Bewaar en herstel Pi sessie toestand.

| Operatie | Beschrijving |
|---|---|
| `save` | Bewaar huidige toestand (label, compact, summary) |
| `apply` | Herstel een bewaarde toestand |
| `diff` | Vergelijk twee sessie toestanden |
| `history` | Toon wijzigingsgeschiedenis |

### pi_verify

Verifieer Pi's toestand tegen verwachtingen.

| Operatie | Beschrijving |
|---|---|
| `session` | Controleer sessie eigenschappen (entries, model, settings) |
| `tool_output` | Controleer of een tool de verwachte output gaf |
| `behavior` | Test of Pi een bepaald gedrag vertoont |

## Rapportage

Na elke workflow:
- Wat er gebeurd is (stappen)
- Wat het bewijs is (tool outputs, session dumps)
- Of de commitments zijn nagekomen
- Eventuele issues of afwijkingen

## Niet doen

- Ga niet door na een fatale fout zonder duidelijke herstelstrategie
- Negeer geen bewijs dat de claim tegenspreekt
- Gebruik geen hardcoded paden; altijd `RUN_DIR`/`RUN_ID` scoping
