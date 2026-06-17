# Intelligence Desk Renderer

Static-first renderer foundation for the Answer Bar Intelligence Desk.

This project exists to render approved snapshot content for the member-facing
Intelligence Desk experience. It does not replace Circle as the primary member
surface, and it does not own ingestion, authentication, or editorial review.

## Purpose

- Render approved snapshot content locally for development
- Provide a controlled fallback/embedded renderer if Circle-native layout proves
  too rigid
- Preserve the file and module boundaries defined in the architecture

## Non-Goals

- No member authentication in this project
- No database in v1
- No always-on backend app in v1
- No live browser-side source fetching

## Story 1.1 Scope

This scaffold initializes the renderer foundation only. Schema, sample
snapshots, source fetchers, and publishing automation are added in later
stories.
