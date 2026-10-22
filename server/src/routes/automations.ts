import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

export const automationsRouter = Router();

const triggerEnum = [
  "STATUS_CHANGES_TO",
  "ANY_COLUMN_CHANGES",
  "ITEM_CREATED",
  "ITEM_MOVED_TO_GROUP",
] as const;
const operatorEnum = ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN"] as const;
const actionEnum = ["CHANGE_COLUMN", "NOTIFY", "CREATE_ITEM", "ARCHIVE_ITEM", "MOVE_ITEM_TO_GROUP"] as const;

const recipeSchema = z.object({
  boardId: z.string(),
  name: z.string().min(1),
  trigger: z.enum(triggerEnum),
  triggerColumnId: z.string().optional(),
  triggerGroupId: z.string().optional(),
  triggerValue: z.any().optional(),
  conditionColumnId: z.string().optional(),
  conditionOperator: z.enum(operatorEnum).optional(),
  conditionValue: z.any().optional(),
  action: z.enum(actionEnum),
  actionColumnId: z.string().optional(),
  actionGroupId: z.string().optional(),
  actionValue: z.any().optional(),
});

automationsRouter.get("/board/:boardId", async (req, res) => {
  const recipes = await prisma.automationRecipe.findMany({
    where: { boardId: req.params.boardId },
    orderBy: { createdAt: "asc" },
  });
  res.json(recipes);
});

automationsRouter.post("/", async (req, res) => {
  const parsed = recipeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const d = parsed.data;

  const recipe = await prisma.automationRecipe.create({
    data: {
      boardId: d.boardId,
      name: d.name,
      trigger: d.trigger,
      triggerColumnId: d.triggerColumnId,
      triggerGroupId: d.triggerGroupId,
      triggerValue: d.triggerValue !== undefined ? JSON.stringify(d.triggerValue) : null,
      conditionColumnId: d.conditionColumnId,
      conditionOperator: d.conditionOperator,
      conditionValue: d.conditionValue !== undefined ? JSON.stringify(d.conditionValue) : null,
      action: d.action,
      actionColumnId: d.actionColumnId,
      actionGroupId: d.actionGroupId,
      actionValue: d.actionValue !== undefined ? JSON.stringify(d.actionValue) : null,
    },
  });
  res.status(201).json(recipe);
});

automationsRouter.patch("/:id", async (req, res) => {
  const schema = z.object({ enabled: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const recipe = await prisma.automationRecipe.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(recipe);
});

automationsRouter.delete("/:id", async (req, res) => {
  await prisma.automationRecipe.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

automationsRouter.get("/:id/runs", async (req, res) => {
  const runs = await prisma.automationRun.findMany({
    where: { recipeId: req.params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(runs);
});
