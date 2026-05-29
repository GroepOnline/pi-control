# pi-control E2E Test Results

**Date:** 2026-05-29
**Framework:** Vitest 4.1.7
**Duration:** 1.36s
**Result:** 116/116 PASS (4 test files)

## Test Files

| File | Tests | Status |
|------|-------|--------|
| tests/tools.test.ts | 56 | PASS |
| tests/guardrails.test.ts | 32 | PASS |
| tests/commands.test.ts | 19 | PASS |
| tests/integration.test.ts | 9 | PASS |

## Coverage Summary

### Tools (56 tests)
- **pi_session** (17): list, inspect, fork, switch, compact, navigate, label, rename, error handling
- **pi_model** (9): list, set, thinking, providers, error handling
- **pi_tool** (7): list, set_active, inspect, error handling
- **pi_state** (11): save, restore, diff, history, error handling
- **pi_verify** (12): session, model, tool, state verification with expectations

### Guardrails (32 tests)
- **Bash guard** (12): rm -rf /, rm -rf ~, mkfs, dd if=, /dev/ writes, fork bombs, curl|bash, wget|sh, safe commands
- **Session lifecycle** (7): switch/fork confirmation, large session warnings, cancellation
- **Model guard** (3): model switch confirmation, cancellation
- **pi_session guard** (3): switch/fork confirmation via pi_session tool
- **Turn monitoring** (6): turn_start/end hooks, tool logging, shutdown

### Commands (19 tests)
- **/pi-demo** (6): registration, empty args, demo flow, session info
- **/pi-verify** (5): registration, empty args, verify protocol, claim passing
- **/pi-qa** (6): registration, empty args, QA flow, tool listing, report format

### Integration (9 tests)
- Full extension registration (tools, commands, event handlers)
- Startup notification
- Tools work after full registration
- Guardrails work after full registration
- Turn monitoring works after full registration
- All tools have execute function and parameter validation

## Detailed Results

