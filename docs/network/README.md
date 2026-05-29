# BeHappier — Network Architecture

Two diagrams in this folder, both editable in [draw.io](https://app.diagrams.net/) or the desktop app:

- `01_current_state_wifi.drawio` — how the system runs today (May 2026), with all Room 216 devices on Stanford WPA2-Enterprise WLAN
- `02_ethernet_proposed.drawio` — proposed switch-based wired LAN that eliminates the WLAN drift problems we hit during May field tests

To open: double-click the `.drawio` file in the draw.io desktop app, or upload to https://app.diagrams.net. All boxes and lines are visually editable.

---

## 1. Current State (Stanford WLAN)

Everything in Room 216 is on the Stanford WPA2-Enterprise WLAN (`192.168.204.0/24`). Reolink cameras (`.5`, `.11`, `.14`), the Linux NUC (`.35`) and the VirtualBox HomeAssistant VM (`.6`) all get IPs from the Stanford DHCP server.

The NUC runs:

- **n8n** (Docker container) — orchestrates the workflows that pull a snapshot, call OpenAI, and write detections to Supabase
- **image_proxy.py** — small Python HTTP server on port 5680, fetches the latest snapshot from HomeAssistant
- **VirtualBox VM "HomeAssistant"** (`.6`, bridged onto the WLAN) — talks to the Reolink cameras via their REST API and refreshes `snapshot_1.jpg` files
- **rinetd** — port-forwards `0.0.0.0:8123 → 192.168.204.6:8123` so HomeAssistant is reachable via Tailscale
- **Tailscale daemon** — exposes the NUC as `100.74.234.95` so the researcher's Mac can SSH in or open the HA web UI from anywhere

Cloud services (always reached over Internet):

- **OpenAI API** — vision (gpt-4.1) and insights (o4-mini)
- **Supabase** (`nxjgwifaolhdlcaoljsb`, us-west-1) — Postgres + private Storage bucket for snapshots
- **Vercel** — hosts the BeHappier frontend, auto-deploys from GitHub
- **Tailscale control plane** — coordination only, traffic stays peer-to-peer

**Pain points this setup creates** (which is why we want Diagram 2):

- Stanford DHCP leases expire every 12–24 h. Cameras get new IPs, HomeAssistant loses its connection, the snapshot pipeline silently stops. This is the failure mode that took most of our May 27 debug session.
- Cameras occasionally drop off WPA2-Enterprise and need re-association. Reolink firmware does not always reconnect cleanly.
- VirtualBox bridged mode through `wlp0s20f3` is fragile. After a NUC reboot, the VM sometimes ends up on a self-assigned `192.168.207.x/27` address that Stanford WLAN never authenticates. We had to fall back to NAT mode and forward port 8123, which broke Reolink mDNS discovery.

---

## 2. Proposed Setup (Ethernet via Stanford Wall Port)

Same software, completely different LAN. We add **one small unmanaged switch** (e.g. Netgear GS105, ~$25, 5 ports) and run **Cat6 Ethernet** from the switch to:

- 3 Reolink cameras (they have RJ45 ports — POE not required since they have separate power)
- The Linux NUC

The switch uplinks to a **Stanford Ethernet wall port** in Room 216. Stanford supplies Internet via DHCP on that port, exactly the same way Stanford WLAN supplies Internet today — but the cameras, NUC and HomeAssistant VM are all on a single deterministic wired LAN instead of fighting over WLAN association.

Everything cloud-side is unchanged: OpenAI, Supabase, Vercel, Tailscale, GitHub all stay exactly as they are today. The researcher's Mac stays on Stanford WLAN (or wherever) and reaches the NUC via Tailscale just like before.

**Why this is better**:

- **No DHCP drift on cameras.** They get static IPs in the switch's subnet and stay there until something physically changes.
- **No WLAN drop-outs.** Wired Ethernet doesn't lose association.
- **VirtualBox bridged mode actually works reliably** on a wired interface — this was the failure mode that pushed us into NAT mode on May 27.
- **Lower latency, higher bandwidth** for the snapshot pipeline (1 Gbps wired vs. shared WPA2-Enterprise).
- **Stanford IT is happier**: cameras stop hammering the wireless access points, and they sit on a known wired port instead of three roaming MAC addresses.

**What we have to buy / do**:

- 1 × unmanaged 5-port gigabit switch (~$25)
- 4 × Cat6 patch cables (1 × switch-to-wall, 3 × camera-to-switch, 1 × NUC-to-switch — ~$15 total)
- Configure static IPs on the cameras (we already did this in their web UIs on May 28)
- Switch the VirtualBox NIC from Bridged-Wifi to Bridged-Ethernet (5 minutes, no code change)
- Optionally update `image_proxy.py` to point at the new HA IP, but this only matters once

No code changes, no cloud changes, no n8n workflow changes. Same OpenAI cost, same Supabase costs, same Vercel deployment. The cloud architecture in both diagrams is identical — only the LAN is different.

---

## Editing the diagrams

- **Online**: open https://app.diagrams.net → File → Open from → Device → pick the `.drawio` file
- **Desktop**: install [draw.io desktop](https://github.com/jgraph/drawio-desktop/releases) → double-click the `.drawio` file
- **VS Code / Cursor**: the [Draw.io Integration extension](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) renders `.drawio` files inline and lets you edit visually

To export for slides or print: File → Export As → PNG (for slides) or PDF (for paper appendix).
