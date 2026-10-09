import { useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Copy, Check, AlertTriangle, Upload, ImageIcon, Settings2, FileText, XCircle, ArrowUpRight, Clock, ShieldCheck } from "lucide-react";
import {
  useListPlans, getListPlansQueryKey, useGetSettings, getGetSettingsQueryKey, useListDeposits, getListDepositsQueryKey,
  useCreateDeposit, useSubmitDepositProof, useCancelDeposit, useRequestReceiptUpload, useGetDashboard, getGetDashboardQueryKey, type Deposit,
} from "@workspace/api-client-react";
import { PageHead, Skel, ErrorBox } from "@/components/brand";
import { useSessionUser } from "@/components/shell";
import { StatusPill } from "@/pages/member";
import { useToast } from "@/hooks/use-toast";
import { apiError, usdt, formatDate, FREE_PLAN_ID, planDurationDays } from "@/lib/helpers";
import { useInvalidateAll, live } from "@/lib/invalidate";
import { useLanguage } from "@/lib/i18n";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const channelAr: Record<string, string> = { binance: "Binance", okx: "OKX" };
const TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

class ReceiptUploadError extends Error {}

async function uploadReceiptThroughApp(uploadId: string, file: File, isEn = false): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/receipts/upload/${encodeURIComponent(uploadId)}/content`, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    throw new ReceiptUploadError(isEn ? "Connection failed. Please check your connection and try again." : "تعذر الاتصال بخدمة رفع الصور. تحقق من الاتصال وحاول مجددًا.");
  }
  if (response.ok) return;
  const body = await response.json().catch(() => null) as { error?: unknown } | null;
  throw new ReceiptUploadError(typeof body?.error === "string" ? body.error : (isEn ? "Upload failed, please try again." : "تعذر رفع الصورة، حاول مجددًا."));
}

function CopyBtn({ text, id }: { text: string; id: string }) {
  const [ok, setOk] = useState(false);
  const { isEn } = useLanguage();
  return (
    <button type="button" data-testid={`button-copy-${id}`} onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="btn-ghost flex shrink-0 items-center gap-1.5 px-3 py-2 text-xs">
      {ok ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      {ok ? (isEn ? "Copied" : "نُسخ") : (isEn ? "Copy" : "نسخ")}
    </button>
  );
}

export function DepositsPage() {
  const { user } = useSessionUser();
  const inv = useInvalidateAll();
  const { toast } = useToast();
  const { isEn, lang } = useLanguage();
  const plans = useListPlans({ query: { queryKey: getListPlansQueryKey(), ...live } });
  const settings = useGetSettings({ query: { queryKey: getGetSettingsQueryKey(), ...live } });
  const deps = useListDeposits({ query: { enabled: !!user, queryKey: getListDepositsQueryKey(), ...live } });
  const open = deps.data?.find((d) => d.status === "awaiting_receipt" || d.status === "pending");
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const cancel = useCancelDeposit({
    mutation: {
      onSuccess: () => { toast({ title: isEn ? "Deposit order cancelled" : "أُلغي طلب الإيداع" }); inv(); setCancelTargetId(null); },
      onError: (e) => toast({ title: isEn ? "Cancellation failed" : "تعذر الإلغاء", description: apiError(e), variant: "destructive" }),
    },
  });

  return (
    <>
      <PageHead
        eyebrow={isEn ? "Deposits" : "الإيداع"}
        title={isEn ? "USDT Membership Subscription & Upgrade" : "اشتراك وتحديث العضوية عبر USDT"}
        desc={isEn ? "Choose your plan or upgrade to a higher tier by paying the difference only. Create the order first to receive the deposit address and exact amount." : "اختر باقتك أو قم بالترقية لباقة أعلى ودفع الفارق فقط. أنشئ الطلب أولًا لتحصل على عنوان الاستلام والمبلغ الدقيق."}
      />
      {deps.isLoading || plans.isLoading || settings.isLoading ? <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]"><Skel className="h-96" /><Skel className="h-96" /></div>
        : deps.isError || plans.isError || settings.isError ? <ErrorBox onRetry={() => { deps.refetch(); plans.refetch(); settings.refetch(); }} />
        : (
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div>{open ? <OpenOrder d={open} /> : <NewOrder depsList={deps.data ?? []} />}</div>
            <div className="glass h-fit rounded-3xl p-4 sm:p-6">
              <h3 className="font-display font-medium mb-1">{isEn ? "Deposit History" : "سجل الإيداعات"}</h3>
              {!deps.data?.length ? <p className="py-8 text-center text-sm text-muted-foreground">{isEn ? "No deposit requests yet." : "لا توجد طلبات إيداع بعد."}</p> : (
                <ul className="divide-y divide-border/60">
                  {deps.data.map((d) => (
                    <li key={d.id} data-testid={`row-deposit-${d.id}`} className="py-3.5 text-sm space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <div><p>{d.planName} <span className="text-xs text-muted-foreground">· {channelAr[d.channel] ?? d.channel}</span></p><p className={`num text-xs text-muted-foreground ${isEn ? "text-left" : "text-right"}`}>{usdt(d.amount)}</p></div>
                        <StatusPill status={d.status} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{isEn ? "Deposit date & time:" : "تاريخ ووقت الإيداع:"}</span>
                        <span className="font-medium text-foreground">{formatDate(d.createdAt, lang, true)}</span>
                      </div>
                      {d.reviewedAt && (
                        <p className="text-[11px] text-muted-foreground">
                          {isEn ? "Review and approval date: " : "تاريخ المراجعة والاعتماد: "}<span className="text-foreground">{formatDate(d.reviewedAt, lang, true)}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                        {d.receiptUrl && <a href={d.receiptUrl} target="_blank" rel="noreferrer" data-testid={`link-receipt-${d.id}`} className="inline-flex items-center gap-1 text-primary"><ImageIcon className="h-3 w-3" />{isEn ? "Receipt" : "الإيصال"}</a>}
                        {(d.status === "awaiting_receipt" || d.status === "pending") && (
                          <button
                            type="button"
                            data-testid={`button-cancel-deposit-list-${d.id}`}
                            onClick={() => setCancelTargetId(d.id)}
                            className="text-xs text-[hsl(4_80%_76%)] hover:underline inline-flex items-center gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" /> {isEn ? "Cancel Order" : "إلغاء الطلب"}
                          </button>
                        )}
                      </div>
                      {d.reviewNote && <p className="text-xs text-muted-foreground">{isEn ? "Admin Note: " : "ملاحظة الإدارة: "}{d.reviewNote}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

      <AlertDialog open={!!cancelTargetId} onOpenChange={(open) => !open && setCancelTargetId(null)}>
        <AlertDialogContent className="glass-strong border-border bg-transparent">
          <AlertDialogHeader className={isEn ? "text-left sm:text-left" : "text-right sm:text-right"}>
            <AlertDialogTitle className="font-display">{isEn ? "Cancel Deposit Order?" : "إلغاء طلب الإيداع؟"}</AlertDialogTitle>
            <AlertDialogDescription>{isEn ? "Are you sure you want to cancel this order? Cancelling allows you to create a new deposit request." : "هل أنت تأكد من إغلاق هذا الطلب؟ الإلغاء يسمح لك بإنشاء طلب إيداع جديد."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
            <AlertDialogAction data-testid="button-confirm-cancel-list" className="btn-gold border-0" disabled={cancel.isPending} onClick={(e) => { e.preventDefault(); if (cancelTargetId) cancel.mutate({ id: cancelTargetId }); }}>{cancel.isPending ? (isEn ? "Cancelling..." : "جارٍ الإلغاء...") : (isEn ? "Yes, Cancel Order" : "نعم، ألغِ الطلب")}</AlertDialogAction>
            <AlertDialogCancel data-testid="button-keep-deposit-list" className="btn-ghost bg-transparent">{isEn ? "Keep Order" : "تراجع"}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NewOrder({ depsList }: { depsList: Deposit[] }) {
  const { toast } = useToast();
  const inv = useInvalidateAll();
  const { isEn } = useLanguage();
  const { user } = useSessionUser();
  const dash = useGetDashboard({ query: { enabled: !!user, queryKey: getGetDashboardQueryKey() } });
  const plans = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const settings = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [planId, setPlanId] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("plan");
      if (p) return p;
    }
    return "";
  });
  const [channel, setChannel] = useState<"binance" | "okx" | "">("");
  const [accepted, setAccepted] = useState(false);
  const [err, setErr] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);

  const create = useCreateDeposit({
    mutation: {
      onSuccess: () => {
        toast({
          title: isEn ? "Deposit order created successfully" : "تم إنشاء طلب الإيداع بنجاح",
          description: isEn
            ? "Please transfer the exact amount to the specified wallet address and attach your receipt to activate your plan."
            : "يرجى تحويل المبلغ المحدد إلى عنوان المحفظة الموضح وإرفاق صورة الإيصال لتأكيد تفعيل الباقة.",
        });
        setAccepted(false);
        setVerifyOpen(false);
        inv();
      },
      onError: (e) => {
        const msg = apiError(e);
        setErr(msg);
        toast({ title: isEn ? "Failed to create order" : "تعذر إنشاء طلب الإيداع", description: msg, variant: "destructive" });
      },
    },
  });

  const s = settings.data;
  const list = plans.data ?? [];
  const activeSub = dash.data?.subscription;
  const hasActiveSub = !!activeSub;
  const currentPlanPrice = activeSub?.plan ? Number(activeSub.plan.annualPrice) : 0;
  const currentPlanId = activeSub?.plan?.id ?? null;

  const usedPlanIds = new Set<string>();
  if (currentPlanId) usedPlanIds.add(currentPlanId);
  depsList.forEach((d) => {
    if (d.status === "approved") {
      usedPlanIds.add(d.planId);
    }
  });

  if (!s?.ready || !s.depositsEnabled || !list.length) {
    return (
      <div data-testid="empty-deposits-setup" className="glass rounded-3xl p-10 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(40_62%_68%/.1)] text-primary"><Settings2 className="h-7 w-7" /></div>
        <p className="font-display text-xl">{isEn ? "Deposits currently unavailable" : "الإيداع غير متاح حاليًا"}</p>
        <p className="mt-2 text-muted-foreground leading-relaxed max-w-md mx-auto">
          {!list.length ? (isEn ? "No plans have been initialized yet. " : "لم تُهيأ أي خطة بعد. ") : ""}
          {!s?.depositsEnabled || !s?.ready ? (isEn ? "Deposit addresses are still being set up by management. " : "لم يكتمل إعداد عناوين الاستلام والشروط من قِبل الإدارة. ") : ""}
          {isEn ? "Please return later. Never send funds to an unlisted address." : "عُد لاحقًا، ولا تحوّل أي مبلغ إلى عنوان لم يظهر داخل طلب إيداع منشأ هنا."}
        </p>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault(); if (create.isPending) return; setErr("");
    if (!planId) return setErr(isEn ? "Please select a plan to join or upgrade" : "اختر خطة للترقية أو الاشتراك");
    if (!channel) return setErr(isEn ? "Please select receiving channel" : "اختر قناة الاستلام");
    if (!accepted) return setErr(isEn ? "You must accept the terms" : "يجب الموافقة على الشروط");
    if (planId === FREE_PLAN_ID) return setVerifyOpen(true);
    create.mutate({ data: { planId, channel, acceptedTerms: true } });
  };

  const confirmFreeVerification = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (create.isPending || planId !== FREE_PLAN_ID || !channel || !accepted) return;
    create.mutate({ data: { planId, channel, acceptedTerms: true } });
  };

  const channels = (["binance", "okx"] as const).filter((c) => (c === "binance" ? s.binanceAddress : s.okxAddress));
  const getPlanPrice = (p: { id: string; annualPrice: number }) => (p.id === FREE_PLAN_ID && Number(p.annualPrice) === 0 ? 4 : Number(p.annualPrice));
  const activePlanObj = list.find((p) => p.id === currentPlanId);
  const activePlanPrice = activePlanObj ? getPlanPrice(activePlanObj) : (activeSub?.plan ? getPlanPrice(activeSub.plan) : 0);
  const selectedPlan = list.find((p) => p.id === planId);
  const selectedPlanPrice = selectedPlan ? getPlanPrice(selectedPlan) : 0;
  const isSelectedUpgrade = selectedPlan && hasActiveSub && selectedPlan.id !== currentPlanId && selectedPlanPrice > activePlanPrice;
  const selectedUpgradeDiff = selectedPlan && isSelectedUpgrade ? Math.max(0, selectedPlanPrice - activePlanPrice) : 0;

  return (
    <form onSubmit={submit} className="glass rounded-3xl p-4 space-y-6 sm:p-7">
      <div>
        <p className="text-sm text-muted-foreground mb-3">
          {isEn
            ? "1. Select Plan (Each plan can be joined once or upgraded by paying the difference only)"
            : "1. اختر الخطة (يمكن الاشتراك في كل باقة مرة واحدة فقط أو الترقية لباقة أعلى ودفع الفارق فقط)"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((p) => {
            const isCurrent = currentPlanId === p.id;
            const isUsed = usedPlanIds.has(p.id);
            const targetPrice = getPlanPrice(p);
            const isLowerOrSame = hasActiveSub && targetPrice <= activePlanPrice;
            const isUpgrade = hasActiveSub && !isCurrent && targetPrice > activePlanPrice;
            const upgradeDiff = isUpgrade ? Math.max(0, targetPrice - activePlanPrice) : targetPrice;
            const isDisabled = isCurrent || isUsed || isLowerOrSame;

            return (
              <button
                type="button"
                key={p.id}
                data-testid={`select-plan-${p.id}`}
                disabled={isDisabled}
                onClick={() => { setErr(""); setPlanId(p.id); }}
                className={`rounded-2xl border p-4 transition-colors relative ${isEn ? "text-left" : "text-right"} ${
                  planId === p.id
                    ? "border-[hsl(40_62%_68%/.6)] bg-[hsl(40_62%_68%/.08)]"
                    : isDisabled
                    ? "border-border/40 opacity-60 bg-muted/20 cursor-not-allowed"
                    : "border-border hover:bg-[hsl(40_40%_90%/.03)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display font-medium">{p.name}</p>
                  {isCurrent && <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">{isEn ? "Current Plan" : "باقتك الحالية"}</span>}
                  {!isCurrent && isUsed && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{isEn ? "Previously Joined" : "مشترك سابقاً"}</span>}
                  {!isCurrent && !isUsed && isLowerOrSame && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{isEn ? "Not Eligible for Upgrade" : "غير متاح للترقية"}</span>}
                  {!isCurrent && !isUsed && isUpgrade && <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] text-accent flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />{isEn ? "Upgrade (Difference only)" : "ترقية (ادفع الفارق فقط)"}</span>}
                  {p.id === FREE_PLAN_ID && !isCurrent && !isUsed && <span className="rounded-full border border-[hsl(40_62%_68%/.45)] px-2.5 py-1 text-[10px] text-primary">{isEn ? "Verification Required" : "بشرط التوثيق"}</span>}
                </div>

                <div className={`mt-2 text-primary ${isEn ? "text-left" : "text-right"}`}>
                  {isUpgrade ? (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-0.5">
                        <span>{isEn ? "Plan Price: " : "سعر الباقة: "}<span className="num font-medium text-foreground">{usdt(targetPrice)}</span></span>
                        <span>·</span>
                        <span className="text-accent font-medium">{isEn ? "Current Credit: " : "خصم باقتك: "}-{usdt(activePlanPrice)}</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="num text-xl sm:text-2xl font-bold gold-text">{usdt(upgradeDiff)}</span>
                      </div>
                      <p className="text-[11px] text-accent font-medium mt-0.5">
                        {isEn ? `Upgrade Difference: Pay ${usdt(upgradeDiff)} only` : `فارق الترقية المطلوب: ادفع ${usdt(upgradeDiff)} فقط`}
                      </p>
                    </div>
                  ) : p.id === FREE_PLAN_ID ? (
                    <div>
                      <span className="num text-lg font-semibold">4 USDT</span>
                      <span className="text-[11px] text-muted-foreground mx-1.5">{isEn ? "(Account verification)" : "(توثيق الحساب)"}</span>
                    </div>
                  ) : (
                    <span className="num text-lg font-semibold">{usdt(p.annualPrice)}</span>
                  )}
                </div>

                <p className="mt-1.5 text-xs text-muted-foreground font-medium">{isEn ? `Contract Duration: ${planDurationDays(p.id)} Days` : `مدة العقد: ${planDurationDays(p.id)} يومًا`}</p>
                <p className="text-xs text-muted-foreground mt-1">{isEn ? "Daily Return: " : "ربح يومي ثابت "}<span className="num text-foreground">{usdt(p.dailyProfit)}</span></p>
                <p className="text-xs text-accent font-medium mt-0.5">{isEn ? "Expected Monthly: " : "ربح شهري متوقع "}<span className="num">{usdt(p.dailyProfit * 30)}</span></p>
              </button>
            );
          })}
        </div>

        {isSelectedUpgrade && (
          <div data-testid="notice-upgrade-diff" className="mt-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm leading-relaxed space-y-2">
            <p className="font-semibold text-accent flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              {isEn ? `Membership upgrade from ${activeSub?.plan?.name || "Current Plan"} to ${selectedPlan?.name || "New Plan"}` : `ترقية عضوية من ${activeSub?.plan?.name || "باقتك الحالية"} إلى ${selectedPlan?.name || "الباقة الجديدة"}`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs py-1">
              <div className="rounded-xl border border-border/50 bg-background/40 p-2.5">
                <p className="text-muted-foreground">{isEn ? `Price of ${selectedPlan?.name}:` : `سعر ${selectedPlan?.name}:`}</p>
                <p className="num font-semibold text-foreground text-sm mt-0.5">{usdt(selectedPlanPrice)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/40 p-2.5">
                <p className="text-muted-foreground">{isEn ? "Current plan credit:" : "قيمة باقتك الحالية (خصم):"}</p>
                <p className="num font-semibold text-accent text-sm mt-0.5">- {usdt(activePlanPrice)}</p>
              </div>
              <div className="rounded-xl border border-accent/40 bg-accent/20 p-2.5">
                <p className="text-accent font-medium">{isEn ? "Difference to pay:" : "فارق الترقية للدفع:"}</p>
                <p className="num font-bold gold-text text-sm mt-0.5">{usdt(selectedUpgradeDiff)}</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-foreground">
              {isEn
                ? `Your current plan value (${usdt(activePlanPrice)}) has been deducted. You only pay the difference of ${usdt(selectedUpgradeDiff)} instead of full ${usdt(selectedPlanPrice)}.`
                : `تم خصم قيمة باقتك الحالية (${usdt(activePlanPrice)}). ستدفع فقط فارق السعر وقدره ${usdt(selectedUpgradeDiff)} بدلاً من المبلغ الكامل (${usdt(selectedPlanPrice)}).`}
            </p>
          </div>
        )}

        {planId === FREE_PLAN_ID && (
          <div data-testid="notice-free-plan-verification" className="mt-3 rounded-2xl border border-[hsl(40_62%_68%/.35)] bg-[hsl(40_62%_68%/.06)] p-4 text-sm leading-relaxed">
            {isEn
              ? "Free 90-day contract with 0.50 USDT daily return. Verification deposit of 4 USDT is required to prevent multiple accounts; the contract activates upon management approval."
              : "العقد مجاني لمدة 90 يومًا بربح يومي 0.50 USDT. يتطلب توثيق الحساب إيداع 4 USDT لمنع استغلال الميزة وإنشاء أكثر من حساب؛ لا يبدأ العقد قبل مراجعة الإيصال من الإدارة."}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-3">{isEn ? "2. Receiving Channel" : "2. قناة الاستلام"}</p>
        <div className="flex gap-3">
          {channels.map((c) => (
            <button type="button" key={c} data-testid={`select-channel-${c}`} onClick={() => setChannel(c)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm ${channel === c ? "border-[hsl(40_62%_68%/.6)] bg-[hsl(40_62%_68%/.08)] text-primary" : "border-border"}`}>{channelAr[c]}</button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {isEn ? "Direct wallet addresses verified by administration. IRTIQA is not affiliated with Binance or OKX." : "تسميات لعناوين يضبطها المسؤول يدويًا. ارتقاء غير تابعة لـ Binance أو OKX."}
        </p>
        {channel && (
          <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center bg-[hsl(40_62%_68%/.03)] rounded-2xl border border-[hsl(40_62%_68%/.2)] p-4 min-w-0 w-full animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white p-2.5 rounded-2xl shrink-0 flex items-center justify-center border border-border shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(channel === "binance" ? s?.binanceAddress || "" : s?.okxAddress || "")}`}
                alt="QR Code"
                className="w-24 h-24 sm:w-28 sm:h-28 select-none object-contain"
                loading="lazy"
              />
            </div>
            <div className={`flex-1 min-w-0 ${isEn ? "text-left sm:text-left" : "text-right sm:text-right"} space-y-1.5 w-full`}>
              <span className="text-xs text-muted-foreground block font-medium">
                {isEn ? `Direct Receiving Address for ${channelAr[channel]}:` : `عنوان الاستلام المباشر لـ ${channelAr[channel]}:`}
              </span>
              <p className="num break-all text-xs sm:text-sm font-semibold text-primary select-all bg-background/20 p-2.5 rounded-xl border border-border/40 leading-relaxed">
                {channel === "binance" ? s?.binanceAddress : s?.okxAddress}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <CopyBtn text={channel === "binance" ? s?.binanceAddress || "" : s?.okxAddress || ""} id="channel-preview-address" />
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                  {isEn ? "Official verified IRTIQA address" : "عنوان رسمي ومعتمد في ارتقاء"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {isEn ? "3. Funding Description & Terms" : "3. وصف التمويل والشروط"}
        </p>
        <div className="max-h-56 overflow-y-auto rounded-2xl border border-border bg-[hsl(205_36%_7%/.5)] p-4 text-sm leading-relaxed whitespace-pre-wrap space-y-3">
          <p data-testid="text-funding-description">{s.fundingDescription}</p>
          <div className="hairline" />
          <p data-testid="text-terms" className="text-muted-foreground">{s.terms}</p>
        </div>
        <label className="mt-3 flex items-start gap-3 text-sm cursor-pointer">
          <input data-testid="checkbox-accept-terms" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(40_62%_68%)]" />
          {isEn
            ? "I have read and agree to the description and terms, and understand that returns depend on market activities with no guaranteed profits."
            : "قرأت الوصف والشروط وأوافق عليها، وأفهم أنه لا توجد عوائد مضمونة."}
        </label>
      </div>

      {err && <p className="text-sm text-[hsl(4_80%_76%)]">{err}</p>}

      <button data-testid="button-create-deposit" disabled={create.isPending} className="btn-gold w-full py-3 font-medium">
        {create.isPending
          ? (isEn ? "Creating..." : "جارٍ الإنشاء...")
          : planId === FREE_PLAN_ID
          ? (isEn ? "Activate Free Contract" : "تفعيل العقد المجاني")
          : isSelectedUpgrade
          ? (isEn ? `Request Upgrade for ${usdt(selectedUpgradeDiff)} (Difference only)` : `طلب الترقية مقابل ${usdt(selectedUpgradeDiff)} (ادفع الفارق فقط)`)
          : (isEn ? "Create Deposit Order" : "إنشاء طلب الإيداع")}
      </button>

      <AlertDialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <AlertDialogContent className="glass-strong border-border bg-transparent">
          <AlertDialogHeader className={isEn ? "text-left sm:text-left" : "text-right sm:text-right"}>
            <AlertDialogTitle className="font-display">
              {isEn ? "Account Verification Required for Free Contract" : "توثيق الحساب مطلوب لتفعيل العقد المجاني"}
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {isEn
                ? "The contract is completely free. Account verification requires a 4 USDT deposit to prevent system abuse and multiple accounts. The contract activates after receipt verification."
                : "العقد مجاني بالكامل. يتطلب توثيق الحساب إيداع 4 USDT لمنع استغلال الميزة وإنشاء أكثر من حساب. لن يُفعّل العقد قبل رفع الإيصال والتحقق اليدوي من وصول المبلغ."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="grid gap-2 rounded-2xl border border-border bg-background/40 p-4 text-sm">
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{isEn ? "Contract Price" : "سعر العقد"}</dt><dd className="num">0 USDT</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{isEn ? "Daily Return" : "الربح اليومي"}</dt><dd className="num text-accent">0.50 USDT</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{isEn ? "Contract Duration" : "مدة العقد"}</dt><dd className="num">{isEn ? "90 Days" : "90 يومًا"}</dd></div>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2 font-medium"><dt>{isEn ? "Verification Deposit Required" : "إيداع التوثيق المطلوب"}</dt><dd className="num text-primary">4 USDT</dd></div>
          </dl>
          {err && <p data-testid="text-verify-error" className="text-sm text-[hsl(4_80%_76%)]">{err}</p>}
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
            <AlertDialogAction type="button" data-testid="button-confirm-free-verification" disabled={create.isPending} className="btn-gold border-0" onClick={confirmFreeVerification}>
              {create.isPending ? (isEn ? "Creating order..." : "جارٍ إنشاء الطلب...") : (isEn ? "Proceed to Deposit 4 USDT" : "متابعة لإيداع 4 USDT")}
            </AlertDialogAction>
            <AlertDialogCancel type="button" data-testid="button-cancel-free-verification" className="btn-ghost bg-transparent">{isEn ? "Cancel" : "إلغاء"}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function OpenOrder({ d }: { d: Deposit }) {
  const { toast } = useToast();
  const inv = useInvalidateAll();
  const { isEn, lang } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const reqUpload = useRequestReceiptUpload();

  const proof = useSubmitDepositProof({
    mutation: {
      onSuccess: () => {
        toast({
          title: isEn ? "Receipt submitted successfully" : "تم إرسال إيصال الإيداع بنجاح",
          description: isEn
            ? "Your receipt image has been received. Administration will manually verify payment on-chain."
            : "تم استلام صورة الإيصال بنجاح. سيتحقق المسؤول يدويًا من وصول التحويل لتفعيل عضويتك فورًا.",
        });
        setFile(null);
        inv();
      },
      onError: (e) => {
        const msg = apiError(e);
        setErr(msg);
        toast({ title: isEn ? "Failed to submit receipt" : "تعذر إرسال الإيصال", description: msg, variant: "destructive" });
      },
    },
  });

  const cancel = useCancelDeposit({
    mutation: {
      onSuccess: () => {
        toast({
          title: isEn ? "Deposit order cancelled" : "تم إلغاء طلب الإيداع بنجاح",
          description: isEn
            ? "Deposit order closed. You can now select another tier and create a new order."
            : "تم إغلاق طلب الإيداع. يمكنك الآن اختيار باقة أخرى وإنشاء طلب جديد في أي وقت.",
        });
        inv();
      },
      onError: (e) => toast({ title: isEn ? "Cancellation failed" : "تعذر إلغاء الطلب", description: apiError(e), variant: "destructive" }),
      onSettled: () => setConfirmCancel(false),
    },
  });

  const busy = uploading || proof.isPending;

  const pick = (f: File | undefined) => {
    setErr("");
    if (!f) return;
    if (!(TYPES as readonly string[]).includes(f.type)) return setErr(isEn ? "Allowed formats: PNG, JPEG, or WebP" : "الصيغ المسموحة: PNG أو JPEG أو WebP");
    if (f.size > 5 * 1024 * 1024) return setErr(isEn ? "Maximum image size is 5MB" : "الحد الأقصى لحجم الصورة 5 ميغابايت");
    setFile(f);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return; setErr("");
    if (!file) return setErr(isEn ? "Please attach the receipt image" : "أرفق صورة الإيصال");
    setUploading(true);
    try {
      const up = await reqUpload.mutateAsync({ data: { contentType: file.type as (typeof TYPES)[number], size: file.size } });
      let directUploadSucceeded = false;
      try {
        const res = await fetch(up.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        directUploadSucceeded = res.ok;
      } catch {
        // Some mobile browsers cannot complete the cross-origin signed PUT; retry via the same-origin API.
      }
      if (!directUploadSucceeded) await uploadReceiptThroughApp(up.uploadId, file, isEn);
      setUploading(false);
      proof.mutate({ id: d.id, data: { uploadId: up.uploadId } });
    } catch (x) {
      setUploading(false);
      setErr(x instanceof ReceiptUploadError ? x.message : apiError(x));
    }
  };

  if (d.status === "pending") {
    return (
      <div data-testid="card-deposit-pending" className="glass rounded-3xl p-5 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-xl">{isEn ? "Your Order is Under Review" : "طلبك قيد المراجعة"}</p>
          <StatusPill status="pending" />
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {d.receiptUrl
            ? (isEn
                ? "Transfer receipt uploaded successfully. Management will manually verify arrival on the Polygon network before activating your subscription."
                : "تم رفع إيصال التحويل بنجاح. سيتحقق المسؤول يدويًا من وصول التحويل على شبكة Polygon قبل تفعيل الاشتراك.")
            : (isEn
                ? "Your deposit order is recorded and under management review. Management will verify on-chain arrival before activating your tier. You may also attach your receipt image below for faster verification."
                : "تم تسجيل طلب الإيداع وهو قيد المراجعة لدى الإدارة. سيتحقق المسؤول يدويًا من وصول التحويل على شبكة Polygon قبل تفعيل الاشتراك. يمكنك أيضاً رفع صورة الإيصال أدناه اختياريًا لسرعة التحقق.")}
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 rounded-2xl border border-border p-4 bg-background/20">
          <div><dt className="text-xs text-muted-foreground">{isEn ? "Target Plan" : "الباقة المطلوب الترقية لها"}</dt><dd className="font-medium text-foreground">{d.planName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">{isEn ? "Amount Required" : "المبلغ المطلوب للتحويل"}</dt><dd className={`num font-semibold ${isEn ? "text-left" : "text-right"} text-primary`}>{usdt(d.amount)}</dd></div>
          <div className="sm:col-span-2 border-t border-border/50 pt-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary shrink-0" />{isEn ? "Order created at:" : "تاريخ ووقت إرسال طلب الإيداع:"}</span>
            <span className="font-semibold text-foreground">{formatDate(d.createdAt, lang, true)}</span>
          </div>
          <div className="sm:col-span-2 border-t border-border/50 pt-3 flex flex-col sm:flex-row items-center gap-4 bg-background/10 p-3 rounded-xl">
            <div className="bg-white p-2 rounded-xl shrink-0 border border-border flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(d.address)}`}
                alt="QR Code"
                className="w-20 h-20 select-none object-contain"
                loading="lazy"
              />
            </div>
            <div className={`min-w-0 flex-1 ${isEn ? "text-left" : "text-right"}`}>
              <dt className="text-xs text-muted-foreground">{isEn ? `Receiving Address · ${channelAr[d.channel] ?? d.channel}` : `عنوان الاستلام · ${channelAr[d.channel] ?? d.channel}`}</dt>
              <dd className="num text-xs sm:text-sm break-all text-primary font-semibold mt-1">{d.address}</dd>
            </div>
          </div>
        </dl>

        {d.receiptUrl ? (
          <a href={d.receiptUrl} target="_blank" rel="noreferrer" data-testid="link-pending-receipt" className="inline-block">
            <p className="text-xs text-muted-foreground mb-1">{isEn ? "Attached Receipt:" : "الإيصال المرفق:"}</p>
            <img src={d.receiptUrl} alt="Receipt" className="max-h-60 rounded-2xl border border-border object-contain" />
          </a>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border p-4 space-y-3 bg-background/30">
            <p className="text-xs font-medium text-foreground">{isEn ? "Upload Transfer Receipt (Optional)" : "رفع إيصال التحويل (اختياري)"}</p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid="input-receipt-file-pending" />
            <button type="button" data-testid="button-pick-receipt-pending" onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground hover:bg-[hsl(40_40%_90%/.03)]">
              <Upload className="h-4 w-4" />{file ? <span className="text-foreground">{file.name} · <span className="num">{(file.size / 1024 / 1024).toFixed(2)} MB</span></span> : (isEn ? "Choose receipt image (PNG / JPEG / WebP up to 5MB)" : "اختر صورة الإيصال (PNG / JPEG / WebP حتى 5MB)")}
            </button>
            {err && <p data-testid="text-proof-error-pending" className="text-xs text-[hsl(4_80%_76%)]">{err}</p>}
            {file && (
              <button data-testid="button-submit-proof-pending" disabled={busy} className="btn-gold w-full py-2.5 text-xs">
                {uploading ? (isEn ? "Uploading image..." : "جارٍ رفع الصورة...") : proof.isPending ? (isEn ? "Submitting..." : "جارٍ الإرسال...") : (isEn ? "Submit Receipt for Review" : "إرسال الإيصال للمراجعة")}
              </button>
            )}
          </form>
        )}

        <div className="pt-2 border-t border-border">
          <button type="button" data-testid="button-cancel-pending-deposit" onClick={() => setConfirmCancel(true)} disabled={cancel.isPending} className="btn-ghost flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[hsl(4_80%_76%)] hover:bg-destructive/10">
            <XCircle className="h-4 w-4" /> {isEn ? "Cancel Deposit Order" : "إلغاء طلب الإيداع"}
          </button>
        </div>

        <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <AlertDialogContent className="glass-strong border-border bg-transparent">
            <AlertDialogHeader className={isEn ? "text-left sm:text-left" : "text-right sm:text-right"}>
              <AlertDialogTitle className="font-display">{isEn ? "Cancel Deposit Order?" : "إلغاء طلب الإيداع؟"}</AlertDialogTitle>
              <AlertDialogDescription>
                {isEn
                  ? "If you have already sent funds, do NOT cancel this order; wait for management review. Cancelling closes this order and lets you create a new one."
                  : "إذا كنت قد حوّلت المبلغ بالفعل فلا تلغِ الطلب، بل انتظر مراجعة الإدارة. الإلغاء يغلق الطلب الحالي ويسمح لك بإنشاء طلب جديد."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
              <AlertDialogAction data-testid="button-confirm-cancel" className="btn-gold border-0" disabled={cancel.isPending} onClick={(e) => { e.preventDefault(); cancel.mutate({ id: d.id }); }}>
                {cancel.isPending ? (isEn ? "Cancelling..." : "جارٍ الإلغاء...") : (isEn ? "Yes, Cancel Order" : "نعم، ألغِ الطلب")}
              </AlertDialogAction>
              <AlertDialogCancel data-testid="button-keep-deposit" className="btn-ghost bg-transparent">{isEn ? "Keep Order" : "تراجع"}</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div data-testid="card-deposit-order" className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-xl">{isEn ? "Transfer the Exact Amount" : "حوّل المبلغ الدقيق"}</p>
          <StatusPill status={d.status} />
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">{isEn ? "Required Amount (USDT)" : "المبلغ المطلوب للترقية (USDT)"}</p>
            <div className="flex items-center gap-3">
              <p data-testid="text-deposit-amount" className="num font-display text-3xl gold-text flex-1">{d.amount}</p>
              <CopyBtn text={String(d.amount)} id="amount" />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {isEn ? `Direct Receiving Address · ${channelAr[d.channel] ?? d.channel}` : `عنوان الاستلام المباشر · ${channelAr[d.channel] ?? d.channel}`}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-[hsl(40_62%_68%/.03)] rounded-2xl border border-[hsl(40_62%_68%/.2)] p-4 min-w-0 w-full">
              <div className="bg-white p-2.5 rounded-2xl shrink-0 flex items-center justify-center border border-border shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(d.address)}`}
                  alt="QR Code"
                  className="w-24 h-24 sm:w-28 sm:h-28 select-none object-contain"
                  loading="lazy"
                />
              </div>
              <div className={`flex-1 min-w-0 ${isEn ? "text-left sm:text-left" : "text-right sm:text-right"} space-y-1.5 w-full`}>
                <span className="text-xs text-muted-foreground block font-medium">
                  {isEn ? "Scan QR code to transfer or copy address below:" : "امسح الباركود للتحويل أو انسخ العنوان أدناه:"}
                </span>
                <p data-testid="text-deposit-address" className="num break-all text-xs sm:text-sm font-semibold text-primary select-all bg-background/20 p-2.5 rounded-xl border border-border/40 leading-relaxed">{d.address}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <CopyBtn text={d.address} id="address" />
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                    {isEn ? "Official verified IRTIQA address" : "عنوان رسمي وموثق في ارتقاء"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">
              {isEn ? `Plan ${d.planName} · Daily return ` : `الخطة ${d.planName} · ربح يومي ثابت `}
              <span className="num font-medium text-foreground">{usdt(d.dailyProfit)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              {isEn ? "Order created at: " : "تاريخ ووقت إنشاء الطلب: "}
              <strong className="font-semibold text-foreground">{formatDate(d.createdAt, lang, true)}</strong>
            </span>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-[hsl(12_60%_66%/.3)] bg-[hsl(12_60%_66%/.06)] p-4 text-sm text-[hsl(12_70%_80%)] space-y-1.5">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />{isEn ? "Notices Before Transfer" : "تنبيهات قبل التحويل"}</p>
          <p>{isEn ? "Send USDT only on Polygon (POL) network only. Any other asset or network cannot be recovered." : "أرسل USDT فقط وعلى شبكة Polygon فقط. أي رمز أو شبكة أخرى قد تضيع ولا يمكن استرجاعها."}</p>
          <p>{isEn ? "Send the exact amount above and account for your platform withdrawal fee so the net amount matches." : "أرسل المبلغ الدقيق أعلاه، واحتسب رسوم السحب من منصتك بحيث يصل المبلغ كاملًا."}</p>
          <p>{isEn ? "Use this verified address saved in your order only, not any other source." : "استخدم هذا العنوان المحفوظ في الطلب فقط، وليس أي عنوان من مصدر آخر."}</p>
        </div>
      </div>

      <form onSubmit={submit} className="glass rounded-3xl p-4 space-y-4 sm:p-7">
        <h3 className="font-display font-medium">{isEn ? "After Transfer: Upload Receipt Image (Optional)" : "بعد التحويل: ارفع صورة الإيصال (اختياري)"}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isEn
            ? "You can attach a receipt image to prove your transfer and facilitate management matching."
            : "يمكنك إرفاق صورة الإيصال لإثبات عملية التحويل وتسهيل مطابقة المبلغ من الإدارة."}
        </p>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid="input-receipt-file" />
        <button type="button" data-testid="button-pick-receipt" onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground hover:bg-[hsl(40_40%_90%/.03)]">
          <Upload className="h-4 w-4" />{file ? <span className="text-foreground">{file.name} · <span className="num">{(file.size / 1024 / 1024).toFixed(2)} MB</span></span> : (isEn ? "Choose receipt image (PNG / JPEG / WebP up to 5MB)" : "اختر صورة الإيصال (PNG / JPEG / WebP حتى 5MB)")}
        </button>
        {err && <p data-testid="text-proof-error" className="text-sm text-[hsl(4_80%_76%)]">{err}</p>}
        <button data-testid="button-submit-proof" disabled={busy} className="btn-gold w-full py-3">
          {uploading ? (isEn ? "Uploading image..." : "جارٍ رفع الصورة...") : proof.isPending ? (isEn ? "Submitting..." : "جارٍ الإرسال...") : (isEn ? "Submit Receipt for Review" : "إرسال الإيصال للمراجعة")}
        </button>
        <button type="button" data-testid="button-cancel-deposit" onClick={() => setConfirmCancel(true)} disabled={busy || cancel.isPending} className="btn-ghost w-full py-2.5 text-sm text-muted-foreground">
          {isEn ? "Cancel Order" : "إلغاء الطلب"}
        </button>
      </form>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="glass-strong border-border bg-transparent">
          <AlertDialogHeader className={isEn ? "text-left sm:text-left" : "text-right sm:text-right"}>
            <AlertDialogTitle className="font-display">{isEn ? "Cancel Deposit Order?" : "إلغاء طلب الإيداع؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEn
                ? "If you have already transferred funds, do NOT cancel. Instead, upload the receipt or contact support first. Cancelling after transfer may complicate tracking."
                : "إذا كنت قد حوّلت المبلغ بالفعل فلا تلغِ الطلب، بل ارفع الإيصال أو تواصل مع الدعم أولًا. الإلغاء بعد التحويل قد يصعّب تتبع أموالك."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
            <AlertDialogAction data-testid="button-confirm-cancel" className="btn-gold border-0" disabled={cancel.isPending} onClick={(e) => { e.preventDefault(); cancel.mutate({ id: d.id }); }}>
              {cancel.isPending ? (isEn ? "Cancelling..." : "جارٍ الإلغاء...") : (isEn ? "I haven't transferred, Cancel Order" : "لم أحوّل، ألغِ الطلب")}
            </AlertDialogAction>
            <AlertDialogCancel data-testid="button-keep-deposit" className="btn-ghost bg-transparent">{isEn ? "Keep Order" : "تراجع"}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
