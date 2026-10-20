import { z } from "zod";

const schema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-5-mini"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  X_APP_KEY: z.string().min(1).optional(),
  X_APP_SECRET: z.string().min(1).optional(),
  X_API_KEY: z.string().min(1).optional(),
  X_API_SECRET: z.string().min(1).optional(),
  X_ACCESS_TOKEN: z.string().min(1).optional(),
  X_ACCESS_SECRET: z.string().min(1).optional(),
  X_ACCESS_TOKEN_SECRET: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(24),
  ADMIN_SECRET: z.string().min(24),
  DRY_RUN: z.enum(["true", "false"]).default("true"),
});

export function getEnv() {
  return schema.parse(process.env);
}

export function requireXEnv() {
  const env = getEnv();
  const appKey = env.X_API_KEY ?? env.X_APP_KEY;
  const appSecret = env.X_API_SECRET ?? env.X_APP_SECRET;
  const accessToken = env.X_ACCESS_TOKEN;
  const accessSecret = env.X_ACCESS_TOKEN_SECRET ?? env.X_ACCESS_SECRET;
  const values = [appKey, appSecret, accessToken, accessSecret];
  if (values.some((value) => !value)) throw new Error("X OAuth credentials are incomplete");
  return {
    appKey: appKey!,
    appSecret: appSecret!,
    accessToken: accessToken!,
    accessSecret: accessSecret!,
  };
}
