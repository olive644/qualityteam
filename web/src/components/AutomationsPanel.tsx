import { useEffect, useState } from "react";
import {
  api,
  type AutomationAction,
  type AutomationOperator,
  type AutomationRecipe,
  type AutomationTrigger,
  type BoardDetail,
} from "../api.js";

const TRIGGERS: AutomationTrigger[] = ["STATUS_CHANGES_TO", "ANY_COLUMN_CHANGES", "ITEM_CREATED"];
const ACTIONS: AutomationAction[] = ["CHANGE_COLUMN", "NOTIFY", "CREATE_ITEM", "ARCHIVE_ITEM"];
const OPERATORS: AutomationOperator[] = ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN"];

function describe(recipe: AutomationRecipe, board: BoardDetail): string {
  const colName = (id?: string | null) => board.columns.find((c) => c.id === id)?.title ?? "?";
  let sentence = "Quando ";
  if (recipe.trigger === "STATUS_CHANGES_TO") {
    const v = recipe.triggerValue ? JSON.parse(recipe.triggerValue) : null;
    sentence += `a coluna "${colName(recipe.triggerColumnId)}" muda para "${v?.label ?? "?"}"`;
  } else if (recipe.trigger === "ANY_COLUMN_CHANGES") {
    sentence += recipe.triggerColumnId
      ? `a coluna "${colName(recipe.triggerColumnId)}" muda`
      : "qualquer coluna muda";
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
  const [action, setAction] = useState<AutomationAction>("CHANGE_COLUMN");
  const [actionColumnId, setActionColumnId] = useState("");
  const [actionValue, setActionValue] = useState("");

  async function reload() {
    setRecipes(await api.listRecipes(board.id));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  async function createRecipe() {
    if (!name.trim()) return;
    await api.createRecipe({
      boardId: board.id,
      name: name.trim(),
      trigger,
      triggerColumnId: triggerColumnId || undefined,
      triggerValue: trigger === "STATUS_CHANGES_TO" ? { label: triggerValue } : undefined,
      conditionColumnId: useCondition ? conditionColumnId : undefined,
      conditionOperator: useCondition ? conditionOperator : undefined,
      conditionValue: useCondition ? safeNumberOrString(conditionValue) : undefined,
      action,
      actionColumnId: action === "CHANGE_COLUMN" ? actionColumnId : undefined,
      actionValue:
        action === "CHANGE_COLUMN" || action === "CREATE_ITEM" || action === "NOTIFY" ? actionValue : undefined,
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

  return (
    <div>
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
                {t}
              </option>
            ))}
          </select>
          {trigger !== "ITEM_CREATED" && (
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
                    {o}
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
                {a}
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
        </div>

        <button onClick={createRecipe}>Criar automação</button>
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
