import { Router, type RequestHandler } from "express";

type PaymentController = ReturnType<
  typeof import("../controllers/payment.controller").createPaymentController
>;

export function createPaymentRouter(options: {
  controller: PaymentController;
  rateLimiter: RequestHandler;
  webhookSignature: RequestHandler;
  flutterwaveWebhookSignature?: RequestHandler;
}): Router {
  const router = Router();
  router.post(
    "/delegate-registrations/:reference/payment/initialize",
    options.rateLimiter,
    options.controller.initialize,
  );
  router.get(
    "/payments/:reference/verify",
    options.rateLimiter,
    options.controller.verify,
  );
  router.post(
    "/payments/paystack/webhook",
    options.webhookSignature,
    options.controller.webhook,
  );
  if (options.flutterwaveWebhookSignature)
    router.post(
      "/payments/flutterwave/webhook",
      options.flutterwaveWebhookSignature,
      options.controller.flutterwaveWebhook,
    );
  return router;
}
