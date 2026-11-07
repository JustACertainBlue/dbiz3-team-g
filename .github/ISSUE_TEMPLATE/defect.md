---
name: Defect report
about: Report an integration or test defect (Session 10 template)
title: "[SENDER→RECEIVER] short description"
labels: defect
assignees: ''
---

<!-- Synthetic data only. Never paste passwords, session cookies, keys or real personal data. -->

**Steps:** exact input and steps to reproduce
1.
2.

**Expected:** behaviour, with spec reference (FR/BR, spec section)

**Actual:** what happened (attach a screenshot without secrets if useful)

**Environment:** hosted URL or `main @ <tag or commit>`, browser/device (phone over 4G?), runtime versions

**Interface:** SENDER → RECEIVER (which call / table / event)

**Owner:** <module owner> · **Reviewer:** <other side's owner>

**Severity:** High / Medium / Low + why
<!-- High: a Must flow is blocked, data is wrong or leaked, or a role can do what it must not.
     Medium: a Must flow works with a workaround, or a Should flow is blocked. Low: cosmetic or wording. -->

**Fix:** PR #<n>, test <name>
<!-- Branch fix/<issue number>-<short-description>; the PR says "Closes #<n>"; the reporter re-tests on the
     hosted version before closing. -->
