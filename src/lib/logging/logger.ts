import type { LogEvent } from "./log-event.ts";

export function logEvent(event: LogEvent): void {
  console.log(JSON.stringify(event));
}

export function logEvents(events: LogEvent[]): void {
  for (const event of events) {
    logEvent(event);
  }
}
