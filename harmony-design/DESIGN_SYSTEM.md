# Harmony Design System Documentation

## Blocked Task Protocol

When a task cannot be completed, we follow a structured reporting process.

### What Makes a Task Blocked?

A task is blocked when:
- Task requirements are undefined or incomplete
- Dependencies are missing
- Technical constraints prevent implementation
- Specifications conflict with system policies

### Reporting Process

1. Create a report in `harmony-design/reports/blocked/{task_id}.md`
2. Document the reason for blocking
3. List attempted solutions
4. Recommend enabling work
5. Await further instructions or create enabling tasks

### Current Blocked Tasks

- **undefined**: Missing task specification and requirements

See [blocked task reports](./reports/blocked/) for details.

## How to Provide Valid Task Information

Every task should include:
- **Unique ID**: For tracking and reference
- **Clear Description**: What needs to be built or changed
- **Acceptance Criteria**: How to verify completion
- **Context**: Which part of the system is affected

This ensures efficient implementation and maintains system quality.