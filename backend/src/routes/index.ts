import { Router } from "express";
import authRouter from "../modules/auth/auth.route.js";
import pollRouter from "../modules/poll/poll.route.js";
import publicRouter from "../modules/poll/public.route.js";
import responseRouter from "../modules/response/response.route.js";

const rootRouter = Router();

rootRouter.use("/auth", authRouter);
rootRouter.use("/polls", pollRouter);
rootRouter.use("/public/polls", publicRouter);
rootRouter.use("/responses", responseRouter);

export default rootRouter;
