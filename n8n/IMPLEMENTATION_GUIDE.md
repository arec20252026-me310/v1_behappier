# Camera Behavior Multi-Agent n8n System

## Import order

1. `07-common-services.json`
2. `04-needfinding-agent.json`
3. `05-behavior-monitoring-agent.json`
4. `06-actionable-insights-agent.json`
5. `03-study-orchestrator.json`
6. `02-setup-agent.json`
7. `01-chat-entry.json`
8. `00-main-dashboard-entry.json`

Set these environment variables or edit the matching nodes after import:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `TAVILY_API_KEY`
- `RESEARCH_SEARCH_URL` (optional, defaults to Tavily search endpoint)
- `VISION_MODEL` (optional)
- `WF_COMMON_SERVICES_ID`
- `WF_NEEDFINDING_AGENT_ID`
- `WF_BEHAVIOR_MONITORING_AGENT_ID`
- `WF_ACTIONABLE_INSIGHTS_AGENT_ID`
- `WF_STUDY_ORCHESTRATOR_ID`
- `WF_SETUP_AGENT_ID`
- `WF_CHAT_ENTRY_ID`

If you do not use environment variables for workflow IDs, open each `Execute Workflow` node after import and select the matching imported workflow from the dropdown. n8n calls imported workflow records, not the original JSON files.

## Thin parent workflow

Use `00 - Camera Behavior - Main Dashboard Entry` as the only workflow your website calls. It contains:

- `Website Dashboard Webhook`
- `Normalize Dashboard Payload`
- `Call Chat Entry Sub-workflow`
- `Return Dashboard Response`

This keeps your main n8n canvas small. The parent workflow calls `01 - Camera Behavior - Chat Entry`; the Chat workflow calls Setup when needed; Setup starts the Orchestrator; the Orchestrator calls Needfinding, Monitoring, Common Services, and Insights.

After importing, wire these `Execute Workflow` nodes:

- In `00 - Camera Behavior - Main Dashboard Entry`, set `Call Chat Entry Sub-workflow` to `01 - Camera Behavior - Chat Entry`.
- In `01 - Camera Behavior - Chat Entry`, set `Call Setup Agent` to `02 - Camera Behavior - Setup Agent`.
- In `02 - Camera Behavior - Setup Agent`, set `Start Study Orchestrator` to `03 - Camera Behavior - Study Orchestrator`.
- In `03 - Camera Behavior - Study Orchestrator`, set `Call Needfinding Agent` to `04 - Camera Behavior - Needfinding Agent`.
- In `03 - Camera Behavior - Study Orchestrator`, set `Call Behavior Monitoring Agent` to `05 - Camera Behavior - Behavior Monitoring Agent`.
- In `03 - Camera Behavior - Study Orchestrator`, set `Call Preview Aggregation Service` to `07 - Camera Behavior - Common Services`.
- In `03 - Camera Behavior - Study Orchestrator`, set `Call Actionable Insights Agent` to `06 - Camera Behavior - Actionable Insights Agent`.

## Workflow map

- `00 - Camera Behavior - Main Dashboard Entry`
  - The thin public entrypoint for the website.
  - Delegates all logic to the Chat Entry workflow.
- `01 - Camera Behavior - Chat Entry`
  - Receives website requests.
  - Interprets intent and study readiness.
  - Starts setup or fetches stored status/results.
- `02 - Camera Behavior - Setup Agent`
  - Converts the user goal into a structured study package.
  - Stores the planned study row.
  - Starts the Study Orchestrator.
- `03 - Camera Behavior - Study Orchestrator`
  - Owns lifecycle transitions and inter-agent handoffs.
  - Calls Needfinding, Monitoring, Aggregation, and Insights.
- `04 - Camera Behavior - Needfinding Agent`
  - Uses a search tool for literature-backed behavior targeting.
  - Returns behavior targets and evidence only.
- `05 - Camera Behavior - Behavior Monitoring Agent`
  - The only workflow allowed to read image references.
  - Pulls latest image links from an internally configured Home Assistant snapshot folder URL.
  - Produces structured detections only.
- `06 - Camera Behavior - Actionable Insights Agent`
  - Generates dashboard-ready summaries, charts, tables, insights, and recommendations.
- `07 - Camera Behavior - Common Services`
  - Shared logging, error capture, and live preview metric aggregation.

## Node-by-node implementation plan

### 01 Chat Entry

- `Dashboard Chat Webhook`: website entry point.
- `Normalize Chat Request`: standardizes input and injects preset catalog.
- `Chat Intent + Intake Planner`: classifies intent and checks study readiness.
- `Validate Chat JSON`: schema gate.
- `Repair Chat JSON`: fallback formatter when output is malformed.
- `Route Start Study?`: sends ready studies to Setup Agent.
- `Fetch Study Status`: returns stored study state without rerunning AI.
- `Fetch Stored Results`: returns existing final or milestone outputs.
- `Fetch Study Context` and `Answer From Stored Context`: answers dashboard questions from stored data only.
- `Build Dashboard Response`: ensures a safe final payload.

