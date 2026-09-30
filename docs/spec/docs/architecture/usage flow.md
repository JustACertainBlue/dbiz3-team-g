# Usage Flow

## 1. Guest Flow

```mermaid
graph TD
  classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
  classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
  G_Start(["0. Start: Guest"])
  G1["1. View Explore Page\n(Public Local Provider/Experiences)\n[F-EXPLORE-01\nF-EXPLORE-02]"]
  G2["2. View Public Local Provider Detail Page\n(Limited Info)\n[F-PROFILE-03\nF-EXPLORE-03]"]
  G3{"3. Request advanced features?\n(Quote, Chat, AI)\n[F-AUTH-16]"}
  G_Handoff(["4a. Handoff:\nTo Auth Flow\n[F-AUTH-05]"])
  G_End(["4b. End:\nContinue Browsing"])
  G_Start --> G1
  G1 --> G2
  G2 --> G3
  G3 -- "Yes" --> G_Handoff
  G3 -- "No" --> G_End
  class G_Start,G_Handoff,G_End startend;
```

## 2. Admin Flow

```mermaid
graph TD
  classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
  classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
  A_Start(["0. Start: Admin Portal\n[F-AUTH-05]"])
  A1[/"1. Input Email, Password\n[F-AUTH-06]"/]
  A2["2. Login to System\n[F-AUTH-07\nF-AUTH-08]"]
  A3["3. View Admin Dashboard\n[F-ADMIN-01\nF-ADMIN-02\nF-ADMIN-03]"]
  A4{"4. Role == HDT?\n[F-AUTH-15]"}
  A5{"5. Switch/Case:\nSelect HDT Action\n[F-AUTH-16]"}
  A6[/"6a. Input Agency Decision\n[F-AUTH-18]"/]
  A7["7a. Approve/Reject Agency\n[F-AUTH-18]"]
  A8[/"6b. Input PC Information\n[F-AUTH-19]"/]
  A9["7b. Create PC Account\n[F-AUTH-19]"]
  A10[/"6c. Input Provider Information\n[F-AUTH-20]"/]
  A11["7c. Create Local Provider Account\n[F-AUTH-20]"]
  A12["8. View all Profiles\n(Read-only Mode)\n[F-PROFILE-01\nF-PROFILE-03]"]
  A13["9. View all Booking Statuses\n[F-ADMIN-09]"]
  A_End(["10. End: Logout\n[F-AUTH-09]"])
  A_Start --> A1 --> A2 --> A3 --> A4
  %% HDT Branch
  A4 -- "Yes (HDT)" --> A5
  A5 -- "Action: Manage Agency" --> A6 --> A7
  A5 -- "Action: Create PC" --> A8 --> A9
  A5 -- "Action: Create LP" --> A10 --> A11
  %% UBND Branch
  A4 -- "No (UBND)" --> A10
  %% Convergence
  A7 --> A12
  A9 --> A12
  A11 --> A12
  A3 --> A12 --> A13 --> A_End
  class A_Start,A_End startend;
```

## 3. Tour Agency Flow

```mermaid
graph TD
  classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
  classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
  TA_Start(["0. Start: Tour Agency\n[F-AUTH-01]"])
  TA1[/"1. Input Registration Data\n[F-AUTH-02\nF-AUTH-03]"/]
  TA2["2. Submit Company Information\n[F-AUTH-23\nF-AUTH-04]"]
  TA3{"3. Account Approved\nby HDT?\n[F-AUTH-18]"}
  TA4[/"4a. Update Information\n[F-AUTH-26]"/]
  TA5[/"4b. Input Email, Password\n[F-AUTH-05\nF-AUTH-06]"/]
  TA6["5. Login to System\n[F-AUTH-07\nF-AUTH-08]"]
  TA7{"6. Switch/Case:\nChoose Discovery Method\n[F-EXPLORE-01]"}
  TA8[/"7a. Input Natural Language\n[F-MATCH-01\nF-MATCH-02]"/]
  TA9["8a. Use AI Tour Matching Assistant\n[F-MATCH-03\nF-MATCH-04\nF-MATCH-05\nF-MATCH-06\nF-MATCH-07\nF-MATCH-08]"]
  TA10["7b. Browse Explore Page\n[F-EXPLORE-01\nF-EXPLORE-02]"]
  TA11["9. View Local Provider Detail\n[F-PROFILE-03\nF-EXPLORE-03]"]
  TA12{"10. Switch/Case:\nChoose Interaction\n[F-AUTH-16]"}
  TA13[/"11a. Input Quote Specs\n[F-EXPLORE-11]"/]
  TA14["12a. Request Quote\n[F-EXPLORE-11\nF-CHAT-01]"]
  TA15[/"11b. Input Message\n[F-CHAT-02]"/]
  TA16["12b. Communicate via Chat\n[F-CHAT-01\nF-EXPLORE-12\nF-CHAT-03\nF-CHAT-04]"]
  TA17["13. Receive Booking Sync\n(From Local Provider)\n[F-SCHED-08]"]
  TA18["14. View Private Booking Details\n[F-SCHED-07\nF-SCHED-02]"]
  TA_End(["15. End: Logout\n[F-AUTH-09]"])
  TA_Start --> TA1 --> TA2 --> TA3
  TA3 -- "No (Pending/Rejected)" --> TA4 --> TA2
  TA3 -- "Yes (Approved)" --> TA5 --> TA6 --> TA7
  TA7 -- "Use AI" --> TA8 --> TA9 --> TA11
  TA7 -- "Manual Browse" --> TA10 --> TA11
  TA11 --> TA12
  TA12 -- "Need Quote" --> TA13 --> TA14 --> TA17
  TA12 -- "Need Info" --> TA15 --> TA16 --> TA17
  TA17 --> TA18 --> TA_End
  class TA_Start,TA_End startend;
```

