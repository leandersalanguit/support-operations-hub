import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// This destructive reset is restricted to the isolated local test database.
// No caller arguments, linked project, or remote URL can enter this runner.
if (process.env.SUPPORT_HUB_ISOLATED_DB_TEST !== '1') {
  console.error('Refusing to reset the local database. This command requires a disposable test stack.');
  console.error('Set SUPPORT_HUB_ISOLATED_DB_TEST=1 only after confirming that its local data can be erased.');
  process.exit(1);
}
const config = readFileSync('supabase/config.toml', 'utf8');
const projectId = config.match(/^project_id\s*=\s*"([^"]+)"\s*$/m)?.[1];
if (!projectId || !/^[A-Za-z0-9_-]+$/.test(projectId)) {
  console.error('Refusing to run legacy database tests with an invalid local project ID.');
  process.exit(1);
}
// CLI 2.121 requires --version to name an existing migration. Use a temporary
// workdir with the same local project config and no app migrations for the reset.
const resetRoot = mkdtempSync(join(tmpdir(), 'support-hub-legacy-test-'));
mkdirSync(join(resetRoot, 'supabase', 'migrations'), { recursive: true });
copyFileSync('supabase/config.toml', join(resetRoot, 'supabase', 'config.toml'));
process.on('exit', () => {
  // Remove only the exact files and empty directories this runner created.
  try {
    unlinkSync(join(resetRoot, 'supabase', 'config.toml'));
    rmdirSync(join(resetRoot, 'supabase', 'migrations'));
    rmdirSync(join(resetRoot, 'supabase'));
    rmdirSync(resetRoot);
  } catch {
    // The CLI may create its own diagnostic state. Never recursively remove it.
  }
});
const steps = [
  { kind: 'cli', args: ['--workdir', resetRoot, 'db', 'reset', '--local', '--yes', '--no-seed'] },
  { kind: 'sql', file: 'sql/supabase/tests/fixtures/legacy_example.sql' },
  { kind: 'cli', args: ['db', 'push', '--local', '--yes'] },
  { kind: 'sql', file: 'sql/supabase/tests/fixtures/legacy-upgrade-assertions.sql' },
  { kind: 'cli', args: ['test', 'db', '--local', 'sql/supabase/tests/database'] },
];
for (const step of steps) {
  let result;
  if (step.kind === 'sql') {
    console.log(`Local legacy upgrade: docker exec supabase_db_${projectId} psql < ${step.file}`);
    result = spawnSync('docker', ['exec', '-i', `supabase_db_${projectId}`,
      'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
      input: readFileSync(step.file),
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  } else {
    console.log(`Local legacy upgrade: supabase ${step.args.join(' ')}`);
    // npm passes its executable path to scripts. Launch its JS CLI through Node
    // to avoid shell interpolation and Windows .cmd spawning differences.
    result = spawnSync(process.execPath, [process.env.npm_execpath, 'exec', '--yes',
      '--package=supabase@2.121.0', '--', 'supabase', ...step.args], { stdio: 'inherit' });
  }
  if (result.error) {
    console.error('Unable to run the local Supabase test command.');
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
