# Session Manager Bounded Context

## Purpose
Manages collaborative session lifecycle: creation, joining, leaving, and synchronization.

## Commands
- `CreateSession`: Create a new collaborative session
- `JoinSession`: Join an existing session
- `LeaveSession`: Leave the current session
- `UpdateSessionMetadata`: Update session name, description, etc.

## Events
- `SessionCreated`: A new session was created
- `SessionJoined`: User joined a session
- `SessionLeft`: User left a session
- `SessionMetadataUpdated`: Session metadata changed
- `SessionError`: An error occurred in session operations

## State
- Active session ID
- Session metadata (name, description, created timestamp)
- Participant count
- Connection status

## Invariants
- A user can only be in one session at a time
- Session IDs must be unique
- Cannot join a non-existent session