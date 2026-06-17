import type { DeskItem } from "../schema/item.ts";
import type { SectionColumn, SectionKey } from "../schema/section.ts";
import { rankItemsForColumn } from "../pipeline/rank-stage.ts";

export function selectColumnItems(
  sectionKey: SectionKey,
  column: SectionColumn
): DeskItem[] {
  return rankItemsForColumn(sectionKey, column.items, 3);
}
