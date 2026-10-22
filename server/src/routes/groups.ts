import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

export const groupsRouter = Router();

groupsRouter.post("/", async (req, res) => {
  const schema = z.object({
    boardId: z.string(),
    name: z.string().min(1),
    color: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const count = await prisma.group.count({ where: { boardId: parsed.data.boardId } });
  const group = await prisma.group.create({
    data: { ...parsed.data, position: count },
  });
  res.status(201).json(group);
});

groupsRouter.delete("/:id", async (req, res) => {
  await prisma.group.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
