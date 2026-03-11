export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null; // Required for BullMQ
}

let _opts: RedisConnectionOptions | null = null;

export function getRedisConnection(): RedisConnectionOptions {
  if (!_opts) {
    const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
    _opts = {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      ...(url.password ? { password: url.password } : {}),
      maxRetriesPerRequest: null,
    };
  }
  return _opts;
}
