import { prisma } from "../db.js";
import type { AutomationRecipe, Item } from "@prisma/client";

type ChangeEvent = {
  boardId: string;
  item: Item;
  changedColumnId?: string;
  isNewItem?: boolean;
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getColumnValue(itemId: string, columnId: string) {
  const cv = await prisma.columnValue.findUnique({
    where: { itemId_columnId: { itemId, columnId } },
  });
  return cv ? parseJson<any>(cv.value, null) : null;
}

function statusLabel(value: any): string | null {
  if (value && typeof value === "object" && "label" in value) return value.label;
  if (typeof value === "string") return value;
  return null;
}

function evaluateCondition(
  recipe: AutomationRecipe,
  actualValue: any
): boolean {
  if (!recipe.conditionColumnId || !recipe.conditionOperator) return true;
  const expected = parseJson<any>(recipe.conditionValue, null);
  const a = typeof actualValue === "number" ? actualValue : Number(actualValue);
  const e = typeof expected === "number" ? expected : Number(expected);
  switch (recipe.conditionOperator) {
    case "EQUALS":
      return JSON.stringify(actualValue) === JSON.stringify(expected);
    case "NOT_EQUALS":
      return JSON.stringify(actualValue) !== JSON.stringify(expected);
    case "GREATER_THAN":
      return !Number.isNaN(a) && !Number.isNaN(e) && a > e;
    case "LESS_THAN":
      return !Number.isNaN(a) && !Number.isNaN(e) && a < e;
    default:
      return true;
  }
}

async function recipeMatches(recipe: AutomationRecipe, event: ChangeEvent): Promise<boolean> {
  if (!recipe.enabled) return false;

  if (recipe.trigger === "ITEM_CREATED") {
    return Boolean(event.isNewItem);
  }

  if (recipe.trigger === "STATUS_CHANGES_TO") {
    if (!recipe.triggerColumnId || recipe.triggerColumnId !== event.changedColumnId) return false;
    const newValue = await getColumnValue(event.item.id, recipe.triggerColumnId);
    const expectedLabel = statusLabel(parseJson<any>(recipe.triggerValue, null));
    return statusLabel(newValue) === expectedLabel;
  }

  if (recipe.trigger === "ANY_COLUMN_CHANGES") {
    if (recipe.triggerColumnId && recipe.triggerColumnId !== event.changedColumnId) return false;
    return Boolean(event.changedColumnId);
  }

  return false;
}

async function runAction(recipe: AutomationRecipe, event: ChangeEvent): Promise<string> {
  switch (recipe.action) {
    case "CHANGE_COLUMN": {
      if (!recipe.actionColumnId) return "ação sem coluna de destino configurada";
      const value = recipe.actionValue ?? "null";
      await prisma.columnValue.upsert({
        where: { itemId_columnId: { itemId: event.item.id, columnId: recipe.actionColumnId } },
        create: { itemId: event.item.id, columnId: recipe.actionColumnId, value },
        update: { value },
      });
      return `coluna ${recipe.actionColumnId} atualizada no item ${event.item.id}`;
    }
    case "ARCHIVE_ITEM": {
      await prisma.item.update({ where: { id: event.item.id }, data: { archived: true } });
      return `item ${event.item.id} arquivado`;
    }
    case "CREATE_ITEM": {
      const name = parseJson<string>(recipe.actionValue, "Novo item (automação)");
      const created = await prisma.item.create({
        data: {
          boardId: event.item.boardId,
          groupId: event.item.groupId,
          name,
        },
      });
      return `item ${created.id} criado a partir da automação`;
    }
    case "NOTIFY": {
      const message = parseJson<string>(recipe.actionValue, "Notificação da automação");
      return `notificação registrada: "${message}"`;
    }
    default:
      return "ação desconhecida";
  }
}

export async function runAutomations(event: ChangeEvent) {
  const recipes = await prisma.automationRecipe.findMany({
    where: { boardId: event.boardId, enabled: true },
  });

  for (const recipe of recipes) {
    if (await recipeMatches(recipe, event)) {
      const summary = await runAction(recipe, event);
      await prisma.automationRun.create({
        data: { recipeId: recipe.id, itemId: event.item.id, summary },
      });
    }
  }
}
