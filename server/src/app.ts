import express from "express";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import profileRoutes from "./routes/profileRoutes";

export const app = express();

app.use((_request, response, next) => {
  response.header("Access-Control-Allow-Origin", "*");
  // PUT is used by PUT /api/profile
  response.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  // x-user-id identifies the user until sign-in exists (see auth/requestUser.ts)
  response.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id");
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

// Student sign-up and sign-in (calvin.edu only), backed by Supabase Auth
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/profile", profileRoutes);

app.use((_request, response) => {
  response.status(404).json({ error: "Route not found" });
});

// Must be registered last so it catches errors from every route above
app.use(errorHandler);
