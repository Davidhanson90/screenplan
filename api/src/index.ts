import cors from "cors";
import express from "express";
import { setupRoutes } from "./routes.js";

const app = express();
app.set("trust proxy", "loopback, linklocal, uniquelocal");

const allowed = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "https://davidhanson90.github.io"
]);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowed.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for ${origin}`));
    }
  })
);

setupRoutes(app);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`screenplan api listening on http://localhost:${port}`);
});
