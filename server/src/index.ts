import express from "express";
import cors from "cors";
import { boardsRouter } from "./routes/boards.js";
import { groupsRouter } from "./routes/groups.js";
import { columnsRouter } from "./routes/columns.js";
import { itemsRouter } from "./routes/items.js";
import { automationsRouter } from "./routes/automations.js";
import { dashboardsRouter } from "./routes/dashboards.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/boards", boardsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/columns", columnsRouter);
app.use("/api/items", itemsRouter);
app.use("/api/automations", automationsRouter);
app.use("/api/dashboards", dashboardsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`qualityteam API ouvindo em http://localhost:${port}`);
});
