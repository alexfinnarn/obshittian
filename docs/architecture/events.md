# Events

This page is retained as a pointer only.

The event bus contract now lives in [overview.md](overview.md) so startup flow and event ownership stay documented together.

Important current contracts:

- `file:open`: `{ path: string; openInNewTab?: boolean }`
- `file:save`: `void`

For persistence and tag-index implications, see [../reference/storage-contracts.md](../reference/storage-contracts.md).
