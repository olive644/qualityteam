import { Router } from "express";
import { prisma } from "../db.js";

export const workloadRouter = Router();

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function labelOf(value: any): string {
  if (value && typeof value === "object" && "label" in value) return String(value.label);
  if (value === null || value === undefined || value === "") return "(sem status)";
  return String(value);
}

// Aggregates, per registered person, every non-archived item assigned to
// them via any PEOPLE column across every board — the cross-board
// "workload" view monday.com builds from its People + Date/Timeline columns.
workloadRouter.get("/", async (_req, res) => {
  const [people, boards] = await Promise.all([
    prisma.person.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.board.findMany({
      include: {
        columns: true,
        items: {
          where: { archived: false, parentItemId: null },
          include: { columnValues: true },
        },
      },
    }),
  ]);

  type AssignedItem = { itemId: string; itemName: string; boardId: string; boardName: string; statusLabel: string };

  const byPerson = new Map<string, AssignedItem[]>();
  for (const p of people) byPerson.set(p.id, []);

  for (const board of boards) {
    const peopleColumns = board.columns.filter((c) => c.type === "PEOPLE");
    const statusColumn = board.columns.find((c) => c.type === "STATUS");
    if (peopleColumns.length === 0) continue;

    for (const item of board.items) {
      const statusCv = statusColumn ? item.columnValues.find((v) => v.columnId === statusColumn.id) : undefined;
      const statusLabel = labelOf(statusCv ? parseJson<any>(statusCv.value, null) : null);

      const assigneeIds = new Set<string>();
      for (const col of peopleColumns) {
        const cv = item.columnValues.find((v) => v.columnId === col.id);
        const ids = parseJson<string[]>(cv?.value, []);
        if (Array.isArray(ids)) ids.forEach((id) => assigneeIds.add(id));
      }

      for (const personId of assigneeIds) {
        const bucket = byPerson.get(personId);
        if (!bucket) continue; // assigned to a since-deleted person
        bucket.push({ itemId: item.id, itemName: item.name, boardId: board.id, boardName: board.name, statusLabel });
      }
    }
  }

  const result = people.map((p) => {
    const items = byPerson.get(p.id) ?? [];
    const byStatus: Record<string, number> = {};
    for (const it of items) byStatus[it.statusLabel] = (byStatus[it.statusLabel] ?? 0) + 1;
    return { person: p, total: items.length, byStatus, items };
  });

  res.json(result);
});
