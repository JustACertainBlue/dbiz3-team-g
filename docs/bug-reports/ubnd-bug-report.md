# QA Bug Report – UBND Role

### BUG-UBND-01 – Revision status is not updated according to review decisions

- Severity: Critical
- Module: Provider Verification / Review Management
- Role: UBND

**Description:**
The status of the revision being reviewed by UBND is not updated according to the review decision. The system continues displaying `Verified` even when the submitted revision is `Pending` or has been marked as `Revision Required`.

**Actual Result:**
- A revision awaiting review or marked as Request Revision may still display `Verified`.
- The displayed status does not accurately reflect the UBND review decision.

**Expected Result:**
- When a Provider submits a new revision, its status should be `Pending`.
- When UBND selects `Approve`, the submitted revision should change to `Verified`.
- When UBND selects `Request Revision`, the submitted revision should change to `Revision Required`.
- Request Revision must require revision comments.
- Every review decision must record the reviewer and timestamp.
- If the Provider already has a previously verified version, that version remains published while the new revision is pending. Once the new revision is approved, it replaces the previously published verified version.

**Testing Note:**
Distinguish between the status of the revision currently under review and the status of the previously published verified version.

---

### BUG-UBND-02 – Inconsistent screen naming between Sidebar and main content

- Severity: Low
- Module: UBND / Hồ sơ

**Description:**
The screen name is inconsistent between the sidebar navigation and the main content area.

**Actual Result:**
- Sidebar displays: `Hồ sơ xưởng`.
- Main page title displays: `Hồ sơ chờ thẩm định`.

**Expected Result:**
The screen name should be consistent between the sidebar and the main page title. If this screen represents the list of workshop profiles awaiting UBND review, use `Hồ sơ chờ thẩm định` consistently.
