DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ledger_events'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS ledger_profile_prev_hash_uq
      ON ledger_events (profile_id, prev_hash);
  ELSE
    RAISE EXCEPTION 'ledger_events table must exist before applying 0000_security_hardening.sql';
  END IF;
END $$;
