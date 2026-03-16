import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    (req as any).user = session.user;
    (req as any).session = session.session;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
