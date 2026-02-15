import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import logger from "./logger.js";
import env from "./env.js";
import { PrismaClient } from "../../generated/prisma/index.js";

//$ Database connection pool configuration
const poolConfig = {
  connectionString: env.DATABASE_URL,
  max: env.DB_MAX_OPEN_CONN,
  min: env.DB_MIN_IDLE_CONN,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
};

logger.info("Database pool configuration", {
  max: poolConfig.max,
  min: poolConfig.min,
  idleTimeoutMillis: poolConfig.idleTimeoutMillis,
  connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
});

//$ Create PostgreSQL connection pool
const pool = new pg.Pool(poolConfig);

//$ Create Prisma adapter
const adapter = new PrismaPg(pool);

//$ Create Prisma client
export const prismaClient = new PrismaClient({
  adapter,
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

//$ Create event listeners for Prisma client
prismaClient.$on("error", (e) => {
  logger.error(e);
});

prismaClient.$on("warn", (e) => {
  logger.warn(e);
});

prismaClient.$on("info", (e) => {
  logger.info(e);
});

prismaClient.$on("query", (e) => {
  logger.info(e);
});
