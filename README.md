# qualityteam

Aplicação de gestão de trabalho (boards, colunas, automações e dashboards)
inspirada nos conceitos públicos do monday.com — construída de forma
independente, sem copiar código ou ativos proprietários.

## Base de pesquisa (fontes públicas)

O modelo de dados e a terminologia seguem a documentação pública da API do
monday.com (`developer.monday.com`) e a central de ajuda (`support.monday.com`):

- **Board** → **Group** → **Item** (linha) → **Column value** (valor por
  coluna, chaveado pelo id da coluna). Esse é o modelo descrito na própria
  API GraphQL pública do monday.com (`boards`, `items_page`, `column_values`).
- **Colunas** têm um `type` (status, people, date, numbers, text, dropdown,
  …) que define como o valor é validado e renderizado.
- **Automações** são descritas pela monday como "recipes": uma frase
  `quando <trigger> [e <condição>] então <ação>`
  (ex.: "when status changes to Done, notify person in Owner column").
- **Dashboards** agregam dados de um ou mais boards em widgets (contagem,
  gráfico, etc.).

Nenhum código-fonte, asset visual ou texto do monday.com foi copiado — o que
foi reaproveitado é o *modelo conceitual* (nomes de entidades e formato das
regras de automação), que é a base factual observável de qualquer usuário da
plataforma.

## Estrutura

- `server/` — API REST em Node.js + TypeScript + Express + Prisma (SQLite em
  dev). Modela boards/groups/items/columns, motor de automações e widgets de
  dashboard.
- `web/` — Frontend em React + Vite + TypeScript.

## Rodando localmente

```bash
# API
cd server
npm install
npx prisma migrate dev --name init
npm run dev   # http://localhost:4000

# Frontend
cd web
npm install
npm run dev   # http://localhost:5173
```
