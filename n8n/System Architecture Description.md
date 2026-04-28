# System Architecture Description

Build a production-style multi-agent n8n system for a camera-based occupant behavior monitoring platform as a json workflow.

SYSTEM CONTEXT
This platform already has the camera -> Home Assistant -> Supabase pipeline working.
Home Assistant periodically captures images only when humans are detected and stores image metadata and image references in Supabase.
n8n must now implement the AI agent architecture that interprets user goals, plans studies, performs literature-backed behavior targeting, analyzes stored images, and returns visual insights to a website dashboard.

PRIMARY PRODUCT GOAL
The product helps users such as building managers, workplace planners, and researchers run behavior studies in buildings.
The system should help them understand behaviors of occupants and generate insights that can improve building layout, congestion, comfort, and operational decisions.

CRITICAL ARCHITECTURAL RULES

1. Use a supervisor pattern, not one monolithic agent.
2. Separate the system into distinct workflows with clear inputs and outputs.
3. Use structured JSON between workflows whenever possible.
4. Add validation and logging after every important step.
5. Make the Behavior Monitoring Agent the only agent with access to image references or image content.
6. Make all agent outputs easy to inspect and troubleshoot.
7. Prefer deterministic routing and schema-based outputs over open-ended agent behavior.
8. Include retry, fallback, and error capture paths.
9. Design for first-time n8n usability: workflows must be clearly named, modular, and testable independently.
10. Never allow the chat-facing workflow to directly inspect images.

WORKFLOWS TO CREATE

WORKFLOW 1: CHAT ENTRY / CHAT AGENT
Purpose:

- Receive user requests from the website dashboard
- Interpret user intent
- Decide whether the user is asking a question, starting a study, checking progress, or requesting results
- If needed, forward the request to the Setup Agent
- Return a clean dashboard-friendly response

Input:

- user_id
- session_id
- message_text
- building_id if available
- study_id if available

Output:

- assistant_response_text
- action_type
- optional study_id
- optional setup_request object

Behavior:

- The Chat Agent is the only agent the user interacts with directly
- It should translate vague user requests into operational intent
- It should not hallucinate study outputs
- It should ask for missing required information only when truly necessary
- It should be concise, practical, and dashboard-friendly

Required action types:

- answer_question
- start_study
- check_study_status
- get_results
- clarify_request

USER INTAKE AND STUDY READINESS LOGIC

The Chat Agent must not assume users know how to describe a study well.
Many users will provide vague or incomplete requests.
The Chat Agent must guide the user until the request reaches a minimum study-readiness threshold.

MINIMUM STUDY-READINESS THRESHOLD
Before a new study is sent to the Setup Agent, the Chat Agent must collect or infer enough information to define:

- study_goal
- space_type or building context
- target area or zone
- study duration
- desired output type

OPTIONAL BUT HIGH-VALUE FIELDS
When relevant, the Chat Agent should also try to collect:

- hours of interest
- known issues already observed
- whether the study is exploratory or intended to answer a specific hypothesis
- preferred visualization type
- business or operational priority
- comparison baseline if applicable

CHAT AGENT INTAKE BEHAVIOR
When the user request is incomplete:

1. Identify the missing required fields
2. Ask concise follow-up questions focused only on the missing high-value information
3. Do not ask unnecessary questions if the study can already be started reliably
4. If too much is missing, offer preset study templates as shortcuts
5. If the user selects a preset study, use that preset to populate a draft study plan and ask only the remaining missing questions

PRESET STUDY TEMPLATES
The Chat Agent should be able to suggest preset studies when the user is unsure what to ask for.
At minimum include:

- Congestion Study
- Space Utilization Study
- Interaction / Collaboration Study
- Thermal Comfort Proxy Study
- Entrance / Flow Study

Each preset study should include:

- a clear goal
- default behaviors to monitor
- recommended study duration
- recommended outputs
- example user-friendly explanation

EXAMPLE PRESET TEMPLATE STRUCTURE
{
"template_name": "Congestion Study",
"goal": "Identify where and when crowding occurs in a monitored space",
"default_behaviors": [
"entry clustering",
"standing clusters",
"queuing",
"high-density occupancy"
],
"recommended_duration": "2 weeks",
"recommended_outputs": [
"peak congestion times",
"zone hotspot chart",
"entry bottleneck summary",
"layout recommendations"
]
}