### 02 Setup Agent

- `Normalize Setup Input`: creates `study_id` and stable planning input.
- `Study Planner`: generates `study_plan`, `task_graph`, `graph_plan`, and downstream request templates.
- `Validate Setup JSON` and `Repair Setup JSON`: enforce structured planning contracts.
- `Upsert Study Row`: persists the planned study.
- `Start Study Orchestrator`: hands off execution control.
- `Build Setup Response`: returns dashboard-safe confirmation.

### 03 Study Orchestrator

- `Normalize Orchestration Command`: accepts initialize, tick, milestone, or finalize commands.
- `Initialize Study?`: routes initialization path.
- `Mark Needfinding Running`: state transition.
- `Call Needfinding Agent`: evidence-backed behavior targeting.
- `Merge Needfinding Into Monitoring Request`: injects behavior targets into monitoring input.
- `Store Needfinding Output`: persists literature output.
- `Mark Monitoring Running`: state transition.
- `Call Behavior Monitoring Agent`: launches a monitoring batch.
- `Call Preview Aggregation Service`: updates preview metrics separately.
- `Finalize Or Milestone?`: routes non-initialization commands.
- `Call Actionable Insights Agent`: only for milestone or final insight generation.
- `Mark Study Complete Or Updated`: updates lifecycle state.

### 04 Needfinding Agent

- `Prepare Needfinding Prompt`: converts setup output to search-ready input.
- `Needfinding Agent`: tool-capable AI agent.
- `Literature Search Tool`: external search call for evidence gathering.
- `Validate Needfinding JSON` and `Repair Needfinding JSON`: strict output enforcement.
- `Finalize Needfinding Output`: returns only structured evidence and targets.

### 05 Behavior Monitoring Agent

- `Prepare Monitoring Request`: validates behaviors and zones, and sets the internal Home Assistant snapshot folder URL.
- `Fetch Snapshot Folder Listing`: loads the Home Assistant folder URL.
- `Extract Latest Snapshot Links`: extracts image file URLs, sorts them, and keeps the latest N images.
- `Analyze Image With Vision Model`: image analysis step.
- `Parse Detection JSON`: enforces structured detections.
- `Store Behavior Detections`: writes detections back to Supabase.
- `Build Monitoring Status`: returns batch-level dataset references and counts.

### 06 Actionable Insights Agent

- `Prepare Insight Input`: normalizes milestone or final dataset input.
- `Generate Dashboard Insights`: converts dataset into dashboard JSON.
- `Validate Insights JSON` and `Repair Insights JSON`: strict output enforcement.
- `Store Insight Outputs`: persists milestone or final result packages.

### 07 Common Services

- `Preview Aggregation Schedule`: periodic live preview refresh.
- `Normalize Service Operation`: routes scheduled or direct service operations.
- `Fetch Running Studies`: identifies active studies for refresh.
- `Build Preview Metrics`: computes lightweight provisional metrics.
- `Store Preview Metrics`: persists live preview dataset.
- `Store Workflow Log`: shared observability sink.
- `Store Workflow Error`: shared error sink.

## Example output schemas

### Chat Agent output

```json
{
  "action_type": "start_study",
  "user_goal_summary": "Study congestion in the east lobby for two weeks",
  "collected_fields": {
    "study_goal": "Identify where and when crowding occurs",
    "space_type": "office lobby",
    "building_context": "main office entrance",
    "target_area": "east lobby",
    "study_duration": "2 weeks",
    "desired_output_type": "hotspot charts and recommendations"
  },
  "missing_required_fields": [],
  "study_readiness_status": "ready",
  "recommended_presets": [],
  "setup_request": {
    "study_goal": "Identify where and when crowding occurs",
    "space_type": "office lobby",
    "target_area": "east lobby",
    "study_duration": "2 weeks",
    "desired_output_type": "hotspot charts and recommendations",
    "building_id": "bldg_001",
    "study_mode": "hypothesis-driven"
  },
  "assistant_response_text": "I can start that study now."
}
```

### Setup Agent output

```json
{
  "study_plan": {
    "study_id": "study_001",
    "study_goal": "Identify congestion in the east lobby",
    "study_objectives": ["Measure peak crowding windows", "Locate bottleneck zones"],
    "study_questions": ["When does crowding peak?", "Where do queues form?"]
  },
  "task_graph": {
    "nodes": [
      { "task_id": "need_01", "task_name": "Needfinding", "depends_on": [], "workflow": "needfinding" },
      { "task_id": "monitor_01", "task_name": "Monitoring", "depends_on": ["need_01"], "workflow": "monitoring" }
    ]
  },
  "graph_plan": {
    "dashboard_sections": ["overview", "heatmap", "timing"],
    "charts": ["zone hotspot heatmap", "hourly congestion trend"],
    "tables": ["peak windows"]
  }
}
```

### Needfinding output

