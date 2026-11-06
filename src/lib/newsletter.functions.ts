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
      const res = await fetch(action === "subscribe" ? SUBSCRIBE_URL : UNSUBSCRIBE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        console.error("n8n non-JSON response", res.status, text.slice(0, 300));
        return { success: false, status: "error", message: "We couldn't reach the server. Please try again." };
      }
      const r = (Array.isArray(json) ? json[0] : json) as Partial<WebhookResult> | undefined;
      if (!r || typeof r.status !== "string") {
        return { success: false, status: "error", message: "Unexpected response. Please try again." };
      }
      return {
        success: Boolean(r.success),
        status: r.status,
        message: typeof r.message === "string" ? r.message : "",
      };
    } catch (e) {
      console.error("n8n request failed", e);
      return { success: false, status: "error", message: "Network error. Please check your connection and try again." };
    }
  });
