import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import coursesRouter from "./courses";
import studentsRouter from "./students";
import questionsRouter from "./questions";
import testsRouter from "./tests";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(coursesRouter);
router.use(studentsRouter);
router.use(questionsRouter);
router.use(testsRouter);
router.use(adminRouter);

export default router;
