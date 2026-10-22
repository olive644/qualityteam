import type { AutomationAction, AutomationOperator, AutomationTrigger, ColumnType } from "./api.js";

export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  TEXT: "Texto",
  LONG_TEXT: "Texto longo",
  STATUS: "Status",
  PRIORITY: "Prioridade",
  PEOPLE: "Pessoas",
  DATE: "Data",
  TIMELINE: "Cronograma",
  NUMBERS: "Números",
  DROPDOWN: "Lista suspensa",
  LINK: "Link",
};

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  STATUS_CHANGES_TO: "o status muda para",
  ANY_COLUMN_CHANGES: "uma coluna muda",
  ITEM_CREATED: "um item é criado",
  ITEM_MOVED_TO_GROUP: "o item é movido para um grupo",
};

export const OPERATOR_LABELS: Record<AutomationOperator, string> = {
  EQUALS: "é igual a",
  NOT_EQUALS: "é diferente de",
  GREATER_THAN: "é maior que",
  LESS_THAN: "é menor que",
};

export const ACTION_LABELS: Record<AutomationAction, string> = {
  CHANGE_COLUMN: "alterar uma coluna",
  NOTIFY: "notificar",
  CREATE_ITEM: "criar um item",
  ARCHIVE_ITEM: "arquivar o item",
  MOVE_ITEM_TO_GROUP: "mover o item para um grupo",
  SET_DATE: "definir uma data para hoje",
};
