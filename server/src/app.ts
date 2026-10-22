import express from "express";
import cors from "cors";
import { boardsRouter } from "./routes/boards.js";
import { groupsRouter } from "./routes/groups.js";
import { columnsRouter } from "./routes/columns.js";
import { itemsRouter } from "./routes/items.js";
import { automationsRouter } from "./routes/automations.js";
import { dashboardsRouter } from "./routes/dashboards.js";
import { peopleRouter } from "./routes/people.js";
import { workloadRouter } from "./routes/workload.js";

export const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/boards", boardsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/columns", columnsRouter);
app.use("/api/items", itemsRouter);
app.use("/api/automations", automationsRouter);
app.use("/api/dashboards", dashboardsRouter);
app.use("/api/people", peopleRouter);
app.use("/api/workload", workloadRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));
