export type SmsMessage = { to: string; body: string };

export interface SmsProvider {
  send(message: SmsMessage): Promise<void>;
}

export class NoopSmsProvider implements SmsProvider {
  async send(_message: SmsMessage): Promise<void> {
    // Local development deliberately never sends real SMS messages.
  }
}

/** Orange Messaging API provider. Secrets are supplied only through Edge Function env vars. */
export class OrangeSmsProvider implements SmsProvider {
  constructor(
    private readonly apiUrl: string,
    private readonly accessToken: string,
    private readonly sender: string,
  ) {}

  async send({ to, body }: SmsMessage): Promise<void> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: `tel:${to}`,
          senderAddress: `tel:${this.sender}`,
          outboundSMSTextMessage: { message: body },
        },
      }),
    });
    if (!response.ok) throw new Error(`Orange SMS delivery failed (${response.status})`);
  }
}

export function createSmsProvider(environment = Deno.env.get("DENO_ENV") ?? "development"): SmsProvider {
  if (environment !== "production") return new NoopSmsProvider();

  const apiUrl = Deno.env.get("ORANGE_SMS_API_URL");
  const accessToken = Deno.env.get("ORANGE_SMS_ACCESS_TOKEN");
  const sender = Deno.env.get("ORANGE_SMS_SENDER");
  if (!apiUrl || !accessToken || !sender) throw new Error("Orange SMS production secrets are not configured");
  return new OrangeSmsProvider(apiUrl, accessToken, sender);
}
