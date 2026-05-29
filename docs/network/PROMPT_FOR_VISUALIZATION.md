# Hand-Off Prompt for Network Diagram Creation

Paste the block below into ChatGPT-5, Claude, or any visual-capable AI tool. It contains the full project context plus specific deliverable requirements. The output should be polished diagrams suitable to show a Stanford ME310 professor.

---

## THE PROMPT

I need you to produce two professional network architecture diagrams plus a setup checklist for a Stanford research project. The audience is my faculty advisor (ME310 / built-environment research). Layout must be clean — no overlapping lines, no spaghetti routing. Use a tool that produces sharp vector output (Mermaid, draw.io, Excalidraw, or SVG — your call, but the result must look like something I would put in a published paper appendix). If you generate diagrams as images, also give me the editable source (Mermaid markdown, draw.io XML, or SVG with grouped layers) so I can tweak it.

### Project context

The project is called **BeHappier** (also branded "OccupancyIQ" in some UIs). It is a passive camera-based occupant-behavior monitoring platform for built environments. Cameras observe a room, snapshots are pulled every ~15 seconds, a vision model classifies behavior (occupancy count, collaboration score, etc.), results land in a database, and a researcher dashboard visualizes the patterns over time. The whole thing currently runs as a field deployment in Stanford's Room 216.

### The complete stack — all pieces, exactly as they exist today

**Physical devices in Room 216:**

- 3 × Reolink IP cameras, Cat6 + power. MAC vendor prefixes `8c:7a:b3` and `dc:ec:4f`. Static IPs configured directly in the cameras' web UIs as of May 28: `192.168.204.5`, `192.168.204.11`, `192.168.204.14`. Each camera exposes RTSP on port 554, HTTPS on 443, an HTTP web UI on 80, and a proprietary "basic service" port 9000. We use them as still-image sources, not video streams.
- 1 × Intel NUC running Debian 13. Hostname `AREC-NUC`. Connected to network via WiFi adapter `wlp0s20f3`. IP `192.168.204.35` on Stanford WLAN. Tailscale-IP `100.74.234.95` (peer-to-peer overlay, see below).

