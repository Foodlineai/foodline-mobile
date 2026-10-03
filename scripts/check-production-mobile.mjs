import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceRoots = ['src/app', 'src/components', 'src/features', 'src/lib'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const failures = [];

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const sourceFiles = sourceRoots
  .flatMap((directory) => filesUnder(join(root, directory)))
  .filter((path) => extensions.has(path.slice(path.lastIndexOf('.'))))
  .filter((path) => !path.endsWith('database.types.ts'));

function prohibit(label, pattern, files = sourceFiles) {
  for (const path of files) {
    const source = readFileSync(path, 'utf8');
    if (pattern.test(source)) failures.push(`${relative(root, path)}: ${label}`);
  }
}

// WorkOS is allowed to open its hosted authentication session. Product
// workflows must stay native and may not hand their core work back to the ERP.
prohibit('core workflow links out to the web ERP', /\bopenLiveErp\b|<LiveErpFlow\b|Continue in (?:the )?(?:live )?ERP/i);
prohibit('demo runtime is forbidden in customer builds', /EXPO_PUBLIC_DEMO_MODE|demo-adapter|\bdemoAdapter\b/i);
prohibit('user-visible legacy AI name "Nova" is forbidden', /\bNova\b/);
prohibit(
  'placeholder backend configuration is forbidden',
  /your[-_ ]?project\.supabase|placeholder-project\.supabase|EXPO_PUBLIC_[A-Z_]+\s*[:=]\s*["']?YOUR_/i,
);

const apiIndex = readFileSync(join(root, 'src/lib/api/index.ts'), 'utf8');
if (!/export const api:\s*FoodlineApi\s*=\s*supabaseApi/.test(apiIndex)) {
  failures.push('src/lib/api/index.ts: production API must be the live Supabase adapter');
}

const home = readFileSync(join(root, 'src/app/(app)/(tabs)/index.tsx'), 'utf8');
if (!/api\.home\.summary\(companyId\)/.test(home)) {
  failures.push('src/app/(app)/(tabs)/index.tsx: Home must load the live home summary contract');
}

const adapter = readFileSync(join(root, 'src/lib/api/supabase-adapter.ts'), 'utf8');
const homeAdapter = adapter.match(/\n\s{2}home:\s*\{([\s\S]*?)\n\s{2}hub:\s*\{/u)?.[1] ?? '';
if (!/get_current_operational_dashboard/.test(homeAdapter)) {
  failures.push('src/lib/api/supabase-adapter.ts: Home must map get_current_operational_dashboard');
}

if (failures.length > 0) {
  console.error('Production mobile hygiene failed:\n');
  for (const failure of [...new Set(failures)].sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Production mobile hygiene passed.');
