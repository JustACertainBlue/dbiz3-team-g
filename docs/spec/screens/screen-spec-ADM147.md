# ADM147 — Ranking Versions

| Item | Specification |
|---|---|
| Actor | Admin with `role=ADMIN`, `admin_type=HDT` and `manage_rankings` permission |
| Function | F-EXPLORE-18; UC-ADM-02 |
| Entry | HDT Admin navigation → Ranking Versions |
| Exit | Return to Admin Dashboard (ADM079) |
| Priority | Should |

The screen lists ranking parameter versions in Draft, Active and Retired states with creation time, tuning reason and available KPI evidence. The currently Active version is prominent. HDT can enter a parameter map and reason to create a Draft, or select a Draft and provide a reason to activate it. Confirmation names the version that will become Retired.

**Validation and errors:** parameter map and reason are required for Draft creation; an activation requires an existing Draft, the Active version ID displayed when the form opened, and a reason. Recheck permission and version status on the server. If another activation has already changed the Active version, show a conflict and reload the list; keep the previous Active version until a complete transaction succeeds. Record actor, time, reason and old/new version IDs in audit logs. UBND and other actors receive Access Denied and cannot see the controls.

No wireframe asset is required for this specification.
