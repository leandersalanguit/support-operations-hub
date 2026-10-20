BEGIN;
SELECT plan(22);

SELECT ok(NOT has_table_privilege('anon', 'public.interactions', 'SELECT'), 'anonymous cannot read interactions');
SELECT ok(NOT has_table_privilege('anon', 'public.clients', 'SELECT'), 'anonymous cannot read clients');
SELECT ok(NOT has_table_privilege('anon', 'public.catalog_products', 'SELECT'), 'anonymous cannot read catalogs');
SELECT ok(NOT has_table_privilege('anon', 'public.marketing_resources', 'SELECT'), 'anonymous cannot read resources');
SELECT ok(NOT has_table_privilege('anon', 'public.interaction_audit_events', 'SELECT'), 'anonymous cannot read interaction audit');
SELECT ok(NOT has_table_privilege('authenticated', 'public.interaction_audit_events', 'INSERT'), 'staff cannot forge interaction audit rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.interaction_audit_events', 'UPDATE'), 'staff cannot update interaction audit rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.interaction_audit_events', 'DELETE'), 'staff cannot delete interaction audit rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.catalog_audit_logs', 'INSERT'), 'staff cannot forge catalog audit rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.interaction_edits_audit', 'INSERT'), 'staff cannot write legacy edit audit rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.deleted_interactions_audit', 'INSERT'), 'staff cannot write legacy delete audit rows');
SELECT ok(NOT has_table_privilege('authenticated', 'public.onboarding_sessions', 'SELECT'), 'unused onboarding sessions are not exposed');
SELECT ok(NOT has_table_privilege('anon', 'public.onboarding_sessions', 'SELECT'), 'anonymous cannot read unused onboarding sessions');
SELECT ok(NOT has_table_privilege('authenticated', 'private.staff_access', 'SELECT'), 'staff state table is private');
SELECT ok(NOT has_schema_privilege('authenticated', 'private', 'USAGE'), 'private schema has no browser usage');
SELECT ok(NOT has_function_privilege('authenticated', 'public.consume_password_change_attempt(uuid)', 'EXECUTE'), 'browser cannot consume password attempts');
SELECT ok(NOT has_function_privilege('authenticated', 'public.complete_required_password_change(uuid)', 'EXECUTE'), 'browser cannot clear password requirement');
SELECT ok(NOT has_function_privilege('anon', 'public.complete_required_password_change(uuid)', 'EXECUTE'), 'anonymous cannot clear password requirement');
SELECT ok(NOT has_function_privilege('anon', 'public.can_use_support_hub()', 'EXECUTE'), 'anonymous cannot call staff-state helper');
SELECT ok(NOT has_function_privilege('anon', 'public.rename_catalog_product(text,text,text)', 'EXECUTE'), 'anonymous cannot call catalog RPC');
SELECT ok(has_function_privilege('service_role', 'public.complete_required_password_change(uuid)', 'EXECUTE'), 'service role can complete password change');
SELECT ok(has_function_privilege('service_role', 'public.consume_password_change_attempt(uuid)', 'EXECUTE'), 'service role can consume password attempt');

SELECT * FROM finish();
ROLLBACK;
