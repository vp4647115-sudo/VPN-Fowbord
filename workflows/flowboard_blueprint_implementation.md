# FlowBoard AI - Blueprint Feature Integration Workflow

## Objective
Seamlessly implement and integrate all features specified in the FlowBoard AI Blueprint PRD into the codebase while maintaining strict TypeScript, dark luxury aesthetic, and Express server standards.

---

## Architecture & Layers

### 1. Workflows (Layer 1)
- Standard Operating Procedures (SOPs) for workspace management, AI diagram synthesis, task synchronization, knowledge base querying, and export formats.

### 2. Agents (Layer 2)
- Specialized AI Agent Modes:
  - **Architect Agent**: Technical architecture, DB schemas, cloud deployments.
  - **Planner Agent**: WBS, project roadmaps, epics, timeline dependencies.
  - **QA Agent**: Bottleneck detection, circular dependency checks, missing error paths.
  - **Documentation Agent**: Converting diagrams to Markdown/Mermaid docs.
  - **Project Manager Agent**: Progress monitoring and risk management.

### 3. Tools (Layer 3)
- Verification scripts, diagram format converters, and node layout auto-arrangers.

---

## Execution Steps

### Phase 1: Universal AI Command Bar (Ctrl + K) & Smart Quick Capture
- Keyboard shortcut `Ctrl + K` global modal/drawer.
- Supports commands: "Create a software architecture diagram", "Turn workflow into tasks", "Find bottlenecks", "Generate database ER diagram", "Create project plan", "Explain workflow", "Find missing dependencies".
- Shortcut `Ctrl + Shift + C` for Quick Capture (Idea, Task, Bug, Note, Link).

### Phase 2: Board View Modes & Task Canvas Synchronization
- Board View Mode Switcher in Canvas & Dashboard:
  1. **Canvas View**: Node & edge whiteboarding with smart shapes.
  2. **Kanban Board**: Drag & drop tasks by status (Backlog, Todo, In Progress, Review, Blocked, Done).
  3. **Timeline / Gantt View**: Milestones, dependencies, dates, progress bars.
  4. **Table / List View**: Grid view with editable custom fields, assignee, status, priority.
  5. **Calendar View**: Monthly/Weekly view showing deadlines.
  6. **Analytics View**: Task breakdown, health metrics, blockers, throughput.
  7. **Presentation Mode**: Fullscreen slide-by-slide zoom transitions.

### Phase 3: AI Diagram Engine & Auto Layout
- Supports: System Architecture, ER Diagrams, Mind Maps, Flowcharts, Sequence, Network, CI/CD, Process.
- Auto-Layout algorithms (Hierarchical, Horizontal, Vertical, Tree, Grid).
- AI Explain & AI Improve Flow.

### Phase 4: Knowledge Base & RAG Workspace Documents
- Workspace Knowledge Base drawer to upload/add documents, specifications, notes.
- Context-aware RAG querying in AI side panel.

### Phase 5: Export & Mermaid Integration
- Export to PNG, SVG, PDF, JSON, CSV, Markdown, Mermaid.
- Bidirectional Mermaid diagram editor & visual renderer.

---

## Verification
1. Run `lint_applet` (`tsc --noEmit`).
2. Run `compile_applet` for Vite & ESBuild compilation.
3. Test dev server with `restart_dev_server`.
