import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', '.astro/', '.wrangler/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  prettier,
  {
    files: ['*.{js,mjs}', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
);
