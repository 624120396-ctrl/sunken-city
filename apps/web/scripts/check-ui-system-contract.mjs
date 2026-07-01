import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, '..');

function readProjectFile(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assertContract(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const backgroundOptions = readProjectFile('src/components/background/backgroundOptions.ts');
const appBackground = readProjectFile('src/components/background/AppBackground.tsx');
const tokens = readProjectFile('src/styles/tokens-v2.css');
const backgroundCss = readProjectFile('src/styles/background-v2.css');
const systemCss = readProjectFile('src/styles/system-v2.css');
const surface = readProjectFile('src/components/system/Surface.tsx');
const systemIndex = readProjectFile('src/components/system/index.ts');

const expectedBackgroundProfiles = {
  'bg-vellum': 'luminous',
  'bg-sunken': 'balanced',
  'bg-ocean-blue': 'balanced',
  'bg-ruins-beige': 'luminous',
  'bg-deep-sea': 'dark',
  'bg-underwater-city': 'balanced',
  'bg-void-runes': 'dark',
};

assertContract(
  backgroundOptions.includes('BackgroundReadabilityProfile'),
  'Background options must define BackgroundReadabilityProfile.'
);

for (const [id, profile] of Object.entries(expectedBackgroundProfiles)) {
  const optionPattern = new RegExp(
    `id:\\s*['"]${id}['"][\\s\\S]*?readabilityProfile:\\s*['"]${profile}['"]`
  );

  assertContract(
    optionPattern.test(backgroundOptions),
    `Background "${id}" must use readabilityProfile "${profile}".`
  );
}

assertContract(
  appBackground.includes('data-bg-profile={selected.readabilityProfile}'),
  'AppBackground must expose selected.readabilityProfile as data-bg-profile.'
);

for (const tokenName of [
  '--coc-surface-page',
  '--coc-surface-panel',
  '--coc-surface-solid',
  '--coc-surface-glass',
  '--coc-surface-elevated',
  '--coc-surface-danger',
  '--coc-on-surface-primary',
  '--coc-on-surface-secondary',
  '--coc-accent-blood-surface',
]) {
  assertContract(tokens.includes(tokenName), `Missing design token ${tokenName}.`);
}

for (const profileSelector of [
  '[data-bg-profile="luminous"]',
  '[data-bg-profile="balanced"]',
  '[data-bg-profile="dark"]',
]) {
  assertContract(
    tokens.includes(profileSelector) || backgroundCss.includes(profileSelector),
    `Missing CSS profile selector ${profileSelector}.`
  );
}

for (const variant of ['page', 'panel', 'solid', 'glass', 'elevated', 'danger']) {
  assertContract(
    surface.includes(`'${variant}'`) && systemCss.includes(`data-variant="${variant}"`),
    `Surface variant "${variant}" must be typed and styled.`
  );
}

for (const component of ['PageShell', 'ReadablePanel', 'ActionCard', 'DataCard']) {
  const componentPath = join(root, `src/components/system/${component}.tsx`);
  assertContract(existsSync(componentPath), `Missing system component ${component}.tsx.`);
  assertContract(
    systemIndex.includes(`export { ${component}`),
    `System index must export ${component}.`
  );
}

console.log('UI system contract check passed.');
