import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { Copy, Check, Award, Timer, ShieldAlert, ArrowUpLeft, Gem, CalendarRange, CalendarCheck, Lock, ExternalLink, Clock, Calculator, Percent, Wallet, ArrowDownToLine } from "lucide-react";
import {
  useGetDashboard, getGetDashboardQueryKey, useListActivity, getListActivityQueryKey,
  useListWithdrawals, getListWithdrawalsQueryKey, useRequestWithdrawal, useGetSettings, getGetSettingsQueryKey, useSavePayoutAddress,
  type Activity, type Withdrawal,
} from "@workspace/api-client-react";
import { PageHead, Skel, ErrorBox } from "@/components/brand";
import { PlatformFoundingButton } from "@/components/platform-info";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSessionUser } from "@/components/shell";
import { useToast } from "@/hooks/use-toast";
import { apiError, usdt, dateAr, formatDate, useCountdown, statusAr, statusLabel, kindAr, kindLabel, isAddr, shortHex, subscriptionDurationDays } from "@/lib/helpers";
import { useInvalidateAll, live } from "@/lib/invalidate";
import { useLanguage } from "@/lib/i18n";

export function MemberId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button data-testid="button-copy-id" onClick={() => { navigator.clipboard?.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="group inline-flex max-w-full items-center gap-2 overflow-hidden rounded-xl border border-[hsl(40_62%_68%/.25)] bg-[hsl(40_62%_68%/.06)] px-2.5 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
      <span data-testid="text-member-id" className="num min-w-0 truncate text-sm tracking-[0.08em] gold-text font-medium sm:text-lg sm:tracking-[0.16em]">{id}</span>
      {copied ? <Check className="h-4 w-4 shrink-0 text-accent" /> : <Copy className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />}
    </button>
  );
}

