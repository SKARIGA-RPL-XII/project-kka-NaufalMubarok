const jwt = require("jsonwebtoken");

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7);
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
}

// Wajib login
function requireAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ ok: false, message: "Unauthorized" });
    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

// Role-based
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (req.user.role !== role) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
