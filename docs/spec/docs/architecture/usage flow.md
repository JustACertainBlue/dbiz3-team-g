# Usage Flow

Admin is one actor. HDT may create UBND and review Agency; UBND may create Provider and review Provider profiles within its assigned village. No HDT→Create Provider path is specified.

## AUT

```mermaid
graph TD
  G["Guest: REG003"] --> V{"Valid registration and unique email?"}
  V -->|No| G
  V -->|Yes| O["REG115: email OTP"]
  O -->|Invalid/expired| O
  O -->|Verified| P["REG116: Pending Approval"]
  P --> H["Admin subtype HDT reviews Agency"]
  H -->|Request More Information| RI["Secure edit link: REG003 → F-AUTH-26 resubmit"]
  RI --> H
  H -->|Approved| L["AUT009 Login"]
  L --> C{"Credentials and status eligible?"}
  C -->|No| L
  C -->|Yes| M{"must_change_password?"}
  M -->|Yes| A["ACC129 Change Password panel"]
  M -->|No| D["ADM079 / EXP017 / DSH018"]
  A -->|Success| D
  L --> R["PAS011 → PAS014 generic recovery confirmation"]
  R --> E["Email token link → PAS142 → PAS143"]
```

## PRF

```mermaid
graph TD
  P["Provider: PRF127 → PRF128"] --> S{"Complete submission?"}
  S -->|No| D["Save Draft"]
  S -->|Yes| V["Pending Verification; retain last Verified version"]
  V --> U["Admin subtype UBND: VER146/VER119"]
  U -->|Approve| A["Publish Verified revision"]
  U -->|Request Revision| R["Revision Required; comments"]
  R --> P
  P --> X["EXP067 Create/Update/Delete via EXP069/070/132"]
  X --> Q{"Active/history references?"}
  Q -->|Active locks| B["Block invalid change/deletion"]
  Q -->|History only and Delete| AR["Archive"]
  Q -->|None and Delete| HD["Hard delete"]
```

## AIT

```mermaid
graph TD
  A["Agency AIT121: requirements"] --> E{"AI available?"}
  E -->|No| F["Temporary AI Failure / Retry"]
  F --> A
  E -->|Yes| C{"Critical fields sufficient?"}
  C -->|No| Q["Clarify or cancel"]
  Q -->|Additional context| A
  C -->|Yes| P["Build Tour Preference Profile"]
  P --> R["Retrieve seeded Village candidates with Verified Provider profiles → filter → rank"]
  R --> N{"Meets threshold?"}
  N -->|No| NM["No-match / refine"]
  N -->|Yes| D["Show results"]
  D --> V["DSC033 detail or COM048 chat/quote"]
```

## EXP

```mermaid
graph TD
  G["Guest EXP120"] --> PD["DSC123/DSC124 public details"]
  PD -->|Restricted action| L["AUT009"]
  A["Agency EXP017"] --> D["DSC122/DSC033 permitted details"]
  D --> Q["Request Quote once per Agency–Experience"]
  Q --> C["COM048 with initial message; optional dates/group"]
  D --> AI["AIT121"]
  A --> W["Eligible preference signals → shared decay/profile"]
  W --> K["Daily aggregation; weekly/monthly tuning proposal"]
  K --> H["Draft version awaiting human approval; no auto-activation"]
```

## BKG

```mermaid
graph TD
  P["Provider BKG134: valid agreed details"] --> V{"Atomic availability check"}
  V -->|Fail| E["Error; no booking created"]
  V -->|Pass| H["Create On hold; original72h expiry"]
  H --> S["Sync Agency SCH141/BKG137 + Chat"]
  S --> D{"Confirm / Cancel / Expiry"}
  D -->|Confirm before expiry| B["Booked"]
  D -->|Cancel or72h reached| C["Cancelled"]
  B --> A{"Mark Arrival on/after start or Cancel"}
  A -->|Mark Arrival| F["Completed; current approved rule"]
  A -->|Cancel| C
  C --> U["Sync status/occupancy/history"]
  F --> U
  U --> AG["Agency read-only BKG138/SCH141"]
```

## ADM

```mermaid
graph TD
  A["Admin ADM079"] --> R{"admin_type"}
  R -->|HDT| H["Platform-wide permitted filters"]
  R -->|UBND| U["Fixed assigned village"]
  H --> D["Load cards/charts/trend/booking list/top10 pairs"]
  U --> D
  D --> F["Change filters → refresh permitted metrics"]
  F --> D
  A --> M["ADM095 account management"]
```

## IAC

```mermaid
graph TD
  P["Authorized Agency/Provider"] --> C["Resolve existing Active pair chat or create new"]
  C --> H["COM048/COM065 history; last50 with pagination"]
  H --> T["Send text<=4000 or files1–5<=10MB each"]
  T --> V{"Valid Active participant and content?"}
  V -->|No| E["Error; no message"]
  V -->|Yes| S["Persist and deliver message"]
  S --> H
  H --> N["Navigate away: keep Active"]
  H --> X["Explicit Close Chat"]
  X --> R["Closed read-only; retain history"]
  R -->|New interaction| C
```
