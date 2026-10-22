const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type Board = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  itemCount?: number;
};

export type Group = { id: string; boardId: string; name: string; color: string; position: number };

export type ColumnType =
  | "TEXT"
  | "LONG_TEXT"
  | "STATUS"
  | "PRIORITY"
  | "PEOPLE"
  | "DATE"
  | "TIMELINE"
  | "NUMBERS"
  | "DROPDOWN"
  | "LINK";

export type ColumnLabel = { label: string; color: string };

export type BoardColumn = {
  id: string;
  boardId: string;
  title: string;
  type: ColumnType;
  settings: string;
  position: number;
};

export function parseColumnLabels(column: BoardColumn): ColumnLabel[] | null {
  try {
    const parsed = JSON.parse(column.settings);
    if (Array.isArray(parsed?.labels)) return parsed.labels;
  } catch {
    // fall through
  }
  return null;
}

export type ColumnValue = { id: string; itemId: string; columnId: string; value: string };

export type Item = {
  id: string;
  boardId: string;
  groupId: string;
  name: string;
  archived: boolean;
  position: number;
  columnValues: ColumnValue[];
};

export type BoardDetail = Board & { groups: Group[]; columns: BoardColumn[]; items: Item[] };

export type AutomationTrigger = "STATUS_CHANGES_TO" | "ANY_COLUMN_CHANGES" | "ITEM_CREATED" | "ITEM_MOVED_TO_GROUP";
export type AutomationOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN";
export type AutomationAction =
  | "CHANGE_COLUMN"
  | "NOTIFY"
  | "CREATE_ITEM"
  | "ARCHIVE_ITEM"
  | "MOVE_ITEM_TO_GROUP"
  | "SET_DATE"
  | "PUSH_DATE";

export type AutomationRecipe = {
  id: string;
  boardId: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  triggerColumnId?: string | null;
  triggerGroupId?: string | null;
  triggerValue?: string | null;
  conditionColumnId?: string | null;
  conditionOperator?: AutomationOperator | null;
  conditionValue?: string | null;
  action: AutomationAction;
  actionColumnId?: string | null;
  actionGroupId?: string | null;
  actionValue?: string | null;
};

export type AutomationRun = { id: string; recipeId: string; itemId: string; summary: string; createdAt: string };

export type Person = { id: string; name: string; color: string; email?: string | null; createdAt: string };

export type WorkloadEntry = {
  person: Person;
  total: number;
  byStatus: Record<string, number>;
  items: { itemId: string; itemName: string; boardId: string; boardName: string; statusLabel: string }[];
};

export type DashboardWidgetType = "COUNT_BY_COLUMN" | "NUMBER_SUM" | "BATTERY" | "TIMELINE_GANTT";

export type DashboardWidget = {
  id: string;
  boardId: string;
  name: string;
  type: DashboardWidgetType;
  config: { columnId: string; targetLabel?: string };
  data: {
    counts?: Record<string, number>;
    sum?: number;
    percent?: number;
    matching?: number;
    total?: number;
    bars?: { name: string; start: string; end: string }[];
  } | null;
};

export const api = {
  listBoards: () => request<Board[]>("/boards"),
  createBoard: (name: string) => request<Board>("/boards", { method: "POST", body: JSON.stringify({ name }) }),
  getBoard: (id: string) => request<BoardDetail>(`/boards/${id}`),
  deleteBoard: (id: string) => request<void>(`/boards/${id}`, { method: "DELETE" }),

  createGroup: (boardId: string, name: string) =>
    request<Group>("/groups", { method: "POST", body: JSON.stringify({ boardId, name }) }),

  createColumn: (boardId: string, title: string, type: ColumnType) =>
    request<BoardColumn>("/columns", { method: "POST", body: JSON.stringify({ boardId, title, type }) }),

  updateColumn: (id: string, data: { title?: string; settings?: Record<string, unknown> }) =>
    request<BoardColumn>(`/columns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteColumn: (id: string) => request<void>(`/columns/${id}`, { method: "DELETE" }),

  createItem: (boardId: string, groupId: string, name: string) =>
    request<Item>("/items", { method: "POST", body: JSON.stringify({ boardId, groupId, name }) }),

  setColumnValue: (itemId: string, columnId: string, value: unknown) =>
    request<void>(`/items/${itemId}/columns/${columnId}`, { method: "PUT", body: JSON.stringify({ value }) }),

  moveItemToGroup: (itemId: string, groupId: string) =>
    request<Item>(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ groupId }) }),

  deleteItem: (id: string) => request<void>(`/items/${id}`, { method: "DELETE" }),

  listRecipes: (boardId: string) => request<AutomationRecipe[]>(`/automations/board/${boardId}`),
  createRecipe: (data: {
    boardId: string;
    name: string;
    trigger: AutomationTrigger;
    triggerColumnId?: string;
    triggerGroupId?: string;
    triggerValue?: unknown;
    conditionColumnId?: string;
    conditionOperator?: AutomationOperator;
    conditionValue?: unknown;
    action: AutomationAction;
    actionColumnId?: string;
    actionGroupId?: string;
    actionValue?: unknown;
  }) => request<AutomationRecipe>("/automations", { method: "POST", body: JSON.stringify(data) }),
  toggleRecipe: (id: string, enabled: boolean) =>
    request<AutomationRecipe>(`/automations/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  deleteRecipe: (id: string) => request<void>(`/automations/${id}`, { method: "DELETE" }),
  listRuns: (recipeId: string) => request<AutomationRun[]>(`/automations/${recipeId}/runs`),

  listWidgets: (boardId: string) => request<DashboardWidget[]>(`/dashboards/board/${boardId}`),
  createWidget: (boardId: string, name: string, type: DashboardWidgetType, columnId: string, targetLabel?: string) =>
    request<DashboardWidget>("/dashboards", {
      method: "POST",
      body: JSON.stringify({ boardId, name, type, config: { columnId, targetLabel } }),
    }),
  deleteWidget: (id: string) => request<void>(`/dashboards/${id}`, { method: "DELETE" }),

  listPeople: () => request<Person[]>("/people"),
  createPerson: (name: string, color: string, email?: string) =>
    request<Person>("/people", { method: "POST", body: JSON.stringify({ name, color, email }) }),
  deletePerson: (id: string) => request<void>(`/people/${id}`, { method: "DELETE" }),

  getWorkload: () => request<WorkloadEntry[]>("/workload"),
};
