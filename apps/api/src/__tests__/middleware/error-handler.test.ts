import { ApiError, errorHandler } from "../../middleware/error-handler";
import type { Request, Response, NextFunction } from "express";

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("ApiError", () => {
  it("creates error with status code and message", () => {
    const err = new ApiError(404, "Not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ApiError");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("errorHandler", () => {
  it("returns ApiError status and message as JSON", () => {
    const res = mockRes();
    const err = new ApiError(400, "Bad request");

    errorHandler(err, {} as Request, res, jest.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Bad request" });
  });

  it("returns 500 for generic errors", () => {
    const res = mockRes();
    const err = new Error("Something went wrong");

    errorHandler(err, {} as Request, res, jest.fn() as NextFunction);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("handles 404 ApiError", () => {
    const res = mockRes();
    errorHandler(new ApiError(404, "Project not found"), {} as Request, res, jest.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("handles 409 ApiError", () => {
    const res = mockRes();
    errorHandler(new ApiError(409, "Conflict"), {} as Request, res, jest.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
