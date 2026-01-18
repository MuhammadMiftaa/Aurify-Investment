import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

dotenv.config();

/**
 * ~ Extract JWT token and return claims
 * @param {string} token - JWT token string
 * @returns {Object} - Decoded claims with email, id, and username
 */
export const extractJwtClaims = (token) => {
  try {
    // Remove "Bearer " prefix if present
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    // Decode JWT without verification (use jwt.verify if you need to verify signature)
    const decoded = jwt.decode(cleanToken);

    if (!decoded) {
      throw new Error("Invalid token");
    }

    // Return structured claims
    return {
      email: decoded.email,
      id: decoded.id,
      username: decoded.username,
    };
  } catch (error) {
    throw new Error(`Failed to extract JWT claims: ${error.message}`);
  }
};

/**
 * ~ Extract and verify JWT token with secret
 * @param {string} token - JWT token string
 * @param {string} secret - Secret key for verification (optional, uses JWT_SECRET_KEY from env if not provided)
 * @returns {Object} - Verified and decoded claims
 */
export const extractAndVerifyJwtClaims = (token, secret) => {
  try {
    // Remove "Bearer " prefix if present
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;

    // Use provided secret or fallback to environment variable
    const jwtSecret = secret || process.env.JWT_SECRET_KEY;

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

/**
 * ~ Generate a random UUID v4
 * @returns {string} - UUID v4 string (e.g., "a79a39e5-d70f-41ae-b7e6-36246a99172d")
 */
export const generateUUID = () => {
  return randomUUID();
};
