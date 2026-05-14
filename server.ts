import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("game.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT DEFAULT 'Dante',
    current_canto INTEGER DEFAULT 0,
    laurel_leaves INTEGER DEFAULT 0,
    puzzle_score INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER,
    verse_id TEXT,
    completed INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, verse_id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;
  console.log(`Server starting in ${process.env.NODE_ENV || 'development'} mode`);

  app.use(express.json());

  // API Routes
  app.get("/api/user", (req, res) => {
    let user = db.prepare("SELECT * FROM users LIMIT 1").get();
    if (!user) {
      db.prepare("INSERT INTO users (username) VALUES ('Dante')").run();
      user = db.prepare("SELECT * FROM users LIMIT 1").get();
    }
    res.json(user);
  });

  app.post("/api/progress", (req, res) => {
    const { userId, verseId } = req.body;
    db.prepare("INSERT OR REPLACE INTO progress (user_id, verse_id, completed) VALUES (?, ?, 1)").run(userId, verseId);
    res.json({ success: true });
  });

  app.post("/api/user/update", (req, res) => {
    const { userId, currentCanto, laurelLeaves, puzzleScore } = req.body;
    db.prepare("UPDATE users SET current_canto = ?, laurel_leaves = ?, puzzle_score = ? WHERE id = ?").run(currentCanto, laurelLeaves, puzzleScore, userId);
    res.json({ success: true });
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
