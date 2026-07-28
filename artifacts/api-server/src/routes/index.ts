import { Router } from "express";
import healthRouter from "./health";
import brandsRouter from "./brands";
import codesRouter from "./codes";
import userRouter from "./user";
import cooldownRouter from "./cooldown";

const router = Router();

router.use(healthRouter);
router.use(brandsRouter);
router.use(codesRouter);
router.use(userRouter);
router.use(cooldownRouter);

export default router;
