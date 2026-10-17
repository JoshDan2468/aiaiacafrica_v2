import cors from "cors";
import express, {
  type Request,
  type RequestHandler,
  type Router,
} from "express";
import helmet from "helmet";
import { createAuthController } from "./controllers/auth.controller";
import { createAdminInvitationController } from "./controllers/adminInvitation.controller";
import { createAdminUserController } from "./controllers/adminUser.controller";
import { createDelegateController } from "./controllers/delegate.controller";
import { createPaymentController } from "./controllers/payment.controller";
import { createAdminPaymentController } from "./controllers/adminPayment.controller";
import { createAdminOverviewController } from "./controllers/adminOverview.controller";
import { createStudentVerificationController } from "./controllers/studentVerification.controller";
import { createCommercialApplicationController } from "./controllers/commercialApplication.controller";
import { createAbstractSubmissionController } from "./controllers/abstractSubmission.controller";
import { createEnquiryController } from "./controllers/enquiry.controller";
import { createEmailVerificationController } from "./controllers/emailVerification.controller";
import { createRegistrationRecoveryController } from "./controllers/registrationRecovery.controller";
import { createReportController } from "./controllers/report.controller";
import { getDatabasePool } from "./config/database";
import { env } from "./config/env";
import { createSessionMiddleware } from "./config/session";
import { createPublicError, errorHandler } from "./middleware/error.middleware";
import { createLoginRateLimiter } from "./middleware/loginRateLimit.middleware";
import { createInvitationRateLimiter } from "./middleware/invitationRateLimit.middleware";
import { createAdminMutationSecurity } from "./middleware/adminMutationSecurity.middleware";
import { createDelegateRegistrationRateLimiter } from "./middleware/delegateRegistrationRateLimit.middleware";
import { createPaymentRateLimiter } from "./middleware/paymentRateLimit.middleware";
import { createPaystackWebhookSignatureMiddleware } from "./middleware/paystackWebhookSignature.middleware";
import { createStudentEvidenceUploadRateLimiter } from "./middleware/studentEvidenceRateLimit.middleware";
import { createStudentVerificationWorkflowRateLimiter } from "./middleware/studentVerificationRateLimit.middleware";
import { createCommercialApplicationRateLimiter } from "./middleware/commercialApplicationRateLimit.middleware";
import { createAbstractSubmissionRateLimiter } from "./middleware/abstractSubmissionRateLimit.middleware";
import { createEnquiryRateLimiter } from "./middleware/enquiryRateLimit.middleware";
import { createEmailVerificationRateLimiter } from "./middleware/emailVerificationRateLimit.middleware";
import {
  enforceStudentEvidenceRequestSize,
  parseStudentEvidenceMultipart,
} from "./middleware/studentEvidenceUpload.middleware";
import { notFoundHandler } from "./middleware/notFound.middleware";
import { createRequireAuth } from "./middleware/requireAuth.middleware";
import { requestLogger } from "./middleware/requestLogger.middleware";
import { requestId } from "./middleware/requestId.middleware";
import { postgresAdminRepository } from "./repositories/admin.repository";
import { postgresAdminAuditRepository } from "./repositories/adminAudit.repository";
import { postgresAdminInvitationRepository } from "./repositories/adminInvitation.repository";
import { postgresDelegateRepository } from "./repositories/delegate.repository";
import { postgresDelegateRegistrationAcknowledgementRepository } from "./repositories/delegateRegistrationAcknowledgement.repository";
import { postgresPaymentRepository } from "./repositories/payment.repository";
import { postgresPaymentCompletionRepository } from "./repositories/paymentCompletion.repository";
import { postgresManualPaymentRepository } from "./repositories/manualPayment.repository";
import { postgresAdminOverviewRepository } from "./repositories/adminOverview.repository";
import { postgresStudentVerificationRepository } from "./repositories/studentVerification.repository";
import { postgresStudentEvidenceRepository } from "./repositories/studentEvidence.repository";
import { postgresStudentVerificationWorkflowRepository } from "./repositories/studentVerificationWorkflow.repository";
import { postgresCommercialApplicationRepository } from "./repositories/commercialApplication.repository";
import { createAbstractSubmissionRepository } from "./repositories/abstractSubmission.repository";
import { createAbstractAnalysisRepository } from "./repositories/abstractAnalysis.repository";
import { AbstractAnalysisService } from "./services/abstractAnalysis.service";
import { postgresEnquiryRepository } from "./repositories/enquiry.repository";
import { postgresReportRepository } from "./repositories/report.repository";
import { postgresCommunicationRepository } from "./repositories/communication.repository";
import { postgresContactRepository } from "./repositories/contact.repository";
import { postgresEmailVerificationRepository } from "./repositories/emailVerification.repository";
import { postgresRegistrationRecoveryRepository } from "./repositories/registrationRecovery.repository";
import { createAdminRouter } from "./routes/admin.routes";
import { createAdminInvitationRouter } from "./routes/adminInvitation.routes";
import { createAuthRouter } from "./routes/auth.routes";
import { createDelegateRouter } from "./routes/delegate.routes";
import { createPaymentRouter } from "./routes/payment.routes";
import { createStudentVerificationRouter } from "./routes/studentVerification.routes";
import { createCommercialApplicationRouter } from "./routes/commercialApplication.routes";
import { createAbstractSubmissionRouter } from "./routes/abstractSubmission.routes";
import { createEnquiryRouter } from "./routes/enquiry.routes";
import { createReportRouter } from "./routes/report.routes";
import { createCommunicationPublicRouter } from "./routes/communicationPublic.routes";
import { createCommunicationRouter } from "./routes/communication.routes";
import { createEmailVerificationRouter } from "./routes/emailVerification.routes";
import { createRegistrationRecoveryRouter } from "./routes/registrationRecovery.routes";
import { createApiRouter } from "./routes";
import { createCheckInController } from "./controllers/checkIn.controller";
import { createAccreditationController } from "./controllers/accreditation.controller";
import { postgresCheckInRepository } from "./repositories/checkIn.repository";
import { postgresAccreditationRepository } from "./repositories/accreditation.repository";
import { CheckInService } from "./services/checkIn.service";
import { AccreditationService } from "./services/accreditation.service";
import { AuthService } from "./services/auth.service";
import { AdminInvitationService } from "./services/adminInvitation.service";
import { AdminUserService } from "./services/adminUser.service";
import { DelegateService } from "./services/delegate.service";
import { DelegateRegistrationAcknowledgementService } from "./services/delegateRegistrationAcknowledgement.service";
import { DelegatePaymentService } from "./services/delegatePayment.service";
import { PaymentCompletionService } from "./services/paymentCompletion.service";
import { ManualPaymentService } from "./services/manualPayment.service";
import { AdminOverviewService } from "./services/adminOverview.service";
import { StudentVerificationService } from "./services/studentVerification.service";
import { StudentEvidenceService } from "./services/studentEvidence.service";
import { StudentVerificationWorkflowService } from "./services/studentVerificationWorkflow.service";
import { CommercialApplicationService } from "./services/commercialApplication.service";
import { AbstractSubmissionService } from "./services/abstractSubmission.service";
import { EnquiryService } from "./services/enquiry.service";
import { ReportService } from "./services/report.service";
import { CommunicationService } from "./services/communication.service";
import { ContactService } from "./services/contact.service";
import { EmailVerificationService } from "./services/emailVerification.service";
import { RegistrationNotificationService } from "./services/registrationNotification.service";
import { RegistrationRecoveryService } from "./services/registrationRecovery.service";
import {
  createStudentEvidenceProviders,
  type StudentEvidenceProviders,
} from "./studentEvidence/providers";
import { PaymentService } from "./payments/payment.service";
import { FlutterwaveProvider } from "./payments/providers/flutterwave.provider";
import { createFlutterwaveWebhookSignatureMiddleware } from "./middleware/flutterwaveWebhookSignature.middleware";
import { PaystackProvider } from "./payments/providers/paystack.provider";
import { EmailService } from "./email/email.service";
import { MailjetProvider } from "./email/providers/mailjet.provider";

