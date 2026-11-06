import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const JOB_TYPES = [
  "Government Jobs",
  "Private Company Jobs",
  "NGO Jobs",
  "Bank Jobs",
  "IT & Software Jobs",
  "Remote Jobs",
  "Part-Time Jobs",
  "Internship",
  "Freelance Jobs",
  "All Job Categories",
] as const;

const SUBSCRIBE_URL = "https://n8n.hablu-programmer.com/webhook-test/job_subscribe";
const UNSUBSCRIBE_URL = "https://n8n.hablu-programmer.com/webhook-test/job_unsubscribe";

export const subscriberSchema = z.object({
  action: z.enum(["subscribe", "unsubscribe"]),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  job_type: z.enum(JOB_TYPES),
});

export type WebhookResult = { success: boolean; status: string; message: string };

export const callNewsletterWebhook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => subscriberSchema.parse(input))
  .handler(async ({ data }): Promise<WebhookResult> => {
    const { action, ...body } = data;
    try {
      if (action === "unsubscribe") {
        console.debug("[Unsubscribe] Webhook URL", UNSUBSCRIBE_URL);
        // Log field presence only: subscriber identity must not enter shared logs.
        console.debug("[Unsubscribe] Payload fields", Object.keys(body));
      }
      const res = await fetch(action === "subscribe" ? SUBSCRIBE_URL : UNSUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (action === "unsubscribe") console.debug("[Unsubscribe] HTTP response status", res.status);
      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        if (action === "unsubscribe") {
          return { success: false, status: "error", message: `The unsubscribe service returned an invalid response (HTTP ${res.status}). Please try again.` };
        }
        console.error("n8n non-JSON response", res.status, text.slice(0, 300));
        return { success: false, status: "error", message: "We couldn't reach the server. Please try again." };
      }
      const r = (Array.isArray(json) ? json[0] : json) as Partial<WebhookResult> | undefined;
      if (action === "unsubscribe") {
        console.debug("[Unsubscribe] Response", { success: r?.success === true, status: r?.status });
        if (!res.ok) {
          return { success: false, status: "error", message: res.status === 404
            ? "The unsubscribe webhook is not listening. Please start the n8n test workflow and try again."
            : `The unsubscribe service could not complete the request (HTTP ${res.status}). Please try again.` };
        }
      }
      if (!r || typeof r.status !== "string") {
        return { success: false, status: "error", message: "Unexpected response. Please try again." };
      }
      return {
        success: action === "unsubscribe" ? r.success === true : Boolean(r.success),
        status: r.status,
        message: typeof r.message === "string" ? r.message : "",
      };
    } catch (e) {
      console.error("n8n request failed", e);
      return { success: false, status: "error", message: "Network error. Please check your connection and try again." };
    }
  });
