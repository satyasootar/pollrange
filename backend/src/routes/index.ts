import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import authRouter from "../modules/auth/auth.route.js";
import pollRouter from "../modules/poll/poll.route.js";
import publicRouter from "../modules/poll/public.route.js";
import responseRouter from "../modules/response/response.route.js";
import analyticsRouter from "../modules/analytics/analytics.route.js";
import formRouter from "../modules/form/form.route.js";
import formPublicRouter from "../modules/form/form.public.route.js";
import formResponseRouter from "../modules/form-response/form-response.route.js";
import formAnalyticsRouter from "../modules/form-analytics/form-analytics.route.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const rootRouter = Router();

// Attach user if a token is present, but don't block anonymous access.
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  verifyJWT(req, res, () => next());
};

rootRouter.use("/auth", authRouter);
rootRouter.use("/polls", pollRouter);
rootRouter.use("/public/polls", publicRouter);
rootRouter.use("/responses", responseRouter);
rootRouter.use("/analytics", analyticsRouter);

rootRouter.use("/forms", formRouter);
rootRouter.use("/public/forms", optionalAuth, formPublicRouter);
rootRouter.use("/form-responses", formResponseRouter);
rootRouter.use("/form-analytics", formAnalyticsRouter);

export default rootRouter;
