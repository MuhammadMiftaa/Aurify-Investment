import { extractAndVerifyJwtClaims } from "./helper.js";

export const authMiddleware = async (req, res, next) => {
  const token = req.get("Authorization");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const user = await extractAndVerifyJwtClaims(token);
    req.user = user;
    next();
  } catch (error) {
    console.log("Error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
