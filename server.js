import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createClient } from "redis";
import { randomBytes } from "crypto";

const app = express();
app.use(express.json());
app.use(cookieParser());

/* -------------------- Redis -------------------- */
const redis = createClient({ url: process.env.REDIS_URL });
redis.on("error", (err) => console.error("Redis error:", err));
await redis.connect();

/* -------------------- Environment -------------------- */
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = Number(process.env.ACCESS_EXPIRES);
const REFRESH_EXPIRES = Number(process.env.REFRESH_EXPIRES);
const PORT = process.env.PORT || 4000;

/* -------------------- Dummy users (example) -------------------- */
const users = {
  "admin@example.com": {
    id: "uid-admin",
    passwordHash: await bcrypt.hash("admin123", 10),
    role: "admin",
  },
  "user@example.com": {
    id: "uid-user",
    passwordHash: await bcrypt.hash("user123", 10),
    role: "user",
  },
};

/* -------------------- Token Generators -------------------- */
function signAccessToken(userId, role) {
  return jwt.sign({ sub: userId, role }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
}

function signRefreshToken(sessionId, userId) {
  return jwt.sign({ sid: sessionId, sub: userId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
}

/* -------------------- AUTH ENDPOINTS -------------------- */

// LOGIN
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users[email];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const sessionId = randomBytes(16).toString("hex");
  const refreshToken = signRefreshToken(sessionId, user.id);
  const accessToken = signAccessToken(user.id, user.role);

  // Save refresh session in Redis
  await redis.set(
    `refresh:${sessionId}`,
    JSON.stringify({ userId: user.id, role: user.role }),
    { EX: REFRESH_EXPIRES }
  );

  // Set refresh token as secure httpOnly cookie
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: REFRESH_EXPIRES * 1000,
  });

  res.json({
    message: "Login successful",
    accessToken: accessToken,
    role: user.role,
  });
});

// REFRESH
app.post("/auth/refresh", async (req, res) => {
  const token = req.cookies.refresh_token;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    const { sid, sub } = payload;

    const session = await redis.get(`refresh:${sid}`);
    if (!session) return res.status(401).json({ error: "Session expired" });

    const data = JSON.parse(session);

    const newSid = randomBytes(16).toString("hex");
    const newRefresh = signRefreshToken(newSid, sub);
    const newAccess = signAccessToken(sub, data.role);

    await redis.del(`refresh:${sid}`);
    await redis.set(
      `refresh:${newSid}`,
      JSON.stringify(data),
      { EX: REFRESH_EXPIRES }
    );

    res.cookie("refresh_token", newRefresh, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: REFRESH_EXPIRES * 1000,
    });

    res.json({ accessToken: newAccess });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// LOGOUT
app.post("/auth/logout", async (req, res) => {
  const token = req.cookies.refresh_token;
  if (token) {
    try {
      const payload = jwt.verify(token, REFRESH_SECRET);
      await redis.del(`refresh:${payload.sid}`);
    } catch (e) {}
  }
  res.clearCookie("refresh_token");
  res.json({ message: "Logged out" });
});

/* -------------------- PROTECTED ROUTE -------------------- */
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing token" });

  const token = auth.split(" ")[1];

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.get("/admin/data", authenticate, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });

  res.json({ message: "Admin secret data" });
});

app.get("/user/data", authenticate, (req, res) => {
  res.json({ message: "User data", userId: req.user.sub });
});

/* -------------------- START SERVER -------------------- */
app.listen(PORT, () => console.log(`Auth server running on port ${PORT}`));
