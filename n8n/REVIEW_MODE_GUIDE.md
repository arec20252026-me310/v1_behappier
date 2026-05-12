# Review Mode — n8n Implementation Guide

## What is review mode?

Review mode is a temporary accuracy-evaluation feature. When a user enables it in the frontend
(Settings page), every study they start will include a `review_mode: true` flag in the webhook
payload. The n8n behavior monitoring workflow must detect this flag and **save a copy of each
camera snapshot to Supabase Storage** alongside the normal detection log.

The frontend will then display those snapshots as small thumbnails next to the AI's description
in the Insights tab, so the user can compare the model's output against the actual image.

---

## What the frontend sends

When a study is started while review mode is active, the `/webhook/start-study` payload includes:

```json
{
  "study_id": "study_1234567890",
  "zone_ids": ["..."],
  "behavior_targets": [...],
  "setup_instructions": "...",
  "review_mode": true
}
```

If review mode is off, `review_mode` is `false`.

---

## What you need to add in n8n

### Workflow: 05 - Camera Behavior - Behavior Monitoring Agent

This is the workflow that fetches camera snapshots and sends them to the vision model for analysis.
It already saves detection results to the `BE_behavior_detections` table.

**Add a conditional branch after each snapshot is fetched:**

1. Check if `review_mode === true` (pass it through from the study payload, e.g. read it from
   `BE_studies.metadata.review_mode` or carry it forward from the orchestrator input).

2. If true, upload the raw image bytes to Supabase Storage:

   - **Bucket:** `camera-snapshots` (already exists, private)
   - **Path:** `snapshots/camera_loft_camera_fluent/{image_id}.jpg`
     - `image_id` is the same value already written to `BE_behavior_detections.image_id`
       (e.g. `snapshot_2026-05-08T01-46-04-953Z`)
   - Use the Supabase Storage REST API with your service role key:

   ```
   PUT {SUPABASE_URL}/storage/v1/object/camera-snapshots/snapshots/camera_loft_camera_fluent/{image_id}.jpg
   Headers:
     Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
     Content-Type: image/jpeg
   Body: raw image bytes
   ```

   Or use the n8n Supabase node / HTTP Request node — whatever pattern the workflow already uses
   for Supabase calls.

3. If `review_mode` is false, skip the upload entirely — no change to the normal flow.

### Passing review_mode through the orchestrator

The orchestrator (workflow 03) receives `review_mode` in the initial webhook payload.
Make sure it forwards `review_mode` to workflow 05 when it triggers the behavior monitoring agent,
either via the Execute Workflow node parameters or by storing it in `BE_studies.metadata`:

```json
// Store on the study row so any workflow can read it:
{ "metadata": { "review_mode": true } }
```

Then in workflow 05, read it with a Supabase GET on `BE_studies` if it is not passed directly.

---

## Storage path the frontend expects

The frontend proxy at `/api/snapshot` constructs the path as:

```
snapshots/camera_loft_camera_fluent/{image_id}.jpg
```

**The `image_id` must exactly match** what is written to `BE_behavior_detections.image_id`
for the thumbnail to appear. No other changes are needed on the frontend side.

---

## Testing

1. Enable review mode in the frontend (Settings → Review Mode → Enable).
2. Start a short study (1–2 minutes).
3. After the study completes, open the Insights tab.
4. You should see a "Snapshot Review" card above the normal insights list,
   with one thumbnail per detection entry.
5. If thumbnails show "No image", the storage upload path or image_id does not match —
   check the bucket path and the `image_id` value in `BE_behavior_detections`.
