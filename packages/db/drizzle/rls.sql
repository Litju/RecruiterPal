-- Row Level Security: tenant isolation enforced by PostgreSQL itself.
-- Application runtime connects as `rp_app`; service paths use explicit
-- backend roles only. Fail closed: unset tenant setting yields zero rows.

--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rp_app') THEN
    CREATE ROLE rp_app LOGIN PASSWORD NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rp_migrator') THEN
    CREATE ROLE rp_migrator NOLOGIN;
  END IF;
END
$$;

--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO rp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rp_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rp_app;

--> statement-breakpoint

-- Enable + force RLS on every tenant-owned table.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'memberships','jobs','hiring_protocols','hiring_protocol_versions',
    'competencies','protocol_competencies','candidates','applications','application_stage_events',
    'application_obligations','interviews','interview_participants','scorecard_templates',
    'scorecards','scorecard_ratings','evidence_observations','evidence_artifacts',
    'decision_readiness_snapshots','decision_records','communication_threads','messages',
    'extracted_facts','availability_windows','calendar_events','exceptions','approvals','actions',
    'workflow_instances','workflow_obligations','integration_connections','external_object_links',
    'outbox_events','domain_events','audit_records','agent_sessions',
    'agent_action_proposals','agent_feedback','protected_demographics'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = NULLIF(current_setting(''rp.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = NULLIF(current_setting(''rp.organization_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END
$$;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

-- Foreign keys do not inherit RLS. sync_cursors is protected through its
-- immutable integration_connections owner relationship.
ALTER TABLE sync_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_cursors FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sync_cursor_isolation ON sync_cursors;
CREATE POLICY sync_cursor_isolation ON sync_cursors
  USING (EXISTS (
    SELECT 1 FROM integration_connections c
    WHERE c.id = sync_cursors.connection_id
      AND c.organization_id = NULLIF(current_setting('rp.organization_id', true), '')::uuid
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM integration_connections c
    WHERE c.id = sync_cursors.connection_id
      AND c.organization_id = NULLIF(current_setting('rp.organization_id', true), '')::uuid
  ));

--> statement-breakpoint

-- organizations rows are visible when the session tenant matches the org id.
DROP POLICY IF EXISTS org_self_isolation ON organizations;
CREATE POLICY org_self_isolation ON organizations
  USING (id = NULLIF(current_setting('rp.organization_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('rp.organization_id', true), '')::uuid);

--> statement-breakpoint

-- users: an authenticated member may see co-members of their organization only.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_same_org ON users;
CREATE POLICY users_same_org ON users
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = users.id
        AND m.organization_id = NULLIF(current_setting('rp.organization_id', true), '')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = users.id
        AND m.organization_id = NULLIF(current_setting('rp.organization_id', true), '')::uuid
    )
  );

--> statement-breakpoint

-- sessions/accounts/verifications are user-owned; restrict to session user via rp.user_id.
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS sessions_owner ON sessions';
  EXECUTE 'CREATE POLICY sessions_owner ON sessions USING (user_id::text = NULLIF(current_setting(''rp.user_id'', true), '''')) WITH CHECK (user_id::text = NULLIF(current_setting(''rp.user_id'', true), ''''))';

  EXECUTE 'DROP POLICY IF EXISTS accounts_owner ON accounts';
  EXECUTE 'CREATE POLICY accounts_owner ON accounts USING (user_id::text = NULLIF(current_setting(''rp.user_id'', true), '''')) WITH CHECK (user_id::text = NULLIF(current_setting(''rp.user_id'', true), ''''))';

  EXECUTE 'DROP POLICY IF EXISTS verifications_owner ON verifications';
  EXECUTE 'CREATE POLICY verifications_owner ON verifications USING (NULLIF(current_setting(''rp.user_id'', true), '''') IS NOT NULL) WITH CHECK (NULLIF(current_setting(''rp.user_id'', true), '''') IS NOT NULL)';
END
$$;

--> statement-breakpoint

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications FORCE ROW LEVEL SECURITY;