CHAT AGENT OUTPUT REQUIREMENTS FOR NEW STUDIES
For requests related to starting a study, the Chat Agent must return JSON with:

- action_type
- user_goal_summary
- collected_fields
- missing_required_fields
- study_readiness_status
- recommended_presets
- setup_request
- assistant_response_text

Allowed values for study_readiness_status:

- ready
- needs_followup
- preset_recommended

RULES FOR FOLLOW-UP QUESTIONS

- Ask at most 2 to 3 focused follow-up questions per turn
- Prioritize required fields over optional ones
- Use practical plain language
- If the user seems unsure, suggest presets instead of continuing to ask abstract questions
- Do not send a study to the Setup Agent until the minimum readiness threshold is met unless the system is explicitly allowed to create a draft exploratory study

DRAFT EXPLORATORY MODE
If the platform supports exploratory studies, the Chat Agent may offer:
"Would you like me to start with a standard exploratory study template and refine it later?"
If the user agrees, create a draft study using a preset template and mark the study as exploratory.

CHAT AGENT SYSTEM PROMPT ADDITION
You are also responsible for study intake.
When a user wants to start a study, determine whether enough information has been provided.
If not, ask concise follow-up questions or recommend preset studies.
Do not pass incomplete study requests to the Setup Agent unless they are explicitly marked as draft exploratory studies.

WORKFLOW 2: SETUP AGENT
Purpose:

- Convert a user goal into a structured study plan
- Decide which downstream workflows are needed
- Create explicit task definitions for those workflows
- Define study duration, building context, desired outputs, and success criteria
- Produce templates for downstream requests, not final execution payloads

Input:

- user_goal
- building context if available
- user role if available
- optional constraints
- optional prior conversation summary

Output:

- study_plan JSON
- task_graph JSON
- graph_plan JSON
- needfinding_request JSON
- behavior_monitoring_request_template JSON
- actionable_insights_request JSON

The Setup Agent must:

- Decompose the user goal into concrete study objectives
- Define the exact questions the study is trying to answer
- Propose initial categories of occupant behaviors for planning purposes (final behavior targets will be determined by the Needfinding Agent)
- Decide the study duration if not specified by the user
- Decide the best output format for the final dashboard
- Generate instructions for the Needfinding Agent
- Generate a template for the Behavior Monitoring Agent request
- Generate instructions for the Actionable Insights Agent
- Define task dependencies so the Study Orchestrator knows what must happen first

Important constraints:

- The Setup Agent is responsible for planning, not long-term execution control
- The Setup Agent must not directly communicate with specialist agents during execution
- The Setup Agent must not create the final Behavior Monitoring Agent input, because final behavior targets will depend on Needfinding outputs
- Final monitoring inputs will be constructed by the Study Orchestrator after incorporating Needfinding results
- All downstream execution will be managed by the Study Orchestrator

The Setup Agent must produce structured objects, not just prose.

WORKFLOW 3: STUDY ORCHESTRATOR
Purpose:

- Control execution order, dependencies, handoffs, retries, and study lifecycle
- Act as the central communication hub between specialist workflows
- Ensure that downstream agents only run when prerequisite outputs are available
- Maintain study state across long-running studies

IMPORTANT COMMUNICATION RULE

- The Setup Agent is a planner, not the long-term execution coordinator
- After the Setup Agent creates the study plan, the Study Orchestrator takes ownership of execution
- Specialist agents must not communicate directly with each other
- All inter-agent communication must pass through the Study Orchestrator using structured JSON and persisted study state

Execution sequence:

1. Receive structured study plan from the Setup Agent
2. Call the Needfinding Agent and wait for completion
3. Receive behavior_targets and evidence outputs
4. Merge behavior_targets into the behavior monitoring request
5. Start or schedule the Behavior Monitoring Agent
6. Repeatedly collect and store structured detections during the study period and update live preview metrics
7. Detect when the study duration or completion criteria are met
8. Call the Actionable Insights Agent with the final study dataset and graph plan
9. Store dashboard outputs and mark the study as complete

Input:

- study_id
- study_plan
- task_graph
- needfinding_request
- behavior_monitoring_request_template
- actionable_insights_request
- study_duration
- completion_criteria

Output:

- study_status
- current_stage
- downstream_requests
- final_result_reference
- orchestration_log

Study states:

- draft
- planned
- needfinding_running
- needfinding_complete
- monitoring_running
- monitoring_paused
- monitoring_complete
- insights_running
- complete
- failed

Orchestrator responsibilities:

