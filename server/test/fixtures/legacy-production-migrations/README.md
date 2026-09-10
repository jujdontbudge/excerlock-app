These two SQL files are exact immutable captures of the migrations applied to
the production GCP Postgres database before the forward compatibility bridge:

- `0006_supabase_sync.sql` from commit `dc75a681`, SHA-256 `7617ba2ffdf55b53dbe815b67865b3f7c0a90f6e918422bf7fb36538e64559ce`
- `0007_support_details_and_history.sql` from commit `b8a12fba`, SHA-256 `187009a3598a3abad3b6c603ef632b0fd706e46e875e6101d7220a645e8e0187`

The compatibility test also pins the deployed journal timestamps and hashes.
These fixtures model applied history; do not edit them to match newer schema.
