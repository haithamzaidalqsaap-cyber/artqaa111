import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodType } from "zod";
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function input<T>(schema: ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new HttpError(400, "يرجى التأكد من صحة الحقول المدخلة.");
  return parsed.data;
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({error: error.message});
    return;
  }
  
  const errObj = error as any;
  if (errObj && errObj.code === "P2002") {
    const target = errObj.meta?.target;
    const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");
    res.status(409).json({
      error: targetText.includes("payoutAddress")
        ? "عنوان المحفظة مرتبط بحساب آخر."
        : "هذا السجل موجود بالفعل. يرجى تحديث الصفحة.",
    });
    return;
  }
  
  if (errObj && errObj.code === "P2025") {
    res.status(404).json({error: "لم يتم العثور على السجل المطلوب."});
    return;
  }
  
  if (error instanceof ZodError) {
    logger.error({ err: error, path: req.path }, "Response validation failed");
    res.status(500).json({error: "تعذر معالجة البيانات. يرجى المحاولة لاحقاً."});
    return;
  }
  
  logger.error({ err: error, path: req.path }, "Request failed");
  res.status(500).json({error: "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً."});
}
