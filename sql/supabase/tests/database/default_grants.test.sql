BEGIN;
SELECT plan(6);

CREATE TABLE public.synthetic_future_object (id integer);
CREATE VIEW public.synthetic_future_view AS SELECT id FROM public.synthetic_future_object;
CREATE FUNCTION public.synthetic_future_function() RETURNS boolean LANGUAGE sql AS 'SELECT true';

SELECT ok(NOT has_table_privilege('anon', 'public.synthetic_future_object', 'SELECT'), 'future table is not anonymous-readable by default');
SELECT ok(NOT has_table_privilege('authenticated', 'public.synthetic_future_object', 'SELECT'), 'future table needs explicit staff grants');
SELECT ok(NOT has_table_privilege('anon', 'public.synthetic_future_view', 'SELECT'), 'future view is not anonymous-readable by default');
SELECT ok(NOT has_table_privilege('authenticated', 'public.synthetic_future_view', 'SELECT'), 'future view needs explicit staff grants');
SELECT ok(NOT has_function_privilege('anon', 'public.synthetic_future_function()', 'EXECUTE'), 'future function is not anonymous-callable by default');
SELECT ok(NOT has_function_privilege('authenticated', 'public.synthetic_future_function()', 'EXECUTE'), 'future function needs explicit staff execution grants');

SELECT * FROM finish();
ROLLBACK;
