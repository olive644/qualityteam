export const DEFAULT_STATUS_LABELS = [
  { label: "Não iniciado", color: "#c4c4c4" },
  { label: "Em progresso", color: "#fdab3d" },
  { label: "Done", color: "#00c875" },
  { label: "Travado", color: "#e2445c" },
];

export const DEFAULT_PRIORITY_LABELS = [
  { label: "Nenhuma", color: "#c4c4c4" },
  { label: "Baixa", color: "#579bfc" },
  { label: "Média", color: "#ffcb00" },
  { label: "Alta", color: "#fdab3d" },
  { label: "Crítica", color: "#ff5ac4" },
];

export function defaultSettingsFor(type: string): Record<string, unknown> {
  if (type === "STATUS") return { labels: DEFAULT_STATUS_LABELS };
  if (type === "PRIORITY") return { labels: DEFAULT_PRIORITY_LABELS };
  return {};
}
