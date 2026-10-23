import { useEffect, useMemo, useState } from "react";
import {
  api,
  type AutomationAction,
  type AutomationOperator,
  type AutomationRecipe,
  type AutomationTrigger,
  type BoardDetail,
} from "../api.js";
import { ACTION_LABELS, OPERATOR_LABELS, TRIGGER_LABELS } from "../labels.js";

const TRIGGERS: AutomationTrigger[] = ["STATUS_CHANGES_TO", "ANY_COLUMN_CHANGES", "ITEM_CREATED", "ITEM_MOVED_TO_GROUP"];
const ACTIONS: AutomationAction[] = [
  "CHANGE_COLUMN",
  "NOTIFY",
  "CREATE_ITEM",
  "ARCHIVE_ITEM",
  "MOVE_ITEM_TO_GROUP",
  "SET_DATE",
  "PUSH_DATE",
];
const OPERATORS: AutomationOperator[] = ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN"];

function describe(recipe: AutomationRecipe, board: BoardDetail): string {
  const colName = (id?: string | null) => board.columns.find((c) => c.id === id)?.title ?? "?";
  const groupName = (id?: string | null) => board.groups.find((g) => g.id === id)?.name ?? "?";
  let sentence = "Quando ";
  if (recipe.trigger === "STATUS_CHANGES_TO") {
    const v = recipe.triggerValue ? JSON.parse(recipe.triggerValue) : null;
    sentence += `a coluna "${colName(recipe.triggerColumnId)}" muda para "${v?.label ?? "?"}"`;
  } else if (recipe.trigger === "ANY_COLUMN_CHANGES") {
    sentence += recipe.triggerColumnId
      ? `a coluna "${colName(recipe.triggerColumnId)}" muda`
      : "qualquer coluna muda";
  } else if (recipe.trigger === "ITEM_MOVED_TO_GROUP") {
    sentence += recipe.triggerGroupId ? `o item é movido para o grupo "${groupName(recipe.triggerGroupId)}"` : "o item é movido para qualquer grupo";
  } else {
    sentence += "um item é criado";
  }
  if (recipe.conditionColumnId && recipe.conditionOperator) {
    const v = recipe.conditionValue ? JSON.parse(recipe.conditionValue) : null;
    sentence += `, e "${colName(recipe.conditionColumnId)}" ${recipe.conditionOperator} ${JSON.stringify(v)}`;
  }
  sentence += ", então ";
  if (recipe.action === "CHANGE_COLUMN") {
    const v = recipe.actionValue ? JSON.parse(recipe.actionValue) : null;
    sentence += `define "${colName(recipe.actionColumnId)}" = ${JSON.stringify(v)}`;
  } else if (recipe.action === "MOVE_ITEM_TO_GROUP") {
    sentence += `move o item para o grupo "${groupName(recipe.actionGroupId)}"`;
  } else if (recipe.action === "SET_DATE") {
    sentence += `define "${colName(recipe.actionColumnId)}" para hoje`;
  } else if (recipe.action === "PUSH_DATE") {
    const v = recipe.actionValue ? JSON.parse(recipe.actionValue) : 0;
    sentence += `soma ${v} dia(s) em "${colName(recipe.actionColumnId)}"`;
  } else if (recipe.action === "ARCHIVE_ITEM") {
    sentence += "arquiva o item";
  } else if (recipe.action === "CREATE_ITEM") {
    const v = recipe.actionValue ? JSON.parse(recipe.actionValue) : null;
    sentence += `cria um item chamado "${v}"`;
  } else {
    const v = recipe.actionValue ? JSON.parse(recipe.actionValue) : null;
    sentence += `notifica: "${v}"`;
  }
  return sentence;
}

