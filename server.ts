import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "database.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Initialize DB if not exists
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({ data: [], meta: null }));
  }

  // API routes
  app.get("/api/inventory", async (req, res) => {
    try {
      const content = await fs.readFile(DB_FILE, "utf-8");
      res.json(JSON.parse(content));
    } catch (error) {
      res.status(500).json({ error: "Failed to load data" });
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const { data, meta } = req.body;
      await fs.writeFile(DB_FILE, JSON.stringify({ data, meta }));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  app.delete("/api/inventory", async (req, res) => {
    try {
      await fs.writeFile(DB_FILE, JSON.stringify({ data: [], meta: null }));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
