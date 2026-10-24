import fs from 'node:fs';
import path from 'node:path';

const assetsPath = path.resolve('dist/assets');
const forbiddenPatterns = [
  /GOOGLE_SHEETS_SECRET_TOKEN/,
  /GOOGLE_SHEETS_WORKER_SECRET/,
  /GOOGLE_SHEETS_WEBAPP_URL/,
  /script\.google\.com\/macros\/s\//,
  /\b[a-f0-9]{64}\b/i,
];

if (!fs.existsSync(assetsPath)) {
  console.error('Build the browser app before checking the bundle.');
  process.exitCode = 1;
} else {
  const files = fs.readdirSync(assetsPath)
    .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
    .map((name) => path.join(assetsPath, name));
  const findings = [];

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    if (forbiddenPatterns.some((pattern) => pattern.test(contents))) findings.push(path.basename(file));
  }

  if (findings.length > 0) {
    console.error(`Server-only Google Sheets configuration found in: ${findings.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`Browser bundle secret scan passed (${files.length} asset files).`);
  }
}
