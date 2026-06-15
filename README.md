# n8n-nodes-unraid

An n8n community node for the [Unraid](https://unraid.net) API. Manage Docker containers, VMs, array and disk health, notifications, and system metrics directly from your n8n workflows.

## Installation

In your n8n instance:

1. Go to **Settings → Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-unraid`
4. Agree to the risks and click **Install**

## Credentials

Create a new **Unraid API** credential with:

| Field                 | Description                                                              | Example                   |
| --------------------- | ------------------------------------------------------------------------ | ------------------------- |
| Server URL            | Your Unraid server URL including port                                    | `http://192.168.1.x:port` |
| API Key               | From Unraid **Settings → Management Access → API Key**                   |                           |
| Allow Unauthorized Certificates | Enable if your Unraid server uses a self-signed certificate     | `false`                   |
| Maximum Control Level | The highest level of operation any node using this credential may perform | `Read` (default)          |

## Safety & permissions

This node is **read-only by default**. Anything that changes your server — and especially
anything destructive — must be explicitly opted into. Permissions are layered so an
automation (or an AI Agent) can never do more than you allowed:

- **Maximum Control Level** on the **credential** is a hard ceiling tied to the API key.
  Default is `Read`.
- **Maximum Control Level** on the **node** can only *narrow* below the credential, never
  exceed it. Default is *Use Credential Default*.

The effective level for any run is the **lower** of the two. The three levels are:

| Level     | Allows                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------- |
| `Read`    | Status, lists, and metrics only. Cannot change server state.                                    |
| `Control` | Read **+** reversible changes: start/stop/restart/pause containers & VMs, start array, create/archive notifications. |
| `Full`    | Control **+** destructive ops: **stop the array**, **force-stop a VM**, **delete notifications**. |

If an operation needs a higher level than the effective one, the node fails with a clear
message instead of touching your server.

### Using it with an AI Agent

The node is marked `usableAsTool: true`, so an n8n AI Agent can drive it. The node cannot
tell whether a call came from the model or from you, so bound the model explicitly:

- Pin the AI Agent's Unraid tool node's **Maximum Control Level** to `Read` or `Control`, **or**
- Give the agent a separate credential scoped to `Read`/`Control`, and keep your `Full`
  credential for manual workflows.

> **Tip:** Treat the Unraid API key itself as the first layer — scope it to least privilege
> in Unraid. The control-level settings are a second layer, not a replacement.

## Resources & Operations

### Docker

| Operation | Description                        |
| --------- | ---------------------------------- |
| Get Many  | List all containers                |
| Get       | Get a single container by ID       |
| Start     | Start a container                  |
| Stop      | Stop a container                   |
| Restart   | Stop then start a container        |
| Pause     | Pause a running container          |
| Unpause   | Unpause a paused container         |

Start/Stop/Restart/Pause/Unpause require the `Control` level (see [Safety & permissions](#safety--permissions)).

### Array

| Operation          | Description                                        |
| ------------------ | -------------------------------------------------- |
| Get Status         | Array state, capacity, and parity check status     |
| Get Disks          | All array disks (parities, data, cache) with temp, I/O stats, and error counts |
| Get Shares         | All user shares                                    |
| Get Parity History | History of parity check runs                       |
| Start              | Start the array _(requires `Control`)_             |
| Stop               | Stop the array _(destructive — requires `Full`)_   |

> **⚠️ On a same-host n8n, Array Stop is self-terminating.** Stopping the array shuts down
> the Docker service, which stops **every container — including the n8n container running
> the workflow.** The array stops **gracefully**, but n8n goes offline before the response
> returns, so the node reports a **504 / gateway timeout even though the stop succeeded.**
> You can't chain a follow-up Start in the same workflow — start the array again from the
> Unraid UI (the standard recovery). No data is lost: Stop/Start only unmount/remount the
> array, identical to the UI buttons.
>
> **When Array Stop/Start make sense:**
> - **Remote orchestration** — an n8n instance running *off* the Unraid box (another
>   server/VPS, or one Unraid managing another) can stop/start an array safely.
> - **UPS-triggered safe shutdown** — pair `System → Get UPS Status` with `Array → Stop` as
>   the *final* step of a low-battery shutdown flow, where you don't need n8n afterward.
> - **Scheduled / post-maintenance startup** — `Array → Start` is safe and never
>   self-terminating; good for bringing the array back on a schedule or after an event.

### Disk

| Operation | Description              |
| --------- | ------------------------ |
| Get Many  | List all physical disks  |

### System

| Operation         | Description                                 |
| ----------------- | ------------------------------------------- |
| Get Info          | OS, CPU, RAM layout, and version info       |
| Get Metrics       | Live CPU % and memory usage (per-core)      |
| Get Online Status | Check whether the server is reachable       |
| Get UPS Status    | UPS device status, battery, and power info  |
| Get Server Status | Server status and access URLs               |
| Get Flash Info    | USB flash drive info                        |
| Get Registration  | Unraid license registration                 |
| Get Config        | System configuration validity               |

### VM

| Operation  | Description              |
| ---------- | ------------------------ |
| Get Many   | List all VMs             |
| Start      | Start a VM _(requires `Control`)_ |
| Stop       | Gracefully stop a VM _(requires `Control`)_ |
| Restart    | Stop then start a VM _(requires `Control`)_ |
| Pause      | Pause a VM _(requires `Control`)_ |
| Resume     | Resume a paused VM _(requires `Control`)_ |
| Reboot     | Reboot a VM _(requires `Control`)_ |
| Force Stop | Force-stop a VM _(destructive — requires `Full`)_ |

### Notification

| Operation   | Description                                              |
| ----------- | -------------------------------------------------------- |
| Get Many    | List notifications — filter by type, importance, limit, offset |
| Get Overview | Unread and archived counts by importance level          |
| Create      | Create a new notification _(requires `Control`)_         |
| Archive     | Archive a notification _(requires `Control`)_            |
| Archive All | Archive all notifications _(requires `Control`)_         |
| Delete      | Delete a notification _(destructive — requires `Full`)_  |

## Compatibility

- n8n 1.0 or later
- Node.js 22 or later
- Unraid 6.12 or later (GraphQL API required)

## Testing status

Being honest about what's been verified:

- **Automated:** unit tests (Vitest) cover the GraphQL client and the node's
  routing + control-level gating. CI runs lint, tests, and build on every pull request
  (see [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)). Run them yourself with
  `npm test`.
- **Manual:** [`TESTING.md`](./TESTING.md) is a checklist of end-to-end scenarios to verify
  against a real Unraid server.
- **Importable:** [`examples/read-verification.workflow.json`](./examples/read-verification.workflow.json)
  is a self-asserting n8n workflow that runs every read operation and checks the actual
  result of each — import it, point it at your credential, and run it.
- **Not yet validated:** long-running stability, the full matrix of Unraid versions, and
  live destructive-operation behaviour beyond request-shape tests. Contributions that tick
  more boxes in `TESTING.md` are very welcome.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
