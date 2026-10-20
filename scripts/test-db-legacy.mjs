import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// This destructive reset is restricted to the isolated local test database.
// No caller arguments, linked project, or remote URL can enter this runner.
if (process.env.SUPPORT_HUB_ISOLATED_DB_TEST !== '1') {
  console.error('Refusing to reset the local database. This command requires a disposable test stack.');
  console.error('Set SUPPORT_HUB_ISOLATED_DB_TEST=1 only after confirming that its local data can be erased.');
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
  ['--workdir', resetRoot, 'db', 'reset', '--local', '--yes', '--no-seed'],
  ['db', 'query', '--local', '--file', 'supabase/tests/fixtures/legacy_example.sql'],
  ['db', 'push', '--local', '--yes'],
  ['db', 'query', '--local', '--file', 'supabase/tests/fixtures/legacy-upgrade-assertions.sql'],
  ['test', 'db', '--local', 'supabase/tests/database'],
];
for (const args of steps) {
  console.log(`Local legacy upgrade: supabase ${args.join(' ')}`);
  // npm passes its executable path to scripts. Launch its JS CLI through Node
  // to avoid shell interpolation and Windows .cmd spawning differences.
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'exec', '--yes',
    '--package=supabase@2.121.0', '--', 'supabase', ...args], { stdio: 'inherit' });
  if (result.error) {
    console.error('Unable to run the local Supabase test command.');
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
