-- Persist only state already used by the existing application. No new business lifecycle.
ALTER TABLE public.matching_sessions ADD COLUMN status varchar(10) NOT NULL DEFAULT 'active'
  CHECK (status IN ('active','closed'));
ALTER TABLE public.explore_interactions
  ADD COLUMN client_event_id varchar(128);
CREATE UNIQUE INDEX explore_event_idempotency ON public.explore_interactions(session_id,client_event_id)
  WHERE client_event_id IS NOT NULL;
ALTER TABLE public.agency_preference_profiles
  ADD COLUMN matching_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN affinity_tags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN baseline_preference_weights jsonb;
UPDATE public.agency_preference_profiles SET baseline_preference_weights=preference_weights;

CREATE SCHEMA hab_runtime;
REVOKE ALL ON SCHEMA hab_runtime FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA hab_runtime TO hab_app;
CREATE TABLE hab_runtime.auth_rate_limits (
  runtime_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(64) NOT NULL,
  at bigint NOT NULL
);
CREATE INDEX auth_rate_limits_key_at ON hab_runtime.auth_rate_limits(key,at);
ALTER TABLE hab_runtime.auth_rate_limits ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON hab_runtime.auth_rate_limits TO hab_app;
CREATE POLICY trusted_server ON hab_runtime.auth_rate_limits TO hab_app USING (true) WITH CHECK (true);

-- Existing multi-table services validate an aggregate and commit it atomically. Foreign keys
-- remain enforced at COMMIT, including registration/provider circular references.
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT conrelid::regclass AS relation,conname FROM pg_constraint
    WHERE contype='f' AND connamespace='public'::regnamespace
  LOOP EXECUTE format('ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY IMMEDIATE',item.relation,item.conname); END LOOP;
END $$;

-- This login is server-only. Browser roles have no table grants. Per-account scope stays in
-- the existing canonical SessionContext/service guards; it is not Supabase Auth/JWT identity.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO hab_app;
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS hab_server_read ON public.%I',item.tablename);
    EXECUTE format('CREATE POLICY hab_server_read ON public.%I FOR SELECT TO hab_app USING (true)',item.tablename);
    IF item.tablename NOT IN ('roles','permissions','role_permissions') THEN
      EXECUTE format('GRANT INSERT,UPDATE,DELETE ON public.%I TO hab_app',item.tablename);
      EXECUTE format('DROP POLICY IF EXISTS hab_server_write ON public.%I',item.tablename);
      EXECUTE format('CREATE POLICY hab_server_write ON public.%I TO hab_app USING (true) WITH CHECK (true)',item.tablename);
    END IF;
  END LOOP;
END $$;
