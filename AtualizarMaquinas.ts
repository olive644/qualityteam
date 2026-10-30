/**
 * Atualizar Máquinas nos Lotes Bloqueados
 *
 * Lê os lotes da coluna W (a partir da linha 7),
 * consulta a API MII embutida no qualityteam (http://localhost:4000/api/mii/lotes)
 * e preenche a máquina (WRKCTR) na coluna AA.
 *
 * PRÉ-REQUISITO: qualityteam deve estar rodando em http://localhost:4000
 * (substitui o api_mii.py — não é mais necessário rodar separado)
 */

async function main(workbook: ExcelScript.Workbook) {
  const SHEET_NAME   = "Lotes Bloqueados";
  const COL_LOTE     = "W";   // número do lote
  const COL_MAQUINA  = "AA";  // máquina (WRKCTR) — será preenchida aqui
  const HEADER_ROW   = 6;     // linha do cabeçalho (dados começam em HEADER_ROW + 1)
  const API_URL      = "http://localhost:4000/api/mii/lotes";

  // ── 1. Pegar a aba ──────────────────────────────────────────────────────────
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    console.log(`Aba "${SHEET_NAME}" não encontrada.`);
    return;
  }

  // ── 2. Descobrir a última linha com dados na coluna W ───────────────────────
  const usedRange = sheet.getUsedRange();
  if (!usedRange) {
    console.log("Aba vazia.");
    return;
  }
  const lastRow = usedRange.getLastRow().getRowIndex() + 1; // 1-based
  const firstDataRow = HEADER_ROW + 1;

  if (lastRow < firstDataRow) {
    console.log("Sem dados para processar.");
    return;
  }

  // ── 3. Ler coluna W (lotes) e AA (máquina atual) ───────────────────────────
  const loteRange    = sheet.getRange(`${COL_LOTE}${firstDataRow}:${COL_LOTE}${lastRow}`);
  const maquinaRange = sheet.getRange(`${COL_MAQUINA}${firstDataRow}:${COL_MAQUINA}${lastRow}`);

  const loteValues    = loteRange.getValues();
  const maquinaValues = maquinaRange.getValues();

  // Coletar lotes que ainda não têm máquina preenchida (AA vazia)
  const pendentes: { lote: string; rowIndex: number }[] = [];

  for (let i = 0; i < loteValues.length; i++) {
    const lote    = String(loteValues[i][0] ?? "").trim();
    const maquina = String(maquinaValues[i][0] ?? "").trim();

    if (lote && !maquina) {
      pendentes.push({ lote, rowIndex: i });
    }
  }

  if (pendentes.length === 0) {
    console.log("Nenhum lote sem máquina encontrado. Tudo já preenchido.");
    return;
  }

  console.log(`Consultando ${pendentes.length} lotes via qualityteam...`);

  // ── 4. Chamar a API em lote ─────────────────────────────────────────────────
  const lotesParaConsultar = pendentes.map(p => p.lote);

  let resultados: { lote: string; maquina?: string; erro?: string }[];

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lotesParaConsultar),
    });

    if (!response.ok) {
      console.log(`Erro HTTP ${response.status} ao chamar a API.`);
      return;
    }

    resultados = await response.json() as { lote: string; maquina?: string; erro?: string }[];
  } catch (err) {
    console.log(`Falha ao conectar na API: ${err}`);
    console.log("Verifique se o qualityteam está rodando em http://localhost:4000");
    return;
  }

  // ── 5. Escrever máquinas de volta na planilha ───────────────────────────────
  let atualizados = 0;
  let erros = 0;

  for (let i = 0; i < pendentes.length; i++) {
    const { rowIndex } = pendentes[i];
    const resultado = resultados[i];

    if (resultado?.maquina) {
      maquinaValues[rowIndex][0] = resultado.maquina;
      atualizados++;
    } else {
      if (resultado?.erro) {
        console.log(`Lote ${resultado.lote}: ${resultado.erro}`);
        erros++;
      }
    }
  }

  // Gravar tudo de uma vez (mais rápido que célula por célula)
  maquinaRange.setValues(maquinaValues);

  console.log(`Concluído: ${atualizados} máquinas preenchidas, ${erros} lotes não encontrados.`);
}
