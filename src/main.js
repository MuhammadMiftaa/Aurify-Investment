import express from "express";
import { authMiddleware } from "./middleware/middleware.js";
import router from "./route/route.js";
import "./utils/cron.js";
import env from "./utils/env.js";
import logger from "./utils/logger.js";
import { GRPCServer } from "./grpc/server/server.js";
import { closeChannel, closeRabbitMQConnection, getRabbitMQConnection } from "./utils/queue.js";

const web = express();
const testRouter = express.Router();

testRouter.get("/test", (req, res) => {
  res.json({ message: "Hello World" });
});

web.use(testRouter);
web.use(express.json());
web.use(authMiddleware);
web.use(router);

// Initialize RabbitMQ connection
getRabbitMQConnection();

// Start gRPC Server
const grpcServer = new GRPCServer();
grpcServer.start();

// Start HTTP Server
const httpServer = web.listen(env.HTTP_PORT || 8080, () => {
  logger.info(`HTTP Server is running on port ${env.HTTP_PORT || 8080}`);
  logger.info(`gRPC Server is running on port ${env.GRPC_PORT || 50051}`);
});

// Graceful Shutdown
const shutdown = async () => {
  logger.info("Shutting down servers...");

  // Close HTTP Server
  httpServer.close(() => {
    logger.info("HTTP server closed");
  });

  // Close gRPC Server
  await grpcServer.stop();
  logger.info("gRPC server closed");

  await closeChannel();
  await closeRabbitMQConnection();

  process.exit(0);
};

// Handle shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  shutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown();
});
