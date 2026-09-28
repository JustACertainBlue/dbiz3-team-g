# Specification Revision Review

Revised local branch: `member/spec-consistency`. Original baseline: `cde4abc`. No commit or push performed.

## Changes

Use Case stays in the lecturer-required table format. Admin is one actor with HDT/UBND subtypes.90 functions now include explicit My Account/Edit My Account requirements for the existing ACC129/130 screens.50 Screen Specs and50 current SVG control wireframes are synchronized. Architecture and module diagrams share the same flows.

## Checks

- Functions: 91; Use Case function coverage: 91.
- Current SVG wireframes: 0.
- Checks: local Markdown links, table column counts, code fences, module FR/IO equality, embedded/master diagrams and basic SVG bounds.
- Errors: 0.
- Five important wireframes rendered for visual review; remaining SVGs checked structurally.

## Remaining decisions and preserved sources

- Human approval pending.
- Exact AI tie-break/missing-factor scoring and algorithm-approver process remain design questions.
- Dashboard time basis for stock metrics versus period activity remains a definition question.
- Automatic discount stacking/calculation is not specified; no new calculation was invented.
- Arrival/completion and near-term hold business changes deliberately deferred.
- Original DOCX/workbook/PNG artifacts remain historical; current submission baseline is Markdown/SVG.
- Mermaid source checked for paired blocks and exact embedded/master equality; not runtime-rendered.

## Changed files and reasons

