const jwt = require("jsonwebtoken");

module.exports = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};
