import express from "express";
import {
  authenticate,
  errorHandler,
  notFoundHandler,
  requestIDMiddleware,
  requestLogger,
} from "./middleware/middleware.js";
import router from "./route/route.js";
import "./utils/cron.js";
import env from "./utils/env.js";
import logger from "./utils/logger.js";
import { GRPCServer } from "./grpc/server/server.js";
import {
  closeChannel,
  closeRabbitMQConnection,
  getRabbitMQConnection,
} from "./utils/queue.js";
import {
  HTTPServerService,
  LogHTTPServerClosed,
  LogHTTPServerStarted,
  LogShutdownStarted,
  LogUncaughtException,
  LogUnhandledRejection,
  MainService,
} from "./utils/log.js";

const web = express();
const testRouter = express.Router();

testRouter.get("/test", (req, res) => {
  res.json({ message: "Hello World" });
});

web.use(testRouter);
web.use(express.json());
// Middleware order: requestID → authenticate → requestLogger → router
web.use(requestIDMiddleware);
web.use(authenticate);
web.use(requestLogger);
web.use(router);
web.use(notFoundHandler);
web.use(errorHandler);

// Initialize RabbitMQ connection
getRabbitMQConnection();

// Start gRPC Server
const grpcServer = new GRPCServer();
grpcServer.start();

// Start HTTP Server
const httpServer = web.listen(env.HTTP_PORT || 8080, () => {
  logger.info(LogHTTPServerStarted, {
    service: HTTPServerService,
    port: env.HTTP_PORT || 8080,
  });
});

// Graceful Shutdown
const shutdown = async () => {
  logger.info(LogShutdownStarted, { service: MainService });

  httpServer.close(() => {
    logger.info(LogHTTPServerClosed, { service: HTTPServerService });
  });

  await grpcServer.stop();

  await closeChannel();
  await closeRabbitMQConnection();

  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (error) => {
  logger.error(LogUncaughtException, {
    service: MainService,
    error: error.message,
  });
  shutdown();
});

process.on("unhandledRejection", (reason) => {
  logger.error(LogUnhandledRejection, {
    service: MainService,
    error: reason instanceof Error ? reason.message : String(reason),
  });
  shutdown();
});
