import { money, safeIso, safeIsoOrNull } from "./platform";

export { safeIso, safeIsoOrNull };

export const depositView = (d: any) => {
  const phoneDigits = String(d.member?.phone || d.memberPhone || "").replace(/[^0-9]/g, "");
  const mId = phoneDigits.length >= 5 ? phoneDigits.slice(-5) : String(d.member?.memberId || d.memberId || "");
  return {
    id: String(d.id ?? ""),
    memberId: mId,
    memberName: String(d.member?.name || d.memberName || "عضو ارتقاء"),
    memberPhone: String(d.member?.phone || d.memberPhone || ""),
    planId: String(d.planId ?? ""),
    planName: String(d.planName ?? ""),
    amount: money(Number(d.amountCents ?? d.amount ?? 0)),
    dailyProfit: money(Number(d.dailyProfitCents ?? d.dailyProfit ?? 0)),
    channel: String(d.channel ?? "binance"),
    address: String(d.address ?? ""),
    status: String(d.status ?? "pending"),
    txHash: d.txHash ? String(d.txHash) : null,
    receiptUrl: d.receiptUploadId ? `/api/receipts/${d.receiptUploadId}` : (d.receiptUrl || null),
    reviewNote: String(d.reviewNote ?? ""),
    createdAt: safeIso(d.createdAt),
    reviewedAt: safeIsoOrNull(d.reviewedAt),
    terms: String(d.terms ?? ""),
    fundingDescription: String(d.fundingDescription ?? ""),
  };
};

export const withdrawalView = (w: any) => {
  const phoneDigits = String(w.member?.phone || w.memberPhone || "").replace(/[^0-9]/g, "");
  const mId = phoneDigits.length >= 5 ? phoneDigits.slice(-5) : String(w.member?.memberId || w.memberId || "");
  return {
    id: String(w.id ?? ""),
    memberId: mId,
    memberName: String(w.memberName || w.member?.name || "عضو ارتقاء"),
    memberPhone: String(w.member?.phone || w.memberPhone || ""),
    amount: money(Number(w.amountCents ?? w.amount ?? 0)),
    status: String(w.status ?? "pending"),
    address: String(w.address ?? ""),
    txHash: w.txHash ? String(w.txHash) : null,
    reviewNote: String(w.reviewNote ?? ""),
    createdAt: safeIso(w.createdAt),
    reviewedAt: safeIsoOrNull(w.reviewedAt),
  };
};