**Software on the NUC (all running on the NUC's Debian host):**

- **Docker** running a single named container `n8n` (the workflow automation platform n8n.io). The n8n container hosts seven published workflows; the two that matter for this diagram are Workflow 05 ("Behavior Monitoring Agent") and Workflow 06 ("Actionable Insights Agent"). Each call to OpenAI/Supabase is initiated from inside n8n.
- **VirtualBox** running one VM named `HomeAssistant`. The VM's NIC is in Bridged mode against `wlp0s20f3`. The VM's IP is `192.168.204.6` (acquired via DHCP from Stanford). HomeAssistant is the official open-source home automation platform; we use it only as the bridge that talks to the Reolink cameras' APIs and writes a `snapshot_1.jpg` file periodically. The cameras are configured in HomeAssistant's Reolink integration. The HA-internal IP each camera was registered with is now static. HA writes snapshots to `/config/www/snapshots/{camera_id}/snapshot_1.jpg` which is served at `http://192.168.204.6:8123/local/snapshots/.../snapshot_1.jpg`.
- **image_proxy.py** — a small Python HTTP server I wrote, listening on port 5680. When n8n hits `http://127.0.0.1:5680?camera=camera_X`, it fetches the corresponding `snapshot_1.jpg` from HA, base64-encodes it, and returns a JSON envelope with the bytes plus an ETag so n8n can skip frames that haven't changed.
- **rinetd** — a tiny TCP forwarder. Configured rule: `0.0.0.0 8123 → 192.168.204.6 8123`. This exposes the HomeAssistant web UI on the NUC's external interface so it is reachable through Tailscale.
- **Tailscale daemon** — peer-to-peer WireGuard-based overlay network. The NUC gets a stable IP `100.74.234.95` on the Tailscale net. From anywhere in the world, my Mac (also on Tailscale) can SSH into the NUC and open the HA UI via `http://100.74.234.95:8123`.

**Cloud services (all reached over the public Internet from the NUC and from the Mac):**

- **OpenAI API** — `https://api.openai.com`. n8n calls `gpt-4.1` (vision) for each snapshot analysis and `o4-mini` for end-of-study Insights generation. These are the only ML inference calls; there is no local model.
- **Supabase** — managed Postgres + Storage + Realtime. Project ID `nxjgwifaolhdlcaoljsb`, region us-west-1. Database holds: `BE_studies`, `BE_behavior_detections` (one row per snapshot per behavior), `BE_insight_outputs`. Storage holds a private bucket `camera-snapshots` with the JPEG files (organized as `snapshots/{camera_id}/{image_id}.jpg`). n8n writes to all of these. The frontend reads from them via the Supabase JS client.
- **Vercel** — hosts the BeHappier frontend (Next.js app at `v0-behappier-sp.vercel.app`). Auto-deploys from a GitHub repository on every push to main.
- **GitHub** — source code repository. Hosts both the frontend code and the n8n workflow JSON exports.
- **Tailscale coordination plane** — login.tailscale.com. Just for key exchange and peer discovery; actual data goes peer-to-peer over WireGuard.

**End users (people who interact with the system):**

- The **researcher** (me) — works from a Mac. Connects to the NUC for admin work via Tailscale + SSH or the HA web UI. Opens the BeHappier frontend at the Vercel URL like any normal website. Usually on Stanford WLAN, sometimes at home, sometimes traveling.
- The **building manager** (the eventual end-user of the dashboard) — just opens the Vercel URL in a normal browser. Nothing more. They never touch the NUC, never see the cameras directly.

### How the data flows during one snapshot cycle (sequence is important)

1. n8n Workflow 05 hits the local image_proxy at `127.0.0.1:5680?camera=camera_3`
2. image_proxy fetches `http://192.168.204.6:8123/local/snapshots/camera_3/snapshot_1.jpg` from HomeAssistant (which itself refreshed the file ~3 seconds earlier from the Reolink camera over the LAN)
3. image_proxy returns the JPEG bytes + ETag to n8n
4. n8n base64-encodes the image and POSTs it to OpenAI's `https://api.openai.com/v1/responses` endpoint with the vision-classification prompt
5. OpenAI returns a JSON detection (e.g. `{occupancy: 4, collaboration_index: 0.67}`)
6. n8n writes one row to `BE_behavior_detections` in Supabase via the REST API
7. In parallel, n8n uploads the snapshot to the Supabase Storage bucket
8. The researcher's frontend (or the building manager's) is subscribed to Supabase Realtime on `BE_behavior_detections` filtered by current study_id, so the new detection appears on the dashboard within a second
9. When a study finishes, n8n Workflow 06 reads all detections, generates summary insights via OpenAI's o4-mini, and writes them to `BE_insight_outputs`

### The two diagrams I need

**Diagram 1 — "Current State (Stanford WLAN)"**

Show how the system is deployed today, May 2026. Every device in Room 216 is on Stanford's WPA2-Enterprise WLAN, subnet `192.168.204.0/24`. The diagram should make these things visually obvious:

- Three zones: Room 216 (physical), Cloud (public Internet services), End Users (people with browsers).
- Inside Room 216: the three Reolink cameras, the NUC, and inside the NUC clearly show the VirtualBox HA VM, n8n container, image_proxy, rinetd, and Tailscale daemon as separate components.
- Network connections between cameras and NUC drawn as WLAN (wavy line or dashed, labelled "WPA2-Enterprise WLAN, 192.168.204.0/24").
- The cloud zone shows OpenAI, Supabase (split into Database and Storage if it fits cleanly), Vercel, GitHub, and the Tailscale coordination server. Internet connections drawn as solid arrows.
- A separate "user" zone with Researcher Mac and Building Manager, with arrows to Vercel (frontend) and Tailscale (for SSH access).
- Annotate the Stanford-WLAN connection visually as the **fragile link** — this is the failure mode that motivates Diagram 2. Maybe a small warning icon or red dashed segment. Cameras occasionally lose DHCP leases and get new IPs; this breaks HA which breaks the snapshot pipeline.

