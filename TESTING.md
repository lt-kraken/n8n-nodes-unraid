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

- [ ] n8n version: `____`
- [ ] Node.js version: `____`
- [ ] Unraid version: `____`
- [ ] Unraid GraphQL API enabled and reachable
- [ ] Date verified: `____` · Verified by: `____`

## Connection & credentials

- [ ] Credential **Test** succeeds with a valid API key
- [ ] Invalid API key / wrong URL fails cleanly with a readable error
- [ ] **Allow Unauthorized Certificates** works against an HTTPS Unraid using a self-signed cert
- [ ] Server URL with a trailing slash is handled (no double `//graphql`)

## Read operations (control level: Read)

- [ ] Docker — Get Many
- [ ] Docker — Get
- [ ] Array — Get Status
- [ ] Array — Get Disks
- [ ] Array — Get Shares
- [ ] Array — Get Parity History
- [ ] Disk — Get Many
- [ ] System — Get Info
- [ ] System — Get Metrics
- [ ] System — Get Online Status
- [ ] System — Get UPS Status
- [ ] System — Get Server Status
- [ ] System — Get Flash Info
- [ ] System — Get Registration
- [ ] System — Get Config
- [ ] VM — Get Many
- [ ] Notification — Get Many (Unread / Archived / All)
- [ ] Notification — Get Many honours importance filter, limit and offset
- [ ] Notification — Get Overview

## Control operations (control level: Control)

- [ ] Docker — Start (container state actually changes)
- [ ] Docker — Stop
- [ ] Docker — Restart
- [ ] Docker — Pause
- [ ] Docker — Unpause
- [ ] Array — Start
- [ ] VM — Start
- [ ] VM — Stop
- [ ] VM — Restart
- [ ] VM — Pause
- [ ] VM — Resume
- [ ] VM — Reboot
- [ ] Notification — Create (appears in the Unraid UI)
- [ ] Notification — Archive
- [ ] Notification — Archive All

## Destructive operations (control level: Full — test on disposable targets)

- [ ] Array — Stop (on a test array / with data safe)
- [ ] VM — Force Stop (on a disposable VM)
- [ ] Notification — Delete

## Safety gating (the core protection)

- [ ] Default credential (**Read**): a control op (e.g. Docker Start) is blocked with the level error message
- [ ] Default credential (**Read**): a destructive op is blocked
- [ ] Credential **Control**: control ops work; destructive ops still blocked
- [ ] Credential **Full**: destructive ops work
- [ ] Node **Maximum Control Level = Control** on a **Full** credential → destructive blocked at that node only
- [ ] Node level cannot exceed credential (**Control** credential + **Full** node → destructive still blocked)

## AI Agent (`usableAsTool`)

- [ ] Node attached to an AI Agent runs a read op end-to-end
- [ ] Agent tool node pinned to **Control** is blocked from a destructive op
- [ ] Agent honours the credential ceiling even when asked to do more

## Robustness

- [ ] **Continue On Fail** returns the error in the output instead of aborting the workflow
- [ ] Operating on a non-existent container / VM / notification ID fails gracefully
- [ ] A GraphQL partial-data + errors response returns the data rather than hard-failing