export default function AutomationsPanel({ board }: { board: BoardDetail }) {
  const [recipes, setRecipes] = useState<AutomationRecipe[]>([]);
  const [runsFor, setRunsFor] = useState<string | null>(null);
  const [runs, setRuns] = useState<Awaited<ReturnType<typeof api.listRuns>>>([]);

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("STATUS_CHANGES_TO");
  const [triggerColumnId, setTriggerColumnId] = useState("");
  const [triggerValue, setTriggerValue] = useState("Done");
  const [useCondition, setUseCondition] = useState(false);
  const [conditionColumnId, setConditionColumnId] = useState("");
  const [conditionOperator, setConditionOperator] = useState<AutomationOperator>("EQUALS");
  const [conditionValue, setConditionValue] = useState("");
  const [triggerGroupId, setTriggerGroupId] = useState("");
  const [action, setAction] = useState<AutomationAction>("CHANGE_COLUMN");
  const [actionColumnId, setActionColumnId] = useState("");
  const [actionGroupId, setActionGroupId] = useState("");
  const [actionValue, setActionValue] = useState("");

  const firstStatusColumn = board.columns.find((c) => c.type === "STATUS");
  const firstDateColumn = board.columns.find((c) => c.type === "DATE");
  const firstColumn = board.columns[0];
  const firstGroup = board.groups[0];

  // Pre-fill the dropdowns with a real column/group as soon as a board is
  // available, instead of leaving them on the "coluna…" placeholder — the
  // user can still change the pick, but it should never start empty.
  useEffect(() => {
    if ((trigger === "STATUS_CHANGES_TO" || trigger === "ANY_COLUMN_CHANGES") && !triggerColumnId) {
      const fallback = trigger === "STATUS_CHANGES_TO" ? firstStatusColumn : firstColumn;
      if (fallback) setTriggerColumnId(fallback.id);
    }
    if (trigger === "ITEM_MOVED_TO_GROUP" && !triggerGroupId && firstGroup) {
      setTriggerGroupId(firstGroup.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, board.id]);

  useEffect(() => {
    if ((action === "CHANGE_COLUMN" || action === "SET_DATE" || action === "PUSH_DATE") && !actionColumnId) {
      const fallback = action === "CHANGE_COLUMN" ? firstColumn : firstDateColumn;
      if (fallback) setActionColumnId(fallback.id);
    }
    if (action === "MOVE_ITEM_TO_GROUP" && !actionGroupId && firstGroup) {
      setActionGroupId(firstGroup.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, board.id]);

  useEffect(() => {
    if (useCondition && !conditionColumnId && firstColumn) setConditionColumnId(firstColumn.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCondition]);

  async function reload() {
    setRecipes(await api.listRecipes(board.id));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  const validationError = useMemo(() => {
    if (!name.trim()) return "Dê um nome para a automação.";
    if ((trigger === "STATUS_CHANGES_TO" || trigger === "ANY_COLUMN_CHANGES") && !triggerColumnId) {
      return "Escolha a coluna do gatilho.";
    }
    if (trigger === "STATUS_CHANGES_TO" && !triggerValue.trim()) {
      return "Informe o valor de status do gatilho.";
    }
    if (useCondition && (!conditionColumnId || !conditionValue.trim())) {
      return "Preencha a coluna e o valor da condição, ou desmarque-a.";
    }
    if ((action === "CHANGE_COLUMN" || action === "SET_DATE" || action === "PUSH_DATE") && !actionColumnId) {
      return "Escolha a coluna da ação.";
    }
    if (action === "CHANGE_COLUMN" && !actionValue.trim()) {
      return "Informe o novo valor da coluna.";
    }
    if (action === "PUSH_DATE" && (!actionValue.trim() || Number.isNaN(Number(actionValue)))) {
      return "Informe um número de dias (pode ser negativo).";
    }
    if (action === "MOVE_ITEM_TO_GROUP" && !actionGroupId) {
      return "Escolha o grupo de destino.";
    }
    if ((action === "CREATE_ITEM" || action === "NOTIFY") && !actionValue.trim()) {
      return action === "CREATE_ITEM" ? "Informe o nome do novo item." : "Informe a mensagem.";
    }
    return null;
  }, [name, trigger, triggerColumnId, triggerValue, useCondition, conditionColumnId, conditionValue, action, actionColumnId, actionValue, actionGroupId]);

  async function createRecipe() {
    if (validationError) return;
    await api.createRecipe({
      boardId: board.id,
      name: name.trim(),
      trigger,
      triggerColumnId: triggerColumnId || undefined,
      triggerGroupId: trigger === "ITEM_MOVED_TO_GROUP" ? triggerGroupId || undefined : undefined,
      triggerValue: trigger === "STATUS_CHANGES_TO" ? { label: triggerValue } : undefined,
      conditionColumnId: useCondition ? conditionColumnId : undefined,
      conditionOperator: useCondition ? conditionOperator : undefined,
      conditionValue: useCondition ? safeNumberOrString(conditionValue) : undefined,
      action,
      actionColumnId:
        action === "CHANGE_COLUMN" || action === "SET_DATE" || action === "PUSH_DATE" ? actionColumnId : undefined,
      actionGroupId: action === "MOVE_ITEM_TO_GROUP" ? actionGroupId : undefined,
      actionValue:
        action === "CHANGE_COLUMN" || action === "CREATE_ITEM" || action === "NOTIFY"
          ? actionValue
          : action === "PUSH_DATE"
            ? Number(actionValue)
            : undefined,
    });
    setName("");
    reload();
  }

  function safeNumberOrString(v: string) {
    const n = Number(v);
    return v !== "" && !Number.isNaN(n) ? n : v;
  }

  async function viewRuns(recipeId: string) {
    setRunsFor(recipeId);
    setRuns(await api.listRuns(recipeId));
  }

  const statusColumn = board.columns.find((c) => c.type === "STATUS");
  const dateColumn = board.columns.find((c) => c.type === "DATE");
  const secondGroup = board.groups[1] ?? board.groups[0];

  function applyTemplate(preset: {
    name: string;
    trigger: AutomationTrigger;
    triggerColumnId?: string;
    triggerValue?: string;
    action: AutomationAction;
    actionColumnId?: string;
    actionGroupId?: string;
    actionValue?: string;
  }) {
    setName(preset.name);
    setTrigger(preset.trigger);
    setTriggerColumnId(preset.triggerColumnId ?? "");
    setTriggerValue(preset.triggerValue ?? "Done");
    setUseCondition(false);
    setAction(preset.action);
    setActionColumnId(preset.actionColumnId ?? "");
    setActionGroupId(preset.actionGroupId ?? "");
    setActionValue(preset.actionValue ?? "");
  }

  const templates = [
    {
      label: "Status muda → notificar",
      disabledReason: !statusColumn ? "precisa de uma coluna Status" : null,
      apply: () =>
        statusColumn &&
        applyTemplate({
          name: "Notificar quando status muda para Done",
          trigger: "STATUS_CHANGES_TO",
          triggerColumnId: statusColumn.id,
          triggerValue: "Done",
          action: "NOTIFY",
          actionValue: "Item concluído!",
        }),
    },
    {
      label: "Status muda → mover de grupo",
      disabledReason: !statusColumn || !secondGroup ? "precisa de uma coluna Status e um grupo" : null,
      apply: () =>
        statusColumn &&
        secondGroup &&
        applyTemplate({
          name: "Mover para outro grupo quando status muda",
          trigger: "STATUS_CHANGES_TO",
          triggerColumnId: statusColumn.id,
          triggerValue: "Done",
          action: "MOVE_ITEM_TO_GROUP",
          actionGroupId: secondGroup.id,
        }),
    },
    {
      label: "Item criado → definir data de hoje",
      disabledReason: !dateColumn ? "precisa de uma coluna Data" : null,
      apply: () =>
        dateColumn &&
        applyTemplate({
          name: "Definir data de criação",
          trigger: "ITEM_CREATED",
          action: "SET_DATE",
          actionColumnId: dateColumn.id,
        }),
    },
    {
      label: "Status muda → arquivar item",
      disabledReason: !statusColumn ? "precisa de uma coluna Status" : null,
      apply: () =>
        statusColumn &&
        applyTemplate({
          name: "Arquivar quando travado",
          trigger: "STATUS_CHANGES_TO",
          triggerColumnId: statusColumn.id,
          triggerValue: "Travado",
          action: "ARCHIVE_ITEM",
        }),
    },
  ];

  return (
    <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Receitas prontas</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Clique numa receita pra pré-preencher o formulário abaixo — você ainda pode ajustar antes de criar.
        </p>
        <div className="toolbar">
          {templates.map((t) => (
            <button
              key={t.label}
              className="secondary"
              disabled={Boolean(t.disabledReason)}
              title={t.disabledReason ?? undefined}
              onClick={t.apply}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Nova automação</h3>
        <div className="toolbar">
          <input placeholder="Nome da automação" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="toolbar">
          <span className="muted">Quando</span>
          <select value={trigger} onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}>
            {TRIGGERS.map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </option>
            ))}
          </select>
          {(trigger === "STATUS_CHANGES_TO" || trigger === "ANY_COLUMN_CHANGES") && (
            <select value={triggerColumnId} onChange={(e) => setTriggerColumnId(e.target.value)}>
              <option value="">coluna…</option>
              {board.columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          {trigger === "STATUS_CHANGES_TO" && (
            <input placeholder="valor (ex: Done)" value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} />
          )}
          {trigger === "ITEM_MOVED_TO_GROUP" && (
            <select value={triggerGroupId} onChange={(e) => setTriggerGroupId(e.target.value)}>
              <option value="">qualquer grupo</option>
              {board.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="toolbar">
          <label>
            <input type="checkbox" checked={useCondition} onChange={(e) => setUseCondition(e.target.checked)} /> e
            (condição opcional)
          </label>
          {useCondition && (
            <>
              <select value={conditionColumnId} onChange={(e) => setConditionColumnId(e.target.value)}>
                <option value="">coluna…</option>
                {board.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <select value={conditionOperator} onChange={(e) => setConditionOperator(e.target.value as AutomationOperator)}>
                {OPERATORS.map((o) => (
                  <option key={o} value={o}>
                    {OPERATOR_LABELS[o]}
                  </option>
                ))}
              </select>
              <input placeholder="valor" value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} />
            </>
          )}
        </div>

        <div className="toolbar">
          <span className="muted">então</span>
          <select value={action} onChange={(e) => setAction(e.target.value as AutomationAction)}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
          {action === "CHANGE_COLUMN" && (
            <>
              <select value={actionColumnId} onChange={(e) => setActionColumnId(e.target.value)}>
                <option value="">coluna…</option>
                {board.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <input placeholder="novo valor" value={actionValue} onChange={(e) => setActionValue(e.target.value)} />
            </>
          )}
          {(action === "CREATE_ITEM" || action === "NOTIFY") && (
            <input
              placeholder={action === "CREATE_ITEM" ? "nome do novo item" : "mensagem"}
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
            />
          )}
          {action === "SET_DATE" && (
            <select value={actionColumnId} onChange={(e) => setActionColumnId(e.target.value)}>
              <option value="">coluna de data…</option>
              {board.columns.filter((c) => c.type === "DATE").map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          {action === "PUSH_DATE" && (
            <>
              <select value={actionColumnId} onChange={(e) => setActionColumnId(e.target.value)}>
                <option value="">coluna de data…</option>
                {board.columns.filter((c) => c.type === "DATE").map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="dias (ex: 7 ou -3)"
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                style={{ width: 120 }}
              />
            </>
          )}
          {action === "MOVE_ITEM_TO_GROUP" && (
            <select value={actionGroupId} onChange={(e) => setActionGroupId(e.target.value)}>
              <option value="">grupo de destino…</option>
              {board.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <button onClick={createRecipe} disabled={Boolean(validationError)} title={validationError ?? undefined}>
          Criar automação
        </button>
        {validationError && <p className="muted" style={{ marginTop: 8 }}>{validationError}</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Automações do board</h3>
        {recipes.length === 0 && <p className="muted">Nenhuma automação criada ainda.</p>}
        {recipes.map((r) => (
          <div key={r.id} style={{ borderBottom: "1px solid #e6e9ef", padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{r.name}</strong>
              <div>
                <label style={{ marginRight: 8 }}>
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={async (e) => {
                      await api.toggleRecipe(r.id, e.target.checked);
                      reload();
                    }}
                  />{" "}
                  ativa
                </label>
                <button className="secondary" onClick={() => viewRuns(r.id)}>
                  Ver execuções
                </button>{" "}
                <button
                  className="secondary"
                  onClick={async () => {
                    await api.deleteRecipe(r.id);
                    reload();
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              {describe(r, board)}
            </p>
            {runsFor === r.id && (
              <ul className="muted">
                {runs.length === 0 && <li>Sem execuções registradas ainda.</li>}
                {runs.map((run) => (
                  <li key={run.id}>
                    {new Date(run.createdAt).toLocaleString()} — {run.summary}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
