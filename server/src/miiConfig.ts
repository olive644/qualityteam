/**
 * Configuração persistente da API MII.
 * Salva as credenciais num arquivo local (mii-config.json) fora do controle de versão.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../mii-config.json");

export interface MiiConfig {
  host: string;
  server: string;
  plant: string;
  query: string;
  user: string;
  pass: string;
}

const DEFAULT_CONFIG: MiiConfig = {
  host: "http://ploula3075:50000",
  server: "Plant_4196",
  plant: "4196",
  query: "AmcorMII/Reports/PlantDBLibraries/qryGetLotDtlInfo",
  user: "",
  pass: "",
};

export function loadConfig(): MiiConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // arquivo corrompido — usa padrão
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(partial: Partial<MiiConfig>): MiiConfig {
  const current = loadConfig();
  const next = { ...current, ...partial };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function getConfigSafe(): Omit<MiiConfig, "pass"> & { configured: boolean } {
  const cfg = loadConfig();
  return {
    host: cfg.host,
    server: cfg.server,
    plant: cfg.plant,
    query: cfg.query,
    user: cfg.user,
    configured: !!(cfg.user && cfg.pass),
  };
}
