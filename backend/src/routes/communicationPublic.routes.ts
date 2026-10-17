import { Router, type RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { z, ZodError } from "zod";
import { UnsubscribeTokens } from "../services/communicationSafety";
import { communicationPreferences } from "../repositories/communicationPreference.repository";
import { createPublicError } from "../middleware/error.middleware";

export function createCommunicationPublicRouter(
  options = {
    secret: process.env.COMMUNICATIONS_UNSUBSCRIBE_SECRET ?? "",
    webhookSecret: process.env.COMMUNICATIONS_MAILJET_WEBHOOK_SECRET ?? "",
    preferences: communicationPreferences,
  },
): Router {
  const router = Router();
  const tokens = new UnsubscribeTokens(options.secret);
  const unsubscribe: RequestHandler = (req, res, next) => {
    Promise.resolve()
      .then(async () => {
        const token = z.string().max(1500).parse(req.query.token);
        const target = tokens.verify(token);
        res.set("Cache-Control", "no-store");
        if (req.method === "POST") {
          await options.preferences.unsubscribe(target.email, target.campaign);
          res
            .type("html")
            .send(
              '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AIAIAC email preferences</title><h1>You have unsubscribed</h1><p>Your email address is suppressed from Communications Center campaigns.</p></html>',
            );
        } else {
          // Email scanners may follow links. Only an explicit POST changes preferences.
          res
            .type("html")
            .send(
              `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AIAIAC email preferences</title><h1>Unsubscribe from AIAIAC campaigns</h1><form method="post" action="?token=${encodeURIComponent(token)}"><button type="submit">Confirm unsubscribe</button></form></html>`,
            );
        }
      })
      .catch((error) =>
        next(
          error instanceof ZodError
            ? createPublicError(400, "Invalid unsubscribe link")
            : error,
        ),
      );
  };
  router.get("/unsubscribe", unsubscribe);
  router.post("/unsubscribe", unsubscribe);
  router.post("/mailjet/events", (req, res, next) => {
    Promise.resolve()
      .then(async () => {
        if (options.webhookSecret.length < 32)
          throw createPublicError(
            503,
            "Delivery event tracking is not configured",
          );
        const expected = Buffer.from(
          "Basic " +
            Buffer.from("mailjet:" + options.webhookSecret).toString("base64"),
        );
        const actual = Buffer.from(req.get("Authorization") ?? "");
        if (
          expected.length !== actual.length ||
          !timingSafeEqual(expected, actual)
        )
          throw createPublicError(401, "Invalid delivery event authentication");
        const eventSchema = z.object({
          event: z.enum([
            "sent",
            "bounce",
            "blocked",
            "spam",
            "unsub",
            "open",
            "click",
          ]),
          Message_GUID: z.uuid(),
          CustomID: z.string().max(100).optional(),
        });
        const events = z
          .array(eventSchema)
          .min(1)
          .max(1000)
          .parse(Array.isArray(req.body) ? req.body : [req.body]);
        const statuses = {
          sent: "DELIVERED",
          bounce: "BOUNCED",
          blocked: "BLOCKED",
          spam: "SPAM",
          unsub: "UNSUBSCRIBED",
          open: "OPENED",
          click: "CLICKED",
        };
        for (const event of events)
          await options.preferences.providerEvent(
            event.Message_GUID,
            statuses[event.event],
            event.CustomID?.startsWith("AIAIAC-COM-DEL:") &&
              z.uuid().safeParse(event.CustomID.slice(15)).success
              ? event.CustomID.slice(15)
              : undefined,
          );
        res.json({ success: true });
      })
      .catch((error) =>
        next(
          error instanceof ZodError
            ? createPublicError(400, "Invalid delivery event")
            : error,
        ),
      );
  });
  return router;
}
