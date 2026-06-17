import currentSnapshot from "../../../data/current/snapshot.json" with { type: "json" };

import { snapshotSchema, type Snapshot } from "../schema/snapshot.ts";

export function loadDeskView(): Snapshot {
  return snapshotSchema.parse(currentSnapshot);
}
