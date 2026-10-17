import { Router, type RequestHandler } from "express";

interface AuthController {
  readonly login: RequestHandler;
  readonly me: RequestHandler;
  readonly logout: RequestHandler;
}

interface AuthRouterOptions {
  readonly controller: AuthController;
  readonly requireAuth: RequestHandler;
  readonly loginRateLimiter: RequestHandler;
}

export function createAuthRouter(options: AuthRouterOptions): Router {
  const router = Router();
  router.post("/login", options.loginRateLimiter, options.controller.login);
  router.get("/me", options.requireAuth, options.controller.me);
  router.post("/logout", options.controller.logout);
  return router;
}
