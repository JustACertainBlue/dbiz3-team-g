# EARS draft — failures seen only on the hosted build (2026-11-09)

**Status: draft for the team. No spec file is changed.** `docs/spec/` is human-owned. When the team approves a
line, it is copied into the named spec's **Edge cases** section in a separate spec PR, in the same style as the
existing line at `docs/spec/specs/spec-AUT.md:231`.

- **Format:** "When <trigger>, the system shall <response>".
- **Scope:** failures found on the hosted version (Render + Supabase), from issues and test reports up to `main` = `ec859af`.
- **Already covered elsewhere (not repeated here):** #87, #88, #93 and #102, in open PR #104.
- **"Needs human":** marks a line where a number, a placement or the fix status still has to be decided or re-checked by a person.

| # | EARS line (proposal) | Source | Proposed place | Status |
|---|---|---|---|---|
| H1 | When the hosted service receives the first request after an idle period, the system shall show the requested page, or a loading indication followed by the page, and shall not show an error page; the page shall be usable within **[N] seconds**. | `docs/adr/0001-hosting.md:53` ("Idle sleep"), `:73` (tester notice); PR #101 `docs/build/local-vs-internet.md` row 15; #162 §3 (record the first load time) | Non-functional / deployment note (no module spec owns it; ADR 0001) | **needs human:** N is not measured yet. #162 §3 asks for the first-load time on a real phone over 4G; choose N from that result, or keep the line without a number |
| H2 | When the Chat screen (COM048 / COM065) is displayed at a viewport width of 360–390 px, the system shall keep the message input, Send, Attach and Close Chat controls fully visible and usable without horizontal scrolling. | Team test report 09/11, item M04 ("chat controls clipped at 390 px", old UI before #148–#153); #162 §3 note | `spec-IAC.md` Edge cases | **needs human:** the UI was rebuilt in #153 (Figma 360 layout). Re-check on the hosted build after deploy, then keep the line as a regression guard or drop it |
| H3 | When a Local Provider changes a Booking (status, schedule, group size, price or conditions), the system shall show the change on the Tour Agency's open Booking History (BKG137), Booking Detail (BKG138) and Agency Schedule (SCH141) within **10 seconds** while the page is visible, without a reload. | #157 (bug, sev:high); `spec-BKG.md:317` FR-002 "Syncs real-time when LP updates booking"; FR-008; fix PR #166 (10 s polling) | `spec-BKG.md` Edge cases | **needs human:** in the DEV check the change appeared after 15–22 s (the poll interval, plus server time, plus the first dev compile). Decide whether the bound is "within 10 s", "within 20 s" or "at the next refresh (10 s interval)" |
| H4 | When the other participant sends a message in an Active Chat that is open on screen, the system shall show the message in that Chat within **10 seconds** while the page is visible, without a reload. | #158 (bug, sev:medium); `spec-IAC.md:248` "Message delivered immediately"; `screen-spec-COM048.md:15`, `screen-spec-COM065.md:15` "real-time"; fix PR #166 | `spec-IAC.md` Edge cases | **needs human:** same bound question as H3 (DEV check ≤ 15 s) |
| H5 | When a browser tab showing BKG137, BKG138, SCH141 or an open Chat becomes visible again after being hidden, the system shall fetch the latest data at once. | Decision linhkhanh-vu 09/11 for #157 / #158; PR #166 (`src/lib/client/poller.ts`) | `spec-BKG.md` and `spec-IAC.md` Edge cases | Ready (behaviour built and unit-tested) |
| H6 | When an action needs to send an email and no email service is configured, the system shall show "Email chưa được cấu hình", shall not create the OTP, reset or edit token, account or temporary password, and shall not report that an email was sent. | `spec-AUT.md:231` (existing line, 2026-11-07); ADR 0001 (no email provider); PR #101 row 8 | Already in `spec-AUT.md:231` | **No new spec line.** This is the existing IF/THEN line rewritten in the "When" form for this list. Keep the spec line as it is |
| H7 | When HDT reviews an Agency registration or change on the hosted build and no email is sent, the system shall say that the email was not sent and shall not report a delivery that did not happen. | #58 ("'Email chưa được gửi' shown although …"); open fix PR #124 | `spec-AUT.md` Edge cases (next to line 231) | **needs human:** check whether H6 already covers it. If it does, drop H7 |

## What only a person can do here

- **Choose the numbers:** N for H1, and the time bound for H3 / H4.
- **Re-check M04 (H2) on the hosted build** after deploy, on a real phone.
- **Approve the exact lines and their target spec files.** Then a spec PR copies them (agents edit `docs/spec/` only for the exact approved lines) and refreshes the Spec Kit snapshots with `uv run tools/start_feature.py --refresh`.
