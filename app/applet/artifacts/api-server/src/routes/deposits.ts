import { Router, type IRouter } from "express";
import { prisma } from "../db";
import { requireMember, lockMember } from "../middleware/auth";
import { HttpError } from "../error";
import * as V from "@shared/validators";
import { input } from "../validate";
import { depositView, FREE_PLAN_ID, FREE_PLAN_VERIFICATION_DEPOSIT_CENTS, cents, safeIso, validAddress } from "../utils";
import { collections } from "../firebase";
import { freezeReceipt } from "../receipts";

const router: IRouter = Router();

router.get("/deposits", requireMember, async (req, res) => {
  const rows = await prisma.deposit.findMany({
    where: { memberId: req.member!.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const populated = rows.map((d: any) => ({ ...d, member: req.member }));
  res.json(V.ListDepositsResponse.parse(populated.map(depositView)));
});

router.post("/deposits", requireMember, async (req, res) => {
  const data = input(V.CreateDepositBody, req.body);
  if (data.acceptedTerms !== true) {
    throw new HttpError(400, "يجب الاطلاع على الشروط والموافقة عليها.");
  }
  const uploadId = typeof req.body?.uploadId === "string" ? req.body.uploadId.trim() : "";

  let finalPath = "";
  if (uploadId) {
    finalPath = await freezeReceipt(uploadId, req.member!.id);
  }

  const deposit = await prisma.$transaction(async (tx: any) => {
    await lockMember(tx, req.member!.id);
    const settings = await tx.setting.findUnique({ where: { id: "main" } });
    const address = data.channel === "binance" ? settings?.binanceAddress : settings?.okxAddress;
    if (!settings?.depositsEnabled || !address || !validAddress(address) || !settings.terms.trim() || !settings.fundingDescription.trim()) {
      throw new HttpError(403, "الإيداعات غير متاحة حتى تُكمل الإدارة إعداد العناوين والشروط.");
    }

    // Automatically cancel any awaiting_receipt deposits so users never get blocked by unfinished orders
    const awaitingDeposits = await tx.deposit.findMany({
      where: { memberId: req.member!.id, status: "awaiting_receipt" }
    });
    for (const ad of awaitingDeposits) {
      await tx.deposit.update({
        where: { id: ad.id },
        data: { status: "cancelled" }
      });
    }

    const existingPending = await tx.deposit.findFirst({
      where: { memberId: req.member!.id, status: "pending" },
      orderBy: { createdAt: "desc" }
    });
    if (existingPending) {
      throw new HttpError(409, "لديك طلب إيداع قيد المراجعة بالفعل. يرجى انتظار اعتماده أو إلغاؤه من القائمة.");
    }

    let planId = typeof data.planId === "string" ? data.planId.trim() : "";
    let amountCents = 0;
    let planName = "شحن رصيد المحفظة";
    let planDescription = "إيداع USDT على شبكة Polygon لشحن رصيد الحساب المتاح للاشتراك في الباقات وسحب الأرباح.";
    let dailyProfitCents = 0;
    const requestedAmount = Number(data.amount);

    if (planId && planId !== "recharge") {
      const plan = await tx.plan.findUnique({ where: { id: planId } });
      if (plan && plan.active && plan.configured) {
        planName = plan.name;
        planDescription = plan.description;
        dailyProfitCents = plan.dailyProfitCents;

        const isFreeVerification = plan.id === FREE_PLAN_ID;
        const targetPriceCents = isFreeVerification ? FREE_PLAN_VERIFICATION_DEPOSIT_CENTS : Number(plan.annualPriceCents);

        const memberSubs = await tx.subscription.findMany({
          where: { memberId: req.member!.id },
          orderBy: { annualPriceCents: "desc" }
        });
        const approvedDeposits = await tx.deposit.findMany({
          where: { memberId: req.member!.id, status: "approved" }
        });

        const activeSub = memberSubs.find((s: any) => new Date(s.expiresAt).getTime() > Date.now());
        const hasUsedPlanBefore = memberSubs.some((s: any) => s.planId === plan.id) || approvedDeposits.some((d: any) => d.planId === plan.id);

        if (hasUsedPlanBefore) {
          throw new HttpError(400, "أنت مشترك أو اشتركت سابقاً في هذه الباقة. يسمح بالاشتراك في كل باقة مرة واحدة فقط، ويمكنك الترقية لباقة أعلى ودفع الفارق.");
        }

        const activeSubPlan = activeSub?.planId ? await tx.plan.findUnique({ where: { id: activeSub.planId } }) : null;
        const currentPriceCents = activeSubPlan ? activeSubPlan.annualPriceCents : (activeSub ? (Number(activeSub.annualPriceCents) > 0 ? Number(activeSub.annualPriceCents) : (activeSub.planId === FREE_PLAN_ID ? FREE_PLAN_VERIFICATION_DEPOSIT_CENTS : 0)) : 0);

        if (activeSub && targetPriceCents <= currentPriceCents) {
          throw new HttpError(400, "يمكنك الترقية فقط إلى باقة أعلى ودفع فارق السعر بينهما.");
        }

        amountCents = targetPriceCents;
        if (activeSub && targetPriceCents > currentPriceCents) {
          amountCents = Math.max(0, targetPriceCents - currentPriceCents);
        }
      } else {
        planId = "recharge";
      }
    } else {
      planId = "recharge";
    }

    if (planId === "recharge") {
      if (!Number.isFinite(requestedAmount) || requestedAmount < 1) {
        throw new HttpError(400, "الحد الأدنى لمبلغ شحن الرصيد هو 1 USDT.");
      }
      amountCents = cents(requestedAmount);
    }

    let receiptUploadId: string | undefined = undefined;
    if (uploadId) {
      const upload = await tx.receiptUpload.findUnique({ where: { id: uploadId } });
      if (!upload || upload.memberId !== req.member!.id || upload.used) {
        throw new HttpError(409, "صورة الوصل مستخدمة بالفعل أو غير موجودة.");
      }
      await tx.receiptUpload.update({ where: { id: uploadId }, data: { used: true, finalPath } });
      receiptUploadId = uploadId;
    }

    const newDeposit = await tx.deposit.create({
      data: {
        memberId: req.member!.id,
        planId,
        planName,
        planDescription,
        amountCents,
        dailyProfitCents,
        channel: data.channel,
        address,
        terms: settings.terms,
        fundingDescription: settings.fundingDescription,
        status: receiptUploadId ? "pending" : "awaiting_receipt",
        receiptUploadId
      },
      include: { member: true }
    });

    await tx.activity.create({
      data: {
        memberId: req.member!.id,
        mode: "live",
        kind: "deposit",
        title: receiptUploadId ? "تم إرسال طلب الشحن وصورة الإيصال، بانتظار التحقق اليدوي" : "تم إنشاء طلب إيداع جديد"
      }
    });

    return newDeposit;
  });

  if (collections.deposits) {
    await collections.deposits.doc(deposit.id).set({
      ...depositView(deposit),
      createdAt: safeIso(deposit.createdAt)
    }).catch(() => {});
  }

  res.json(V.CreateDepositResponse.parse(depositView({ ...deposit, member: req.member })));
});

router.post("/deposits/:id/proof", requireMember, async (req, res) => {
  const { id } = input(V.SubmitDepositProofParams, req.params);
  const data = input(V.SubmitDepositProofBody, req.body);

  const original = await prisma.deposit.findFirst({
    where: { id, memberId: req.member!.id }
  });
  if (!original) throw new HttpError(404, "طلب الإيداع غير موجود.");
  if (original.status === "cancelled" || original.status === "approved") {
    throw new HttpError(409, "هذا الطلب تم إلغاؤه أو اعتماده بالفعل.");
  }

  const finalPath = await freezeReceipt(data.uploadId, req.member!.id);

  const deposit = await prisma.$transaction(async (tx: any) => {
    await lockMember(tx, req.member!.id);
    const current = await tx.deposit.findFirst({ where: { id, memberId: req.member!.id } });
    if (!current || current.status === "cancelled" || current.status === "approved") {
      throw new HttpError(409, "طلب الإيداع غير متاح لإرسال وصل.");
    }

    const upload = await tx.receiptUpload.findUnique({ where: { id: data.uploadId } });
    if (!upload || upload.memberId !== req.member!.id || upload.used) {
      throw new HttpError(409, "صورة الوصل مستخدمة بالفعل.");
    }

    await tx.receiptUpload.update({ where: { id: upload.id }, data: { used: true, finalPath } });

    const updated = await tx.deposit.update({
      where: { id },
      data: { receiptUploadId: upload.id, status: "pending" },
      include: { member: true }
    });

    await tx.activity.create({
      data: {
        memberId: req.member!.id,
        mode: "live",
        kind: "deposit",
        title: "تم إرسال صورة إيصال الإيداع، بانتظار التحقق اليدوي"
      }
    });

    return updated;
  });

  if (collections.deposits) {
    await collections.deposits.doc(deposit.id).set({
      ...depositView(deposit),
      createdAt: safeIso(deposit.createdAt)
    }).catch(() => {});
  }

  res.json(V.SubmitDepositProofResponse.parse(depositView({ ...deposit, member: req.member })));
});

router.post("/deposits/:id/cancel", requireMember, async (req, res) => {
  const { id } = input(V.CancelDepositParams, req.params);
  const deposit = await prisma.$transaction(async (tx: any) => {
    await lockMember(tx, req.member!.id);
    const current = await tx.deposit.findFirst({ where: { id, memberId: req.member!.id } });
    if (!current) {
      throw new HttpError(404, "طلب الإيداع غير موجود.");
    }
    if (current.status === "cancelled") {
      return current;
    }
    if (current.status === "approved") {
      throw new HttpError(409, "هذا الطلب تم معالجته واعتماده بالفعل بصفة نهائية.");
    }

    const updated = await tx.deposit.update({
      where: { id: current.id },
      data: { status: "cancelled" },
      include: { member: true }
    });

    await tx.activity.create({
      data: {
        memberId: req.member!.id,
        mode: "live",
        kind: "deposit",
        title: `تم إلغاء طلب الإيداع لباقة ${current.planName}`
      }
    }).catch(() => {});

    return updated;
  });

  res.json(V.CancelDepositResponse.parse(depositView({ ...deposit, member: req.member })));
});

export default router;
