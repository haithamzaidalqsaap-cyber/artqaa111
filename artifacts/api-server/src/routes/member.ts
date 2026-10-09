import { Router, type IRouter } from "express";
import * as V from "@workspace/api-zod";
import { prisma } from "../lib/prisma";
import { requireMember } from "../lib/auth";
import { HttpError, input } from "../lib/http";
import { accrue, activityView, cents, dashboard, lockMember, MIN_WITHDRAWAL_CENTS, money, planView, settings, validAddress } from "../lib/platform";
import { withdrawalView } from "../lib/finance";
const router: IRouter = Router();
router.get("/team", requireMember, async (req, res) => {
  const user = await prisma.member.findUniqueOrThrow({where: {id: req.member!.id}});
  
  // 1. Fetch Level 1 (Direct Referrals)
  const l1Members = await prisma.member.findMany({
    where: {inviterId: user.id},
    orderBy: {createdAt: "desc"},
  });
  const l1Ids = l1Members.map((m: any) => m.id);

  // 2. Fetch Level 2 (Indirect Referrals from L1)
  const l2Members = l1Ids.length > 0 ? await prisma.member.findMany({
    where: {inviterId: {in: l1Ids}},
    orderBy: {createdAt: "desc"},
  }) : [];
  const l2Ids = l2Members.map((m: any) => m.id);

  // 3. Fetch Level 3 (Team Referrals from L2)
  const l3Members = l2Ids.length > 0 ? await prisma.member.findMany({
    where: {inviterId: {in: l2Ids}},
    orderBy: {createdAt: "desc"},
  }) : [];
  const l3Ids = l3Members.map((m: any) => m.id);

  const allNetworkMembers = [
    ...l1Members.map((m: any) => ({ ...m, level: 1, inviterName: "أنت (مباشر)" })),
    ...l2Members.map((m: any) => {
      const inv = l1Members.find((l1: any) => l1.id === m.inviterId);
      return { ...m, level: 2, inviterName: inv?.name || "عضو مستوى 1" };
    }),
    ...l3Members.map((m: any) => {
      const inv = l2Members.find((l2: any) => l2.id === m.inviterId);
      return { ...m, level: 3, inviterName: inv?.name || "عضو مستوى 2" };
    }),
  ];

  const allNetworkIds = allNetworkMembers.map((m: any) => m.id);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [allSubs, allDeposits, refActivities] = await Promise.all([
    allNetworkIds.length > 0 ? prisma.subscription.findMany({
      where: { memberId: { in: allNetworkIds }, mode: "live" },
      orderBy: { startsAt: "desc" }
    }).catch(() => []) : [],
    allNetworkIds.length > 0 ? prisma.deposit.findMany({
      where: { memberId: { in: allNetworkIds }, status: "approved" }
    }).catch(() => []) : [],
    prisma.activity.findMany({
      where: { memberId: user.id, kind: { in: ["referral_bonus", "referral", "bonus"] }, mode: "live" }
    }).catch(() => [])
  ]);

  const now = Date.now();
  let totalNetworkVolumeCents = 0;
  let activeSubscriptionsCount = 0;
  let freeMembersCount = 0;
  let investorMembersCount = 0;
  let todayJoinedCount = 0;

  // Level breakdowns
  let l1VolumeCents = 0, l1Active = 0;
  let l2VolumeCents = 0, l2Active = 0;
  let l3VolumeCents = 0, l3Active = 0;

  const enrichedMembers = allNetworkMembers.map(m => {
    const userSubs = (allSubs || []).filter((s: any) => s.memberId === m.id);
    const activeSub = userSubs.find((s: any) => new Date(s.expiresAt).getTime() > now);
    const userDeposits = (allDeposits || []).filter((d: any) => d.memberId === m.id);
    const totalDepositedCents = userDeposits.reduce((acc: number, d: any) => acc + Number(d.amountCents || 0), 0);
    
    totalNetworkVolumeCents += totalDepositedCents;
    if (m.level === 1) {
      l1VolumeCents += totalDepositedCents;
      if (activeSub) l1Active++;
    } else if (m.level === 2) {
      l2VolumeCents += totalDepositedCents;
      if (activeSub) l2Active++;
    } else if (m.level === 3) {
      l3VolumeCents += totalDepositedCents;
      if (activeSub) l3Active++;
    }

    if (activeSub) {
      activeSubscriptionsCount++;
      if (activeSub.planId === "starter" || activeSub.annualPriceCents <= 400) {
        freeMembersCount++;
      } else {
        investorMembersCount++;
      }
    }
    const createdDate = new Date(m.createdAt);
    if (createdDate >= oneDayAgo) {
      todayJoinedCount++;
    }

    return {
      id: String(m.id),
      memberId: String(m.memberId),
      name: String(m.name),
      phone: m.phone ? `${m.phone.slice(0, 4)}****${m.phone.slice(-3)}` : "",
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
      active: m.active !== false,
      honorPoints: Number(m.honorPoints ?? 100),
      planName: activeSub ? activeSub.planName : (userSubs.length ? "عقد مكتمل" : "بانتظار الاشتراك"),
      planId: activeSub?.planId ?? null,
      totalDeposited: money(totalDepositedCents),
      level: m.level,
      inviterName: m.inviterName,
    };
  });

  const totalMembers = allNetworkMembers.length;
  const avgHonorPoints = totalMembers > 0 
    ? Math.round(allNetworkMembers.reduce((acc, m) => acc + Number(m.honorPoints ?? 100), 0) / totalMembers)
    : 100;

  const totalCommissionEarnedCents = (refActivities || []).reduce((acc: number, a: any) => acc + Math.max(0, Number(a.amountCents || 0)), 0);

  // Commission rates: L1 = 8%, L2 = 3%, L3 = 1%
  const l1Earned = (l1VolumeCents * 0.08) / 100;
  const l2Earned = (l2VolumeCents * 0.03) / 100;
  const l3Earned = (l3VolumeCents * 0.01) / 100;

  res.json(V.GetTeamResponse.parse({
    referralCode: user.referralCode,
    stats: {
      totalMembers,
      activeMembers: activeSubscriptionsCount,
      freeMembers: freeMembersCount,
      investorMembers: investorMembersCount,
      todayJoined: todayJoinedCount,
      totalVolume: money(totalNetworkVolumeCents),
      avgHonor: avgHonorPoints,
      totalCommissionEarned: money(totalCommissionEarnedCents),
      level1Count: l1Members.length,
      level1Active: l1Active,
      level1Volume: money(l1VolumeCents),
      level1CommissionRate: 8,
      level1Earned: l1Earned,
      level2Count: l2Members.length,
      level2Active: l2Active,
      level2Volume: money(l2VolumeCents),
      level2CommissionRate: 3,
      level2Earned: l2Earned,
      level3Count: l3Members.length,
      level3Active: l3Active,
      level3Volume: money(l3VolumeCents),
      level3CommissionRate: 1,
      level3Earned: l3Earned,
    },
    members: enrichedMembers,
  }));
});
router.get("/plans", async (_req, res) => {
  res.json(V.ListPlansResponse.parse((await prisma.plan.findMany({where: {active: true, configured: true}, orderBy: {annualPriceCents: "asc"}})).map(planView)));
});
router.get("/settings", async (_req, res) => { res.json(V.GetSettingsResponse.parse(await settings())); });
router.get("/dashboard", requireMember, async (req, res) => { res.json(V.GetDashboardResponse.parse(await dashboard(req.member!.id))); });
router.put("/payout-address", requireMember, async (req, res): Promise<void> => {
  const data = input(V.SavePayoutAddressBody, req.body);
  const address = data.address.trim().toLowerCase();
  if (!validAddress(address)) throw new HttpError(400, "أدخل عنوان Polygon صحيحاً.");
  const member = await prisma.$transaction(async (tx: any) => {
    const user = await lockMember(tx, req.member!.id);
    if (user.payoutAddress) throw new HttpError(409, "عنوان المحفظة محفوظ بالفعل؛ اطلب من الإدارة تغييره.");
    if (await tx.member.findUnique({where: {payoutAddress: address}, select: {id: true}})) {
      throw new HttpError(409, "عنوان المحفظة مرتبط بحساب آخر.");
    }
    const updated = await tx.member.update({where: {id: user.id}, data: {payoutAddress: address}});
    await tx.audit.create({data: {actorId: user.id, action: "payout_address_set", targetId: user.id, detail: JSON.stringify({source: "member"})}});
    return updated;
  });
  res.json(V.SavePayoutAddressResponse.parse({address: member.payoutAddress!}));
});
router.get("/activity", requireMember, async (req, res) => {
  await prisma.$transaction((tx: any) => accrue(tx, req.member!.id));
  const rows = await prisma.activity.findMany({where: {memberId: req.member!.id, mode: "live"}, orderBy: {createdAt: "desc"}, take: 100});
  res.json(V.ListActivityResponse.parse(rows.map(activityView)));
});
router.get("/withdrawals", requireMember, async (req, res) => {
  const rows = await prisma.withdrawal.findMany({where: {memberId: req.member!.id, mode: "live"}, orderBy: {createdAt: "desc"}, take: 100});
  const populated = rows.map((w: any) => ({ ...w, member: req.member }));
  res.json(V.ListWithdrawalsResponse.parse(populated.map(withdrawalView)));
});
router.post("/withdrawals", requireMember, async (req, res) => {
  const data = input(V.RequestWithdrawalBody, req.body);
  const amountCents = cents(data.amount);
  if (amountCents < MIN_WITHDRAWAL_CENTS) throw new HttpError(400, `الحد الأدنى للسحب ${MIN_WITHDRAWAL_CENTS / 100} USDT.`);
  const withdrawal = await prisma.$transaction(async (tx: any) => {
    await lockMember(tx, req.member!.id);
    const user = await accrue(tx, req.member!.id);
    if (!user.payoutAddress || !validAddress(user.payoutAddress)) throw new HttpError(403, "أضف عنوان محفظة Polygon أولاً.");
    if (amountCents > user.realBalanceCents) throw new HttpError(400, "الرصيد المتاح غير كافٍ.");
    await tx.member.update({where: {id: user.id}, data: {realBalanceCents: {decrement: amountCents}}});
    const feeCents = Math.round(amountCents * 0.21);
    const netCents = amountCents - feeCents;
    const created = await tx.withdrawal.create({data: {memberId: user.id, amountCents, address: user.payoutAddress, status: "pending", mode: "live"}, include: {member: true}});
    await tx.activity.create({
      data: {
        memberId: user.id,
        mode: "live",
        kind: "withdrawal",
        title: `حجز رصيد لطلب سحب: ${money(amountCents)} USDT (رسوم 21%: ${money(feeCents)} USDT | الصافي المحول: ${money(netCents)} USDT)`,
        amountCents: -amountCents,
      },
    });
    return created;
  });
  res.json(V.RequestWithdrawalResponse.parse(withdrawalView({ ...withdrawal, member: req.member })));
});

