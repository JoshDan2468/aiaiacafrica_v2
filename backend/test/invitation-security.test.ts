import assert from "node:assert/strict";
import test from "node:test";
import type { RequestHandler } from "express";
import request from "supertest";
import { createApplication } from "../src/app";
import { createInvitationRateLimiter } from "../src/middleware/invitationRateLimit.middleware";
import { createAdminInvitationRouter } from "../src/routes/adminInvitation.routes";
import { createApiRouter } from "../src/routes";

const ok: RequestHandler = (_request, response) => {
  response.status(200).json({ success: true });
};

test("public invitation validation and acceptance have independent focused rate limits", async () => {
  const app = createApplication({
    apiRouter: createApiRouter({
      adminInvitationRouter: createAdminInvitationRouter({
        controller: { validate: ok, accept: ok },
        validateRateLimiter: createInvitationRateLimiter({
          windowMs: 60_000,
          max: 1,
        }),
        acceptRateLimiter: createInvitationRateLimiter({
          windowMs: 60_000,
          max: 1,
        }),
      }),
    }),
  });

  await request(app)
    .get("/api/admin/invitations/validate?token=value")
    .expect(200);
  const validateLimited = await request(app)
    .get("/api/admin/invitations/validate?token=value")
    .expect(429);
  assert.match(validateLimited.body.message, /Too many invitation attempts/);

  await request(app).post("/api/admin/invitations/accept").send({}).expect(200);
  await request(app).post("/api/admin/invitations/accept").send({}).expect(429);
});
