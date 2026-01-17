import express from "express";
import { authMiddleware } from "./middleware.js";
import router from "./route.js";

const web = express();
web.use(express.json());
web.use(authMiddleware);
web.use(router)

web.listen(3030, () => {
  console.log("Server is running on port 3030");
});