```json
{
  "needfinding_summary": "Lobby congestion is best captured through queueing, entry clustering, and lingering bottlenecks near thresholds.",
  "behavior_targets": [
    {
      "behavior_name": "entry_clustering",
      "why_it_matters": "Shows crowd build-up near arrival points",
      "likely_building_interpretation": "Entry capacity or wayfinding friction",
      "confidence": 0.84,
      "evidence_summary": "Supported by facility flow and crowding literature",
      "detection_hint_for_vision_agent": "Look for 3 or more people tightly grouped near the entrance path"
    }
  ],
  "evidence_notes": ["ASHRAE and building performance literature emphasize bottleneck detection near transitions."],
  "building_relevance_notes": ["This is especially relevant for office lobbies with turnstiles or badge checks."]
}
```

### Detection record

```json
{
  "study_id": "study_001",
  "image_id": "img_1882",
  "timestamp": "2026-04-22T14:15:00Z",
  "zone_id": "east_lobby",
  "detected_behaviors": [
    { "name": "congestion_near_entry", "confidence": 0.84 },
    { "name": "standing_cluster", "confidence": 0.78 }
  ],
  "confidence_scores": {
    "congestion_near_entry": 0.84,
    "standing_cluster": 0.78
  },
  "notes": "Three-person cluster near entrance area",
  "model_version": "gpt-4.1-mini"
}
```

### Insights output

```json
{
  "study_id": "study_001",
  "output_mode": "final_insights",
  "dashboard_summary": "Congestion is concentrated in the east lobby during morning arrival peaks.",
  "charts": [
    {
      "chart_id": "chart_01",
      "chart_type": "heatmap",
      "title": "Zone Congestion Heatmap",
      "data": {}
    }
  ],
  "tables": [
    {
      "table_id": "table_01",
      "title": "Peak Congestion Windows",
      "columns": ["hour", "count"],
      "rows": [["08:00", 17]]
    }
  ],
  "insights": ["Most clustering occurs between 8:00 and 9:00 AM."],
  "recommendations": ["Evaluate queue spillback near the east entry threshold."]
}
```

## Recommended Supabase tables

- `BE_studies`
- `BE_study_tasks`
- `BE_needfinding_outputs`
- `BE_behavior_detections`
- `BE_live_preview_metrics`
- `BE_insight_outputs`
- `BE_workflow_logs`
- `BE_workflow_errors`

`image_events` is no longer required for the monitoring workflow if you use the Home Assistant snapshot folder source.

## Workflow test checklist

- Chat webhook: vague study request returns follow-up questions or presets.
- Chat webhook: ready study request starts setup and returns `start_study`.
- Chat webhook: status request with valid `study_id` returns stored status.
- Setup Agent: returns all six required structured planning objects.
- Orchestrator initialize: marks study running, stores needfinding, starts monitoring.
- Needfinding Agent: returns at least one behavior target with evidence fields.
- Monitoring Agent: stores detections without exposing image URLs downstream.
- Monitoring Agent: can read the latest images from the configured Home Assistant snapshot folder URL.
- Insights Agent: returns charts, tables, insights, and recommendations in JSON.
- Common Services: scheduled run writes provisional preview metrics.

## Troubleshooting checklist

- Import failure:
  - Import the workflows individually in the listed order.
  - If bundle import is unsupported in your n8n instance, use the per-workflow files.
- Execute Workflow nodes fail:
  - Set the `WF_*` environment variables or replace the placeholder workflow IDs.
- Supabase requests fail:
  - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
  - Confirm the REST API is enabled and the referenced tables exist.
- Home Assistant snapshot fetch fails:
  - Verify the snapshot folder URL configured inside `05 - Camera Behavior - Behavior Monitoring Agent` is reachable from n8n.
  - If your Home Assistant URL does not expose directory listings, point the workflow at a simple HTML or JSON index endpoint for the folder instead.
- OpenAI calls fail:
  - Verify `OPENAI_API_KEY`.
  - Adjust `VISION_MODEL` if your account does not support the default.
- Needfinding search fails:
  - Verify `TAVILY_API_KEY` or replace `RESEARCH_SEARCH_URL` and the tool settings.
- Vision parsing fails:
  - The workflow already logs parse failures per image.
  - Tighten the monitoring prompt or add a second repair step if needed.
- Final insights rerun too often:
  - Trigger the Orchestrator with `milestone_review` or `finalize_study` only.

## Study-state model

- `draft`: intake started but not yet ready.
- `planned`: setup complete and persisted.
- `needfinding_running`: evidence discovery in progress.
- `needfinding_complete`: behavior targets available.
- `monitoring_running`: image analysis and detections are ongoing.
- `monitoring_paused`: monitoring intentionally paused.
- `milestone_review`: interim insight generation.
- `monitoring_complete`: data collection finished.
- `insights_running`: final reporting in progress.
- `complete`: final outputs stored and ready for dashboard use.
- `failed`: unrecoverable error or manual failure state.
