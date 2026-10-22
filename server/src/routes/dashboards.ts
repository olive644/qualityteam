import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

export const dashboardsRouter = Router();

const widgetTypeEnum = ["COUNT_BY_COLUMN", "NUMBER_SUM", "BATTERY", "TIMELINE_GANTT"] as const;

dashboardsRouter.post("/", async (req, res) => {
  const schema = z.object({
    boardId: z.string(),
    name: z.string().min(1),
    type: z.enum(widgetTypeEnum),
    config: z.object({ columnId: z.string(), targetLabel: z.string().optional() }),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const count = await prisma.dashboardWidget.count({ where: { boardId: parsed.data.boardId } });
  const widget = await prisma.dashboardWidget.create({
    data: {
      boardId: parsed.data.boardId,
      name: parsed.data.name,
      type: parsed.data.type,
      config: JSON.stringify(parsed.data.config),
      position: count,
    },
  });
  res.status(201).json(widget);
});

dashboardsRouter.delete("/:id", async (req, res) => {
  await prisma.dashboardWidget.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

function labelOf(value: any): string {
  if (value && typeof value === "object" && "label" in value) return String(value.label);
  if (value === null || value === undefined || value === "") return "(vazio)";
  return String(value);
}

dashboardsRouter.get("/board/:boardId", async (req, res) => {
  const widgets = await prisma.dashboardWidget.findMany({
    where: { boardId: req.params.boardId },
    orderBy: { position: "asc" },
  });

  const items = await prisma.item.findMany({
    where: { boardId: req.params.boardId, archived: false },
    include: { columnValues: true },
  });

  const results = widgets.map((widget) => {
    const config = JSON.parse(widget.config) as { columnId: string; targetLabel?: string };

    if (widget.type === "COUNT_BY_COLUMN") {
      const counts: Record<string, number> = {};
      for (const item of items) {
        const cv = item.columnValues.find((v) => v.columnId === config.columnId);
        const key = labelOf(cv ? JSON.parse(cv.value) : null);
        counts[key] = (counts[key] ?? 0) + 1;
      }
      return { ...widget, config, data: { counts } };
    }

    if (widget.type === "NUMBER_SUM") {
      let sum = 0;
      for (const item of items) {
        const cv = item.columnValues.find((v) => v.columnId === config.columnId);
        const raw = cv ? JSON.parse(cv.value) : null;
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isNaN(n)) sum += n;
      }
      return { ...widget, config, data: { sum } };
    }

    if (widget.type === "BATTERY") {
      const target = config.targetLabel ?? "Done";
      let matching = 0;
      for (const item of items) {
        const cv = item.columnValues.find((v) => v.columnId === config.columnId);
        const raw = cv ? JSON.parse(cv.value) : null;
        if (labelOf(raw) === target) matching += 1;
      }
      const percent = items.length === 0 ? 0 : Math.round((matching / items.length) * 100);
      return { ...widget, config, data: { percent, matching, total: items.length } };
    }

    if (widget.type === "TIMELINE_GANTT") {
      const bars: { name: string; start: string; end: string }[] = [];
      for (const item of items) {
        const cv = item.columnValues.find((v) => v.columnId === config.columnId);
        const raw = cv ? JSON.parse(cv.value) : null;
        if (raw?.start && raw?.end) {
          bars.push({ name: item.name, start: raw.start, end: raw.end });
        }
      }
      return { ...widget, config, data: { bars } };
    }

    return { ...widget, config, data: null };
  });

  res.json(results);
});
