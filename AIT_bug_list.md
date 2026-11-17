# AIT Bug List

## Village-card search does not match unaccented village names

- **Reproduction:** `resolveVillageCards("lang gom bat trang")` returns no village card.
- **Evidence:** The relevant existing resolver tests passed on clean `bd3a57d` (4 passed), and the same new reproduction test failed when copied into a detached worktree at that commit (1 failed, 5 passed). This behavior predates the current coordinate changes.
- **Status:** Known pre-existing issue; not changed as part of the village-coordinate work.