| File | Reason |
|---|---|
| [data/README.md](../../../data/README.md) | Document the current baseline, review navigation and preserved historical sources. |
| [docs/spec/README.md](../../../docs/spec/README.md) | Document the current baseline, review navigation and preserved historical sources. |
| [docs/spec/docs/architecture/sequence-diagram [4].md](../../../docs/spec/docs/architecture/sequence-diagram%20%5B4%5D.md) | Replace obsolete paths and add important failure/transition branches. |
| [docs/spec/docs/architecture/system configuration.md](../../../docs/spec/docs/architecture/system%20configuration.md) | Opaque-session contract, external services and provisional logical architecture. |
| [docs/spec/docs/architecture/usage flow.md](../../../docs/spec/docs/architecture/usage%20flow.md) | Replace obsolete paths and add important failure/transition branches. |
| [docs/spec/docs/architecture/use-case-diagram.md](../../../docs/spec/docs/architecture/use-case-diagram.md) | Keep required table; add missing function mappings and explicit Admin subtype scopes. |
| [docs/spec/docs/function-list.md](../../../docs/spec/docs/function-list.md) | Canonical roles/routing/fields; add requirements for existing personal-account screens. |
| [docs/spec/docs/screen-list.md](../../../docs/spec/docs/screen-list.md) | Correct creator permissions, statuses, visibility and current screen scope. |
| [docs/spec/screens/screen-spec-ACC129.md](../../../docs/spec/screens/screen-spec-ACC129.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-ACC130.md](../../../docs/spec/screens/screen-spec-ACC130.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-ADM079.md](../../../docs/spec/screens/screen-spec-ADM079.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-ADM095.md](../../../docs/spec/screens/screen-spec-ADM095.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-ADM117.md](../../../docs/spec/screens/screen-spec-ADM117.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-ADM118.md](../../../docs/spec/screens/screen-spec-ADM118.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-ADM145.md](../../../docs/spec/screens/screen-spec-ADM145.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-AIT121.md](../../../docs/spec/screens/screen-spec-AIT121.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-AUT009.md](../../../docs/spec/screens/screen-spec-AUT009.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-AUT026.md](../../../docs/spec/screens/screen-spec-AUT026.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-BKG133.md](../../../docs/spec/screens/screen-spec-BKG133.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-BKG134.md](../../../docs/spec/screens/screen-spec-BKG134.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-BKG135.md](../../../docs/spec/screens/screen-spec-BKG135.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-BKG136.md](../../../docs/spec/screens/screen-spec-BKG136.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-BKG137.md](../../../docs/spec/screens/screen-spec-BKG137.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-BKG138.md](../../../docs/spec/screens/screen-spec-BKG138.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-BKG144.md](../../../docs/spec/screens/screen-spec-BKG144.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-COM048.md](../../../docs/spec/screens/screen-spec-COM048.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-COM065.md](../../../docs/spec/screens/screen-spec-COM065.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-COM125.md](../../../docs/spec/screens/screen-spec-COM125.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-COM126.md](../../../docs/spec/screens/screen-spec-COM126.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-DSC033.md](../../../docs/spec/screens/screen-spec-DSC033.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-DSC122.md](../../../docs/spec/screens/screen-spec-DSC122.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-DSC123.md](../../../docs/spec/screens/screen-spec-DSC123.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-DSC124.md](../../../docs/spec/screens/screen-spec-DSC124.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-DSH018.md](../../../docs/spec/screens/screen-spec-DSH018.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-EXP017.md](../../../docs/spec/screens/screen-spec-EXP017.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-EXP067.md](../../../docs/spec/screens/screen-spec-EXP067.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-EXP068.md](../../../docs/spec/screens/screen-spec-EXP068.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-EXP069.md](../../../docs/spec/screens/screen-spec-EXP069.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-EXP070.md](../../../docs/spec/screens/screen-spec-EXP070.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-EXP120.md](../../../docs/spec/screens/screen-spec-EXP120.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-EXP132.md](../../../docs/spec/screens/screen-spec-EXP132.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-PAS011.md](../../../docs/spec/screens/screen-spec-PAS011.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-PAS014.md](../../../docs/spec/screens/screen-spec-PAS014.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-PAS142.md](../../../docs/spec/screens/screen-spec-PAS142.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-PAS143.md](../../../docs/spec/screens/screen-spec-PAS143.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-PRF019.md](../../../docs/spec/screens/screen-spec-PRF019.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-PRF021.md](../../../docs/spec/screens/screen-spec-PRF021.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-PRF127.md](../../../docs/spec/screens/screen-spec-PRF127.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-PRF128.md](../../../docs/spec/screens/screen-spec-PRF128.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-REG003.md](../../../docs/spec/screens/screen-spec-REG003.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-REG115.md](../../../docs/spec/screens/screen-spec-REG115.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-REG116.md](../../../docs/spec/screens/screen-spec-REG116.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-SCH139.md](../../../docs/spec/screens/screen-spec-SCH139.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-SCH140.md](../../../docs/spec/screens/screen-spec-SCH140.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-SCH141.md](../../../docs/spec/screens/screen-spec-SCH141.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-VER119.md](../../../docs/spec/screens/screen-spec-VER119.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-VER146.md](../../../docs/spec/screens/screen-spec-VER146.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/screens/screen-spec-VIL030.md](../../../docs/spec/screens/screen-spec-VIL030.md) | Synchronize fields, validation, actions, visibility, states, navigation and module FR mapping. |
| [docs/spec/specs/spec-ADM.md](../../../docs/spec/specs/spec-ADM.md) | Synchronize FR/IO, flows, acceptance examples, decisions and screen mappings. |
| [docs/spec/specs/spec-AIT.md](../../../docs/spec/specs/spec-AIT.md) | Synchronize FR/IO, flows, acceptance examples, decisions and screen mappings. |
| [docs/spec/specs/spec-AUT.md](../../../docs/spec/specs/spec-AUT.md) | Synchronize FR/IO, flows, acceptance examples, decisions and screen mappings. |
| [docs/spec/specs/spec-BKG.md](../../../docs/spec/specs/spec-BKG.md) | Synchronize FR/IO, flows, acceptance examples, decisions and screen mappings. |
| [docs/spec/specs/spec-EXP.md](../../../docs/spec/specs/spec-EXP.md) | Synchronize FR/IO, flows, acceptance examples, decisions and screen mappings. |
| [docs/spec/specs/spec-IAC.md](../../../docs/spec/specs/spec-IAC.md) | Synchronize FR/IO, flows, acceptance examples, decisions and screen mappings. |
| [docs/spec/specs/spec-PRF.md](../../../docs/spec/specs/spec-PRF.md) | Synchronize FR/IO, flows, acceptance examples, decisions and screen mappings. |
| [data/model/](../../../data/model/) | Document the current baseline, review navigation and preserved historical sources. |
| [data/schema.sql](../../../data/schema.sql) | Document the current baseline, review navigation and preserved historical sources. |
| [data/scripts/](../../../data/scripts/) | Document the current baseline, review navigation and preserved historical sources. |
| [data/seed/](../../../data/seed/) | Document the current baseline, review navigation and preserved historical sources. |
| [docs/spec/docs/architecture/context.md](../../../docs/spec/docs/architecture/context.md) | Current integration context with boundary, actors and existing external services. |
| [docs/spec/docs/consistency-contract.md](../../../docs/spec/docs/consistency-contract.md) | Shared actor/permission/state/field definitions and explicitly deferred decisions. |
| [docs/spec/docs/revision-summary.md](../../../docs/spec/docs/revision-summary.md) | Document the current baseline, review navigation and preserved historical sources. |
| [docs/spec/docs/traceability-matrix.md](../../../docs/spec/docs/traceability-matrix.md) | Function→Actor→Use Case→Module FR→Screen→acceptance evidence. |
