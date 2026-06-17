import currentSnapshot from "../data/current/snapshot.json" with { type: "json" };

import { snapshotSchema } from "../src/lib/schema/snapshot.ts";

const parsedSnapshot = snapshotSchema.parse(currentSnapshot);

console.log(
  `Validated snapshot ${parsedSnapshot.schema_version} with ${parsedSnapshot.sections.length} sections.`
);