- Wait for prerequisite outputs before advancing
- Pass only the required structured fields to downstream workflows
- Handle retries and recoverable failures
- Log all state transitions
- Prevent unauthorized image access outside the Behavior Monitoring Agent
- Allow studies to run over long durations without requiring one continuously open execution
- Coordinate a lightweight aggregation step that converts detection records into live preview metrics stored separately for real-time dashboard updates

LIVE PREVIEW AND FINAL INSIGHTS LOGIC

The system must support two levels of output:

1. Live Preview Output
- As new structured detections are generated during the study, the system should update preview metrics and chart data incrementally
- Live preview outputs are provisional and must be labeled as non-final
- Live preview should prioritize lightweight metrics such as counts, rolling averages, trend lines, heatmaps, and latest detections
- Live preview should not generate strong conclusions or final recommendations
1. Final Insights Output
- Final charts, recommendations, and narrative conclusions should be generated only after the study duration is complete or after a defined milestone checkpoint
- Final insights must be based on the full available study dataset, not partial live data alone

ARCHITECTURAL RULES FOR LIVE PREVIEW

- The Behavior Monitoring Agent writes structured detections to storage
- A lightweight aggregation step or workflow updates live study metrics
- The dashboard may subscribe to these updates in real time
- The Actionable Insights Agent should not be re-run on every individual detection event unless explicitly requested
- The Actionable Insights Agent may run on schedule, at milestone checkpoints, or at final study completion

LIVE PREVIEW LABELING
All live-updating outputs must be clearly marked as:

- preview
- provisional
- data collection in progress

FINAL OUTPUT LABELING
Final outputs must be clearly marked as:

- complete
- final insights
- generated from the full study window

Communication rules:

- Chat Agent -> Setup Agent
- Setup Agent -> Study Orchestrator
- Study Orchestrator -> Needfinding Agent
- Study Orchestrator -> Behavior Monitoring Agent
- Study Orchestrator -> Actionable Insights Agent
- No specialist agent may directly invoke another specialist agent unless explicitly approved by architecture

Data handoff rules:

- Needfinding outputs must be returned to the Study Orchestrator
- The Study Orchestrator must inject needfinding outputs into the monitoring request
- Behavior Monitoring outputs must be returned to the Study Orchestrator as structured detections
- The Study Orchestrator must aggregate or reference the study dataset before calling the Actionable Insights Agent

WORKFLOW 4: NEEDFINDING AGENT
Purpose:

- Search the web/literature for relationships between occupant behaviors and building conditions relevant to the user’s study goal
- Return only relevant behaviors and building interpretations
- Produce an evidence-backed behavior target list

Input:

- user_goal
- building type or building context
- study questions
- desired outcome
- setup instructions

Output:

- needfinding_summary
- behavior_targets JSON array
- evidence_notes JSON array
- building_relevance_notes JSON array

Each behavior target should include:

- behavior_name
- why_it_matters
- likely_building_interpretation
- confidence
- evidence_summary
- detection_hint_for_vision_agent

The Needfinding Agent must not analyze images.
It only produces a structured list of behaviors and why they matter.

WORKFLOW 5: BEHAVIOR MONITORING AGENT
Purpose:

- Analyze images stored in Supabase over time
- Detect only the requested behaviors
- Record detections with timestamps
- Maintain a study dataset through structured detection records, not prose summaries or text files

IMPORTANT SECURITY AND PRIVACY RULE

- This is the only workflow allowed to access images or image URLs
- No other agent should receive image content

Input:

- study_id
- building_id
- zone_ids if applicable
- behavior_targets JSON array
- date range
- image selection rules
- setup instructions

Output:

- detection_log JSON array
- behavior_summary JSON
- monitoring_status JSON
- study_dataset reference

Each detection record should include:

- study_id
- image_id
- timestamp
- zone_id if available
- detected_behaviors
- confidence_scores
- notes
- model_version

Required behavior:

- Pull eligible image records from Supabase
- Process them in batches
- Store structured detections back into Supabase
- Skip corrupted or missing images and log the failure
- Never output raw image data to downstream agents
- Downstream outputs must only contain structured detection data

IMPORTANT OUTPUT RULE

- The Behavior Monitoring Agent must not output a human-written text file of insights
- Its primary output must be structured, machine-readable detection records
- It may optionally generate brief monitoring summaries for status tracking, but not final user-facing conclusions
- Final interpretation, graphing, and user-facing synthesis belong to the Actionable Insights Agent

