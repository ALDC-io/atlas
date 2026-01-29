// Artifact templates for project documentation

export interface ArtifactTemplate {
    id: string;
    name: string;
    icon: string; // Tabler icon name
    description: string;
    defaultFilename: string;
    template: (projectName: string) => string;
}

const today = () => new Date().toISOString().split("T")[0];

export const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
    {
        id: "gantt",
        name: "Gantt Chart",
        icon: "IconChartGantt",
        description: "Project timeline with phases, milestones, and dependencies",
        defaultFilename: "gantt-chart.md",
        template: (projectName: string) => `# ${projectName} - Gantt Chart

## Project Timeline

| Phase | Task | Owner | Start | End | Status | Dependencies |
|-------|------|-------|-------|-----|--------|--------------|
| Planning | Requirements gathering | TBD | ${today()} | | Not Started | - |
| Planning | Technical design | TBD | | | Not Started | Requirements |
| Development | Phase 1 implementation | TBD | | | Not Started | Technical design |
| Development | Phase 2 implementation | TBD | | | Not Started | Phase 1 |
| Testing | QA testing | TBD | | | Not Started | Phase 2 |
| Deployment | Production release | TBD | | | Not Started | QA testing |

## Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Project kickoff | ${today()} | Pending |
| Design complete | | Pending |
| MVP ready | | Pending |
| Beta release | | Pending |
| Production launch | | Pending |

## Notes

- Update status: Not Started, In Progress, Blocked, Complete
- Add dependencies to track task relationships
`,
    },
    {
        id: "timeline",
        name: "Timeline",
        icon: "IconTimeline",
        description: "Chronological view of project events and milestones",
        defaultFilename: "timeline.md",
        template: (projectName: string) => `# ${projectName} - Timeline

## Project Timeline

### Q1 2026

#### ${today()} - Project Initiated
- Initial planning session
- Stakeholders identified
- Scope defined

#### TBD - Discovery Phase
- Requirements gathering
- User research
- Technical assessment

### Q2 2026

#### TBD - Design Phase
- Architecture design
- UI/UX mockups
- Technical specifications

#### TBD - Development Begins
- Sprint 1 kickoff
- Core functionality development

### Q3 2026

#### TBD - Beta Release
- Internal testing
- Bug fixes
- Performance optimization

#### TBD - Production Launch
- Go-live deployment
- Monitoring setup
- Documentation complete

## Key Dates

| Event | Date | Notes |
|-------|------|-------|
| Project Start | ${today()} | |
| Design Review | TBD | |
| Development Complete | TBD | |
| Launch | TBD | |
`,
    },
    {
        id: "tasks",
        name: "Task List",
        icon: "IconChecklist",
        description: "Task tracking with owners, priorities, and due dates",
        defaultFilename: "tasks.md",
        template: (projectName: string) => `# ${projectName} - Task List

## Active Tasks

### High Priority

- [ ] **Task Title** - @owner - Due: TBD
  - Description of the task
  - Acceptance criteria

- [ ] **Task Title** - @owner - Due: TBD
  - Description of the task

### Medium Priority

- [ ] **Task Title** - @owner - Due: TBD
  - Description of the task

### Low Priority

- [ ] **Task Title** - @owner - Due: TBD
  - Description of the task

## Completed Tasks

- [x] **Project setup** - @team - Completed: ${today()}
  - Repository created
  - Initial documentation

## Blocked Tasks

| Task | Blocker | Owner | Waiting On |
|------|---------|-------|------------|
| | | | |

## Task Summary

| Status | Count |
|--------|-------|
| To Do | 0 |
| In Progress | 0 |
| Blocked | 0 |
| Complete | 1 |

---
*Last updated: ${today()}*
`,
    },
    {
        id: "kanban",
        name: "Kanban Board",
        icon: "IconLayoutKanban",
        description: "Visual board with columns for workflow stages",
        defaultFilename: "kanban.md",
        template: (projectName: string) => `# ${projectName} - Kanban Board

## Backlog

| ID | Task | Priority | Owner | Notes |
|----|------|----------|-------|-------|
| 1 | | High | | |
| 2 | | Medium | | |
| 3 | | Low | | |

## To Do (This Sprint)

| ID | Task | Priority | Owner | Notes |
|----|------|----------|-------|-------|
| | | | | |

## In Progress

| ID | Task | Priority | Owner | Started | Notes |
|----|------|----------|-------|---------|-------|
| | | | | | |

## In Review

| ID | Task | Priority | Owner | Reviewer | Notes |
|----|------|----------|-------|----------|-------|
| | | | | | |

## Done

| ID | Task | Priority | Owner | Completed | Notes |
|----|------|----------|-------|-----------|-------|
| | Project setup | High | Team | ${today()} | Initial setup complete |

## WIP Limits

| Column | Limit | Current |
|--------|-------|---------|
| In Progress | 3 | 0 |
| In Review | 2 | 0 |

---
*Board last updated: ${today()}*
`,
    },
    {
        id: "raci",
        name: "RACI Matrix",
        icon: "IconUsers",
        description: "Responsibility assignment matrix for team roles",
        defaultFilename: "raci-matrix.md",
        template: (projectName: string) => `# ${projectName} - RACI Matrix

## Team Members

| Role | Name | Email |
|------|------|-------|
| Project Lead | TBD | |
| Developer | TBD | |
| Designer | TBD | |
| QA | TBD | |
| Stakeholder | TBD | |

## Responsibility Matrix

**Legend:** R = Responsible, A = Accountable, C = Consulted, I = Informed

| Activity | Project Lead | Developer | Designer | QA | Stakeholder |
|----------|--------------|-----------|----------|-----|-------------|
| Requirements | A | C | C | I | R |
| Design | A | C | R | I | C |
| Development | A | R | C | C | I |
| Testing | A | C | I | R | I |
| Deployment | A | R | I | C | I |
| Documentation | A | R | C | C | I |

## Decision Authority

| Decision Type | Authority | Escalation Path |
|---------------|-----------|-----------------|
| Technical | Developer | Project Lead |
| Design | Designer | Project Lead |
| Scope | Project Lead | Stakeholder |
| Timeline | Project Lead | Stakeholder |

---
*Created: ${today()}*
`,
    },
    {
        id: "meeting-notes",
        name: "Meeting Notes",
        icon: "IconNotes",
        description: "Template for capturing meeting discussions and actions",
        defaultFilename: "meeting-notes.md",
        template: (projectName: string) => `# ${projectName} - Meeting Notes

## Meeting Details

| Field | Value |
|-------|-------|
| Date | ${today()} |
| Time | |
| Location | |
| Facilitator | |

## Attendees

- [ ] Name 1
- [ ] Name 2
- [ ] Name 3

## Agenda

1. Topic 1
2. Topic 2
3. Topic 3

## Discussion Notes

### Topic 1

- Key point discussed
- Decision made
- Open question

### Topic 2

- Key point discussed
- Decision made

## Action Items

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| | | | Pending |
| | | | Pending |

## Decisions Made

1. Decision 1 - Rationale
2. Decision 2 - Rationale

## Next Meeting

- Date: TBD
- Topics to cover:
  - Follow-up item 1
  - Follow-up item 2

---
*Notes taken by: *
`,
    },
    {
        id: "risk-register",
        name: "Risk Register",
        icon: "IconAlertTriangle",
        description: "Track project risks, impacts, and mitigation strategies",
        defaultFilename: "risk-register.md",
        template: (projectName: string) => `# ${projectName} - Risk Register

## Risk Summary

| Risk Level | Count |
|------------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

## Active Risks

### Critical Risks

| ID | Risk | Probability | Impact | Score | Mitigation | Owner | Status |
|----|------|-------------|--------|-------|------------|-------|--------|
| | | | | | | | |

### High Risks

| ID | Risk | Probability | Impact | Score | Mitigation | Owner | Status |
|----|------|-------------|--------|-------|------------|-------|--------|
| | | | | | | | |

### Medium Risks

| ID | Risk | Probability | Impact | Score | Mitigation | Owner | Status |
|----|------|-------------|--------|-------|------------|-------|--------|
| | | | | | | | |

### Low Risks

| ID | Risk | Probability | Impact | Score | Mitigation | Owner | Status |
|----|------|-------------|--------|-------|------------|-------|--------|
| | | | | | | | |

## Risk Scoring Guide

**Probability:** 1 (Rare) - 5 (Almost Certain)
**Impact:** 1 (Minimal) - 5 (Severe)
**Score:** Probability × Impact

| Score | Level |
|-------|-------|
| 20-25 | Critical |
| 12-19 | High |
| 6-11 | Medium |
| 1-5 | Low |

## Closed Risks

| ID | Risk | Closure Date | Resolution |
|----|------|--------------|------------|
| | | | |

---
*Last reviewed: ${today()}*
`,
    },
    {
        id: "requirements",
        name: "Requirements Doc",
        icon: "IconFileDescription",
        description: "Functional and non-functional requirements specification",
        defaultFilename: "requirements.md",
        template: (projectName: string) => `# ${projectName} - Requirements Document

## Overview

### Purpose
Brief description of the project purpose.

### Scope
What is included and excluded from this project.

### Stakeholders
- Primary:
- Secondary:

## Functional Requirements

### FR-001: Requirement Name
- **Priority:** High/Medium/Low
- **Description:** Detailed description
- **Acceptance Criteria:**
  - Criterion 1
  - Criterion 2
- **Dependencies:** None

### FR-002: Requirement Name
- **Priority:**
- **Description:**
- **Acceptance Criteria:**
  -
- **Dependencies:**

## Non-Functional Requirements

### NFR-001: Performance
- **Description:** System response time requirements
- **Metric:** Page load < 2 seconds
- **Priority:** High

### NFR-002: Security
- **Description:** Security requirements
- **Metric:**
- **Priority:** High

### NFR-003: Scalability
- **Description:**
- **Metric:**
- **Priority:** Medium

## Constraints

- Technical:
- Business:
- Timeline:

## Assumptions

1. Assumption 1
2. Assumption 2

## Out of Scope

- Item 1
- Item 2

---
*Version: 1.0*
*Created: ${today()}*
*Last Updated: ${today()}*
`,
    },
];

export function getTemplateById(id: string): ArtifactTemplate | undefined {
    return ARTIFACT_TEMPLATES.find((t) => t.id === id);
}

export function generateArtifact(templateId: string, projectName: string): string | null {
    const template = getTemplateById(templateId);
    if (!template) return null;
    return template.template(projectName);
}
