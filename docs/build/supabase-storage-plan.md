# Supabase Storage implementation plan

Use a private `hab-private` bucket through the Storage HTTP API, independent of the disabled database Data API. Backend-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are required. Keep the current opaque session, authorization services and media/attachment API URLs. Do not expose documents, avatars or Chat attachments through public buckets. No new dependencies.

Replace local live byte reads/writes with one async object-store adapter. Keep disk/memory fixtures for automated tests only, with no live fallback. Validate upload formats and preserve compensating cleanup when a metadata transaction fails. Import existing real upload bytes before removing any local files (retain the originals). Add illustrative, credited craft photographs for seed gallery records; do not fabricate business certificates or portray stock images as proof of verification. Test role access and image responses on localhost. No GitHub push.
