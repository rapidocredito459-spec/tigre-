import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("game.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    display_name TEXT,
    profile_pic TEXT,
    balance REAL DEFAULT 0,
    total_bet REAL DEFAULT 0,
    required_rollover REAL DEFAULT 0,
    spent_for_bonus REAL DEFAULT 0,
    referral_count INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Create default admin if not exists
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, display_name, is_admin) VALUES (?, ?, ?, ?)")
    .run('admin', 'admin123', 'Administrador', 1);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { username, password } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO users (username, password, display_name, balance) VALUES (?, ?, ?, ?)");
      const info = stmt.run(username, password, username, 0);
      res.json({ id: info.lastInsertRowid, username, display_name: username, balance: 0, is_admin: 0 });
    } catch (e) {
      res.status(400).json({ error: "Usuário já existe" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.post("/api/user/update", (req, res) => {
    const { userId, display_name, profile_pic } = req.body;
    db.prepare("UPDATE users SET display_name = ?, profile_pic = ? WHERE id = ?")
      .run(display_name, profile_pic, userId);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(user);
  });

  app.get("/api/user/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "Usuário não encontrado" });
    }
  });

  // Deposit Routes
  app.post("/api/deposit/request", (req, res) => {
    const { userId, amount } = req.body;
    db.prepare("INSERT INTO deposits (user_id, amount) VALUES (?, ?)")
      .run(userId, amount);
    res.json({ success: true, message: "Solicitação enviada. Aguarde confirmação do administrador." });
  });

  // Admin Routes
  app.get("/api/admin/deposits", (req, res) => {
    const deposits = db.prepare(`
      SELECT d.*, u.username 
      FROM deposits d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.status = 'pending'
      ORDER BY d.created_at DESC
    `).all();
    res.json(deposits);
  });

  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users ORDER BY id DESC").all();
    res.json(users);
  });

  app.post("/api/admin/user/update", (req, res) => {
    const { userId, balance, total_bet, is_admin, password } = req.body;
    db.prepare("UPDATE users SET balance = ?, total_bet = ?, is_admin = ?, password = ? WHERE id = ?")
      .run(balance, total_bet, is_admin, password, userId);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(user);
  });

  app.post("/api/admin/deposit/confirm", (req, res) => {
    const { depositId } = req.body;
    const deposit = db.prepare("SELECT * FROM deposits WHERE id = ?").get(depositId);
    
    if (deposit && deposit.status === 'pending') {
      const rolloverRequired = deposit.amount * 2;
      db.prepare("UPDATE users SET balance = balance + ?, required_rollover = required_rollover + ? WHERE id = ?")
        .run(deposit.amount, rolloverRequired, deposit.user_id);
      db.prepare("UPDATE deposits SET status = 'confirmed' WHERE id = ?").run(depositId);
      
      // Referral logic
      if (deposit.amount >= 20) {
        const otherUser = db.prepare("SELECT id FROM users WHERE id != ? ORDER BY RANDOM() LIMIT 1").get(deposit.user_id);
        if (otherUser) {
          db.prepare("UPDATE users SET referral_count = referral_count + 1 WHERE id = ?").run(otherUser.id);
          const updatedOther = db.prepare("SELECT referral_count FROM users WHERE id = ?").get(otherUser.id);
          if (updatedOther.referral_count % 5 === 0) {
            db.prepare("UPDATE users SET balance = balance + 30 WHERE id = ?").run(otherUser.id);
          }
        }
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Depósito não encontrado ou já processado" });
    }
  });

  // Game Logic with 24% Win Rate Control
  app.post("/api/game/spin", (req, res) => {
    const { userId, bet, symbols } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    
    if (!user || user.balance < bet) return res.status(400).json({ error: "Saldo insuficiente" });

    const shouldWin = Math.random() < 0.24;
    let resultReels = [];
    let winAmount = 0;
    let winningLines = [];

    const PAYLINES = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 4, 8], [2, 4, 6]
    ];

    if (shouldWin) {
      const randomLine = PAYLINES[Math.floor(Math.random() * PAYLINES.length)];
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      
      resultReels = Array(9).fill(null).map(() => symbols[Math.floor(Math.random() * symbols.length)]);
      randomLine.forEach(idx => resultReels[idx] = randomSymbol);
      
      PAYLINES.forEach(line => {
        if (resultReels[line[0]].id === resultReels[line[1]].id && resultReels[line[1]].id === resultReels[line[2]].id) {
          winAmount += resultReels[line[0]].value * (bet / 1);
          winningLines.push(line);
        }
      });
    } else {
      resultReels = Array(9).fill(null).map(() => symbols[Math.floor(Math.random() * symbols.length)]);
      let hasWin = PAYLINES.some(line => 
        resultReels[line[0]].id === resultReels[line[1]].id && resultReels[line[1]].id === resultReels[line[2]].id
      );
      if (hasWin) {
        PAYLINES.forEach(line => {
          if (resultReels[line[0]].id === resultReels[line[1]].id && resultReels[line[1]].id === resultReels[line[2]].id) {
            resultReels[line[0]] = symbols[(symbols.indexOf(resultReels[line[0]]) + 1) % symbols.length];
          }
        });
      }
    }

    let newSpent = user.spent_for_bonus + bet;
    let bonus = 0;
    if (newSpent >= 50) {
      bonus = Math.floor(newSpent / 50) * 10;
      newSpent = newSpent % 50;
    }

    db.prepare("UPDATE users SET balance = balance - ? + ? + ?, total_bet = total_bet + ?, spent_for_bonus = ? WHERE id = ?")
      .run(bet, bonus, winAmount, bet, newSpent, userId);

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json({ 
      success: true, 
      user: updatedUser, 
      bonusAwarded: bonus,
      reels: resultReels,
      winAmount,
      winningLines
    });
  });

  app.post("/api/game/win", (req, res) => {
    const { userId, winAmount } = req.body;
    db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(winAmount, userId);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    res.json(user);
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