export function HonorRing({ value, size = 120 }: { value: number; size?: number }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(200 22% 18%)" strokeWidth="7" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke="url(#hr)" strokeWidth="7" fill="none" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - clamped / 100) }} transition={{ duration: 1.4, ease: "easeOut" }} />
        <defs><linearGradient id="hr"><stop stopColor="hsl(168 42% 55%)" /><stop offset="1" stopColor="hsl(42 72% 76%)" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><p data-testid="text-honor" className="num font-display text-2xl font-semibold sm:text-3xl">{value}</p></div>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const { lang } = useLanguage();
  const tone: Record<string, string> = {
    approved: "border-accent/40 text-accent bg-accent/10", paid: "border-accent/40 text-accent bg-accent/10",
    pending: "border-[hsl(40_62%_68%/.4)] text-primary bg-[hsl(40_62%_68%/.08)]",
    awaiting_receipt: "border-[hsl(40_62%_68%/.4)] text-primary bg-[hsl(40_62%_68%/.08)]",
    processing: "border-[hsl(210_50%_65%/.45)] text-[hsl(210_60%_78%)] bg-[hsl(210_50%_60%/.1)]",
    rejected: "border-[hsl(4_60%_66%/.4)] text-[hsl(4_80%_76%)] bg-[hsl(4_60%_60%/.08)]",
    cancelled: "border-border text-muted-foreground",
  };
  return <span data-testid={`status-${status}`} className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium sm:px-3 sm:py-1 sm:text-xs ${tone[status] ?? "border-border"}`}>{statusLabel(status, lang)}</span>;
}

function ActivityList({ items }: { items: Activity[] }) {
  const { lang, isEn } = useLanguage();
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) return (
    <div className="py-8 text-center text-xs sm:text-sm text-muted-foreground">
      <div className="mx-auto mb-2.5 h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-dashed border-border grid place-items-center"><Timer className="h-4 w-4 sm:h-5 sm:w-5" /></div>
      {isEn ? "No ledger activity yet. All credited amounts will appear here." : "لا توجد حركات بعد. ستظهر هنا كل قيد على رصيدك بتاريخه."}
    </div>
  );
  return (
    <ul className="divide-y divide-border/60">
      {safeItems.map((a) => {
        const isHonor = a.kind === "honor";
        return (
          <li key={a.id} data-testid={`row-activity-${a.id}`} className="flex items-center justify-between gap-2.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium sm:text-sm">{a.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{kindLabel(a.kind, lang)} · {formatDate(a.createdAt, lang, true)}</p>
            </div>
            {isHonor ? (
              <span className={`num text-xs font-semibold sm:text-sm shrink-0 whitespace-nowrap px-2.5 py-0.5 rounded-lg border ${a.amount >= 0 ? "text-accent bg-accent/10 border-accent/30" : "text-[hsl(4_80%_76%)] bg-destructive/10 border-destructive/30"}`}>
                {a.amount >= 0 ? `+${a.amount} ${isEn ? "pts" : "نقاط"}` : `${a.amount} ${isEn ? "pts" : "نقاط"}`}
              </span>
            ) : (
              <span className={`num text-xs font-semibold sm:text-sm shrink-0 whitespace-nowrap ${a.amount >= 0 ? "text-accent" : "text-[hsl(12_70%_72%)]"}`}>
                {a.amount >= 0 ? "+" : ""}{usdt(a.amount)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardPage() {
  const { user } = useSessionUser();
  const { t, isEn, lang } = useLanguage();
  const q = useGetDashboard({ query: { enabled: !!user, queryKey: getGetDashboardQueryKey(), ...live } });
  const cd = useCountdown(q.data?.nextAccrualAt ?? undefined);
  const subCd = useCountdown(q.data?.subscription?.expiresAt ?? undefined);

  if (q.isLoading) return <div className="grid gap-3 sm:gap-4 md:grid-cols-3"><Skel className="h-56 md:col-span-2" /><Skel className="h-56" /><Skel className="h-32" /><Skel className="h-32" /><Skel className="h-32" /></div>;
  if (q.isError || !q.data || !q.data.user) return <ErrorBox onRetry={() => q.refetch()} text={isEn ? "Failed to load dashboard data" : "تعذر تحميل البيانات"} />;
  const d = q.data;
  const userName = d.user?.name || user?.name || (isEn ? "IRTIQA Member" : "عضو ارتقاء");
  const durationDays = d.subscription ? subscriptionDurationDays(d.subscription.startsAt, d.subscription.expiresAt) : 0;
  const remainingDays = Math.max(0, durationDays - d.creditedDays);
  const pct = durationDays ? remainingDays / durationDays : 0;

  return (
    <>
      <PageHead
        eyebrow={t("dashboard.eyebrow", "لوحة العضو")}
        title={`${isEn ? "Welcome, " : "أهلًا، "}${userName}`}
        desc={t("dashboard.desc", "متابعة فورية ومباشرة لمحفظتك الاستثمارية، أرباحك اليومية، وحركات حسابك في ارتقاء.")}
      />
      
      <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass relative min-w-0 overflow-hidden rounded-2xl p-4 sm:rounded-3xl sm:p-7 md:col-span-2">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full border border-[hsl(40_62%_68%/.1)] pointer-events-none" />
          <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full border border-[hsl(168_42%_52%/.08)] pointer-events-none" />
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{isEn ? "Member ID" : "رقم العضوية"}</p>
              <MemberId id={d.user.memberId} />
            </div>
            <div className="self-end sm:self-center">
              <PlatformFoundingButton />
            </div>
          </div>
          
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="col-span-2 sm:col-span-2 bg-background/20 rounded-2xl p-3 border border-border/40">
              <p className="text-[11px] sm:text-xs text-muted-foreground">{isEn ? "Available Balance" : "الرصيد المتاح"}</p>
              <p data-testid="text-balance" className="num font-display text-2xl sm:text-4xl md:text-5xl font-semibold mt-1 gold-text break-all">{usdt(d.user.balance)}</p>
            </div>
            <div className="bg-background/15 rounded-2xl p-3 border border-border/30">
              <p className="text-[11px] sm:text-xs text-muted-foreground">{isEn ? "Reserved for Payout" : "محجوز للسحب"}</p>
              <p data-testid="text-reserved" className="num text-sm sm:text-lg font-medium mt-1 truncate">{usdt(d.reservedBalance)}</p>
            </div>
            <div className="bg-background/15 rounded-2xl p-3 border border-border/30">
              <p className="text-[11px] sm:text-xs text-muted-foreground">{isEn ? "Credited Today" : "مُقيَّد اليوم"}</p>
              <p className="num text-sm sm:text-lg font-medium mt-1 text-accent truncate">{usdt(d.todayEarned)}</p>
            </div>
            <div className="col-span-2 sm:col-span-4 bg-background/10 rounded-2xl p-3 border border-border/20 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{isEn ? "Total Profits Received" : "إجمالي الأرباح المستلمة"}</span>
              <span className="num text-base sm:text-lg font-medium text-foreground">{usdt(d.user.totalEarned)}</span>
            </div>

            {/* 3 Clear Action Buttons Separating Recharge, Plans, and Withdrawal */}
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-border/30 grid grid-cols-3 gap-2">
              <Link
                href="/deposits"
                data-testid="dash-action-recharge"
                className="btn-gold py-2 sm:py-2.5 px-1 sm:px-2.5 text-[11px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 shadow-sm text-center leading-tight min-w-0"
              >
                <ArrowDownToLine className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-center break-words sm:whitespace-nowrap">{isEn ? "Recharge Balance" : "شحن الرصيد"}</span>
              </Link>
              <Link
                href="/plans"
                data-testid="dash-action-plans"
                className="rounded-xl border border-primary/40 bg-[hsl(40_62%_68%/.1)] hover:bg-[hsl(40_62%_68%/.18)] text-primary py-2 sm:py-2.5 px-1 sm:px-2.5 text-[11px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-colors text-center leading-tight min-w-0"
              >
                <Gem className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-center break-words sm:whitespace-nowrap">{isEn ? "Plans" : "الباقات"}</span>
              </Link>
              <Link
                href="/wallet"
                data-testid="dash-action-wallet"
                className="btn-ghost py-2 sm:py-2.5 px-1 sm:px-2.5 text-[11px] sm:text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center leading-tight min-w-0"
              >
                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="text-center break-words sm:whitespace-nowrap">{isEn ? "Withdraw" : "سحب الأرباح"}</span>
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="glass flex flex-col items-center justify-center rounded-2xl p-4 text-center sm:rounded-3xl sm:p-7 min-w-0">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2 font-medium"><Award className="h-4 w-4 text-primary shrink-0" />{isEn ? "Honor Points" : "نقاط التميز"}</p>
          <HonorRing value={d.user.honorPoints} size={110} />
          <p className="mt-3 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            {isEn ? "Account prestige & verified reputation score within the IRTIQA network." : "نقاط ولاء وتقدير خاصة بعضويتك تعكس نشاطك وموثوقية حسابك."}
          </p>
        </motion.div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 md:col-span-3">
          <div className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 min-w-0">
            <p className="text-xs text-muted-foreground flex items-center gap-2"><CalendarCheck className="h-4 w-4 shrink-0 text-primary" />{isEn ? "Days Remaining" : "الأيام المتبقية"}</p>
            <p data-testid="text-remaining-days" className="num font-display text-2xl sm:text-3xl font-medium mt-2">{remainingDays}<span className="text-muted-foreground text-sm sm:text-base font-normal"> / {durationDays} {isEn ? "days" : "يوم"}</span></p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><motion.div className="h-full origin-right bg-gradient-to-l from-[hsl(42_72%_76%)] to-[hsl(168_42%_52%)]" initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ duration: 1 }} /></div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center justify-between"><span>{isEn ? "Daily Return:" : "الربح اليومي:"}</span> <span className="num text-foreground font-semibold">{usdt(d.dailyProfit)}</span></p>
          </div>

          <div className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 min-w-0">
            <p className="text-xs text-muted-foreground flex items-center gap-2"><Timer className="h-4 w-4 shrink-0 text-accent" />{isEn ? "Next Accrual In" : "القيد التالي خلال"}</p>
            <p data-testid="text-countdown" className="num font-display text-2xl sm:text-3xl font-medium mt-2 text-primary">{d.nextAccrualAt && cd ? cd.text : "--:--:--"}</p>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-2 leading-relaxed">
              {d.nextAccrualAt
                ? (isEn ? `Next distribution automatically scheduled for: ${formatDate(d.nextAccrualAt, "en", true)}` : `يُقيَّد ربح الخطة التالي تلقائيًا، الموعد: ${formatDate(d.nextAccrualAt, "ar", true)}`)
                : d.subscription
                ? (isEn ? "Term completed or no upcoming accruals." : "اكتملت أيام الاشتراك أو لا يوجد قيد قادم.")
                : (isEn ? "Daily yield starts once your deposit is verified by administration." : "يبدأ ربح الخطة بعد اعتماد الإدارة لإيداعك.")}
            </p>
          </div>

          <div className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 min-w-0 sm:col-span-2 lg:col-span-1">
            <p className="text-xs text-muted-foreground flex items-center gap-2"><Gem className="h-4 w-4 shrink-0 text-accent" />{isEn ? "Active Subscription" : "اشتراكك الحالي"}</p>
            {d.subscription ? (
              <>
                <p className="font-display text-base sm:text-lg font-semibold mt-2">{d.subscription.plan?.name || (isEn ? "IRTIQA Plan" : "باقة ارتقاء")}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                  {isEn ? `From ${formatDate(d.subscription.startsAt, "en")} to ${formatDate(d.subscription.expiresAt, "en")}` : `من ${formatDate(d.subscription.startsAt, "ar")} حتى ${formatDate(d.subscription.expiresAt, "ar")}`}
                </p>
                {subCd && <p className="text-xs text-accent mt-2.5 num font-medium flex items-center gap-1.5"><Timer className="h-3.5 w-3.5 shrink-0" /> {isEn ? `Remaining contract: ${subCd.text}` : `المتبقي لانتهاء العقد: ${subCd.text}`}</p>}
              </>
            ) : (
              <>
                <p className="text-xs sm:text-sm mt-2.5 text-muted-foreground">{isEn ? "No active subscription currently" : "لا يوجد اشتراك نشط حاليًا"}</p>
                <Link href="/plans" data-testid="link-choose-plan" className="mt-2.5 inline-flex items-center gap-1 text-xs sm:text-sm text-primary font-medium">
                  {isEn ? "Select a plan and begin" : "استعرض الباقات وابدأ الآن"} <ArrowUpLeft className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3 md:col-span-3">
          <div className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 md:col-span-2 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm sm:text-base font-medium">{isEn ? "Recent Ledger Activity" : "آخر الحركات المالية"}</h3>
              <Link href="/wallet" data-testid="link-all-activity" className="text-xs text-primary font-medium hover:underline">
                {isEn ? "View Wallet Ledger" : "عرض سجل المحفظة"}
              </Link>
            </div>
            <ActivityList items={d.recentActivity.slice(0, 6)} />
          </div>

          <div className={`glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 min-w-0 flex flex-col justify-between ${d.canWithdraw ? "" : "border-[hsl(12_60%_66%/.25)]"}`}>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-2"><ShieldAlert className="h-4 w-4 shrink-0 text-primary" />{isEn ? "Withdrawal Status" : "حالة طلبات السحب"}</p>
              <p data-testid="status-withdraw" className={`font-display text-base sm:text-lg font-semibold mt-2.5 ${d.canWithdraw ? "text-accent" : "text-[hsl(12_70%_74%)]"}`}>
                {d.canWithdraw ? (isEn ? "Withdrawal available now" : "يمكنك طلب سحب الآن") : (isEn ? "Currently unavailable" : "غير متاح حاليًا")}
              </p>
              {d.withdrawalReason && <p className="text-xs text-muted-foreground mt-2 leading-relaxed bg-background/20 p-2.5 rounded-xl border border-border/40">{d.withdrawalReason}</p>}
            </div>
            <Link href="/wallet" className="btn-gold mt-4 block text-center py-2.5 text-xs sm:text-sm">
              {isEn ? "Go to Wallet & Withdraw" : "الانتقال للمحفظة والسحب"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function WithdrawalRow({ w, onCancel, isCancelling }: { w: Withdrawal; onCancel?: (id: string) => void; isCancelling?: boolean }) {
  const { lang, isEn } = useLanguage();
  const gross = w.amount;
  const fee = Math.round(gross * 0.21 * 100) / 100;
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);

  return (
    <li data-testid={`row-withdrawal-${w.id}`} className="py-3 text-xs sm:text-sm space-y-2 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="num font-semibold text-sm sm:text-base">{usdt(gross)}</p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            <span>{isEn ? "Net Dispatched: " : "الصافي المحول: "}<strong className="num text-accent font-semibold">{usdt(net)}</strong></span>
            <span>·</span>
            <span>{isEn ? "Fee (21%): " : "الرسوم (21%): "}<strong className="num text-[hsl(4_80%_76%)] font-medium">-{usdt(fee)}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {w.status === "pending" && onCancel && (
            <button
              data-testid={`button-cancel-withdrawal-${w.id}`}
              onClick={() => onCancel(w.id)}
              disabled={isCancelling}
              className="text-[11px] text-[hsl(4_80%_76%)] border border-[hsl(4_60%_66%/.3)] bg-[hsl(4_60%_60%/.08)] px-2.5 py-1 rounded-lg hover:bg-[hsl(4_60%_60%/.15)] transition-colors cursor-pointer"
            >
              {isCancelling ? (isEn ? "Cancelling..." : "جارٍ الإلغاء...") : (isEn ? "Cancel & Refund" : "إلغاء واسترجاع الرصيد")}
            </button>
          )}
          <StatusPill status={w.status} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>{isEn ? "Requested Date & Time:" : "تاريخ ووقت طلب السحب:"}</span>
        <span className="font-medium text-foreground">{formatDate(w.createdAt, lang, true)}</span>
      </div>
      {w.reviewedAt && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3 text-accent shrink-0" />
          <span>{isEn ? "Processed & Approved Date:" : "تاريخ معالجة واعتماد السحب:"}</span>
          <span className="font-medium text-foreground">{formatDate(w.reviewedAt, lang, true)}</span>
        </div>
      )}
      <p className="text-[11px] sm:text-xs text-muted-foreground break-all">{isEn ? "To: " : "إلى: "}<span className="num font-mono">{w.address}</span></p>
      {w.status === "pending" && <p className="text-[11px] text-primary/90 bg-primary/10 p-2 rounded-lg">{isEn ? `Your request is pending review. Upon admin approval, you will receive net ${usdt(net)} after the 21% network and verification fee.` : `طلبك قيد المراجعة. بعد اعتماد الإدارة ستستلم الصافي (${usdt(net)}) بعد اقتطاع رسوم 21%.`}</p>}
      {w.status === "processing" && <p className="text-[11px] text-[hsl(210_60%_78%)] bg-[hsl(210_50%_60%/.1)] p-2 rounded-lg">{isEn ? `Manually processing by administration with net amount of ${usdt(net)} on Polygon network.` : `قيد التحويل اليدوي من الإدارة بمبلغ ${usdt(net)} الصافي عبر شبكة Polygon.`}</p>}
      {w.txHash && <a data-testid={`link-wtx-${w.id}`} href={`https://polygonscan.com/tx/${w.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-primary hover:underline"><span className="num">{shortHex(w.txHash)}</span><ExternalLink className="h-3 w-3 shrink-0" /></a>}
      {w.reviewNote && <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg">{isEn ? "Admin Note: " : "ملاحظة الإدارة: "}{w.reviewNote}</p>}
    </li>
  );
}

export function WalletPage() {
  const { user } = useSessionUser();
  const { toast } = useToast();
  const inv = useInvalidateAll();
  const { lang, isEn, dir } = useLanguage();
  const dash = useGetDashboard({ query: { enabled: !!user, queryKey: getGetDashboardQueryKey(), ...live } });
  const act = useListActivity({ query: { enabled: !!user, queryKey: getListActivityQueryKey(), ...live } });
  const wd = useListWithdrawals({ query: { enabled: !!user, queryKey: getListWithdrawalsQueryKey(), ...live } });
  const settings = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [walletErr, setWalletErr] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    try {
      setCancellingId(id);
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("irtiqa_token") : null;
      const res = await fetch(`/api/withdrawals/${id}/cancel`, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (isEn ? "Could not cancel request" : "تعذر إلغاء الطلب"));
      toast({
        title: isEn ? "Withdrawal Cancelled" : "تم إلغاء طلب السحب",
        description: isEn ? "Balance has been restored to your wallet." : "تمت استعادة الرصيد إلى محفظتك بنجاح.",
      });
      inv();
    } catch (e: any) {
      toast({ title: isEn ? "Error" : "خطأ", description: e.message || (isEn ? "Could not cancel request" : "تعذر إلغاء الطلب"), variant: "destructive" });
    } finally {
      setCancellingId(null);
    }
  };

  const payoutForm = useForm<{address: string}>({defaultValues: {address: ""}});
  const minimumWithdrawal = settings.data?.minimumWithdrawal ?? 2;
  const req = useRequestWithdrawal({
    mutation: {
      onSuccess: () => {
        setAmount("");
        toast({
          title: isEn ? "Withdrawal Request Submitted" : "أُرسل طلب السحب",
          description: isEn ? "Amount has been reserved from available balance pending admin approval." : "حُجز المبلغ من رصيدك المتاح بانتظار مراجعة الإدارة.",
        });
        inv();
      },
      onError: (e) => setErr(apiError(e)),
    },
  });

  const wallet = useSavePayoutAddress({
    mutation: {
      onSuccess: () => {
        setWalletErr("");
        payoutForm.reset();
        toast({
          title: isEn ? "Payout Address Saved" : "تم حفظ عنوان المحفظة",
          description: isEn ? "Locked for security; contact administration for any modifications." : "لا يمكن تغييره من حسابك؛ التغيير متاح للإدارة فقط.",
        });
        inv();
      },
      onError: (e) => setWalletErr(apiError(e)),
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault(); if (req.isPending) return; setErr("");
    const n = Number(amount);
    if (!Number.isFinite(n) || n < minimumWithdrawal) return setErr(isEn ? `Minimum withdrawal is ${usdt(minimumWithdrawal)}.` : `الحد الأدنى للسحب ${usdt(minimumWithdrawal)}.`);
    if (dash.data && n > dash.data.user.balance) return setErr(isEn ? "Amount exceeds available balance" : "المبلغ يتجاوز الرصيد المتاح");
    req.mutate({ data: { amount: n } });
  };

  const savePayoutAddress = ({address: rawAddress}: {address: string}) => {
    setWalletErr("");
    const address = rawAddress.trim();
    if (!isAddr(address)) {
      payoutForm.setError("address", {message: isEn ? "Enter a valid 40-character Polygon address starting with 0x." : "أدخل عنوان Polygon صحيحًا يبدأ بـ 0x ويتكون من 40 خانة."});
      return;
    }
    wallet.mutate({data: {address}});
  };

  const d = dash.data;
  return (
    <>
      <PageHead
        eyebrow={isEn ? "Digital Wallet" : "المحفظة"}
        title={isEn ? "Balance & Payouts" : "رصيدك وسحوباتك"}
        desc={isEn ? `Manual & secure settlement exclusively on Polygon network upon compliance review. Minimum withdrawal is ${usdt(minimumWithdrawal)}.` : `التحويل يدوي وحصري عبر شبكة Polygon بعد مراجعة الإدارة. الحد الأدنى للسحب هو ${usdt(minimumWithdrawal)}.`}
      />
      
      <div data-testid="card-payout-wallet" className="glass mb-4 rounded-2xl p-4 sm:rounded-3xl sm:p-6 min-w-0">
        <h3 className="font-display font-medium text-sm sm:text-base">{isEn ? "Designated Payout Wallet (USDT Polygon)" : "محفظة استلام السحوبات (Polygon)"}</h3>
        {dash.isLoading ? (
          <Skel className="h-16 mt-3" />
        ) : d?.user?.payoutAddress ? (
          <div className="mt-3 space-y-2">
            <p data-testid="text-payout-wallet" dir="ltr" className="num break-all rounded-xl border border-border bg-background/20 p-2.5 sm:p-3 text-left text-xs sm:text-sm font-mono leading-relaxed select-all">{d?.user?.payoutAddress}</p>
            <p className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5 shrink-0 text-primary" />{isEn ? "Verified payout address locked for institutional security. Contact administration to modify." : "العنوان محفوظ ومُعتمد. للتغيير تواصل مع الإدارة مباشرة."}</p>
          </div>
        ) : (
          <Form {...payoutForm}>
            <form onSubmit={payoutForm.handleSubmit(savePayoutAddress)} className="mt-3 space-y-3">
              <FormField control={payoutForm.control} name="address" render={({field}) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">{isEn ? "Your USDT receiving address on Polygon network (USDT-Polygon)" : "عنوان محفظتك لاستلام USDT على شبكة Polygon (USDT-Polygon)"}</FormLabel>
                  <FormControl>
                    <input {...field} data-testid="input-payout-wallet" maxLength={42} dir="ltr" placeholder="0x..." className="field num text-left text-xs sm:text-sm w-full min-w-0" disabled={wallet.isPending} onChange={(e) => { field.onChange(e); payoutForm.clearErrors("address"); setWalletErr(""); }} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
              {walletErr && <p data-testid="text-wallet-error" role="alert" className="text-xs sm:text-sm text-[hsl(4_80%_76%)]">{walletErr}</p>}
              <p className="text-[11px] sm:text-xs leading-relaxed text-muted-foreground">{isEn ? "Verify address and network carefully before saving. Cannot be changed without admin approval." : "تأكد من العنوان والشبكة قبل الحفظ. بعد الحفظ لا يمكن تغييره إلا من الإدارة، ولا يمكن ربط عنوان واحد بأكثر من حساب."}</p>
              <button data-testid="button-save-payout-wallet" disabled={wallet.isPending} className="btn-gold w-full py-2.5 text-xs sm:text-sm sm:w-auto sm:px-8 font-semibold cursor-pointer">{wallet.isPending ? (isEn ? "Saving..." : "جارٍ الحفظ...") : (isEn ? "Save Payout Address" : "حفظ عنوان المحفظة")}</button>
            </form>
          </Form>
        )}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4 min-w-0">
          <div className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 min-w-0">
            {dash.isLoading ? <Skel className="h-24" /> : d?.user ? (
              <>
                <p className="text-xs text-muted-foreground">{isEn ? "Available Balance for Payout" : "الرصيد المتاح للسحب"}</p>
                <p data-testid="text-wallet-balance" className="num font-display text-3xl sm:text-4xl font-semibold mt-1.5 gold-text break-all">{usdt(d.user.balance)}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm rounded-xl bg-background/20 p-2.5 border border-border/40">
                  <div><span className="text-muted-foreground">{isEn ? "Reserved for Payout: " : "محجوز للسحب: "}</span><span className="num font-medium text-foreground">{usdt(d.reservedBalance)}</span></div>
                  <div><span className="text-muted-foreground">{isEn ? "Minimum: " : "الحد الأدنى: "}</span><span className="num font-medium text-foreground">{usdt(minimumWithdrawal)}</span></div>
                </div>
              </>
            ) : <ErrorBox onRetry={() => dash.refetch()} />}
          </div>

          {(() => {
            const numAmount = Number(amount) || 0;
            const calcAmount = Math.max(0, numAmount);
            const feeAmount = Math.round(calcAmount * 0.21 * 100) / 100;
            const netAmount = Math.max(0, Math.round((calcAmount - feeAmount) * 100) / 100);
            const userBal = d?.user?.balance || 0;

            return (
              <form onSubmit={submit} className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 space-y-4 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-medium text-sm sm:text-base">{isEn ? "Request USDT Withdrawal (Polygon)" : "طلب سحب USDT (Polygon)"}</h3>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary font-medium flex items-center gap-1">
                    <Percent className="h-3 w-3" /> {isEn ? "21% Fee" : "رسوم سحب 21%"}
                  </span>
                </div>

                {d && !d.canWithdraw && (
                  <p className="rounded-xl bg-[hsl(12_60%_66%/.08)] border border-[hsl(12_60%_66%/.25)] p-2.5 text-xs sm:text-sm text-[hsl(12_70%_78%)]">
                    {d.withdrawalReason || (isEn ? "Withdrawals currently disabled" : "السحب غير متاح حاليًا")}
                  </p>
                )}

                {/* Quick percentage selection buttons */}
                {d?.canWithdraw && userBal > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-xs text-muted-foreground ml-1">{isEn ? "Quick amount:" : "تحديد سريع:"}</span>
                    {[
                      { label: "25%", mult: 0.25 },
                      { label: "50%", mult: 0.50 },
                      { label: "75%", mult: 0.75 },
                      { label: isEn ? "Max" : "كامل الرصيد", mult: 1.0 },
                    ].map((item) => {
                      const val = Math.floor(userBal * item.mult * 100) / 100;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => setAmount(String(val))}
                          className="rounded-lg border border-border/70 bg-background/30 hover:bg-background/60 hover:border-primary/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <span className={`absolute ${dir === "rtl" ? "left-3 sm:left-4" : "right-3 sm:right-4"} top-1/2 -translate-y-1/2 text-xs text-muted-foreground num pointer-events-none select-none`}>USDT</span>
                  <input
                    data-testid="input-amount"
                    type="number"
                    step="0.01"
                    min={minimumWithdrawal}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    dir="ltr"
                    className={`field num ${dir === "rtl" ? "pl-14 sm:pl-16 text-right" : "pr-14 sm:pr-16 text-left"} text-sm w-full min-w-0`}
                    disabled={!d?.canWithdraw}
                  />
                </div>

                {/* 21% withdrawal fee calculator */}
                <div className="rounded-2xl border border-[hsl(40_62%_68%/.25)] bg-[hsl(40_62%_68%/.05)] p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Calculator className="h-4 w-4" />
                      {isEn ? "Withdrawal Fee Calculator (21%)" : "حاسبة رسوم السحب المالي (21%)"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {isEn ? "Real-time calculation" : "احتساب تلقائي وفوري"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-background/40 p-2.5 border border-border/40">
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground">{isEn ? "Gross Amount" : "المبلغ الإجمالي"}</p>
                      <p className="num text-xs sm:text-sm font-semibold mt-0.5 text-foreground">{usdt(calcAmount)}</p>
                    </div>
                    <div className="rounded-xl bg-[hsl(4_60%_60%/.08)] p-2.5 border border-[hsl(4_60%_66%/.25)]">
                      <p className="text-[10px] sm:text-[11px] text-[hsl(4_80%_78%)]">{isEn ? "Fee (21%)" : "رسوم السحب (21%)"}</p>
                      <p className="num text-xs sm:text-sm font-semibold mt-0.5 text-[hsl(4_80%_78%)]">-{usdt(feeAmount)}</p>
                    </div>
                    <div className="rounded-xl bg-accent/10 p-2.5 border border-accent/25">
                      <p className="text-[10px] sm:text-[11px] text-accent">{isEn ? "Net Payout" : "الصافي للمستلم"}</p>
                      <p className="num text-xs sm:text-sm font-bold mt-0.5 text-accent">{usdt(netAmount)}</p>
                    </div>
                  </div>

                  {/* Visual distribution bar */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span className="text-accent font-medium">{isEn ? "Net Received: 79%" : "المبلغ الصافي المستلم: 79%"}</span>
                      <span className="text-[hsl(4_80%_78%)] font-medium">{isEn ? "Network & Processing: 21%" : "رسوم السحب والمعالجة: 21%"}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-background/50 overflow-hidden flex">
                      <div className="h-full bg-accent" style={{ width: "79%" }} />
                      <div className="h-full bg-[hsl(4_70%_60%)]" style={{ width: "21%" }} />
                    </div>
                  </div>

                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                    {isEn
                      ? `* A 21% processing fee is deducted automatically to cover Polygon network gas and manual audit fees. You will receive ${usdt(netAmount)} directly to your verified wallet.`
                      : `* تُقتطع رسوم السحب بنسبة 21% تلقائياً لتغطية رسوم تدقيق المعاملة وشبكة Polygon، وسيتم إرسال المبلغ الصافي (${usdt(netAmount)}) مباشرة إلى محفظتك المعتمدة.`}
                  </p>
                </div>

                <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                  {isEn
                    ? "Your withdrawal will be dispatched to the verified address saved above. Transactions sent to incorrect networks or addresses cannot be recovered."
                    : "سيُرسل الطلب إلى عنوان محفظتك المحفوظ أعلاه. راجعه قبل الإرسال؛ التحويل إلى عنوان أو شبكة خاطئة قد لا يمكن استرجاعه."}
                </p>

                {err && <p data-testid="text-withdraw-error" className="text-xs sm:text-sm text-[hsl(4_80%_76%)]">{err}</p>}

                <button
                  data-testid="button-withdraw"
                  disabled={!d?.canWithdraw || req.isPending}
                  className="btn-gold w-full py-3 text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  {req.isPending
                    ? (isEn ? "Submitting..." : "جارٍ الإرسال...")
                    : calcAmount > 0
                    ? (isEn ? `Submit Withdrawal (Net: ${usdt(netAmount)})` : `إرسال طلب السحب (الصافي المستلم: ${usdt(netAmount)})`)
                    : (isEn ? "Submit Withdrawal Request" : "إرسال طلب السحب")}
                </button>
              </form>
            );
          })()}

          <div className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 min-w-0">
            <h3 className="font-display font-medium text-sm sm:text-base mb-2">{isEn ? "Withdrawal Requests History" : "سجل طلبات السحب"}</h3>
            {wd.isLoading ? <Skel className="h-20" /> : wd.isError ? <ErrorBox onRetry={() => wd.refetch()} /> : !wd.data?.length ? <p className="py-6 text-center text-xs sm:text-sm text-muted-foreground">{isEn ? "No previous withdrawal requests found." : "لا توجد طلبات سحب سابقة."}</p> : (
              <ul className="divide-y divide-border/60">{wd.data.map((w) => <WithdrawalRow key={w.id} w={w} onCancel={handleCancel} isCancelling={cancellingId === w.id} />)}</ul>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-4 sm:rounded-3xl sm:p-6 min-w-0 h-fit">
          <h3 className="font-display font-medium text-sm sm:text-base mb-2">{isEn ? "Complete Activity Ledger" : "سجل الحركات الكامل"}</h3>
          {act.isLoading ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skel key={i} className="h-12" />)}</div> : act.isError ? <ErrorBox onRetry={() => act.refetch()} /> : <ActivityList items={act.data ?? []} />}
        </div>
      </div>
    </>
  );
}

export function ProfilePage() {
  const { user } = useSessionUser();
  const { lang, isEn } = useLanguage();
  const dash = useGetDashboard({ query: { enabled: !!user, queryKey: getGetDashboardQueryKey(), ...live } });
  if (dash.isLoading) return <Skel className="h-80" />;
  if (dash.isError || !dash.data) return <ErrorBox onRetry={() => dash.refetch()} />;
  const { user: u, subscription: s } = dash.data;
  const rows: [string, string][] = [
    [isEn ? "Full Name" : "الاسم", u.name],
    [isEn ? "Phone Number" : "الهاتف", u.phone],
    [isEn ? "Role" : "الدور", u.role === "admin" ? (isEn ? "Administrator" : "مسؤول") : (isEn ? "Member" : "عضو")],
    [isEn ? "Status" : "الحالة", u.active ? (isEn ? "Active" : "نشط") : (isEn ? "Suspended" : "موقوف")],
    [isEn ? "Member Since" : "عضو منذ", formatDate(u.createdAt, lang)],
  ];

  return (
    <>
      <PageHead eyebrow={isEn ? "Member Profile" : "الملف الشخصي"} title={isEn ? "Your Identity in IRTIQA" : "هويتك في ارتقاء"} />
      <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="glass rounded-3xl p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-6">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(42_72%_76%/.25)] to-[hsl(168_42%_52%/.2)] font-display text-3xl text-primary">{u.name.trim().charAt(0)}</div>
            <div className="min-w-0">
              <p className="break-words font-display text-xl sm:text-2xl">{u.name}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <MemberId id={u.memberId} />
                <PlatformFoundingButton />
              </div>
            </div>
          </div>
          <div className="hairline my-7" />
          <dl className="grid gap-4 sm:grid-cols-2">
            {rows.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className={`mt-1 ${k === "الهاتف" || k === "Phone Number" ? "num text-left" : ""}`}>{v}</dd></div>)}
          </dl>
        </div>
        
        <div className="space-y-4">
          <div className="glass flex items-center gap-4 rounded-3xl p-5 sm:gap-6 sm:p-7">
            <HonorRing value={u.honorPoints} size={110} />
            <div>
              <p className="font-display">{isEn ? "Honor Points" : "نقاط التميز"}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{isEn ? "Prestige & loyalty score reflecting your active contribution and financial trust in IRTIQA." : "نقاط ولاء وتقدير خاصة بعضويتك تعكس نشاطك وموثوقية حسابك"}</p>
            </div>
          </div>
          <div className="glass rounded-3xl p-5 sm:p-7">
            <p className="font-display flex items-center gap-2"><CalendarRange className="h-4 w-4 text-primary" />{isEn ? "Membership Details" : "الاشتراك"}</p>
            {s ? (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{isEn ? "Tier" : "الخطة"}</dt><dd className="break-words">{s?.plan?.name || (isEn ? "IRTIQA Plan" : "باقة ارتقاء")}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{isEn ? "Starts" : "البداية"}</dt><dd>{formatDate(s.startsAt, lang)}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{isEn ? "Expires" : "الانتهاء"}</dt><dd>{formatDate(s.expiresAt, lang)}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{isEn ? "Fixed Daily Return" : "الربح اليومي الثابت"}</dt><dd className="num">{usdt(dash.data.dailyProfit)}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{isEn ? "Remaining Days" : "الأيام المتبقية"}</dt><dd data-testid="text-profile-remaining-days" className="num">{s ? Math.max(0, subscriptionDurationDays(s.startsAt, s.expiresAt) - dash.data.creditedDays) : 0} / {s ? subscriptionDurationDays(s.startsAt, s.expiresAt) : 0}</dd></div>
              </dl>
            ) : <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2"><Lock className="h-4 w-4" />{isEn ? "No active membership. " : "لا يوجد اشتراك نشط. "}<Link href="/deposits" data-testid="link-profile-deposit" className="text-primary">{isEn ? "Start deposit" : "ابدأ إيداعًا"}</Link></p>}
          </div>
        </div>
      </div>
    </>
  );
}
