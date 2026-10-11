import express from "express";
import eventRoutes from "./routes/eventRoutes";

export const app = express();

app.use((_request, response, next) => {
  response.header("Access-Control-Allow-Origin", "*");
  response.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use("/api/events", eventRoutes);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});
