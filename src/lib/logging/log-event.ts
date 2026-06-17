export interface LogEvent {
  stage: string;
  result: "info" | "success" | "warning" | "error";
  source_type?: string;
  provider_or_topic?: string;
  reason?: string;
  timestamp: string;
}

export function createLogEvent(
  stage: string,
  result: LogEvent["result"],
  details: Omit<LogEvent, "stage" | "result" | "timestamp"> = {}
): LogEvent {
  return {
    stage,
    result,
    timestamp: new Date().toISOString(),
    ...details
  };
}
