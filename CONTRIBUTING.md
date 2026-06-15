# Contributing to n8n-nodes-unraid

Thanks for taking the time to contribute!

## Getting Started

```bash
git clone https://github.com/lt-kraken/n8n-nodes-unraid.git
cd n8n-nodes-unraid
npm install
npm run build
```

To test against a local n8n instance, symlink the package:

```bash
cd ~/.n8n/custom
npm link /path/to/n8n-nodes-unraid
```

Then restart n8n — the Unraid node will appear in the node palette.

## Project Structure

```
credentials/          Credential definition (server URL + API key)
nodes/Unraid/
  Unraid.node.ts      Main node — resource routing + execute logic
  GenericFunctions.ts GraphQL HTTP helper
  descriptions/       n8n UI definitions (operations + fields) per resource
  queries/            GraphQL query and mutation strings per resource
```

## Adding a New Operation

1. Add the GraphQL query/mutation to the relevant file in `queries/`.
2. Add the operation option and any new fields to the relevant file in `descriptions/`.
3. Add the execute branch in `Unraid.node.ts` under the correct resource block.
4. **Classify its risk** in `nodes/Unraid/operations.ts`. Anything that changes server
   state must be listed as `control`, and anything destructive (irreversible or data-losing)
   as `destructive`. Read-only operations need no entry. This is what gates the operation
   behind the credential/node control level.
5. Run `npm run build` and test locally.

## Adding a New Resource

Follow the same pattern as an existing resource (e.g. `docker`):

- Create `descriptions/<Resource>Description.ts` exporting `<resource>Operations` and `<resource>Fields`.
- Create `queries/<resource>.queries.ts` exporting query/mutation strings.
- Import and spread both into `Unraid.node.ts`.
- Add the resource option to the `resource` dropdown in `Unraid.node.ts`.
- Add the execute block to the `execute` method.

## Code Style

- TypeScript strict mode is enabled — no `any` types.
- Run `npm run lint` before submitting a PR.
- Keep GraphQL queries in `queries/` — no inline query strings in the node file.

## Testing

- Run the unit tests with `npm test` (Vitest). CI runs lint, tests, and build on every PR.
- Add or update tests in `test/` when you change routing or gating behaviour. New
  state-changing operations should have a test confirming they're blocked below their
  required control level.
- For end-to-end changes, work through the relevant section of [`TESTING.md`](./TESTING.md)
  against a real Unraid server and tick off what you verified in your PR.

## Submitting a PR

- One feature or fix per PR.
- Include a brief description of what changed and why.
- If you're adding a new operation, mention which Unraid API version it requires.

## Reporting Bugs

Open an issue at https://github.com/lt-kraken/n8n-nodes-unraid/issues with:
- Your Unraid version
- Your n8n version
- The operation that failed
- The error message or unexpected output
