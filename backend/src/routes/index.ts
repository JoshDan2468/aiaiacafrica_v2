import { Router } from "express";
import {
  createGetReady,
  type DatabaseConnectionCheck,
} from "../controllers/ready.controller";
import { getHealth } from "../controllers/health.controller";

interface ApiRouterDependencies {
  readonly checkDatabaseConnection?: DatabaseConnectionCheck;
  readonly authRouter?: Router;
  readonly adminRouter?: Router;
  readonly adminInvitationRouter?: Router;
  readonly delegateRouter?: Router;
  readonly paymentRouter?: Router;
  readonly studentVerificationRouter?: Router;
  readonly commercialApplicationRouter?: Router;
  readonly abstractSubmissionRouter?: Router;
  readonly enquiryRouter?: Router;
  readonly reportRouter?: Router;
  readonly communicationRouter?: Router;
  readonly communicationPublicRouter?: Router;
  readonly emailVerificationRouter?: Router;
  readonly registrationRecoveryRouter?: Router;
}

export function createApiRouter(
  dependencies: ApiRouterDependencies = {},
): Router {
  const router = Router();
  const getReady = dependencies.checkDatabaseConnection
    ? createGetReady(dependencies.checkDatabaseConnection)
    : createGetReady();

  router.get("/health", getHealth);
  router.get("/ready", getReady);
  if (dependencies.authRouter) router.use("/auth", dependencies.authRouter);
  if (dependencies.delegateRouter) router.use(dependencies.delegateRouter);
  if (dependencies.paymentRouter) router.use(dependencies.paymentRouter);
  if (dependencies.studentVerificationRouter)
    router.use(dependencies.studentVerificationRouter);
  if (dependencies.emailVerificationRouter)
    router.use(dependencies.emailVerificationRouter);
  if (dependencies.registrationRecoveryRouter)
    router.use(dependencies.registrationRecoveryRouter);
  if (dependencies.commercialApplicationRouter)
    router.use(dependencies.commercialApplicationRouter);
  if (dependencies.abstractSubmissionRouter)
    router.use(dependencies.abstractSubmissionRouter);
  if (dependencies.enquiryRouter) router.use(dependencies.enquiryRouter);
  if (dependencies.reportRouter)
    router.use("/admin/reports", dependencies.reportRouter);
  if (dependencies.communicationPublicRouter)
    router.use("/communications", dependencies.communicationPublicRouter);
  if (dependencies.communicationRouter)
    router.use("/admin/communications", dependencies.communicationRouter);
  if (dependencies.adminInvitationRouter)
    router.use("/admin/invitations", dependencies.adminInvitationRouter);
  if (dependencies.adminRouter) router.use("/admin", dependencies.adminRouter);

  return router;
}
