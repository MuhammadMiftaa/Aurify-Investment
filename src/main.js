import express from "express";
import { authMiddleware } from "./middleware/middleware.js";
import router from "./route/route.js";
import "./utils/cron.js";
import env from "./utils/env.js";
import logger from "./utils/logger.js";

const web = express();
const testRouter = express.Router();

testRouter.get("/test", (req, res) => {
  res.json({ message: "Hello World" });
});
web.use(testRouter);

web.use(express.json());
web.use(authMiddleware);
web.use(router);

web.listen(env.HTTP_PORT || 8080, () => {
  logger.info(`Server is running on port ${env.HTTP_PORT || 8080}`);
});
