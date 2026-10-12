import type { Member, Plan, Subscription, Activity, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "./http";
import { logger } from "./logger";

export const DAY = 86400_000;
export const FREE_PLAN_ID = "starter";
export const FREE_PLAN_VERIFICATION_DEPOSIT_CENTS = 400;
export const FREE_PLAN_DURATION_DAYS = 90;
export const DEFAULT_PLAN_DURATION_DAYS = 365;
export const planDurationDays = (planId: string) => planId === FREE_PLAN_ID ? FREE_PLAN_DURATION_DAYS : DEFAULT_PLAN_DURATION_DAYS;
export const MIN_WITHDRAWAL_CENTS = 200;

export const safeIso = (v: any): string => {
  try {
    if (v instanceof Date) {
      if (!isNaN(v.getTime())) return v.toISOString();
    }
    if (v && typeof v.toDate === "function") {
      const d = v.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString();
    }
    if (v && typeof v === "object") {
      if (typeof v._seconds === "number") {
        const d = new Date(v._seconds * 1000 + (v._nanoseconds ? Math.round(v._nanoseconds / 1e6) : 0));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      if (typeof v.seconds === "number") {
        const d = new Date(v.seconds * 1000 + (v.nanoseconds ? Math.round(v.nanoseconds / 1e6) : 0));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    if (typeof v === "string" && v.trim().length > 0) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  } catch {}
  return new Date().toISOString();
};

export const safeIsoOrNull = (v: any): string | null => {
  try {
    if (!v) return null;
    if (v instanceof Date) {
      if (!isNaN(v.getTime())) return v.toISOString();
      return null;
    }
    if (typeof v.toDate === "function") {
      const d = v.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d.toISOString();
    }
    if (typeof v === "object") {
      if (typeof v._seconds === "number") {
        const d = new Date(v._seconds * 1000 + (v._nanoseconds ? Math.round(v._nanoseconds / 1e6) : 0));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      if (typeof v.seconds === "number") {
        const d = new Date(v.seconds * 1000 + (v.nanoseconds ? Math.round(v.nanoseconds / 1e6) : 0));
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    if (typeof v === "string" && v.trim().length > 0) {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  } catch {}
  return null;
};

export const money = (c: number) => {
  const n = Number(c);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n) / 100;
};

export function cents(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) throw new HttpError(400, "يسمح بمنزلتين عشريتين فقط للمبالغ.");
  return Math.round(value * 100);
}

export const validAddress = (s: string) => typeof s === "string" && /^0x[a-fA-F0-9]{40}$/.test(s.trim()) && !/^0x0{40}$/i.test(s.trim());
export const validHash = (s: string) => typeof s === "string" && /^0x[a-fA-F0-9]{64}$/.test(s.trim()) && !/^0x0{64}$/i.test(s.trim());

export const userView = (u: any) => {
  const payoutAddress = u.payoutAddress && typeof u.payoutAddress === "string" && /^0x[a-fA-F0-9]{40}$/.test(u.payoutAddress.trim())
    ? u.payoutAddress.trim()
    : null;
  const balanceCents = Number.isFinite(Number(u.realBalanceCents))
    ? Number(u.realBalanceCents)
    : Number.isFinite(Number(u.balanceCents))
    ? Number(u.balanceCents)
    : 0;
  const earnedCents = Number.isFinite(Number(u.realEarnedCents))
    ? Number(u.realEarnedCents)
    : Number.isFinite(Number(u.earnedCents))
    ? Number(u.earnedCents)
    : 0;
  const phoneDigits = String(u.phone ?? "").replace(/[^0-9]/g, "");
  const memberId = phoneDigits.length >= 5 ? phoneDigits.slice(-5) : String(u.memberId ?? "");
  return {
    id: String(u.id ?? ""),
    name: String(u.name ?? ""),
    phone: String(u.phone ?? ""),
    payoutAddress,
    memberId,
    role: (u.role === "admin" ? "admin" : "member") as "member" | "admin",
    honorPoints: Math.round(Number(u.honorPoints ?? 0)) || 0,
    balance: money(balanceCents),
    totalEarned: money(earnedCents),
    active: u.active !== false,
    createdAt: safeIso(u.createdAt),
  };
};

export const planView = (p: any) => ({
  id: String(p.id ?? ""),
  name: String(p.name ?? ""),
  description: String(p.description ?? ""),
  annualPrice: money(Number(p.annualPriceCents ?? 0)),
  dailyProfit: money(Number(p.dailyProfitCents ?? 0)),
  active: p.active !== false,
  configured: p.configured !== false,
});

export const subscriptionView = (s: any, currentPlan?: any) => {
  const planName = currentPlan?.name || s.planName || "";
  const planDescription = currentPlan?.description || s.planDescription || "";
  const annualPriceCents = currentPlan ? currentPlan.annualPriceCents : (Number(s.annualPriceCents) || 0);
  const dailyProfitCents = currentPlan ? currentPlan.dailyProfitCents : (Number(s.dailyProfitCents) || 0);
  return {
    id: String(s.id ?? ""),
    startsAt: safeIso(s.startsAt),
    expiresAt: safeIso(s.expiresAt),
    active: (s.expiresAt instanceof Date ? s.expiresAt.getTime() : new Date(s.expiresAt || 0).getTime()) > Date.now(),
    plan: {
      id: String(s.planId ?? ""),
      name: String(planName),
      description: String(planDescription),
      annualPrice: money(annualPriceCents),
      dailyProfit: money(dailyProfitCents),
      active: true,
      configured: true,
    },
  };
};

export const activityView = (a: any) => ({
  id: String(a.id ?? ""),
  title: String(a.title ?? ""),
  kind: String(a.kind ?? "account"),
  amount: a.kind === "honor" ? Number(a.amountCents ?? 0) : money(Number(a.amountCents ?? 0)),
  createdAt: safeIso(a.createdAt),
});

export async function settings() {
  const s = await prisma.setting.findUnique({where: {id: "main"}});
  const base = {
    telegramUrl: s?.telegramUrl ?? "https://t.me/irtiqa_support",
    binanceAddress: s?.binanceAddress ?? "0x71C83e2840004185fe0D5FE87756f7C99F94a1d4",
    okxAddress: s?.okxAddress ?? "0x39a164b38d3566144e59103e3a537f71B8497F87",
    depositsEnabled: s?.depositsEnabled ?? true,
    fundingDescription: s?.fundingDescription ?? "إيداع USDT على شبكة Polygon للاشتراك في عضوية ارتقاء ذات العائد اليومي الثابت.",
    terms: s?.terms ?? "تخضع العضوية للمراجعة اليدوية والاعتماد الرسمي قبل تفعيل الأرباح اليومية.",
  };
  return {
    ...base,
    minimumWithdrawal: money(MIN_WITHDRAWAL_CENTS),
    currency: "USDT",
    network: "Polygon",
    ready: true,
  };
}

export async function lockMember(tx: any, id: string): Promise<Member> {
  let user = await tx.member.findUnique({where: {id}});
  if (!user) {
    user = await prisma.member.findUnique({where: {id}});
  }
  if (!user) throw new HttpError(404, "الحساب غير موجود.");
  if (!user.active) throw new HttpError(403, "هذا الحساب موقوف.");
  return user;
}

export async function accrue(tx: any, memberId: string, now = new Date()): Promise<Member> {
  const subscriptions = (await tx.subscription.findMany({
    where: { memberId },
  })) || [];
  
  let amount = 0;
  for (const sub of subscriptions) {
    const durationDays = planDurationDays(sub.planId);
    const startsAtTime = sub.startsAt instanceof Date ? sub.startsAt.getTime() : new Date(sub.startsAt).getTime();
    const expiresAtTime = sub.expiresAt instanceof Date ? sub.expiresAt.getTime() : new Date(sub.expiresAt).getTime();
    const elapsed = Math.max(0, Math.min(durationDays, Math.floor((Math.min(now.getTime(), expiresAtTime) - startsAtTime) / DAY)));
    const lastCredited = Number(sub.lastCreditedDay ?? 0);
    if (elapsed <= lastCredited) continue;

    const newCreditsCount = elapsed - lastCredited;
    const profitPerDay = Number(sub.dailyProfitCents ?? 0);
    const addedAmount = newCreditsCount * profitPerDay;
    amount += addedAmount;

    await tx.subscription.update({where: {id: sub.id}, data: {lastCreditedDay: elapsed}}).catch(() => {});
  }

  if (amount > 0) {
    await tx.activity.create({
      data: {
        memberId,
        mode: "live",
        kind: "daily_profit",
        title: `تم إيداع الأرباح اليومية بنجاح: ${money(amount)} USDT في رصيدك`,
        amountCents: amount,
      },
    }).catch(() => {});

    return tx.member.update({
      where: {id: memberId},
      data: {
        realBalanceCents: {increment: amount},
        realEarnedCents: {increment: amount},
      },
    }).catch(() => tx.member.findUnique({where: {id: memberId}}));
  }

  return tx.member.findUnique({where: {id: memberId}});
}

export async function dashboard(id: string) {
  let user = await prisma.member.findUnique({where: {id}});
  if (!user) {
    throw new HttpError(404, "المستخدم غير موجود.");
  }
  try {
    user = await accrue(prisma, id);
  } catch {}

  const now = new Date();
  const [sub, config, activities, allWithdrawals] = await Promise.all([
    prisma.subscription.findFirst({where: {memberId: id}, orderBy: {startsAt: "desc"}}).catch(() => null),
    settings().catch(() => null),
    prisma.activity.findMany({where: {memberId: id}, orderBy: {createdAt: "desc"}, take: 8}).catch(() => []),
    prisma.withdrawal.findMany({where: {memberId: id}}).catch(() => []),
  ]);

  const subPlan = sub?.planId ? await prisma.plan.findUnique({where: {id: sub.planId}}).catch(() => null) : null;

  const pendingWithdrawals = (allWithdrawals || []).filter((w: any) => w.status === "pending" || w.status === "processing");
  const reservedCents = pendingWithdrawals.reduce((sum: number, w: any) => sum + (Number(w.amountCents) || 0), 0);

  const durationDays = sub ? planDurationDays(sub.planId) : 0;
  const startsAtTime = sub ? (sub.startsAt instanceof Date ? sub.startsAt.getTime() : new Date(sub.startsAt).getTime()) : 0;
  const expiresAtTime = sub ? (sub.expiresAt instanceof Date ? sub.expiresAt.getTime() : new Date(sub.expiresAt).getTime()) : 0;
  const elapsedDays = sub ? Math.max(0, Math.min(durationDays, Math.floor((Math.min(now.getTime(), expiresAtTime) - startsAtTime) / DAY))) : 0;
  const balanceCents = Number(user.realBalanceCents ?? user.balanceCents ?? 0);
  const canWithdraw = !!user.payoutAddress && balanceCents >= MIN_WITHDRAWAL_CENTS;
  
  return {
    user: userView(user),
    subscription: sub ? subscriptionView(sub, subPlan) : null,
    todayEarned: sub && expiresAtTime > Date.now() ? money(Number(subPlan?.dailyProfitCents ?? sub.dailyProfitCents ?? 0)) : 0,
    dailyProfit: sub && expiresAtTime > Date.now() ? money(Number(subPlan?.dailyProfitCents ?? sub.dailyProfitCents ?? 0)) : 0,
    creditedDays: elapsedDays,
    nextAccrualAt: sub && (sub.lastCreditedDay ?? 0) < durationDays ? safeIsoOrNull(startsAtTime + ((sub.lastCreditedDay ?? 0) + 1) * DAY) : null,
    reservedBalance: money(reservedCents),
    canWithdraw,
    withdrawalReason: !user.payoutAddress ? "أضف عنوان محفظة Polygon قبل طلب السحب."
      : balanceCents < MIN_WITHDRAWAL_CENTS ? (reservedCents > 0 ? "طلب السحب قيد المراجعة. يمكنك إلغاؤه لاستعادة الرصيد أو انتظار اعتماده." : `الحد الأدنى للسحب ${money(MIN_WITHDRAWAL_CENTS)} USDT.`)
      : "السحب يُراجع ويُحوّل يدوياً بعملة USDT على Polygon.",
    recentActivity: (activities || []).map(activityView),
  };
}

export function startAccrualWorker(): void {
  let running = false;
  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      if (prisma && prisma.subscription && typeof prisma.subscription.findMany === "function") {
        const members = await prisma.subscription.findMany({
          select: {memberId: true},
        }).catch(() => []);
        const uniqueMemberIds = Array.from(new Set((members || []).map((m: any) => m.memberId))).filter(Boolean) as string[];
        for (const memberId of uniqueMemberIds) {
          await accrue(prisma, memberId).catch(() => {});
        }
      }
    } catch (err) { logger.warn({err}, "Daily accrual sweep note; will retry"); }
    finally { running = false; }
  };
  try { void sweep().catch(() => {}); } catch {}
  try {
    const timer = setInterval(() => { void sweep().catch(() => {}); }, 60_000);
    if (timer && typeof timer.unref === "function") timer.unref();
  } catch {}
}
