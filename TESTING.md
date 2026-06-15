# Manual verification checklist

This is the live record of what has actually been verified by hand, and in which
environment. It is deliberately specific so you can see exactly what is and isn't covered —
rather than relying on a vague "it works for me." Automated unit tests (run with
`npm test`) cover the GraphQL client and the node's routing/gating logic; this checklist
covers end-to-end behaviour against a real Unraid server.

Tick a box only once you have verified it yourself. Copy the **Environment** block for each
fresh test pass so the history is preserved.

> ⚠️ Destructive operations (array stop, VM force-stop, notification delete) genuinely
> change or remove things on your server. Test them deliberately, on disposable targets,
> with your data safe.

## Environment

Versions and host identifiers are intentionally left blank to avoid publishing details
about a specific server. The Read operations below were confirmed against a live Unraid
host using the self-asserting workflow ([`examples/read-verification.workflow.json`](./examples/read-verification.workflow.json)),
which checks the actual result of each read and records nothing about the server.

- [x] Unraid GraphQL API enabled and reachable
- [x] n8n version: `2.25.X`
- [x] Node.js version: `22.XX.XX`
- [x] Unraid version: `7.3.X`
- [x] Date verified: `2026-06-15` · Verified by: `maintainer`

## Connection & credentials

- [x] Credential authenticates with a valid API key (every live read call succeeded)
- [x] Invalid API key / wrong URL fails cleanly with a readable error
    > API key validation failed
    
    > The service refused the connection - perhaps it is offline
- [x] **Allow Unauthorized Certificates** works against an HTTPS Unraid using a self-signed cert
- [x] Server URL with a trailing slash is handled (no double `//graphql`)

## Read operations (control level: Read)

Verified end-to-end by the self-asserting workflow (assertions check each result's shape,
not its values — so no server specifics are recorded).

- [x] Docker — Get Many
- [x] Docker — Get _(by a live container ID; returned id matches)_
- [x] Array — Get Status
- [x] Array — Get Disks
- [x] Array — Get Shares
- [x] Array — Get Parity History
- [x] Disk — Get Many
- [x] System — Get Info
- [x] System — Get Metrics
- [x] System — Get Online Status
- [x] System — Get UPS Status
- [x] System — Get Server Status
- [x] System — Get Flash Info
- [x] System — Get Registration
- [x] System — Get Config
- [x] VM — Get Many _(empty list when no VMs defined — path verified)_
- [x] Notification — Get Many (Unread / Archived / All) 
- [x] Notification — Get Many honours importance filter, limit and offset
- [x] Notification — Get Overview

## Control operations (control level: Control)

- [x] Docker — Start (container state actually changes)
- [x] Docker — Stop
- [x] Docker — Restart
- [x] Docker — Pause
- [x] Docker — Unpause
- [ ] Array — Start 
    > gating verified (blocked below Control). Live start-from-stopped is not testable from a same-host n8n: whenever the array is stopped, Docker (and n8n) is down, so n8n can't issue the start. Mutation unchanged since 1.0.1.
- [x] VM — Start
- [x] VM — Stop
- [x] VM — Restart
- [x] VM — Pause
- [x] VM — Resume
- [ ] VM — Reboot
    > node behaves correctly; on this guest the API returned "graceful shutdown failed, please force stop" (guest OS didn't honour the ACPI request). Re-test on a guest with ACPI / guest agent enabled.
- [x] Notification — Create (appears in the Unraid UI)
- [x] Notification — Archive
- [x] Notification — Archive All

## Destructive operations (control level: Full — test on disposable targets)

- [x] Array — Stop
    > verified live: the array stops **gracefully**. On a same-host n8n the node reports a **504 / gateway timeout** even though the stop succeeds, because the n8n container goes offline before the response returns — so there's no clean success and no follow-up Start in the same workflow. Gating also verified (blocked below Full; no mutation sent when blocked). Identical to the Unraid UI Stop button; intended for remote orchestration or as the final step of a UPS shutdown.
- [x] VM — Force Stop (on a disposable VM)
- [x] Notification — Delete

## Safety gating (the core protection)

- [x] Default credential (**Read**): a control op (e.g. Docker Start) is blocked with the level error message
    > Operation "start" on "docker" requires control level "control", but the effective level is "read". Raise "Maximum Control Level" on the Unraid credential (and on the node, if set) to allow it.
- [x] Default credential (**Read**): a destructive op is blocked
    > Operation "stop" on "array" requires control level "full", but the effective level is "read". Raise "Maximum Control Level" on the Unraid credential (and on the node, if set) to allow it.
- [x] Credential **Control**: control ops work; destructive ops still blocked
    > Operation "delete" on "notification" requires control level "full", but the effective level is "control". Raise "Maximum Control Level" on the Unraid credential (and on the node, if set) to allow it.
- [x] Credential **Full**: destructive ops work
    > Verified with delete of a notification
- [x] Node **Maximum Control Level = Control** on a **Full** credential → destructive blocked at that node only
    > Operation "delete" on "notification" requires control level "full", but the effective level is "control". Raise "Maximum Control Level" on the Unraid credential (and on the node, if set) to allow it.
- [x] Node level cannot exceed credential (**Control** credential + **Full** node → destructive still blocked)
    > Operation "delete" on "notification" requires control level "full", but the effective level is "control". Raise "Maximum Control Level" on the Unraid credential (and on the node, if set) to allow it.
- [x] Node action cannot exceed token scope
    > Forbidden resource

## AI Agent (`usableAsTool`)

The control-level gate runs inside the node's `execute()`, so it applies identically no
matter who invokes the node — a manual run or an AI Agent. The live run below confirms the
agent's tool call goes through the node's `execute()` (the real Unraid node ran and returned
live data), which is exactly where the gate lives — so the "blocked / honours ceiling" rows
hold for the agent path too, and are additionally covered by the gating unit tests.

- [x] Node attached to an AI Agent runs a read op end-to-end
    > Verified live: an n8n AI Agent (Ollama `minimax-m3:cloud`) with the Unraid node wrapped in a `toolWorkflow` (a community node can't be attached as `ai_tool` directly) made a real tool call (`tool_calls.completed: 1`); the node returned the live container list and the agent summarised it accurately.
- [x] Agent tool node pinned to **Control** is blocked from a destructive op
    > by construction: the agent's tool call runs the node's `execute()` (confirmed by the live run above), where the level gate is enforced — unit-tested in `Unraid.execute — control level gating`.
- [x] Agent honours the credential ceiling even when asked to do more
    > by construction: `maxControlLevel` is read from the credential in `execute()` and applied as `min(node, credential)` on every call regardless of caller — unit-tested.

## Robustness

Covered by the automated unit-test suite (`npm test`) — deterministic, not dependent on
live server state.

- [x] **Continue On Fail** returns the error in the output instead of aborting the workflow
    > unit test: `Unraid.execute — error handling › continueOnFail captures the error as output instead of throwing`
- [x] Operating on a non-existent container / VM / notification ID fails gracefully
    > unit test: `Unraid.execute — Docker › get returns nothing when no container matches`; bogus ids on mutations surface a clean `NodeApiError` (caught by Continue On Fail when enabled)
- [x] A GraphQL partial-data + errors response returns the data rather than hard-failing
    > unit test: `unraidApiRequest › returns partial data when GraphQL errors arrive alongside data`
