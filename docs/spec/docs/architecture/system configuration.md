# System Configuration

Proposed implementation architecture for the Plan step; technology choices are not yet an implementation commitment. Engines are logical modules in one backend, not separately deployed microservices. Admin is one actor with HDT/UBND subtypes. Authentication uses an opaque server-side session; lifetime and transport are Plan decisions, not JWT assumptions. Private legal/chat documents use authenticated storage and permission-checked access. SMS, VNAT lookup, escrow and E2EE are not MVP integrations.


```mermaid
graph TD
  classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
  classDef external fill:#F9F9F9,stroke:#000000,stroke-width:1.5px,stroke-dasharray: 5 5,color:#000000;
  classDef database fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
  classDef scheduler fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,stroke-dasharray: 3 3,color:#000000;
  subgraph Legend ["Legend"]
    direction LR
    L1["Internal Component"]
    L2["External Service (Outbound HTTPS)"]:::external
    L3["Database / Storage"]:::database
    L4["Background Worker / Scheduler"]:::scheduler
  end

  subgraph Client_Tier ["1. Client Tier (Untrusted Network)"]
    direction LR
    Guest["Guest<br/>(No Auth)"]
    Agency["Tour Agency"]
    Provider["Local Provider"]
    Admin["Admin (HDT / UBND)"]
  end

  subgraph Presentation_Tier ["2. Presentation Tier (Vercel)"]
    direction TB
    UI["React / Next.js Web UI<br/>(Responsive Web)<br/>(Google Maps SDK Integration)"]
  end

  subgraph Backend_Trust_Boundary [" 3. 🔒 Trusted Backend Boundary"]
    direction TB
    subgraph Logic_Tier ["3. Logic Tier (Backend Hosting)"]
      direction TB
      API["Node.js Backend API<br/>(Routing & Rate Limiting)"]
      AuthLayer["Auth & RBAC Validator<br/>(Token + Role + Account Status + Data Scope)<br/>(Periodic Re-validation Every 5min)"]
      CoreEngine["Core Business Engine<br/>(Profile / Booking / Schedule / Availability / Chat / Admin)"]
      AIEngine["AI Matching & Explore Learning Engine<br/>(Intent / Matching / Preference / Ranking / Description Refinement)"]
      Worker["Background Worker / Scheduler<br/>(72h Hold Expiry / Nightly Time Decay / KPI Evaluation & Tuning)"]:::scheduler
    end
    subgraph Data_Tier ["4. Data Tier"]
      direction TB
      DB["PostgreSQL<br/>(Relational DB<br/>+ notifications / audit metadata)"]:::database
      Cache["In-Memory Cache<br/>(Public-safe Data / node-cache)"]:::database
    end
  end

  subgraph External_Services ["5. 3rd Party Integrations (External)"]
    direction TB
    Cloudinary["Cloudinary<br/>(Image Upload / Optimization / Crop Preview)"]:::external
    OpenAI["OpenAI API<br/>(LLM / Intent Extraction / Description Refinement)"]:::external
    GoogleMaps["Google Maps API<br/>(Maps / Coordinates / Route & Distance)"]:::external
    MailService["Email Delivery Service<br/>(Resend / SMTP via Nodemailer)<br/>(Registration OTP / Reset Link / Credentials / Approval Email)"]:::external
    PrivateStore["Private Object Storage<br/>(Legal / Chat files)"]:::external
  end

  %% Client → Presentation
  Guest -.->|"Unauthenticated Request"| UI
  Agency -->|"Authenticated Request"| UI
  Provider -->|"Authenticated Request"| UI
  Admin -->|"Authenticated Request"| UI

  %% Presentation → Backend
  UI -->|"HTTPS / REST<br/>(Opaque server-side session)"| API

  %% Public requests
  API -->|"Public Requests<br/>(Rate-Limited / No Auth)"| Cache
  Cache -->|"Cache Hit"| API
  Cache -->|"Cache Miss"| CoreEngine

  %% Protected requests
  API -->|"Protected Requests"| AuthLayer

  %% Authentication & RBAC
  AuthLayer <-->|"Account Status / Role / Permission / Data Scope"| DB
  AuthLayer -->|"Authorized Business Request"| CoreEngine
  AuthLayer -->|"Authorized AI Request"| AIEngine

  %% Core business
  CoreEngine <-->|"Read / Write (ACID)"| DB
  CoreEngine <-->|"Read / Write Public-safe Cached Data"| Cache

  %% AI / Matching / Learning Loop
  AIEngine <-->|"Read / Write"| DB
  AIEngine <-->|"Read / Write Preference / Ranking Cache"| Cache

  %% Background jobs
  Worker -->|"72h Booking Hold Expiry"| CoreEngine
  Worker -->|"Nightly Time Decay"| AIEngine
  Worker -->|"Weekly / Monthly KPI Evaluation & Tuning"| AIEngine
  CoreEngine -->|"Upload / Optimize / Crop Preview<br/>(16:9 or 4:3 accepted)"| Cloudinary

  %% AI services
  AIEngine -->|"Intent Extraction / LLM /<br/>Description Refinement"| OpenAI

  %% Map display from frontend
  UI -->|"Map Display / Coordinates"| GoogleMaps

  %% Route & distance calculation for Matching
  AIEngine -->|"Route & Distance Calculation"| GoogleMaps

  %% Transactional emails (auth-related: reset link, credentials, approval status)
  AuthLayer -->|"Transactional Email<br/>(Registration OTP / Reset Link / Credentials / Approval Status)"| MailService
  CoreEngine -->|"Private file upload / signed access"| PrivateStore
  CoreEngine -->|"Create in-app notification records"| DB
```
