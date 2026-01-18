import express from "express";
import { authMiddleware } from "./middleware.js";
import router from "./route.js";
import "./cron.js";

const web = express();
const testRouter = express.Router();

testRouter.get("/test", (req, res) => {
  res.json({ message: "Hello World" });
});
web.use(testRouter);

web.use(express.json());
web.use(authMiddleware);
web.use(router);

web.listen(8080, () => {
  console.log("Server is running on port 8080");
});
