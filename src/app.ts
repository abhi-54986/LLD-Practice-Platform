import express, { ErrorRequestHandler } from "express";
import { apiRouter } from "./routes/api.js";
import { AppError } from "./errors/AppError.js";

const app = express();
app.use(express.json());
app.use("/api", apiRouter);

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    return;
  }
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
};

app.use(errorHandler);

export default app;