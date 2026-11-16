import pino, { type DestinationStream, type Logger } from "pino";
import { logEnv } from "./env";

/**
 * Structured JSON logger (pino).
 *
 * Two layers keep secrets out of logs:
 * 1. Known secret-looking keys are redacted wherever they appear in a log object.
 * 2. The values of secret environment variables (…TOKEN, …SECRET, …KEY) are
 *    masked if they show up inside a message string, e.g. in a URL.
 */

const CENSOR = "[REDACTED]";

const SECRET_KEYS = ["token", "apiKey", "api_key", "secret", "password", "authorization", "cookie"];

export const REDACT_PATHS = [
  ...SECRET_KEYS,
  ...SECRET_KEYS.map((key) => `*.${key}`),
  "headers.authorization",
  "headers.cookie",
  "*.headers.authorization",
  "*.headers.cookie",
];

const SECRET_ENV_NAME = /(TOKEN|SECRET|KEY)$/;

export function secretValues(source: Record<string, string | undefined> = process.env): string[] {
  return Object.entries(source)
    .filter(([name, value]) => SECRET_ENV_NAME.test(name) && typeof value === "string" && value.length >= 8)
    .map(([, value]) => value as string);
}

export function maskSecrets(text: string, secrets: string[] = secretValues()): string {
  let masked = text;
  for (const secret of secrets) {
    masked = masked.split(secret).join(CENSOR);
  }
  return masked;
}

type LoggerOptions = {
  level?: string;
  destination?: DestinationStream;
  secrets?: string[];
};

export function createLogger(options: LoggerOptions = {}): Logger {
  const secrets = options.secrets ?? secretValues();
  return pino(
    {
      level: options.level ?? logEnv().LOG_LEVEL,
      base: { app: "nadlan" },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: { paths: REDACT_PATHS, censor: CENSOR },
      hooks: {
        logMethod(args, method) {
          const cleaned = args.map((arg) => (typeof arg === "string" ? maskSecrets(arg, secrets) : arg));
          return method.apply(this, cleaned as Parameters<typeof method>);
        },
      },
    },
    options.destination,
  );
}

export const logger = createLogger();
