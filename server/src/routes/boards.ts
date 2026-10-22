import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { defaultSettingsFor } from "../columnDefaults.js";

export const boardsRouter = Router();

boardsRouter.get("/", async (_req, res) => {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: { where: { archived: false } } } } },
  });
  res.json(boards.map((b) => ({ ...b, itemCount: b._count.items, _count: undefined })));
});

boardsRouter.post("/", async (req, res) => {
  const schema = z.object({ name: z.string().min(1), description: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const board = await prisma.board.create({ data: parsed.data });
  // every board starts with one default group so items have somewhere to live
  await prisma.group.create({ data: { boardId: board.id, name: "Grupo principal" } });

  // seed a starter set of columns, mirroring what a new monday.com board ships with
  const starterColumns: { title: string; type: string }[] = [
    { title: "Status", type: "STATUS" },
    { title: "Responsável", type: "PEOPLE" },
    { title: "Data", type: "DATE" },
  ];
  await prisma.column.createMany({
    data: starterColumns.map((c, i) => ({
      boardId: board.id,
      title: c.title,
      type: c.type,
      settings: JSON.stringify(defaultSettingsFor(c.type)),
      position: i,
    })),
  });

  res.status(201).json(board);
});

boardsRouter.get("/:id", async (req, res) => {
  const board = await prisma.board.findUnique({
    where: { id: req.params.id },
    include: {
      groups: { orderBy: { position: "asc" } },
      columns: { orderBy: { position: "asc" } },
      items: {
        where: { archived: false },
        orderBy: { position: "asc" },
        include: { columnValues: true },
      },
    },
  });
  if (!board) return res.status(404).json({ error: "board não encontrado" });
  res.json(board);
});

boardsRouter.delete("/:id", async (req, res) => {
  await prisma.board.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
