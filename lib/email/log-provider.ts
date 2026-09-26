import { logger } from "@/lib/observability/logger";
import type { EmailProvider } from "./provider";

/**
 * Default provider for dev/test/preview: nothing leaves the process. Logs only
 * the idempotency key and non-personal tags — never recipient, subject or body.
 */
export function createLogEmailProvider(): EmailProvider {
  return {
    name: "log",
    async send(message, { idempotencyKey }) {
      logger.info("email delivery simulated (EMAIL_DELIVERY_ENABLED is not true)", {
        idempotencyKey,
        tags: message.tags ?? [],
      });
      return { provider: "log", messageId: null };
    },
  };
}
