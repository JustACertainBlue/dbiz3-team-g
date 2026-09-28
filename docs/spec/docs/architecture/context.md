# Context Diagram

Current integration context. Admin is one actor; HDT/UBND are permission subtypes. The system boundary includes application UI/backend and its owned data. External integrations exchange only the data required for their existing functions. The original DOCX is retained as a historical business-context source.

```mermaid
flowchart LR
  Guest["Guest"]
  Agency["Tour Agency"]
  Provider["Local Provider"]
  Admin["Admin — subtype HDT / UBND"]
  subgraph Boundary["Hanoi Artisan Bridge system boundary"]
    App["Application UI and backend"]
    Data[("Owned database, notification records and private document references")]
    App <--> Data
  end
  Guest <-->|"Public catalog / Agency registration / email verification"| App
  Agency <-->|"Explore / matching / profile / quote / chat / own booking reads"| App
  Provider <-->|"Own profile / Experience / chat / booking / calculated schedule"| App
  Admin <-->|"Subtype-scoped account/review actions / read-only profiles / dashboard"| App
  App <-->|"Registration OTP / reset links / credentials / review notifications"| Email["Email delivery service"]
  App <-->|"Intent extraction / description drafts / AI results or failure"| AI["AI service"]
  App <-->|"Maps / coordinates / route and distance"| Maps["Maps service"]
  App <-->|"Image upload / optimized media"| Media["Media service"]
  App <-->|"Private legal/chat files"| PrivateStore["Private object storage"]
```

Private legal/chat files are stored in private object storage with permission-checked access; the database stores metadata and storage keys, not file binaries. Registration/review/booking events may create in-app notifications stored in the application database. Storage provider, realtime transport and notification delivery details are Plan decisions. No SMS, VNAT verification, escrow, payment gateway or end-to-end-encryption integration is claimed by this MVP.
