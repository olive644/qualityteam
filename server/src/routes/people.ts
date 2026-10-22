import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

export const peopleRouter = Router();

peopleRouter.get("/", async (_req, res) => {
  const people = await prisma.person.findMany({ orderBy: { createdAt: "asc" } });
  res.json(people);
});

peopleRouter.post("/", async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const person = await prisma.person.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color ?? "#579bfc",
      email: parsed.data.email || undefined,
    },
  });
  res.status(201).json(person);
});

peopleRouter.delete("/:id", async (req, res) => {
  await prisma.person.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