Example structured detection record:
{
"study_id": "study_001",
"timestamp": "2026-04-22T14:15:00Z",
"zone_id": "zone_a",
"image_id": "img_1882",
"behaviors": [
{
"name": "congestion_near_entry",
"confidence": 0.84
},
{
"name": "standing_cluster",
"confidence": 0.78
}
],
"notes": "3-person cluster near entrance area",
"model_version": "v1.0"
}

WORKFLOW 6: ACTIONABLE INSIGHTS AGENT
Purpose:

- Convert the behavior monitoring dataset into tables, chart specs, summaries, and recommendations for milestone-level and final study outputs

Input:

- study_plan
- graph_plan
- detection_log or aggregated study dataset
- setup instructions

Output:

- dashboard_summary
- charts JSON array
- tables JSON array
- insights JSON array
- recommendations JSON array

This agent should:

- Follow the chart/layout instructions from the Setup Agent
- Produce front-end-friendly JSON for graphs and tables
- Summarize important trends
- Tie insights back to the original study goal
- Avoid making claims unsupported by the study dataset

WORKFLOW 7: UTILITIES / COMMON SERVICES
Purpose:

- Validation
- Logging
- Error handling
- Retry logic
- Schema enforcement
- Shared Supabase utilities

IMPLEMENTATION REQUIREMENTS IN N8N

GENERAL

- Name every workflow and every important node clearly
- Add notes to major sections
- Use separate sub-workflows or callable workflows for each agent
- Use structured JSON outputs between workflows
- After each AI node, add a validation step
- If parsing fails, send the result into a repair/reformat step before continuing
- Keep raw agent text output available for debugging

TRIGGERS

- Use Chat Trigger or Webhook for the chat-facing workflow
- Use webhook or schedule-based polling where appropriate for monitoring pipelines
- Return dashboard-safe responses

OUTPUT FORMATTING

- For any output that must be machine-readable, do not rely on freeform agent text alone
- Use explicit schemas for:
    - action_type
    - study_plan
    - task_graph
    - behavior_targets
    - detection_log entries
    - charts
    - tables
    - recommendations

STATE AND STORAGE
Use Supabase tables or storage buckets for at least:

- studies
- study_tasks
- needfinding_outputs
- image_events
- behavior_detections
- insight_outputs
- workflow_logs
- workflow_errors

ROUTING LOGIC
The Chat Agent should route based on:

- start a new study
- continue an existing study
- answer a question about an existing study
- return previously generated charts/results
- When a user requests existing results, the system should retrieve stored outputs from insight_outputs or live metrics datasets rather than re-running workflows unnecessarily

ERROR HANDLING
For every workflow:

- Add try/catch style error branches
- Store errors in workflow_errors with:
    - workflow_name
    - node_name
    - timestamp
    - input_reference
    - error_message
    - retry_count
- For recoverable failures, retry up to a reasonable limit
- For non-recoverable failures, mark the task as failed and return a human-readable explanation upstream

OBSERVABILITY

- Log every major transition
- Log workflow input and output references
- Log study_id in every sub-workflow
- Preserve intermediate structured outputs for debugging
- Include a debug mode flag

PROMPTING STYLE FOR ALL AI NODES
For every AI node:

- Give the agent a specific role
- State what it can and cannot access
- Specify required output schema
- Instruct it not to invent unavailable data
- Require concise reasoning in hidden process but structured explicit outputs only
- Include examples of good output
- Tell it what to do if information is missing
- Tell it to return “needs_clarification” instead of guessing when critical data is missing

SPECIFIC AI NODE INSTRUCTIONS

CHAT AGENT SYSTEM PROMPT
You are the user-facing agent for a behavior monitoring dashboard.
Your job is to understand the user’s goal and translate it into a clear action.
You are not allowed to inspect or reason over images.
You must be concise, practical, and oriented toward building studies and results.

Return JSON with:

- action_type
- user_goal_summary
- collected_fields
- missing_required_fields
- study_readiness_status
- recommended_presets
- setup_request
- assistant_response_text

SETUP AGENT SYSTEM PROMPT
You are the study planner.
Your job is to convert the user goal into a structured study plan and explicit downstream task definitions.
You are responsible for planning, not long-term execution control.
Do not analyze images.
Do not monitor study progress.
Do not communicate directly with specialist agents during execution.
Do not search the web directly unless instructed by architecture.
Your outputs will be passed to the Study Orchestrator, which will manage execution.
Return JSON only.