router.post("/withdrawals/:id/cancel", requireMember, async (req, res) => {
  const { id } = req.params;
  const withdrawal = await prisma.$transaction(async (tx: any) => {
    await lockMember(tx, req.member!.id);
    const w = await tx.withdrawal.findFirst({where: {id, memberId: req.member!.id, mode: "live"}});
    if (!w) throw new HttpError(404, "طلب السحب غير موجود.");
    if (w.status !== "pending") throw new HttpError(400, "لا يمكن إلغاء الطلب بعد بدء معالجته أو اكتماله.");
    await tx.withdrawal.update({where: {id: w.id}, data: {status: "cancelled"}});
    await tx.member.update({where: {id: req.member!.id}, data: {realBalanceCents: {increment: w.amountCents}}});
    await tx.activity.create({
      data: {
        memberId: req.member!.id,
        mode: "live",
        kind: "refund",
        title: `إلغاء طلب السحب واستعادة الرصيد: ${money(w.amountCents)} USDT`,
        amountCents: w.amountCents,
      },
    });
    return w;
  });
  res.json({ success: true, message: "تم إلغاء طلب السحب واستعادة الرصيد بنجاح." });
});
// Retired simulation endpoints must not mint real balances.
router.post(["/subscriptions", "/tasks/:id/complete"], requireMember, () => { throw new HttpError(410, "يُفعّل الاشتراك بعد تأكيد الإيداع من الإدارة؛ لا توجد مكافآت مهام."); });
export default router;