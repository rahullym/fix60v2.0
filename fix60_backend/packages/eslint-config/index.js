const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');

/** Shared ESLint flat config (Airbnb-flavoured rules for TypeScript). */
module.exports = tseslint.config(
  { ignores: ['dist/**', '.next/**', 'drizzle/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'prefer-template': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='delete'][callee.object.name='db']",
          message: 'Soft delete only: set deletedAt instead of db.delete().',
        },
        {
          selector: "CallExpression[callee.property.name='delete'][callee.object.name='tx']",
          message: 'Soft delete only: set deletedAt instead of tx.delete().',
        },
      ],
    },
  },
);
