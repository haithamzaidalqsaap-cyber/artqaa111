import { Router, type IRouter } from "express";
import * as V from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { requireMember } from "../lib/auth";
import { HttpError, input } from "../lib/http";
import { FREE_PLAN_ID, FREE_PLAN_VERIFICATION_DEPOSIT_CENTS, lockMember, validAddress } from "../lib/platform";
import { depositView } from "../lib/finance";
import { freezeReceipt } from "../lib/receipts";
import { collections } from "../lib/firebase";

const router: IRouter = Router();

router.get("/deposits", requireMember, async (req, res) => {
  const rows = await prisma.deposit.findMany({where: {memberId: req.member!.id}, orderBy: {createdAt: "desc"}, take: 100});
  const populated = rows.map((d: any) => ({ ...d, member: req.member }));
  res.json(V.ListDepositsResponse.parse(populated.map(depositView)));
});

router.post("/deposits", requireMember, async (req, res) => {
  const data = input(V.CreateDepositBody, req.body);
  if (data.acceptedTerms !== true) throw new HttpError(400, "يجب الاطلاع على شروط الباقة والموافقة عليها.");
  const deposit = await prisma.$transaction(async (tx: any) => {
    await lockMember(tx, req.member!.id);
    const settings = await tx.setting.findUnique({where: {id: "main"}});
    const address = data.channel === "binance" ? settings?.binanceAddress : settings?.okxAddress;
    if (!settings?.depositsEnabled || !address || !validAddress(address) || !settings.terms.trim() || !settings.fundingDescription.trim()) {
      throw new HttpError(403, "الإيداعات غير متاحة حتى تُكمل الإدارة إعداد العناوين والشروط.");
    }
    const plan = await tx.plan.findUnique({where: {id: data.planId}});
    const isFreeVerification = plan?.id === FREE_PLAN_ID;
    if (!plan?.active || !plan.configured) throw new HttpError(400, "الباقة غير مهيأة للاشتراك.");

    // Retrieve active and past subscriptions and approved deposits for this member
    const memberSubs = await tx.subscription.findMany({
      where: { memberId: req.member!.id },
      orderBy: { annualPriceCents: "desc" }
    });
    const approvedDeposits = await tx.deposit.findMany({
      where: { memberId: req.member!.id, status: "approved" }
    });

    const activeSub = memberSubs.find((s: any) => new Date(s.expiresAt).getTime() > Date.now());

    // User can subscribe to a plan only ONCE
    const hasUsedPlanBefore = memberSubs.some((s: any) => s.planId === plan.id) || approvedDeposits.some((d: any) => d.planId === plan.id);
    if (hasUsedPlanBefore) {
      throw new HttpError(400, "أنت مشترك أو اشتركت سابقاً في هذه الباقة. يسمح بالاشتراك في كل باقة مرة واحدة فقط، ويمكنك الترقية لباقة أعلى ودفع الفارق.");
    }

    const activeSubPlan = activeSub?.planId ? await tx.plan.findUnique({where: {id: activeSub.planId}}) : null;
    const currentPriceCents = activeSubPlan ? activeSubPlan.annualPriceCents : (activeSub ? (Number(activeSub.annualPriceCents) > 0 ? Number(activeSub.annualPriceCents) : (activeSub.planId === FREE_PLAN_ID ? FREE_PLAN_VERIFICATION_DEPOSIT_CENTS : 0)) : 0);
    const targetPriceCents = isFreeVerification ? FREE_PLAN_VERIFICATION_DEPOSIT_CENTS : Number(plan.annualPriceCents);

    if (activeSub && targetPriceCents <= currentPriceCents) {
      throw new HttpError(400, "يمكنك الترقية فقط إلى باقة أعلى ودفع فارق السعر بينهما.");
    }

    if (await tx.deposit.findFirst({where: {memberId: req.member!.id, status: {in: ["awaiting_receipt", "pending"]}}})) {
      throw new HttpError(409, "لديك طلب إيداع مفتوح بالفعل، يرجى إكماله أو إلغاؤه أولاً.");
    }

    // Calculate upgrade price difference if upgrading from an active subscription
    let amountCents = targetPriceCents;
    if (activeSub && targetPriceCents > currentPriceCents) {
      amountCents = Math.max(0, targetPriceCents - currentPriceCents);
    }

    return tx.deposit.create({
      data: {
        memberId: req.member!.id,
        planId: plan.id,
        planName: plan.name,
        planDescription: plan.description,
        amountCents,
        dailyProfitCents: plan.dailyProfitCents,
        channel: data.channel,
        address,
        terms: settings.terms,
        fundingDescription: settings.fundingDescription
      },
      include: {member: true}
    });
  });

  if (collections.deposits) {
    await collections.deposits.doc(deposit.id).set({
      ...depositView(deposit),
      createdAt: deposit.createdAt.toISOString()
    }).catch(() => {});
  }

  res.json(V.CreateDepositResponse.parse(depositView({ ...deposit, member: req.member })));
});

router.post("/deposits/:id/proof", requireMember, async (req, res) => {
  const {id} = input(V.SubmitDepositProofParams, req.params);
  const data = input(V.SubmitDepositProofBody, req.body);
  const original = await prisma.deposit.findFirst({where: {id, memberId: req.member!.id, status: "awaiting_receipt"}});
  if (!original) throw new HttpError(409, "الطلب غير متاح لإرسال وصل.");
  const finalPath = await freezeReceipt(data.uploadId, req.member!.id);
  const deposit = await prisma.$transaction(async (tx: any) => {
    await lockMember(tx, req.member!.id);
    const current = await tx.deposit.findFirst({where: {id, memberId: req.member!.id}});
    if (current?.status !== "awaiting_receipt") throw new HttpError(409, "تم إرسال الوصل أو إغلاق الطلب بالفعل.");
    const upload = await tx.receiptUpload.findUnique({where: {id: data.uploadId}});
    if (!upload || upload.memberId !== req.member!.id || upload.used) throw new HttpError(409, "صورة الوصل مستخدمة بالفعل.");
    await tx.receiptUpload.update({where: {id: upload.id}, data: {used: true, finalPath}});
    const updated = await tx.deposit.update({where: {id}, data: {receiptUploadId: upload.id, status: "pending"}, include: {member: true}});
    await tx.activity.create({data: {memberId: req.member!.id, mode: "live", kind: "deposit", title: "تم إرسال صورة إيصال الإيداع، بانتظار التحقق اليدوي"}});
    return updated;
  });

  if (collections.deposits) {
    await collections.deposits.doc(deposit.id).set({
      ...depositView(deposit),
      createdAt: deposit.createdAt.toISOString()
    }).catch(() => {});
  }

  res.json(V.SubmitDepositProofResponse.parse(depositView({ ...deposit, member: req.member })));
});

router.post("/deposits/:id/cancel", requireMember, async (req, res) => {
  const {id} = input(V.CancelDepositParams, req.params);
  const deposit = await prisma.$transaction(async (tx: any) => {
    await lockMember(tx, req.member!.id);
    const current = await tx.deposit.findFirst({where: {id, memberId: req.member!.id}});
    if (!current) {
      throw new HttpError(404, "طلب الإيداع غير موجود.");
    }
    if (current.status === "cancelled") {
      return current;
    }
    if (current.status === "approved") {
      throw new HttpError(409, "هذا الطلب تم معالجته واعتماده بالفعل بصفة نهائية.");
    }
    const updated = await tx.deposit.update({where: {id: current.id}, data: {status: "cancelled"}, include: {member: true}});
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