```
 ✓ tests/commands.test.ts > /pi-demo > registreert pi-demo commando 18ms
 ✓ tests/commands.test.ts > /pi-demo > toont notificatie zonder args 4ms
 ✓ tests/commands.test.ts > /pi-demo > toont notificatie zonder argumenten 2ms
 ✓ tests/commands.test.ts > /pi-demo > stuurt user message met demo instructies 6ms
 ✓ tests/commands.test.ts > /pi-demo > bevat sessie info in message 3ms
 ✓ tests/commands.test.ts > /pi-demo > wacht op idle voor versturen 2ms
 ✓ tests/commands.test.ts > /pi-verify > registreert pi-verify commando 2ms
 ✓ tests/commands.test.ts > /pi-verify > toont notificatie zonder args 2ms
 ✓ tests/commands.test.ts > /pi-verify > stuurt verify instructies 4ms
 ✓ tests/commands.test.ts > /pi-verify > bevat claim in message 2ms
 ✓ tests/commands.test.ts > /pi-verify > bevat verify protocol stappen 2ms
 ✓ tests/commands.test.ts > /pi-qa > registreert pi-qa commando 2ms
 ✓ tests/commands.test.ts > /pi-qa > toont notificatie zonder args 2ms
 ✓ tests/commands.test.ts > /pi-qa > stuurt QA instructies 3ms
 ✓ tests/commands.test.ts > /pi-qa > bevat target in message 1ms
 ✓ tests/commands.test.ts > /pi-qa > bevat pi_* tools lijst 2ms
 ✓ tests/commands.test.ts > /pi-qa > bevat rapport formaat 2ms
 ✓ tests/guardrails.test.ts > Bash guard > registreert tool_call handler 16ms
 ✓ tests/guardrails.test.ts > Bash guard > blokkeert rm -rf / 5ms
 ✓ tests/guardrails.test.ts > Bash guard > staat rm -rf / toe bij bevestiging 2ms
 ✓ tests/guardrails.test.ts > Bash guard > blokkeert rm -rf ~ 2ms
 ✓ tests/guardrails.test.ts > Bash guard > blokkeert mkfs 3ms
 ✓ tests/guardrails.test.ts > Bash guard > blokkeert dd if= 2ms
 ✓ tests/guardrails.test.ts > Bash guard > blokkeert schrijven naar /dev/ 3ms
 ✓ tests/guardrails.test.ts > Bash guard > blokkeert fork bomb 3ms
 ✓ tests/guardrails.test.ts > Bash guard > blokkeert curl | bash 4ms
 ✓ tests/guardrails.test.ts > Bash guard > blokkeert wget | sh 2ms
 ✓ tests/guardrails.test.ts > Bash guard > laat veilige commando's door 2ms
 ✓ tests/guardrails.test.ts > Bash guard > laat npm install door 1ms
 ✓ tests/guardrails.test.ts > Bash guard > negeert niet-bash tools 1ms
 ✓ tests/guardrails.test.ts > Session lifecycle guard > registreert session_before_switch handler 2ms
 ✓ tests/guardrails.test.ts > Session lifecycle guard > registreert session_before_fork handler 1ms
 ✓ tests/guardrails.test.ts > Session lifecycle guard > vraagt bevestiging bij switch met >20 entries 3ms
 ✓ tests/guardrails.test.ts > Session lifecycle guard > annuleert switch bij weigering 2ms
 ✓ tests/guardrails.test.ts > Session lifecycle guard > geen bevestiging bij kleine sessie 2ms
 ✓ tests/guardrails.test.ts > Session lifecycle guard > vraagt bevestiging bij fork >50 entries 4ms
 ✓ tests/guardrails.test.ts > Session lifecycle guard > annuleert fork bij weigering 2ms
 ✓ tests/guardrails.test.ts > Model guard > vraagt bevestiging bij model wissel 3ms
 ✓ tests/guardrails.test.ts > Model guard > blokkeert model wissel bij weigering 2ms
 ✓ tests/guardrails.test.ts > Model guard > geen bevestiging bij list actie 2ms
 ✓ tests/guardrails.test.ts > pi_session guard > vraagt bevestiging bij switch via pi_session 3ms
 ✓ tests/guardrails.test.ts > pi_session guard > vraagt bevestiging bij fork via pi_session 3ms
 ✓ tests/guardrails.test.ts > pi_session guard > blokkeert sessie switch bij weigering 2ms
 ✓ tests/guardrails.test.ts > Turn monitoring > registreert turn_start handler 2ms
 ✓ tests/guardrails.test.ts > Turn monitoring > registreert turn_end handler 1ms
 ✓ tests/guardrails.test.ts > Turn monitoring > registreert session_shutdown handler 1ms
 ✓ tests/guardrails.test.ts > Turn monitoring > turn_start zet status 2ms
 ✓ tests/guardrails.test.ts > Turn monitoring > turn_end logt tool gebruik 5ms
 ✓ tests/guardrails.test.ts > Turn monitoring > turn_end handelt lege results af 2ms
 ✓ tests/integration.test.ts > pi-control integratie > registreert alle 5 tools 329ms
 ✓ tests/integration.test.ts > pi-control integratie > registreert alle 3 commando's 2ms
 ✓ tests/integration.test.ts > pi-control integratie > registreert event handlers 2ms
 ✓ tests/integration.test.ts > pi-control integratie > session_start toont startup melding 6ms
 ✓ tests/integration.test.ts > pi-control integratie > tools werken na volledige registratie 3ms
 ✓ tests/integration.test.ts > pi-control integratie > guardrails werken na volledige registratie 2ms
 ✓ tests/integration.test.ts > pi-control integratie > turn monitoring logt na volledige registratie 4ms
 ✓ tests/integration.test.ts > pi-control integratie > alle tools hebben execute functie 3ms
 ✓ tests/integration.test.ts > pi-control integratie > alle tools hebben validatie (required params) 3ms
 ✓ tests/tools.test.ts > pi_session > registreert pi_session tool 12ms
 ✓ tests/tools.test.ts > pi_session > list retourneert beschikbare sessies 4ms
 ✓ tests/tools.test.ts > pi_session > inspect retourneert sessie details 2ms
 ✓ tests/tools.test.ts > pi_session > fork vereist entryId 2ms
 ✓ tests/tools.test.ts > pi_session > fork met entryId triggert /fork 5ms
 ✓ tests/tools.test.ts > pi_session > switch vereist sessionPath 2ms
 ✓ tests/tools.test.ts > pi_session > switch met sessionPath triggert /resume 2ms
 ✓ tests/tools.test.ts > pi_session > compact start compressie 2ms
 ✓ tests/tools.test.ts > pi_session > compact met custom instructions 7ms
 ✓ tests/tools.test.ts > pi_session > navigate vereist entryId 2ms
 ✓ tests/tools.test.ts > pi_session > navigate retourneert instructies 1ms
 ✓ tests/tools.test.ts > pi_session > label vereist entryId 1ms
 ✓ tests/tools.test.ts > pi_session > label zet label op entry 1ms
 ✓ tests/tools.test.ts > pi_session > label wist label zonder param 1ms
 ✓ tests/tools.test.ts > pi_session > rename vereist name 1ms
 ✓ tests/tools.test.ts > pi_session > rename hernoemt sessie 1ms
 ✓ tests/tools.test.ts > pi_session > vangt errors op 1ms
 ✓ tests/tools.test.ts > pi_model > registreert pi_model tool 1ms
 ✓ tests/tools.test.ts > pi_model > list retourneert modellen 3ms
 ✓ tests/tools.test.ts > pi_model > set vereist modelId 1ms
 ✓ tests/tools.test.ts > pi_model > set wisselt naar bestaand model 1ms
 ✓ tests/tools.test.ts > pi_model > set faalt bij onbekend model 1ms
 ✓ tests/tools.test.ts > pi_model > set faalt als setModel false retourneert 1ms
 ✓ tests/tools.test.ts > pi_model > thinking vereist level 1ms
 ✓ tests/tools.test.ts > pi_model > thinking wijzigt level 1ms
 ✓ tests/tools.test.ts > pi_model > providers retourneert info 1ms
 ✓ tests/tools.test.ts > pi_tool > registreert pi_tool tool 1ms
 ✓ tests/tools.test.ts > pi_tool > list retourneert alle tools 2ms
 ✓ tests/tools.test.ts > pi_tool > set_active vereist toolNames 1ms
 ✓ tests/tools.test.ts > pi_tool > set_active stelt tools in 2ms
 ✓ tests/tools.test.ts > pi_tool > inspect vereist toolName 2ms
 ✓ tests/tools.test.ts > pi_tool > inspect retourneert details 2ms
 ✓ tests/tools.test.ts > pi_tool > inspect faalt bij onbekende tool 1ms
 ✓ tests/tools.test.ts > pi_state > registreert pi_state tool 1ms
 ✓ tests/tools.test.ts > pi_state > save bewaart toestand 2ms
 ✓ tests/tools.test.ts > pi_state > save genereert key zonder param 3ms
 ✓ tests/tools.test.ts > pi_state > restore vereist key 1ms
 ✓ tests/tools.test.ts > pi_state > restore vindt opgeslagen state 2ms
 ✓ tests/tools.test.ts > pi_state > restore faalt bij onbekende key 1ms
 ✓ tests/tools.test.ts > pi_state > diff vergelijkt huidige staat 1ms
 ✓ tests/tools.test.ts > pi_state > diff met key zoekt opgeslagen state 1ms
 ✓ tests/tools.test.ts > pi_state > diff faalt bij onbekende key 1ms
 ✓ tests/tools.test.ts > pi_state > history retourneert state entries 1ms
 ✓ tests/tools.test.ts > pi_state > history toont bericht bij geen entries 1ms
 ✓ tests/tools.test.ts > pi_verify > registreert pi_verify tool 1ms
 ✓ tests/tools.test.ts > pi_verify > session verifieert properties 2ms
 ✓ tests/tools.test.ts > pi_verify > session met correcte expectations passeert 1ms
 ✓ tests/tools.test.ts > pi_verify > session met foute expectations faalt 1ms
 ✓ tests/tools.test.ts > pi_verify > session met entries.gt expectation 1ms
 ✓ tests/tools.test.ts > pi_verify > session met entries.lt expectation 2ms
 ✓ tests/tools.test.ts > pi_verify > model verifieert configuratie 1ms
 ✓ tests/tools.test.ts > pi_verify > model met correcte expectations 2ms
 ✓ tests/tools.test.ts > pi_verify > model met foute expectations faalt 3ms
 ✓ tests/tools.test.ts > pi_verify > tool verifieert actieve tools 6ms
 ✓ tests/tools.test.ts > pi_verify > tool met activeTools expectation 1ms
 ✓ tests/tools.test.ts > pi_verify > tool met inactiveTools expectation 1ms
 ✓ tests/tools.test.ts > pi_verify > state verifieert custom entries 1ms
 ✓ tests/tools.test.ts > pi_verify > state faalt als state niet bestaat 1ms
```
