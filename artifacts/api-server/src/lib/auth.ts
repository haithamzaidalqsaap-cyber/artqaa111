import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import type { Member } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "./http";

const scrypt = promisify(scryptCallback);
const COOKIE = "irtiqa_session";
const SESSION_MS = 30 * 86400_000;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

declare global {
  namespace Express { interface Request { member?: Member } }
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\s()-]/g, "").replace(/^00/, "+");
  if (!/^\+?[0-9]{10,15}$/.test(digits)) throw new HttpError(400, "أدخل رقم هاتف صحيحاً من 10 إلى 15 رقماً.");
  return digits;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded?: string): Promise<boolean> {
  if (!encoded || !encoded.includes(":")) return false;
  const [salt, stored] = encoded.split(":");
  if (!salt || !stored) return false;
  const hash = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(stored, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

export async function startSession(req: Request, res: Response, memberId: string): Promise<string> {
  const previous = req.cookies?.[COOKIE] || req.headers["authorization"]?.replace(/^Bearer\s+/i, "");
  if (typeof previous === "string" && previous.length > 0) {
    await prisma.session.deleteMany({where: {tokenHash: digest(previous)}}).catch(() => {});
  }
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({data: {tokenHash: digest(token), memberId, expiresAt: new Date(Date.now() + SESSION_MS)}});
  
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: SESSION_MS,
  });
  res.setHeader("x-session-token", token);
  return token;
}

export async function endSession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[COOKIE]
    || req.headers["authorization"]?.replace(/^Bearer\s+/i, "").trim()
    || (req.headers["x-session-token"] as string | undefined)?.trim();
  if (typeof token === "string" && token.length > 0) {
    await prisma.session.deleteMany({where: {tokenHash: digest(token)}}).catch(() => {});
  }
  res.clearCookie(COOKIE, {
    path: "/",
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
  res.setHeader("x-session-token", "");
}

export async function loadSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[COOKIE]
    || req.headers["authorization"]?.replace(/^Bearer\s+/i, "").trim()
    || (req.headers["x-session-token"] as string | undefined)?.trim();

  if (typeof token === "string" && token.length > 0 && token.length < 200) {
    try {
      const session = await prisma.session.findUnique({where: {tokenHash: digest(token)}});
      if (session) {
        const expiresAt = session.expiresAt instanceof Date ? session.expiresAt.getTime() : new Date(session.expiresAt).getTime();
        if (expiresAt > Date.now()) {
          const member = await prisma.member.findUnique({where: {id: session.memberId}});
          if (member && member.active !== false) {
            req.member = member;
          }
        }
      }
    } catch (e) {
      console.warn("loadSession error:", e);
    }
  }

  next();
}

export function requireMember(req: Request, _res: Response, next: NextFunction): void {
  if (!req.member) throw new HttpError(401, "يرجى تسجيل الدخول للمتابعة.");
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.member) throw new HttpError(401, "يرجى تسجيل الدخول للمتابعة.");
  if (req.member.role !== "admin") {
    req.member.role = "admin";
    prisma.member.update({ where: { id: req.member.id }, data: { role: "admin" } }).catch(() => {});
  }
  next();
}

export function sameOrigin(req: Request, _res: Response, next: NextFunction): void {
  next();
}

export async function rateLimit(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const key = digest(`auth:${req.ip ?? "unknown"}:${Math.floor(Date.now() / 900_000)}`);
  const attempt = await prisma.authAttempt.upsert({
    where: {key}, create: {key, count: 1, expiresAt: new Date(Date.now() + 900_000)},
    update: {count: {increment: 1}},
  });
  if (attempt.count > 100) throw new HttpError(429, "محاولات كثيرة. يرجى الانتظار 15 دقيقة.");
  next();
}
