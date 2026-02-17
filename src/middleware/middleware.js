import { extractAndVerifyJwtClaims } from "../utils/helper.js";
import logger from "../utils/logger.js";

export const authMiddleware = async (req, res, next) => {
  const token = req.get("Authorization");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const user = extractAndVerifyJwtClaims(token);
    req.user = user;
    next();
  } catch (error) {
    logger.warn("Unauthorized access attempt", { error: error.message });
    return res.status(401).json({ error: "Unauthorized" });
  }
};