STUDY ORCHESTRATOR SYSTEM PROMPT
You are the execution controller for the study lifecycle.
Your job is to coordinate workflow execution, dependencies, state transitions, retries, and handoffs between specialist agents.
You are the only workflow allowed to coordinate communication between specialist agents.
You must receive outputs from one workflow, validate them, and pass only the required structured data to the next workflow.

You are responsible for coordinating a lightweight aggregation step that converts raw detection records into live preview metrics (counts, trends, summaries) stored in a separate dataset for real-time dashboard updates.

You must trigger the Actionable Insights Agent only under the following conditions:

- when the study duration is complete
- when a scheduled milestone is reached (e.g., daily or weekly summary)
- when explicitly requested by the user

You must not trigger the Actionable Insights Agent on every new detection event.

You must distinguish between:

- live preview updates during the study
- final insights after study completion or milestone checkpoints
You must not analyze image content yourself.
You must not generate literature findings yourself.
You must not generate final insights yourself unless explicitly instructed by architecture.
You are responsible for:
- calling the Needfinding Agent
- injecting needfinding outputs into the Behavior Monitoring request
- coordinating repeated monitoring runs over the study duration
- updating study state
- triggering live preview metric updates
- calling the Actionable Insights Agent only at appropriate times
Return JSON only.

NEEDFINDING AGENT SYSTEM PROMPT
You are the literature-grounded behavior relevance specialist.
Given the study goal and building context, identify which occupant behaviors matter and how they relate to building conditions and study objectives.
You do not analyze images.
You do not communicate directly with the Behavior Monitoring Agent or the Actionable Insights Agent.
Your outputs are returned to the Study Orchestrator only.
Return JSON only.

BEHAVIOR MONITORING AGENT SYSTEM PROMPT
You are the only agent allowed to analyze image-derived content.
Use the provided behavior target list and analyze the supplied images or image references.
Your primary output must be structured detection records, not prose reports.
You may generate brief monitoring summaries for status tracking, but you must not generate final user-facing conclusions or recommendations.
You do not communicate directly with the Actionable Insights Agent.
You must return outputs only to the Study Orchestrator.
Do not pass image content to downstream agents.
Return JSON only.

ACTIONABLE INSIGHTS AGENT SYSTEM PROMPT
You are the reporting and visualization specialist.
Your job is to convert structured study detections into dashboard-ready charts, tables, summaries, and recommendations.

You are only responsible for milestone-level or final insights.

You must not be invoked for high-frequency live preview updates.

Live preview outputs are generated through structured detections and lightweight aggregation, not through this agent.

Allowed output modes:

- milestone_summary
- final_insights

Your responsibilities include:

- generating milestone summaries when explicitly scheduled by the Study Orchestrator
- generating final charts, summaries, and recommendations when the study is complete
- using the full available study dataset or milestone dataset
- clearly distinguishing milestone outputs from final outputs

You do not analyze images directly.
You must not invent findings not supported by the dataset.
You must not generate outputs from incomplete or insufficient datasets unless the output is explicitly labeled as a milestone summary.
Your outputs are returned to the Study Orchestrator or dashboard pipeline as defined by architecture.
Return JSON only.

N8N BUILD DETAILS
Construct this solution using best-practice n8n patterns:

- Use AI Agent nodes where tool use is needed
- Use a dedicated Study Orchestrator workflow to control execution order, dependencies, and lifecycle state
- Use separate formatting or LLM-chain steps for strict schema output where direct agent parsing may be unreliable
- Use workflow-to-workflow calls for modularity
- Use node-level notes and naming for maintainability
- Add clear test data examples to each workflow
- Make every workflow independently executable for debugging
- Support long-running studies through persisted study state, scheduled/event-driven re-entry, and incremental updates rather than a single permanently open execution
- Support live preview updates without re-running full final-insight generation on every new detection
- Keep specialist-agent communication routed through the Study Orchestrator unless explicitly overridden by architecture

DELIVERABLE
Build the workflows, nodes, expected schemas, recommended Supabase table interactions, and routing logic.
Also generate:

1. a workflow map
2. a node-by-node implementation plan
3. example JSON schemas for all major agent outputs
4. test cases for each workflow
5. a troubleshooting checklist for failures
6. a study-state model covering draft, active monitoring, live preview, milestone review, final insights, complete, and failed states