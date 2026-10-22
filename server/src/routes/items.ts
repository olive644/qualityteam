import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { runAutomations } from "../automation/engine.js";

export const itemsRouter = Router();

itemsRouter.post("/", async (req, res) => {
  const schema = z.object({
    boardId: z.string(),
    groupId: z.string(),
    name: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const count = await prisma.item.count({ where: { groupId: parsed.data.groupId } });
  const item = await prisma.item.create({
    data: { ...parsed.data, position: count },
  });

  await runAutomations({ boardId: item.boardId, item, isNewItem: true });

  res.status(201).json(item);
});

itemsRouter.patch("/:id", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    archived: z.boolean().optional(),
    groupId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const before = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: "item não encontrado" });

  const item = await prisma.item.update({ where: { id: req.params.id }, data: parsed.data });

  if (parsed.data.groupId && parsed.data.groupId !== before.groupId) {
    await runAutomations({ boardId: item.boardId, item, movedToGroupId: parsed.data.groupId });
  }

  res.json(item);
});

itemsRouter.delete("/:id", async (req, res) => {
  await prisma.item.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Set/update a single column's value on an item — this is the hook point
// where automations ("when column X changes...") get evaluated.
itemsRouter.put("/:id/columns/:columnId", async (req, res) => {
  const schema = z.object({ value: z.any() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const item = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: "item não encontrado" });

  const value = JSON.stringify(parsed.data.value ?? null);
  await prisma.columnValue.upsert({
    where: { itemId_columnId: { itemId: item.id, columnId: req.params.columnId } },
    create: { itemId: item.id, columnId: req.params.columnId, value },
    update: { value },
  });

  await runAutomations({ boardId: item.boardId, item, changedColumnId: req.params.columnId });

  res.status(204).end();
});
