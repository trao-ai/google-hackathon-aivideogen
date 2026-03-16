describe("getRedisConnection", () => {
  beforeEach(() => {
    // Reset the cached connection between tests
    jest.resetModules();
  });

  it("parses default Redis URL", () => {
    delete process.env.REDIS_URL;
    const { getRedisConnection } = require("../../services/queue");
    const conn = getRedisConnection();
    expect(conn.host).toBe("localhost");
    expect(conn.port).toBe(6379);
    expect(conn.password).toBeUndefined();
    expect(conn.maxRetriesPerRequest).toBeNull();
  });

  it("parses custom Redis URL with password", () => {
    process.env.REDIS_URL = "redis://:secretpass@redis.example.com:6380";
    const { getRedisConnection } = require("../../services/queue");
    const conn = getRedisConnection();
    expect(conn.host).toBe("redis.example.com");
    expect(conn.port).toBe(6380);
    expect(conn.password).toBe("secretpass");
    delete process.env.REDIS_URL;
  });

  it("caches the connection options", () => {
    delete process.env.REDIS_URL;
    const { getRedisConnection } = require("../../services/queue");
    const conn1 = getRedisConnection();
    const conn2 = getRedisConnection();
    expect(conn1).toBe(conn2);
  });
});
