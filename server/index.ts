import "dotenv/config";
import { createServer } from "http";
import cors from "cors";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
const httpServer = createServer(app);
const port = parseInt(process.env.PORT || "5000", 10);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode ?? 500;
    const message = (err as Error).message ?? "Internal Server Error";
    if (!res.headersSent) res.status(status).json({ message });
  });


  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
  });
})();
