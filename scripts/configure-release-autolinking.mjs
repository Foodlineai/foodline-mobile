import { readFile, writeFile } from 'node:fs/promises';

if (process.env.NODE_ENV !== 'production') {
  throw new Error('Release autolinking may only be configured for a production build.');
}

const packageJsonPath = new URL('../package.json', import.meta.url);
const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
const expo = packageJson.expo ?? {};
const autolinking = expo.autolinking ?? {};
const android = autolinking.android ?? {};

packageJson.expo = {
  ...expo,
  autolinking: {
    ...autolinking,
    android: {
      ...android,
      exclude: [...new Set([
        ...(android.exclude ?? []),
        'expo-dev-client',
        'expo-dev-launcher',
        'expo-dev-menu',
      ])],
    },
  },
};

await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