## 4. Local Provider Flow

```mermaid
graph TD
  classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
  classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
  classDef decision fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
  LP_Start(["0. Start: Local Provider\n[F-AUTH-05]"])
  LP1[/"1. Input Email, Password\n[F-AUTH-06]"/]
  LP2["2. Login to System\n[F-AUTH-07\nF-AUTH-08]"]
  LP3[/"3. Upload Media & Edit Info\n[F-PROFILE-04]"/]
  LP4["4. Update Tour & Experience Profile\n[F-PROFILE-06]"]
  LP5["5. View Public Schedule\n[F-SCHED-01]"]
  LP6["6. Receive Request Quote & Chat\n[F-CHAT-01\nF-CHAT-03]"]
  LP7{"7. Initial Booking Action:\nHold or Confirm?\n[F-SCHED-03]"}
  LP8["8a. Hold Spot\n[State: On hold]\n[F-SCHED-03]"]
  LP9["8b. Confirm Booking \n[State: Booked]\n[F-SCHED-03\nF-SCHED-05]"]
  LP_Sync1["9. Auto-Sync to Agency Schedule\n[F-SCHED-08]"]
  LP10{"10. Decision on 'On hold':\nConfirm or Cancel?\n[F-SCHED-07\nF-SCHED-05]"}
  LP11["11. Cancel Booking\n[State: Cancelled]\n[F-SCHED-05]"]
  LP_Sync2["12. Auto-Sync to Agency Schedule\n[F-SCHED-08]"]
  LP12{"13. Decision on 'Booked':\nArrival or Cancel?\n[F-SCHED-07]"}
  LP13["14a. Mark Group Arrival\n[State: Completed]\n[F-SCHED-06]"]
  LP14["14b. Cancel Booking\n[State: Cancelled]\n[F-SCHED-05]"]
  LP_Sync3["15. Auto-Sync to Agency Schedule\n[F-SCHED-08]"]
  LP15["16. View Private Booking Details (History)\n[F-SCHED-10\nF-SCHED-07]"]
  LP_End(["17. End: Logout\n[F-AUTH-09]"])
  %% --- FLOW CONNECTIONS ---
  LP_Start --> LP1 --> LP2 --> LP3 --> LP4 --> LP5 --> LP6 --> LP7
  %% Initial Creation Routing
  LP7 -- "Need time / Hold" --> LP8
  LP7 -- "Ready to host" --> LP9
  %% On Hold Flow
  LP8 --> LP_Sync1 --> LP10
  LP10 -- "Agree to host" --> LP9
  LP10 -- "Cannot host" --> LP11
  %% Booked Flow
  LP9 --> LP_Sync2 --> LP12
  LP12 -- "Tour Finished" --> LP13
  LP12 -- "No-show / Issue" --> LP14
  %% Routing Terminal States to Final Sync & History
  LP11 --> LP_Sync3
  LP13 --> LP_Sync3
  LP14 --> LP_Sync3
  LP_Sync3 --> LP15 --> LP_End
  class LP_Start,LP_End startend;
  class LP7,LP10,LP12 decision;
```
