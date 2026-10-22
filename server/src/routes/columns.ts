import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { defaultSettingsFor } from "../columnDefaults.js";

export const columnsRouter = Router();

const columnTypes = [
  "TEXT",
  "LONG_TEXT",
  "STATUS",
  "PRIORITY",
  "PEOPLE",
  "DATE",
  "TIMELINE",
  "NUMBERS",
  "DROPDOWN",
  "LINK",
] as const;

columnsRouter.post("/", async (req, res) => {
  const schema = z.object({
    boardId: z.string(),
    title: z.string().min(1),
    type: z.enum(columnTypes),
    settings: z.record(z.any()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const count = await prisma.column.count({ where: { boardId: parsed.data.boardId } });
  const settings = parsed.data.settings ?? defaultSettingsFor(parsed.data.type);
  const column = await prisma.column.create({
    data: {
      boardId: parsed.data.boardId,
      title: parsed.data.title,
      type: parsed.data.type,
      settings: JSON.stringify(settings),
      position: count,
    },
  });
  res.status(201).json(column);
});

columnsRouter.patch("/:id", async (req, res) => {
  const schema = z.object({
    title: z.string().min(1).optional(),
    settings: z.record(z.any()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const column = await prisma.column.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.settings !== undefined ? { settings: JSON.stringify(parsed.data.settings) } : {}),
    },
  });
  res.json(column);
});

columnsRouter.delete("/:id", async (req, res) => {
  await prisma.column.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
