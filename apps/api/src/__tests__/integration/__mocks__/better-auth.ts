export const betterAuth = jest.fn().mockReturnValue({
  api: { getSession: jest.fn() },
  handler: jest.fn(),
});