**Diagram 2 — "Proposed Setup (Wired via Stanford Wall Ethernet Port)"**

Same software stack, totally different LAN. The diagram should show:

- A new physical component: a small unmanaged 5-port gigabit Ethernet switch (e.g. Netgear GS105 or similar, ~$25), sitting in Room 216.
- The switch's uplink goes to a **Stanford Ethernet wall port** in Room 216, which provides Internet via Stanford-managed DHCP exactly like the WLAN does today.
- The three Reolink cameras and the NUC are all connected to the switch via Cat6 patch cables (solid black lines, labelled "1 Gbps wired").
- No WLAN involvement on the camera/NUC side at all.
- VirtualBox HA VM is now bridged onto the **wired Ethernet adapter** of the NUC, not the WiFi adapter, which means it gets a real LAN address and stays there.
- The cloud half of the diagram is **identical** to Diagram 1 — make this visually clear (the right side of the diagram is the same).
- The researcher's Mac still connects via Tailscale to the NUC, and via Vercel for the frontend, exactly as before.
- Optionally include a small callout: "Why: Static IPs no longer drift; HA never disconnects from cameras; bridged VM works reliably; less Stanford WPA2-Enterprise auth friction."

OpenAI absolutely stays in the cloud — there is no local LLM. Do not show one. The Mac and the building manager keep using Stanford WLAN (or any Internet) — they don't sit on the wired LAN.

### Visual style requirements

- Clean, geometric, paper-publication-ready. Think the diagrams in an ACM CSCW paper, not a marketing infographic.
- Distinct visual languages for: physical hardware (boxes with sharp corners and small icons), software components (rounded rectangles), cloud services (rounded with a small cloud icon or shadow), network connections (solid for wired, wavy/dashed for WLAN, dotted for VPN/Tailscale).
- Color-code by zone: a light neutral for the room, a soft blue for cloud, a soft orange for users. Not bright/saturated.
- **No crossing lines**. Use orthogonal routing. If two arrows would cross, route them around. Put the switch in Diagram 2 in the middle of the room so the cables fan out cleanly.
- Clear typography. IP addresses in monospace. Component names in bold.
- A small legend in the lower-left corner of each diagram explaining the line types.
- Both diagrams should be the same aspect ratio (landscape, around 16:9 or similar) and printable on a single page.

### Plus: setup checklist (third deliverable)

After the two diagrams, give me a short checklist (3-5 numbered items) of what is needed to physically deploy the proposed setup. Things like:

1. Confirm an active Ethernet wall port exists in Room 216 (talk to Stanford IT / facilities, request activation if needed)
2. Buy the switch (Netgear GS105 v5 or equivalent, ~$25) and 4 × Cat6 patch cables (1m and 2m mix, ~$15)
3. Configure static IPs in the Reolink web UIs (already done as of May 28, so just verify)
4. In the NUC's VirtualBox, switch the HomeAssistant VM's NIC from "Bridged → wlp0s20f3" to "Bridged → enp...(the wired adapter name)"
5. Update `image_proxy.py` to point at HomeAssistant's new IP if it changes (or just rerun the static-IP setup on HA as well)

Make the checklist phrased so I can hand it to my advisor or to whoever physically does the install in the lab.

### Output format I want from you

1. The two diagrams as either embedded images or shared links (Mermaid in code blocks, draw.io XML in code blocks, or downloadable SVG). Plus the editable source.
2. The setup checklist, as a numbered list.
3. A one-paragraph summary I can read aloud to a faculty advisor explaining what changed and why.

If you cannot render polished diagrams directly, then please at minimum produce: (a) the editable source code in Mermaid or draw.io XML, structured carefully with named groups and a clear coordinate layout so the lines truly do not cross, and (b) explicit visual styling notes (colors, fonts, icon suggestions) that I can apply in a final pass with draw.io.

Do not skip any of the cloud services, do not invent components that aren't in the stack above, and do not get creative with the architecture — the diagrams must reflect exactly what I described, just rendered cleanly.

---

End of prompt. Paste everything from "I need you to produce..." down through the end of "...just rendered cleanly." into the AI tool of your choice.
