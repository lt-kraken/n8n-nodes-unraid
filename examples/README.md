# Example workflows

Importable n8n workflows you can use to validate the node against your own Unraid server.

## `read-verification.workflow.json` — self-asserting read smoke test

Runs **every read-only operation once** (Docker, Array, Disk, System, VM, Notification —
including `Docker: Get` by a live container ID), then a Code node (**Assert read outcomes**)
checks the actual shape/values of each result and **fails the run** if any hard check fails.
It's read-only: it never starts, stops, or deletes anything.

### How to use

1. In n8n: **Workflows → Import from File** and choose `read-verification.workflow.json`.
2. The Unraid nodes need a credential — select your **Unraid API** credential on the nodes
   (the file ships without one, so nothing is tied to a specific instance).
   Your credential's *Maximum Control Level* of `Read` is enough; this workflow needs nothing more.
3. Click **Test workflow**. Open the **Assert read outcomes** node to see the report:

   ```json
   { "success": true, "total": 18, "passed": 18, "failed": 0, "warnings": 2, "checks": [ ... ] }
   ```

A red run means a read returned the wrong shape — the error message names the failing checks.

### Notes

- **Warnings, not failures:** `System: Get UPS Status` with no UPS attached, and `VM: Get Many`
  with no VMs defined, are reported as warnings (the read path works, there's just nothing to
  return). The UPS check accepts both the older error payload and the newer `{ connected: false }`.
- **No destructive operations.** Control/destructive operations (start/stop/restart, array
  stop, VM force-stop, delete) are intentionally **not** included here — verify those manually
  per [`../TESTING.md`](../TESTING.md), on disposable targets. A one-click destructive workflow
  is exactly the footgun the node's safe-by-default control levels are meant to prevent.
- The export contains no server data — node definitions and assertions only.
