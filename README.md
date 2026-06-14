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

| Field      | Description                                                   | Example                  |
| ---------- | ------------------------------------------------------------- | ------------------------ |
| Server URL | Your Unraid server URL including port                         | `http://192.168.1.x:port` |
| API Key    | From Unraid **Settings → Management Access → API Key**        |                          |

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

> **Tip:** The node is marked `usableAsTool: true`, so it works as a tool inside n8n AI Agent workflows.

### Array

| Operation          | Description                                        |
| ------------------ | -------------------------------------------------- |
| Get Status         | Array state, capacity, and parity check status     |
| Get Disks          | All array disks (parities, data, cache) with temp, I/O stats, and error counts |
| Get Shares         | All user shares                                    |
| Get Parity History | History of parity check runs                       |
| Start              | Start the array                                    |
| Stop               | Stop the array                                     |

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
| Start      | Start a VM               |
| Stop       | Gracefully stop a VM     |
| Restart    | Stop then start a VM     |
| Pause      | Pause a VM               |
| Resume     | Resume a paused VM       |
| Reboot     | Reboot a VM              |
| Force Stop | Force-stop a VM          |

### Notification

| Operation   | Description                                              |
| ----------- | -------------------------------------------------------- |
| Get Many    | List notifications — filter by type, importance, limit, offset |
| Get Overview | Unread and archived counts by importance level          |
| Create      | Create a new notification                                |
| Archive     | Archive a notification                                   |
| Archive All | Archive all notifications                                |
| Delete      | Delete a notification                                    |

## Compatibility

- n8n 1.0 or later
- Node.js 22 or later
- Unraid 6.12 or later (GraphQL API required)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
