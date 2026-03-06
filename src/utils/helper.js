import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import env from "./env.js";
import logger from "./logger.js";

dotenv.config();

export const extractAndVerifyJwtClaims = (token, secret) => {
  try {
    // Remove "Bearer " prefix if present
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    // Use provided secret or fallback to environment variable
    const jwtSecret = secret || env.JWT_SECRET_KEY;

    if (!jwtSecret) {
      throw new Error("JWT secret is not configured");
    }

    // Verify and decode JWT
    const decoded = jwt.verify(cleanToken, jwtSecret);

    // Return structured claims
    return {
      email: decoded.email,
      id: decoded.id,
      username: decoded.username,
    };
  } catch (error) {
    throw new Error(`Failed to verify JWT: ${error.message}`);
  }
};

export const validate = (schema, request) => {
  const result = schema.validate(request, {
    abortEarly: false,
    allowUnknown: false,
  });
  if (result.error) {
    logger.debug(result.error.message);
    throw new Error(400, result.error.message);
  } else {
    return result.value;
  }
};