interface ApplicationOptions {
  readonly apiRouter?: Router;
  readonly sessionMiddleware?: RequestHandler;
  readonly clientOrigins?: readonly string[];
  readonly requestLogger?: RequestHandler;
}

// Build the middleware pipeline. Optional dependencies keep health/error behavior easy to test.
export function createApplication(
  options: ApplicationOptions = {},
): express.Express {
  const app = express();
  const clientOrigins = options.clientOrigins ?? env.clientOrigins;

  app.disable("x-powered-by");
  app.set("json escape", true);
  app.set("trust proxy", env.trustProxyHops);

  app.use(requestId);
  app.use(options.requestLogger ?? requestLogger);
  app.use(
    helmet({
      frameguard: { action: "deny" },
      hsts:
        env.nodeEnv === "production"
          ? { maxAge: 31_536_000, includeSubDomains: true }
          : false,
    }),
  );
  app.use((_request, response, next) => {
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });
  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          clientOrigins.includes(origin) ||
          (process.env.COMMUNICATIONS_PUBLIC_API_URL &&
            origin ===
              new URL(process.env.COMMUNICATIONS_PUBLIC_API_URL).origin)
        ) {
          callback(null, true);
          return;
        }

        callback(createPublicError(403, "Origin not allowed"));
      },
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(
    express.json({
      limit: "100kb",
      verify(request, _response, buffer) {
        // Paystack signs these exact bytes; parsing/re-serializing would invalidate the signature.
        const expressRequest = request as Request;
        if (
          expressRequest.originalUrl.split("?")[0] ===
          "/api/payments/paystack/webhook"
        ) {
          expressRequest.rawBody = Buffer.from(buffer);
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  if (options.sessionMiddleware) app.use(options.sessionMiddleware);

  app.use("/api", options.apiRouter ?? createApiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Wire the real database, session store, authentication service, and protected routes for startup.
export function createConfiguredApplication(
  options: {
    onCommunicationServiceCreated?: (service: CommunicationService) => void;
    onPaymentServiceCreated?: (service: DelegatePaymentService) => void;
    studentEvidenceProviders?: StudentEvidenceProviders;
  } = {},
): express.Express {
  const pool = getDatabasePool();
  if (!pool)
    throw new Error(
      "DATABASE_URL is required to configure admin authentication",
    );
  if (!env.sessionSecret) {
    throw new Error(
      "SESSION_SECRET is required to configure admin authentication",
    );
  }

  const authService = new AuthService(postgresAdminRepository);
  const emailProvider = env.mailjet ? new MailjetProvider(env.mailjet) : null;
  const emailService = new EmailService(
    emailProvider,
    env.adminFrontendUrl,
    env.publicFrontendUrl,
  );
  const invitationService = new AdminInvitationService({
    invitations: postgresAdminInvitationRepository,
    admins: postgresAdminRepository,
    audits: postgresAdminAuditRepository,
    emailService,
    expiryHours: env.adminInvitationExpiryHours,
    allowedEmailDomains: env.adminAllowedEmailDomains,
  });
  const emailVerificationService = new EmailVerificationService(
    postgresEmailVerificationRepository,
    emailService,
    env.emailVerificationTokenTtlHours,
  );
  const registrationRecoveryService = new RegistrationRecoveryService(
    postgresRegistrationRecoveryRepository,
    emailService,
    env.registrationRecoveryTokenTtlMinutes,
    env.registrationContinuationTokenTtlHours,
  );
  const adminUserService = new AdminUserService(
    postgresAdminRepository,
    postgresAdminAuditRepository,
  );
  const registrationNotificationService = new RegistrationNotificationService(
    postgresRegistrationRecoveryRepository,
    emailService,
    env.registrationNotificationRoles,
    undefined,
    env.registrationNotificationEmail,
  );
  const delegateService = new DelegateService(
    postgresDelegateRepository,
    undefined,
    new DelegateRegistrationAcknowledgementService(
      postgresDelegateRegistrationAcknowledgementRepository,
      emailService,
    ),
    emailVerificationService,
    registrationNotificationService,
  );
  const studentVerificationService = new StudentVerificationService(
    postgresStudentVerificationRepository,
    undefined,
    env.studentEvidenceTokenTtlHours,
    undefined,
    undefined,
    emailVerificationService,
    registrationNotificationService,
  );
  let studentEvidenceService: StudentEvidenceService | undefined;
  if (env.studentEvidenceEnabled) {
    const { storage, scanner } = createStudentEvidenceProviders(
      {
        production: env.nodeEnv === "production",
        localStorageDirectory: env.studentEvidenceStorageDirectory,
      },
      options.studentEvidenceProviders,
    );
    studentEvidenceService = new StudentEvidenceService(
      postgresStudentEvidenceRepository,
      storage,
      scanner,
    );
  }
  const studentVerificationWorkflowService =
    new StudentVerificationWorkflowService(
      postgresStudentVerificationWorkflowRepository,
      emailService,
      env.studentEvidenceTokenTtlHours,
      env.studentVerificationRecoveryTokenTtlMinutes,
    );
  const commercialApplicationService = new CommercialApplicationService(
    postgresCommercialApplicationRepository,
    emailService,
  );
  const analysisRepository = env.abstractAi
    ? createAbstractAnalysisRepository(env.abstractAi)
    : null;
  const abstractAnalysisService = new AbstractAnalysisService(
    analysisRepository,
    null,
  );
  const abstractSubmissionService = new AbstractSubmissionService(
    createAbstractSubmissionRepository(
      undefined,
      undefined,
      analysisRepository
        ? (client, submissionId, historyId) =>
            analysisRepository.enqueue(client, submissionId, historyId)
        : undefined,
    ),
    emailService,
    env.abstractSubmissionDeadline,
    env.abstractContinuationTokenTtlHours,
    env.abstractRecoveryTokenTtlMinutes,
  );
  const enquiryService = new EnquiryService(
    postgresEnquiryRepository,
    emailService,
    env.enquiryNotificationRoles,
  );
  const paystackProvider = env.paystack
    ? new PaystackProvider(env.paystack.secretKey)
    : null;
  const completionService = new PaymentCompletionService(
    postgresPaymentCompletionRepository,
    emailService,
    env.paymentNotificationRoles,
  );
  const paymentService = new DelegatePaymentService(
    postgresPaymentRepository,
    new PaymentService({
      ...(paystackProvider ? { PAYSTACK: paystackProvider } : {}),
      ...(env.flutterwave
        ? { FLUTTERWAVE: new FlutterwaveProvider(env.flutterwave.secretKey) }
        : {}),
    }),
    completionService,
    env.paystack?.callbackUrl ||
      `${env.publicFrontendUrl}/registration/payment/callback`,
    undefined,
    registrationRecoveryService,
    { ...(env.flutterwave ? { FLUTTERWAVE: env.flutterwave.callbackUrl } : {}) },
  );
  options.onPaymentServiceCreated?.(paymentService);
  const sessionPolicy = {
    idleMs: env.adminSessionIdleMs,
    absoluteMs: env.adminSessionAbsoluteMs,
  };
  const requireAuth = createRequireAuth(
    authService,
    sessionPolicy,
    postgresAdminAuditRepository,
    env.nodeEnv === "production",
  );
  const controller = createAuthController({
    authService,
    audits: postgresAdminAuditRepository,
    sessionPolicy,
    production: env.nodeEnv === "production",
  });
  const authRouter = createAuthRouter({
    controller,
    requireAuth,
    loginRateLimiter: createLoginRateLimiter({
      windowMs: env.loginRateLimitWindowMs,
      max: env.loginRateLimitMax,
    }),
  });
  const delegateController = createDelegateController({ delegateService });
  const adminUserController = createAdminUserController({
    invitations: invitationService,
    users: adminUserService,
  });
  const adminInvitationController =
    createAdminInvitationController(invitationService);
  const paymentController = createPaymentController(paymentService);
  const manualPaymentService = new ManualPaymentService(
    postgresManualPaymentRepository,
    postgresPaymentRepository,
    completionService,
  );
  const adminPaymentController = createAdminPaymentController(
    paymentService,
    manualPaymentService,
  );
  const adminOverviewController = createAdminOverviewController(
    new AdminOverviewService(postgresAdminOverviewRepository),
  );
  const studentVerificationController = createStudentVerificationController(
    studentVerificationService,
    studentEvidenceService,
    studentVerificationWorkflowService,
    env.studentEvidenceEnabled,
  );
  const commercialApplicationController = createCommercialApplicationController(
    commercialApplicationService,
  );
  const abstractSubmissionController = createAbstractSubmissionController(
    abstractSubmissionService,
    abstractAnalysisService,
  );
  const enquiryController = createEnquiryController(enquiryService);
  const emailVerificationController = createEmailVerificationController(
    emailVerificationService,
    registrationRecoveryService,
  );
  const registrationRecoveryController = createRegistrationRecoveryController({
    recovery: registrationRecoveryService,
    emailVerification: emailVerificationService,
    payments: paymentService,
  });
  const reportController = createReportController(
    new ReportService(postgresReportRepository),
  );
  const delegateRouter = createDelegateRouter({
    controller: delegateController,
    registrationRateLimiter: createDelegateRegistrationRateLimiter({
      windowMs: env.delegateRegistrationRateLimitWindowMs,
      max: env.delegateRegistrationRateLimitMax,
    }),
  });
  const adminRouter = createAdminRouter({
    requireAuth,
    mutationSecurity: createAdminMutationSecurity(env.clientOrigins),
    delegateController,
    adminUserController,
    adminPaymentController,
    adminOverviewController,
    studentVerificationController,
    commercialApplicationController,
    abstractSubmissionController,
    enquiryController,
    checkInController: createCheckInController(
      new CheckInService(
        postgresCheckInRepository,
        postgresAdminAuditRepository,
      ),
    ),
    accreditationController: createAccreditationController(
      new AccreditationService(
        postgresAccreditationRepository,
        postgresAdminAuditRepository,
      ),
    ),
  });
  const reportRouter = createReportRouter({
    requireAuth,
    mutationSecurity: createAdminMutationSecurity(env.clientOrigins),
    controller: reportController,
  });
  const communicationService = new CommunicationService(
    postgresCommunicationRepository,
    emailService,
    postgresAdminAuditRepository,
    env.communicationsBulkSendEnabled,
  );
  options.onCommunicationServiceCreated?.(communicationService);
  const communicationRouter = createCommunicationRouter({
    requireAuth,
    mutationSecurity: createAdminMutationSecurity(env.clientOrigins),
    service: communicationService,
    contactService: new ContactService(
      postgresContactRepository,
      postgresAdminAuditRepository,
    ),
  });
  const communicationPublicRouter = createCommunicationPublicRouter();
  const paymentRouter = createPaymentRouter({
    controller: paymentController,
    rateLimiter: createPaymentRateLimiter({
      windowMs: env.delegateRegistrationRateLimitWindowMs,
      max: env.delegateRegistrationRateLimitMax,
    }),
    flutterwaveWebhookSignature: createFlutterwaveWebhookSignatureMiddleware(
      env.flutterwave?.webhookSecretHash,
    ),
    webhookSignature: createPaystackWebhookSignatureMiddleware(
      env.paystack?.secretKey,
    ),
  });
  const studentVerificationRouter = createStudentVerificationRouter({
    controller: studentVerificationController,
    rateLimiter: createDelegateRegistrationRateLimiter({
      windowMs: env.delegateRegistrationRateLimitWindowMs,
      max: env.delegateRegistrationRateLimitMax,
    }),
    uploadRateLimiter: createStudentEvidenceUploadRateLimiter({
      windowMs: env.studentEvidenceRateLimitWindowMs,
      max: env.studentEvidenceRateLimitMax,
    }),
    workflowRateLimiter: createStudentVerificationWorkflowRateLimiter({
      windowMs: env.studentVerificationWorkflowRateLimitWindowMs,
      max: env.studentVerificationWorkflowRateLimitMax,
    }),
    requestSizeLimit: enforceStudentEvidenceRequestSize,
    multipartParser: parseStudentEvidenceMultipart,
  });
  const commercialApplicationRouter = createCommercialApplicationRouter({
    controller: commercialApplicationController,
    rateLimiter: createCommercialApplicationRateLimiter({
      windowMs: env.commercialApplicationRateLimitWindowMs,
      max: env.commercialApplicationRateLimitMax,
    }),
  });
  const abstractSubmissionRouter = createAbstractSubmissionRouter({
    controller: abstractSubmissionController,
    rateLimiter: createAbstractSubmissionRateLimiter({
      windowMs: env.abstractRateLimitWindowMs,
      max: env.abstractRateLimitMax,
    }),
  });
  const enquiryRouter = createEnquiryRouter({
    controller: enquiryController,
    rateLimiter: createEnquiryRateLimiter({
      windowMs: env.enquiryRateLimitWindowMs,
      max: env.enquiryRateLimitMax,
    }),
  });
  const emailVerificationRouter = createEmailVerificationRouter({
    controller: emailVerificationController,
    rateLimiter: createEmailVerificationRateLimiter({
      windowMs: env.emailVerificationRateLimitWindowMs,
      max: env.emailVerificationRateLimitMax,
    }),
  });
  const registrationRecoveryRouter = createRegistrationRecoveryRouter({
    controller: registrationRecoveryController,
    rateLimiter: createEmailVerificationRateLimiter({
      windowMs: env.registrationRecoveryRateLimitWindowMs,
      max: env.registrationRecoveryRateLimitMax,
    }),
  });
  const adminInvitationRouter = createAdminInvitationRouter({
    controller: adminInvitationController,
    validateRateLimiter: createInvitationRateLimiter({
      windowMs: env.adminInvitationRateLimitWindowMs,
      max: env.adminInvitationValidateRateLimitMax,
    }),
    acceptRateLimiter: createInvitationRateLimiter({
      windowMs: env.adminInvitationRateLimitWindowMs,
      max: env.adminInvitationAcceptRateLimitMax,
    }),
  });
  const sessionMiddleware = createSessionMiddleware({
    pool,
    secret: env.sessionSecret,
    absoluteMs: env.adminSessionAbsoluteMs,
    production: env.nodeEnv === "production",
  });

  return createApplication({
    sessionMiddleware,
    apiRouter: createApiRouter({
      authRouter,
      adminRouter,
      adminInvitationRouter,
      delegateRouter,
      paymentRouter,
      studentVerificationRouter,
      commercialApplicationRouter,
      abstractSubmissionRouter,
      enquiryRouter,
      reportRouter,
      communicationRouter,
      communicationPublicRouter,
      emailVerificationRouter,
      registrationRecoveryRouter,
    }),
  });
}
