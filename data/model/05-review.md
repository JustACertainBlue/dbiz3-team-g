# 05 — Data-model review and decision log

Status: **conceptual/logical model approved through Human Gate 4 for Q-01–Q-04 on 28 September 2026**. Source baseline: [Function List](../../docs/spec/docs/function-list.md), [module specs](../../docs/spec/specs/), and [consistency contract](../../docs/spec/docs/consistency-contract.md). Remaining decisions stay visible and do not silently become requirements.

## Structural audit

| Check | Finding | Action |
|---|---|---|
| Function coverage | 91 distinct Function IDs appear once in [CRUD matrix](02-crud-matrix.md) | Keep this invariant when spec changes. |
| No-C entities | Role, Permission and Village are seeded references; Resubmission Token issuance is an implied step of HDT Request More Information | Confirm seed authority and token issuance/storage. |
| Write-only entities | None intentionally. Audit and Notification are read mainly through accountability/delivery operations not a separate user-facing screen | Confirm retention/read consumers. |
| Multi-owner entities | Private Attachment spans AUT/IAC; Notification spans AUT/PRF/BKG | Assign one schema owner and module-specific access policy. |
| Orphan functions | F-AUTH-01/02/05/10 are UI/validation-only in the matrix | Expected; F-AUTH-02's eventual request persistence still needs attribution. |
| Unused declared nouns | Module §6 includes derived cards/schedules/dashboards; REC has no required CRUD write | Treat display nouns as views; retain REC only if Q-10 approves recommendation history. |
| Freeze values | Booking `agreed_price_total`, `conditions_snapshot`, start/duration/group size at creation are transaction facts | Retain historical values when Experience changes; F-SCHED-03/04. |
| Delete behavior | Experience hard delete only without Booking reference; historical Booking requires archived Experience | Other foreign-key delete/retention rules remain open. |
| Enum transitions | Booking/Chat are mostly defined; Agency request state and Provider version replacement are not fully defined | Decide before DDL. |
| Normalization | Repeating versions, operating windows, media, discounts, messages and history are separated | Review structured fields at physical design. |
| Dashboard source | Booking created-at and status history, activity event timestamps, Agency/Provider snapshot history | A current-status-only table cannot reconstruct historical snapshots; see Q-08. |

## `[NEEDS CLARIFICATION]` decisions

| ID | Priority | Question and evidence | Recommended decision for approval | Owner / effect |
|---|---|---|---|---|
| Q-01 | Approved | F-AUTH-23 says server stores request/sends OTP, but its input already contains `registration_request_id`. Which action creates request/challenge and resends? | Successful F-AUTH-02 validation creates the request; F-AUTH-23 issues/resends/verifies OTP. Update its input/output wording together. | Approved 28 Sep 2026; AUT wording follow-up remains. |
| Q-02 | Approved | F-AUTH-26 requires single-use resubmission token without expiry/issuance. | F-AUTH-18 issues a 24-hour token on Request More Information; a new token or successful use invalidates older active tokens. | Approved 28 Sep 2026. |
| Q-03 | Approved | Legal registration documents and chat files have different access/retention rules. | Use shared `stored_file` metadata plus separate `registration_document` and `chat_attachment` owner-link relations. | Approved 28 Sep 2026. |
| Q-04 | Approved | Last Verified Provider version remains published during new review. Which fields/images are snapshotted; can pending versions overlap? | Snapshot every public/profile/legal field and media links; allow one current editable/submitted version per Provider plus one published version. | Approved 28 Sep 2026. |
| Q-05 | Important | Is `tax_id` unique across Agencies/rejected registrations? Is Provider registration number unique? | Enforce normalized unique business identifiers across current entities; retain rejected history without releasing identifier until policy says otherwise. | AUT/PRF; natural keys. |
| Q-06 | Important | Retention for closed chats/files/rejected applications/audits/inactive users is absent. | No cascade deletion of evidence; define retention periods in a later policy and use restrict/archive meanwhile. | Data owner; referential actions. |
| Q-07 | Important | AUT and PRF both name account status. | Store account status only on `user_account`; profile outputs derive it. | AUT + PRF; remove duplicate authority. |
| Q-08 | Important | End-date snapshots require status history that current entities do not define. | Add append-only account/profile status history events and calculate as-of end date from them. | ADM + AUT/PRF; KPI correctness. |
| Q-09 | Important | Can Experience move Provider/Village? Booking stores Experience and Provider IDs. | Make Experience ownership immutable in MVP; keep Booking provider snapshot only if reporting/history requires it and enforce equality at creation. | PRF/BKG; FK consistency. |
| Q-10 | Important | Recommendation runs and unaccepted AI drafts may be transient. | Persist matching run/results for traceability; expire unaccepted description drafts after a defined retention period. | AIT/PRF; REC/AID persistence. |
| Q-11 | Important | Seeded Village lacks a stable source/natural key. | Use an approved government/source code when available; do not use village name as the sole key. | PRF/data; seed upsert. |
| Q-12 | Later | Ranking approval/deployment role and parameter schema unresolved. | Store draft/active version status, but defer activation workflow until an authorized actor is added to the spec. | EXP BA; RPV/RQA model. |
| Q-13 | Important | Multiple pending Agency major changes and rejection retention are unspecified. | At most one pending major change per Agency; keep rejected request/history immutable. | AUT + PRF; uniqueness/retention. |

## Human review gates

1. **Entity authority:** the team confirms the one-sentence entity definitions, Table C reconciliation and a named owner for ATT/NOT.
2. **CRUD:** module owners review each Function ID's C/R/U/D cells, especially the pre-OTP request and registration resubmission.
3. **ERD:** read each relationship in both directions; confirm the optional side and N:M associations.
4. **Logical model:** resolve blocker questions, freeze-value rules, natural keys, and status histories.
5. **Seed:** produce synthetic rows covering ordinary, boundary, empty and exceptional scenarios; validate FK and source-scenario coverage.
6. **Physical design:** only after the stack decision, choose SQL types, indexes, migration order and DDL.

## Ready state

The package passed its four blocking decisions and may proceed to a reviewable PostgreSQL candidate schema and executable synthetic seed. Q-05–Q-13 remain visible; the physical candidate applies the recommendations where needed for testability and labels them as provisional until final team approval.
