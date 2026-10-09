import { Router, type IRouter } from "express";
import * as V from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireMember } from "../lib/auth";
import { HttpError, input } from "../lib/http";
import { DAY, FREE_PLAN_ID, accrue, planDurationDays, validHash } from "../lib/platform";
import { depositView, withdrawalView } from "../lib/finance";

const router: IRouter = Router();
router.use("/admin", requireMember, requireAdmin);

router.get("/admin/deposits", async (_req, res) => {
  const rows = await prisma.deposit.findMany({orderBy: {createdAt: "desc"}, take: 1000});
  const populated = await Promise.all(rows.map(async (d: any) => {
    const member = await prisma.member.findUnique({where: {id: d.memberId}});
    return { ...d, member };
  }));
  res.json(V.ListAdminDepositsResponse.parse(populated.map(depositView)));
});

router.post("/admin/deposits/:id/review", async (req, res) => {
  const {id} = input(V.ReviewDepositParams, req.params);
  const data = input(V.ReviewDepositBody, req.body);
  if (data.decision === "approved" && !data.confirmed) throw new HttpError(400, "يجب التحقق فعلياً من وصول USDT على Polygon قبل الموافقة.");
  if (data.decision === "rejected" && data.note.trim().length < 3) throw new HttpError(400, "اذكر سبب رفض الإيداع.");

  const deposit = await prisma.$transaction(async (tx: any) => {
    const d = await tx.deposit.findUniqueOrThrow({where: {id}});

    if (d.status === "rejected" || d.status === "cancelled") {
      throw new HttpError(409, "هذا الطلب ملغي أو مرفوض سابقاً.");
    }

    if (data.decision === "approved") {
      const member = await tx.member.findUniqueOrThrow({where: {id: d.memberId}});
      if (!member.active) {
        await tx.member.update({where: {id: d.memberId}, data: {active: true}});
      }

      const now = new Date();
      const durationDays = planDurationDays(d.planId);

      // Replace/close existing subscriptions
      const existingSubs = await tx.subscription.findMany({where: {memberId: d.memberId, mode: "live"}});
      for (const sub of existingSubs) {
        await tx.subscription.update({where: {id: sub.id}, data: {expiresAt: now}}).catch(() => {});
      }

      const targetPlan = await tx.plan.findUnique({where: {id: d.planId}});
      const fullAnnualPriceCents = targetPlan ? targetPlan.annualPriceCents : (d.planId === FREE_PLAN_ID ? 0 : d.amountCents);

      await tx.subscription.create({
        data: {
          memberId: d.memberId,
          planId: d.planId,
          planName: d.planName,
          planDescription: d.planDescription || "",
          annualPriceCents: fullAnnualPriceCents,
          dailyTasks: 0,
          taskRewardCents: 0,
          dailyProfitCents: d.dailyProfitCents,
          startsAt: now,
          expiresAt: new Date(now.getTime() + DAY * durationDays),
          lastCreditedDay: -1,
          mode: "live",
        },
      });

      await tx.member.update({where: {id: d.memberId}, data: {honorPoints: 100, active: true}});
      await accrue(tx, d.memberId, now).catch(() => {});
      await tx.activity.create({
        data: {
          memberId: d.memberId,
          mode: "live",
          kind: "deposit",
          title: `تم اعتماد الإيداع وتفعيل باقة ${d.planName} بقيمة ${money(d.amountCents)} USDT لمدة ${durationDays} يوماً`,
          amountCents: d.amountCents,
        },
      }).catch(() => {});

      // Multi-tier referral commission distribution (L1 = 8%, L2 = 3%, L3 = 1%)
      try {
        const depositor = await tx.member.findUnique({where: {id: d.memberId}});
        if (depositor?.inviterId && d.amountCents > 0) {
          // Level 1 Inviter (8%)
          const l1 = await tx.member.findUnique({where: {id: depositor.inviterId}});
          if (l1) {
            const l1Bonus = Math.round(d.amountCents * 0.08);
            if (l1Bonus > 0) {
              await tx.member.update({where: {id: l1.id}, data: {realBalanceCents: {increment: l1Bonus}}});
              await tx.activity.create({
                data: {
                  memberId: l1.id,
                  mode: "live",
                  kind: "referral_bonus",
                  title: `مكافأة إحالة مباشرة (مستوى 1 - 8%): إيداع ${depositor.name}`,
                  amountCents: l1Bonus,
                },
              });
            }

            // Level 2 Inviter (3%)
            if (l1.inviterId) {
              const l2 = await tx.member.findUnique({where: {id: l1.inviterId}});
              if (l2) {
                const l2Bonus = Math.round(d.amountCents * 0.03);
                if (l2Bonus > 0) {
                  await tx.member.update({where: {id: l2.id}, data: {realBalanceCents: {increment: l2Bonus}}});
                  await tx.activity.create({
                    data: {
                      memberId: l2.id,
                      mode: "live",
                      kind: "referral_bonus",
                      title: `مكافأة فريق فرعي (مستوى 2 - 3%): إيداع ${depositor.name}`,
                      amountCents: l2Bonus,
                    },
                  });
                }

                // Level 3 Inviter (1%)
                if (l2.inviterId) {
                  const l3 = await tx.member.findUnique({where: {id: l2.inviterId}});
                  if (l3) {
                    const l3Bonus = Math.round(d.amountCents * 0.01);
                    if (l3Bonus > 0) {
                      await tx.member.update({where: {id: l3.id}, data: {realBalanceCents: {increment: l3Bonus}}});
                      await tx.activity.create({
                        data: {
                          memberId: l3.id,
                          mode: "live",
                          kind: "referral_bonus",
                          title: `مكافأة جيل ثالث (مستوى 3 - 1%): إيداع ${depositor.name}`,
                          amountCents: l3Bonus,
                        },
                      });
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Multi-tier commission distribution error:", err);
      }
    } else {
      await tx.activity.create({
        data: {
          memberId: d.memberId,
          mode: "live",
          kind: "deposit",
          title: `رُفض الإيداع: ${data.note.trim()}`,
        },
      }).catch(() => {});
    }

    await tx.audit.create({
      data: {
        actorId: req.member?.id || "admin",
        action: "deposit_review",
        targetId: id,
        detail: JSON.stringify(data),
      },
    }).catch(() => {});

    return tx.deposit.update({
      where: {id},
      data: {
        status: data.decision,
        reviewNote: data.note.trim(),
        reviewedAt: new Date(),
        reviewerId: req.member?.id || "admin",
      },
      include: {member: true}
    });
  });

  const member = await prisma.member.findUnique({where: {id: deposit.memberId}});
  res.json(V.ReviewDepositResponse.parse(depositView({ ...deposit, member })));
});

router.get("/admin/withdrawals", async (_req, res) => {
  const rows = await prisma.withdrawal.findMany({where: {mode: "live"}, orderBy: {createdAt: "desc"}, take: 1000});
  const populated = await Promise.all(rows.map(async (w: any) => {
    const member = await prisma.member.findUnique({where: {id: w.memberId}});
    return { ...w, member };
  }));
  res.json(V.ListAdminWithdrawalsResponse.parse(populated.map(withdrawalView)));
});

router.post("/admin/withdrawals/:id/review", async (req, res) => {
  const {id} = input(V.ReviewWithdrawalParams, req.params);
  const data = input(V.ReviewWithdrawalBody, req.body);
  const hash = data.txHash.trim().toLowerCase();
  if (data.decision === "paid" && (!data.confirmed || !validHash(hash))) throw new HttpError(400, "حوّل المبلغ فعلياً ثم أكد العملية وأدخل معرّف التحويل على Polygon.");
  if (data.decision === "rejected" && data.note.trim().length < 3) throw new HttpError(400, "اذكر سبب رفض السحب.");

  const withdrawal = await prisma.$transaction(async (tx: any) => {
    const w = await tx.withdrawal.findUniqueOrThrow({where: {id}});
    if (data.decision === "rejected") {
      await tx.member.update({where: {id: w.memberId}, data: {realBalanceCents: {increment: w.amountCents}}}).catch(() => {});
      await tx.activity.create({data: {memberId: w.memberId, mode: "live", kind: "refund", title: `إعادة الرصيد بعد رفض السحب: ${data.note.trim()}`, amountCents: w.amountCents}}).catch(() => {});
    }
    if (data.decision === "paid") {
      await tx.activity.create({data: {memberId: w.memberId, mode: "live", kind: "payout", title: `تم تحويل مبلغ السحب بنجاح: ${money(w.amountCents)} USDT إلى محفظتك — معرّف العملية: ${hash.slice(0, 12)}...`, amountCents: -w.amountCents}}).catch(() => {});
    }
    await tx.audit.create({data: {actorId: req.member?.id || "admin", action: "withdrawal_review", targetId: id, detail: JSON.stringify(data)}}).catch(() => {});
    return tx.deposit ? tx.withdrawal.update({
      where: {id},
      data: {
        status: data.decision,
        reviewerId: req.member?.id || "admin",
        reviewedAt: new Date(),
        reviewNote: data.note.trim(),
        ...(data.decision === "paid" ? {txHash: hash} : {}),
      },
      include: {member: true}
    }) : w;
  });

  const member = await prisma.member.findUnique({where: {id: withdrawal.memberId}});
  res.json(V.ReviewWithdrawalResponse.parse(withdrawalView({ ...withdrawal, member })));
});

export default router;
