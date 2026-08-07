import { Router } from "express";
import healthRouter from "./health";
import brandsRouter from "./brands";
import codesRouter from "./codes";
import userRouter from "./user";
import cooldownRouter from "./cooldown";
import adminRouter from "./admin";
import debugSentryRouter from "./debugSentry";

const router = Router();

router.use(healthRouter);
router.use(brandsRouter);
router.use(codesRouter);
router.use(userRouter);
router.use(cooldownRouter);
router.use(adminRouter);
router.use(debugSentryRouter);

export default router;
