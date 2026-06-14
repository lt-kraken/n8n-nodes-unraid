import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import n8nNodesBase from 'eslint-plugin-n8n-nodes-base';
import * as jsoncParser from 'jsonc-eslint-parser';

export default tseslint.config(
	{
		ignores: ['dist/**', 'node_modules/**', '*.js', '*.mjs', '*.d.ts'],
	},

	// Base JS + TypeScript recommended rules — TypeScript source only.
	{
		files: ['**/*.ts'],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
	},

	// n8n community-package checks (run against package.json).
	{
		files: ['package.json'],
		languageOptions: { parser: jsoncParser },
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: n8nNodesBase.configs.community.rules,
	},

	// n8n node-file conventions.
	{
		files: ['nodes/**/*.ts'],
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: n8nNodesBase.configs.nodes.rules,
	},

	// n8n credential-file conventions.
	{
		files: ['credentials/**/*.ts'],
		plugins: { 'n8n-nodes-base': n8nNodesBase },
		rules: {
			...n8nNodesBase.configs.credentials.rules,
			// This rule camelCases the documentationUrl *value* — correct for built-in
			// nodes that reference internal doc keys, but wrong for community nodes,
			// which must use a real HTTP URL (enforced by `...-not-http-url`).
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
		},
	},
);
