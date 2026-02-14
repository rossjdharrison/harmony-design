# Blocked Task Report: undefined

**Date:** 2024
**Reporter:** Autonomous Executor
**Status:** BLOCKED - Cannot Proceed

## Reason for Block

The task cannot be executed because:

1. **Task ID:** `undefined` - No valid task identifier provided
2. **Task Description:** "Details not available" - No actionable requirements specified
3. **No Context:** PROJECT CONTEXT shows "No structure available"

## Attempted Solutions

1. ✗ Reviewed task metadata - all fields are undefined/unavailable
2. ✗ Checked recent commits - only generic "Task implementation" messages without specifics
3. ✗ Analyzed project context - no structure information available

## What is Needed to Unblock

To proceed with task execution, the following information is required:

### Minimum Required Information

1. **Valid Task ID** - A specific identifier for tracking
2. **Task Description** - Clear, actionable requirements describing what needs to be implemented
3. **Acceptance Criteria** - How to verify the task is complete
4. **Context** - Which part of the Harmony Design System this affects (e.g., component, bounded context, infrastructure)

### Recommended Task Structure

```yaml
task:
  id: "HDS-XXX"
  description: "Implement [specific feature/component]"
  type: [component|bounded-context|infrastructure|documentation]
  acceptance_criteria:
    - Criterion 1
    - Criterion 2
  context:
    area: [ui|audio|graph|schema|tooling]
    files_affected: []
```

## Recommended Next Steps

**Option A:** Provide complete task specification and re-run executor

**Option B:** Create an enabling task to:
- Define the task requirements
- Establish acceptance criteria
- Identify affected system areas

## Policy Compliance Note

This report is created in compliance with:
- **Policy 18:** Blocked Task Reporting Protocol
- **Policy 19:** Documentation Non-Optional (documenting why task cannot proceed)

## Awaiting Instructions

Cannot proceed until valid task specification is provided.