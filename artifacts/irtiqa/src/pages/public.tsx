import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Check, Settings2, ShieldCheck, CheckCircle2, TrendingUp, Users2, LockKeyhole, Zap,
  ArrowUpRight, Crown, Gem, Award, Shield, Star, Info, HelpCircle, Wallet, ArrowDownToLine, Loader2
} from "lucide-react";
import { useListPlans, getListPlansQueryKey, useGetDashboard, getGetDashboardQueryKey, type Plan } from "@workspace/api-client-react";
import { PageHead, Skel, ErrorBox } from "@/components/brand";
import { useSessionUser } from "@/components/shell";
import { usdt, FREE_PLAN_ID, planDurationDays, apiError } from "@/lib/helpers";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useInvalidateAll } from "@/lib/invalidate";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const planMeta: Record<string, {
  tagAr: string;
  tagEn: string;
  badgeClass: string;
  cardBorder: string;
  glow: string;
  icon: any;
  accentColor: string;
  isPopular?: boolean;
}> = {
  starter: {
    tagAr: "باقة الانطلاقة والتوثيق",
    tagEn: "Launch & Verification Tier",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    cardBorder: "border-emerald-500/30 hover:border-emerald-500/50",
    glow: "from-emerald-500/10 via-transparent to-transparent",
    icon: Star,
    accentColor: "text-emerald-400",
  },
  bronze: {
    tagAr: "الباقة البرونزية الأساسية",
    tagEn: "Bronze Foundation Tier",
    badgeClass: "bg-amber-600/10 text-amber-500 border-amber-500/30",
    cardBorder: "border-amber-600/30 hover:border-amber-500/50",
    glow: "from-amber-600/10 via-transparent to-transparent",
    icon: Shield,
    accentColor: "text-amber-500",
  },
  silver: {
    tagAr: "الباقة الفضية المتقدمة",
    tagEn: "Silver Growth Tier",
    badgeClass: "bg-slate-300/10 text-slate-300 border-slate-300/30",
    cardBorder: "border-slate-400/30 hover:border-slate-300/60",
    glow: "from-slate-400/10 via-transparent to-transparent",
    icon: Award,
    accentColor: "text-slate-300",
  },
  gold: {
    tagAr: "الأكثر اختياراً وطلباً ⭐",
    tagEn: "Most Popular Choice ⭐",
    badgeClass: "bg-[hsl(40_62%_68%/.15)] text-primary border-[hsl(40_62%_68%/.4)]",
    cardBorder: "border-[hsl(40_62%_68%/.5)] shadow-[0_0_25px_hsl(40_62%_68%/.12)] hover:border-[hsl(40_62%_68%/.8)]",
    glow: "from-[hsl(40_62%_68%/.15)] via-transparent to-transparent",
    icon: Star,
    accentColor: "text-primary",
    isPopular: true,
  },
  diamond: {
    tagAr: "الباقة الماسية الاستثمارية",
    tagEn: "Diamond Wealth Tier",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    cardBorder: "border-cyan-500/30 hover:border-cyan-400/60",
    glow: "from-cyan-500/10 via-transparent to-transparent",
    icon: Gem,
    accentColor: "text-cyan-400",
  },
  vip: {
    tagAr: "عضوية كبار الشخصيات VIP",
    tagEn: "VIP Executive Tier",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    cardBorder: "border-purple-500/35 hover:border-purple-400/65",
    glow: "from-purple-500/10 via-transparent to-transparent",
    icon: Crown,
    accentColor: "text-purple-400",
  },
  elite: {
    tagAr: "قمة الامتياز الاستثماري 💎",
    tagEn: "Elite Pinnacle Tier 💎",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    cardBorder: "border-rose-500/40 shadow-[0_0_25px_hsl(350_80%_60%/.1)] hover:border-rose-500/70",
    glow: "from-rose-500/15 via-transparent to-transparent",
    icon: Zap,
    accentColor: "text-rose-400",
  },
};

export function PlansPage() {
  const { user } = useSessionUser();
  const { isEn, lang } = useLanguage();
  const { toast } = useToast();
  const inv = useInvalidateAll();
  const dash = useGetDashboard({ query: { enabled: !!user, queryKey: getGetDashboardQueryKey() } });
  const plans = useListPlans({ query: { queryKey: getListPlansQueryKey(), refetchInterval: 30000 } });

  const [planToActivate, setPlanToActivate] = useState<{ plan: any; cost: number; isUpgrade: boolean } | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const activeSub = dash.data?.subscription;
  const hasActiveSub = !!activeSub && !!activeSub.active;
  const list = Array.isArray(plans.data) ? plans.data : [];
  const currentPlanId = activeSub?.plan?.id ?? null;
  const getPlanPrice = (p: { id?: string; annualPrice?: number }) => (p?.id === FREE_PLAN_ID && Number(p?.annualPrice) === 0 ? 4 : Number(p?.annualPrice ?? 0));
  const activePlanObj = list.find((p) => p && p.id === currentPlanId);
  const activePlanPrice = activePlanObj ? getPlanPrice(activePlanObj) : (activeSub?.plan ? getPlanPrice(activeSub.plan) : 0);
  const userBalance = Number(dash.data?.user?.balance ?? user?.balance ?? 0);

  return (
    <>
      <PageHead
        eyebrow={isEn ? "Membership & Investment" : "العضوية والاستثمار"}
        title={isEn ? "IRTIQA Investment Tiers" : "باقات ارتقاء الاستثمارية"}
        desc={isEn
          ? "Select your annual membership tier with automated daily returns distributed every 24 hours. Activate instantly from your available wallet balance."
          : "اختر باقتك الاستثمارية بعوائد يومية ثابتة ومؤكدة تُودع آلياً في محفظتك كل 24 ساعة. يمكنك تفعيل أي باقة فوراً بنقرة واحدة من رصيد محفظتك المتاح."}
      />

      {/* User Wallet Balance & Quick Recharge Banner */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-3xl border border-primary/30 bg-[hsl(40_62%_68%/.06)] p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-primary shrink-0">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{isEn ? "Your Available Wallet Balance" : "رصيدك المتاح حالياً في المحفظة"}</p>
              <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                <span className="num font-display text-2xl sm:text-3xl font-bold gold-text">{usdt(userBalance)}</span>
                <span className="text-xs text-accent font-medium">
                  {isEn ? "· Ready to activate any tier from your balance" : "· جاهز لتفعيل أي باقة أدناه مباشرة بنقرة واحدة"}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/deposits"
            data-testid="link-recharge-from-plans"
            className="btn-gold shrink-0 px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shadow-md hover:shadow-lg"
          >
            <ArrowDownToLine className="h-4 w-4" />
            <span>{isEn ? "Recharge Balance (USDT)" : "شحن رصيد المحفظة (USDT)"}</span>
          </Link>
        </motion.div>
      )}

      {/* Active Subscription Upgrade Notice */}
      {hasActiveSub && activeSub && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-3xl border border-accent/40 bg-accent/10 p-5 sm:p-6 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-display text-base font-semibold text-accent">
              <CheckCircle2 className="h-4 w-4" />
              <span>{isEn ? `You are currently subscribed to: ${activeSub.plan?.name || "IRTIQA Plan"}` : `أنت مشترك حالياً في: ${activeSub.plan?.name || "باقة ارتقاء"}`}</span>
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent num">
                {isEn ? `valued at ${usdt(activePlanPrice)}` : `بقيمة ${usdt(activePlanPrice)}`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isEn
                ? "Flexible Upgrade active: When choosing any higher tier, your current investment is automatically deducted and you only pay the price difference from your balance!"
                : "ميزة الترقية المرنة مفعلة: عند اختيار أي باقة أعلى، سيتم تلقائياً خصم قيمة باقتك الحالية وستدفع فقط فارق السعر من رصيدك دون تكرار دفع ما دفعته سابقاً!"}
            </p>
          </div>
        </motion.div>
      )}

      {/* Feature Highlights Banner */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="glass rounded-2xl p-3.5 text-center sm:p-4">
          <p className="font-display text-lg sm:text-xl font-bold gold-text">{isEn ? "24 Hours" : "24 ساعة"}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{isEn ? "Automated Daily Payouts" : "توزيع يومي آلي للأرباح"}</p>
        </div>
        <div className="glass rounded-2xl p-3.5 text-center sm:p-4">
          <p className="font-display text-lg sm:text-xl font-bold text-accent">Polygon USDT</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{isEn ? "Instant Low-Fee Transfers" : "سحب فوري وأدنى رسوم"}</p>
        </div>
        <div className="glass rounded-2xl p-3.5 text-center sm:p-4">
          <p className="font-display text-lg sm:text-xl font-bold text-primary">{isEn ? "Pay Difference" : "فارق الترقية"}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{isEn ? "Upgrade by difference only" : "ادفع الفارق فقط عند الترقية"}</p>
        </div>
        <div className="glass rounded-2xl p-3.5 text-center sm:p-4">
          <p className="font-display text-lg sm:text-xl font-bold text-foreground">{isEn ? "Florida, USA" : "فلوريدا، أمريكا"}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{isEn ? "US Corporate Entity 2024" : "تسجيل رسمي معتمد 2024"}</p>
        </div>
      </div>

      {plans.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skel key={i} className="h-96" />)}
        </div>
      ) : plans.isError ? (
        <ErrorBox onRetry={() => plans.refetch()} text={isEn ? "Failed to load plans" : "تعذر تحميل الخطط"} />
      ) : !list.length ? (
        <div data-testid="empty-plans" className="glass rounded-3xl p-12 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(40_62%_68%/.1)] text-primary">
            <Settings2 className="h-7 w-7" />
          </div>
          <p className="font-display text-xl">{isEn ? "No plans configured yet" : "لا توجد خطط مُهيأة بعد"}</p>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto leading-relaxed">
            {isEn
              ? "Administration is finalizing the tier parameters. Plans will be available shortly."
              : "تعمل الإدارة على ضبط أسعار الخطط والربح اليومي وعناوين الاستلام والشروط. ستظهر الخطط هنا فور اكتمال الإعداد."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {list.map((p, i) => {
            const meta = planMeta[p.id] || {
              tagAr: "باقة استثمارية",
              tagEn: "Investment Tier",
              badgeClass: "bg-primary/10 text-primary border-primary/30",
              cardBorder: "border-border hover:border-primary/50",
              glow: "from-primary/10 via-transparent to-transparent",
              icon: Award,
              accentColor: "text-primary",
            };
            const Icon = meta.icon;
            const targetPrice = getPlanPrice(p);
            const isCurrent = hasActiveSub && currentPlanId === p.id;
            const isUpgrade = hasActiveSub && !isCurrent && targetPrice > activePlanPrice;
            const isLowerOrSame = hasActiveSub && !isCurrent && targetPrice <= activePlanPrice;
            const upgradeDiff = isUpgrade ? Math.max(0, targetPrice - activePlanPrice) : targetPrice;
            const requiredCost = isUpgrade ? upgradeDiff : targetPrice;
            const hasBalance = userBalance >= requiredCost;
            const missingBalance = Math.max(0, requiredCost - userBalance);

            return (
              <motion.div
                key={p.id}
                data-testid={`card-plan-${p.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass relative flex flex-col rounded-3xl p-5 sm:p-7 overflow-hidden border transition-all duration-300 ${
                  isCurrent
                    ? "border-accent ring-1 ring-accent/30 bg-accent/[0.04]"
                    : isUpgrade
                    ? "border-[hsl(40_62%_68%/.45)] hover:border-[hsl(40_62%_68%/.8)] hover:shadow-xl"
                    : meta.cardBorder
                }`}
              >
                {/* Background glow decoration */}
                <div className={`absolute -right-20 -top-20 h-44 w-44 rounded-full bg-gradient-to-br ${meta.glow} pointer-events-none blur-2xl`} />

                {/* Header Tag / Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${meta.badgeClass}`}>
                    <Icon className="h-3 w-3 shrink-0" />
                    <span>{isEn ? meta.tagEn : meta.tagAr}</span>
                  </span>

                  {isCurrent && (
                    <span className="rounded-full border border-accent/40 bg-accent/20 px-2.5 py-1 text-[10px] font-semibold text-accent flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {isEn ? "Current Active Tier" : "باقتك الحالية"}
                    </span>
                  )}
                  {isUpgrade && (
                    <span className="rounded-full border border-accent/40 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent flex items-center gap-0.5">
                      <ArrowUpRight className="h-3 w-3" />
                      {isEn ? "Upgrade Available" : "ترقية متاحة"}
                    </span>
                  )}
                  {isLowerOrSame && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                      {isEn ? "Lower Tier" : "مستوى أدنى"}
                    </span>
                  )}
                </div>

                {/* Plan Name & Description */}
                <h3 className="font-display text-xl sm:text-2xl font-semibold">{p.name}</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed min-h-[2.5rem]">
                  {p.description}
                </p>

                {/* Price Display Section */}
                <div className="mt-5 rounded-2xl bg-background/30 p-4 border border-border/50">
                  {isUpgrade ? (
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1.5 mb-1.5 border-b border-border/40">
                        <span>{isEn ? "Original Tier Price:" : "سعر الباقة الأصلي:"}</span>
                        <span className="num font-semibold text-foreground">{usdt(targetPrice)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-accent pb-1.5 mb-2 border-b border-border/40">
                        <span>{isEn ? `Current Tier Deduction (${activeSub?.plan?.name || "Active"}):` : `خصم باقتك الحالية (${activeSub?.plan?.name || "باقتك"}):`}</span>
                        <span className="num font-semibold text-accent">- {usdt(activePlanPrice)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">{isEn ? "Required Upgrade Amount (Difference Only):" : "مبلغ الترقية المطلوب (الفارق فقط):"}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-display text-3xl sm:text-4xl font-bold gold-text num">
                          {usdt(upgradeDiff)}
                        </span>
                        <span className="text-xs text-muted-foreground line-through num">
                          {usdt(targetPrice)}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-accent font-medium flex items-center gap-1">
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                        <span>{isEn ? `You saved ${usdt(activePlanPrice)} · Pay only ${usdt(upgradeDiff)}` : `وفرت ${usdt(activePlanPrice)} · تدفع ${usdt(upgradeDiff)} فقط`}</span>
                      </p>
                    </div>
                  ) : p.id === FREE_PLAN_ID ? (
                    <div>
                      <p className="text-[11px] text-muted-foreground">{isEn ? "Initial Verification Deposit:" : "إيداع التوثيق الأولي:"}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-display text-3xl sm:text-4xl font-bold text-emerald-400 num">
                          4 USDT
                        </span>
                        <span className="text-xs text-muted-foreground">{isEn ? "/ one-time" : "/ لمرة واحدة"}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-emerald-400/90 leading-tight">
                        {isEn ? "Anti-sybil verification deposit activating automated daily earnings." : "إيداع تأكيد لمنع تكرار الحسابات وتفعيل الأرباح"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[11px] text-muted-foreground">{isEn ? "Annual Membership Investment:" : "قيمة الاشتراك السنوي:"}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-display text-3xl sm:text-4xl font-bold gold-text num">
                          {usdt(p.annualPrice)}
                        </span>
                        <span className="text-xs text-muted-foreground">{isEn ? "/ year" : "/ سنويًا"}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {isEn ? "Full 365-day digital investment contract" : "عقد استثماري كامل لمدة 365 يوماً"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Returns Breakdown Table */}
                <div className="mt-4 rounded-2xl border border-border/40 bg-background/20 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-accent" />
                      {isEn ? "Fixed Daily Return:" : "الربح اليومي الثابت:"}
                    </span>
                    <span className="font-bold text-accent num text-sm">
                      {usdt(p.dailyProfit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-2">
                    <span className="text-muted-foreground">{isEn ? "Est. Monthly Yield (30 days):" : "العائد الشهري المتوقع (30 يوم):"}</span>
                    <span className="font-semibold text-foreground num">
                      {usdt(p.dailyProfit * 30)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/30 pt-2">
                    <span className="text-muted-foreground">{isEn ? "Total Contract Yield:" : "إجمالي العائد طوال العقد:"}</span>
                    <span className="font-semibold text-primary num">
                      {usdt(p.dailyProfit * planDurationDays(p.id))}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="mt-5 space-y-2.5 text-xs text-muted-foreground flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{isEn ? "Automated 24h distribution without delays" : "توزيع الأرباح آلياً كل 24 ساعة دون تأخير"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{isEn ? `Contract term: ${planDurationDays(p.id)} days` : `مدة العقد: ${planDurationDays(p.id)} يوماً`}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{isEn ? "Instant withdrawals via Polygon USDT" : "سحب الأرباح متاح ومباشر عبر USDT Polygon"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span>{isEn ? "Upgrade anytime by paying the price difference only" : "إمكانية الترقية لباقة أعلى في أي وقت بدفع الفارق"}</span>
                  </li>
                </ul>

                {/* CTA Action Button */}
                <div className="mt-6 pt-2">
                  {!user ? (
                    <Link
                      href="/register"
                      data-testid={`link-join-${p.id}`}
                      className="btn-gold block w-full py-3 text-center text-xs sm:text-sm font-semibold"
                    >
                      {isEn ? "Create Account to Subscribe" : "أنشئ حسابًا للاشتراك"}
                    </Link>
                  ) : isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl border border-accent/40 bg-accent/10 py-3 text-center text-xs font-semibold text-accent cursor-default flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>{isEn ? "Current Active Tier" : "باقتك الحالية المفعلة"}</span>
                    </button>
                  ) : isLowerOrSame ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-xl border border-border/40 bg-muted/20 py-3 text-center text-xs text-muted-foreground opacity-60 cursor-not-allowed"
                    >
                      {isEn ? "Lower Than Current Tier" : "أدنى من باقتك الحالية"}
                    </button>
                  ) : hasBalance ? (
                    <button
                      type="button"
                      data-testid={`btn-activate-plan-${p.id}`}
                      onClick={() => setPlanToActivate({ plan: p, cost: requiredCost, isUpgrade })}
                      className="btn-gold block w-full py-3 text-center text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isUpgrade ? <ArrowUpRight className="h-4 w-4" /> : <Gem className="h-4 w-4" />}
                      <span>
                        {isUpgrade
                          ? (isEn ? `Upgrade Now (Deduct ${usdt(requiredCost)})` : `ترقية الباقة الآن (خصم ${usdt(requiredCost)} من رصيدك)`)
                          : (isEn ? `Activate Tier (${usdt(requiredCost)} from Balance)` : `تفعيل الباقة الآن من رصيدك (${usdt(requiredCost)})`)}
                      </span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-primary/30 bg-primary/10 p-2 text-center text-xs flex items-center justify-between px-3">
                        <span className="text-muted-foreground">{isEn ? "Your Balance:" : "رصيدك المتاح:"} <strong className="num text-foreground">{usdt(userBalance)}</strong></span>
                        <span className="text-primary font-bold">{isEn ? `Missing: ${usdt(missingBalance)}` : `ينقصك: ${usdt(missingBalance)}`}</span>
                      </div>
                      <Link
                        href={`/deposits?amount=${Math.ceil(missingBalance)}`}
                        data-testid={`link-recharge-${p.id}`}
                        className="btn-gold block w-full py-2.5 text-center text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                        <span>{isEn ? `Recharge ${usdt(missingBalance)} to Activate` : `اشحن رصيدك بـ ${usdt(missingBalance)} لتفعيل الباقة`}</span>
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Upgrade Difference Explanation Guide Box */}
      <div className="mt-12 glass rounded-3xl p-6 sm:p-8 border border-[hsl(40_62%_68%/.25)] bg-[hsl(40_62%_68%/.03)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-primary font-display font-semibold text-base sm:text-lg">
              <Info className="h-5 w-5 shrink-0" />
              <h3>{isEn ? "How Account Top-Up & Tier Activation Works" : "كيف يعمل نظام شحن الرصيد وتفعيل الباقات؟"}</h3>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isEn
                ? "First, recharge your wallet balance with USDT (Polygon). Once confirmed by management, your balance appears in your wallet and you can activate any investment tier with 1 click directly from your balance!"
                : "بكل بساطة: اشحن رصيد محفظتك عبر USDT على شبكة Polygon. بعد تأكيد الإيداع يظهر الرصيد في حسابك فوراً، ثم تضغط زر تفعيل الباقة لتفعيلها مباشرة من رصيدك وتبدأ أرباحك اليومية!"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-xl border border-border/60 bg-background/30 p-2.5">
                <p className="text-muted-foreground font-medium">{isEn ? "1. Recharge Wallet" : "1. اشحن رصيد المحفظة:"}</p>
                <p className="text-accent font-semibold mt-1">{isEn ? "Add USDT on Polygon" : "حوّل USDT وأرفق الإيصال"}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/30 p-2.5">
                <p className="text-muted-foreground font-medium">{isEn ? "2. Activate Tier" : "2. فعّل الباقة بنقرة واحدة:"}</p>
                <p className="text-primary font-semibold mt-1">{isEn ? "Deducted from balance" : "خصم فوري من رصيدك"}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/30 p-2.5">
                <p className="text-muted-foreground font-medium">{isEn ? "3. Receive Daily Profits" : "3. استلم أرباحك يومياً:"}</p>
                <p className="text-accent font-semibold mt-1">{isEn ? "Automated 24h payout" : "توزيع آلي وسحب مباشر"}</p>
              </div>
            </div>
          </div>
          <Link href={user ? "/deposits" : "/register"} className="btn-gold whitespace-nowrap px-6 py-3 text-xs sm:text-sm font-semibold shrink-0">
            {user ? (isEn ? "Recharge Balance Now" : "شحن رصيد المحفظة الآن") : (isEn ? "Start Investing Now" : "ابدأ استثمارك الآن")}
          </Link>
        </div>
      </div>

      {/* Confirmation Dialog for Balance-based Plan Activation */}
      <AlertDialog open={!!planToActivate} onOpenChange={(open) => !open && !subscribing && setPlanToActivate(null)}>
        <AlertDialogContent className="glass-strong border-border bg-transparent">
          <AlertDialogHeader className={isEn ? "text-left sm:text-left" : "text-right sm:text-right"}>
            <AlertDialogTitle className="font-display">
              {planToActivate?.isUpgrade
                ? (isEn ? `Confirm Upgrade to ${planToActivate.plan.name}` : `تأكيد الترقية إلى باقة ${planToActivate.plan.name}`)
                : (isEn ? `Confirm Activation of ${planToActivate?.plan.name}` : `تأكيد تفعيل باقة ${planToActivate?.plan.name}`)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEn
                ? "The required amount will be deducted directly from your available wallet balance. Daily profit accruals will start immediately."
                : "سيتم خصم قيمة الاشتراك مباشرة من رصيدك المتاح في المحفظة، وسيبدأ احتساب الأرباح اليومية تلقائياً كل 24 ساعة."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {planToActivate && (
            <div className="rounded-2xl border border-border/60 bg-background/30 p-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">{isEn ? "Plan Name:" : "اسم الباقة:"}</span>
                <span className="font-bold text-foreground">{planToActivate.plan.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">{isEn ? "Deduction from Balance:" : "المبلغ المخصوم من الرصيد:"}</span>
                <span className="num font-bold gold-text text-sm sm:text-base">{usdt(planToActivate.cost)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">{isEn ? "Current Available Balance:" : "رصيدك الحالي المتاح:"}</span>
                <span className="num font-semibold text-foreground">{usdt(userBalance)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">{isEn ? "Balance After Activation:" : "الرصيد المتبقي بعد التفعيل:"}</span>
                <span className="num font-semibold text-accent">{usdt(Math.max(0, userBalance - planToActivate.cost))}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">{isEn ? "Fixed Daily Return:" : "الربح اليومي الثابت:"}</span>
                <span className="num font-bold text-primary">{usdt(planToActivate.plan.dailyProfit)} / {isEn ? "day" : "يومياً"}</span>
              </div>
            </div>
          )}

          <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
            <AlertDialogAction
              data-testid="btn-confirm-activate-plan"
              disabled={subscribing}
              onClick={async (e) => {
                e.preventDefault();
                if (!planToActivate) return;
                setSubscribing(true);
                try {
                  const res = await fetch("/api/subscriptions", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      ...(typeof localStorage !== "undefined" && localStorage.getItem("irtiqa_token") ? { "Authorization": `Bearer ${localStorage.getItem("irtiqa_token")}` } : {}),
                    },
                    credentials: "include",
                    body: JSON.stringify({ planId: planToActivate.plan.id }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) {
                    throw new Error(data?.message || data?.error || (isEn ? "Activation failed" : "تعذر تفعيل الباقة"));
                  }
                  toast({
                    title: isEn ? "Tier Activated Successfully 🎉" : "تم تفعيل الباقة بنجاح 🎉",
                    description: isEn
                      ? `${planToActivate.plan.name} is now active. Daily profits will accumulate every 24 hours.`
                      : `تم تفعيل باقة ${planToActivate.plan.name} وخصم ${usdt(planToActivate.cost)} من رصيدك. سيبدأ توزيع العوائد اليومية آلياً كل 24 ساعة.`,
                  });
                  inv();
                  setPlanToActivate(null);
                } catch (err: any) {
                  toast({
                    title: isEn ? "Activation Failed" : "تعذر تفعيل الباقة",
                    description: err.message || (isEn ? "Please try again later" : "يرجى المحاولة مجدداً"),
                    variant: "destructive",
                  });
                } finally {
                  setSubscribing(false);
                }
              }}
              className="btn-gold border-0 cursor-pointer"
            >
              {subscribing ? (isEn ? "Activating..." : "جارٍ التفعيل...") : (isEn ? "Confirm & Activate Now" : "تأكيد التفعيل وخصم المبلغ")}
            </AlertDialogAction>
            <AlertDialogCancel disabled={subscribing} className="btn-ghost bg-transparent">
              {isEn ? "Cancel" : "تراجع"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function AboutPage() {
  const { isEn } = useLanguage();

  const visionValues = [
    {
      icon: TrendingUp,
      t: isEn ? "Disciplined Capital Growth" : "النمو المالي المنضبط",
      d: isEn
        ? "Sustainable wealth is built on steady, disciplined methodology rather than arbitrary speculation. Our model provides balanced and predictable daily yields."
        : "نؤمن بأن الاستقرار المالي يتحقق بالخطوات الثابتة والمدروسة، وليس بالمضاربات العشوائية أو الوعود الوهمية. صُممت خططنا لتوفير عوائد متوازنة ومستدامة.",
    },
    {
      icon: ShieldCheck,
      t: isEn ? "Transparency & Strict Governance" : "الشفافية والنزاهة",
      d: isEn
        ? "Every ledger entry is accounted for with cryptographic precision. Zero hidden fees or fine-print ambiguity—trust is the cornerstone of our investor partnership."
        : "كل حركة مالية مقيدة بدقة متناهية وسجل محاسبي واضح لكل عضو. لا رسوم خفية ولا شروط معقدة، فالثقة هي أساس شراكتنا مع كل عضو في ارتقاء.",
    },
    {
      icon: Users2,
      t: isEn ? "Elite Private Network" : "مجتمع ارتقاء المترابط",
      d: isEn
        ? "An invitation-based community fostering mutual success and multi-tier partnership rewards across the globe."
        : "نظام قائم على الثقة والتعاون عبر شبكة دعوات موثوقة تضمن بناء مجتمع استثماري نخبوي يتقاسم فرص النمو والنجاح بشكل حقيقي ومستمر.",
    },
    {
      icon: LockKeyhole,
      t: isEn ? "US Digital Asset Security" : "أمان التحويلات والعملات الرقمية",
      d: isEn
        ? "Leveraging the Polygon network and USDT for instant, low-fee settlements under rigorous compliance and security standards."
        : "نعتمد شبكة Polygon وعملة USDT لتوفير سرعة فائقة في المعاملات مع أدنى رسوم ممكنة، مع مراجعة دقيقة ومستمرة لحماية حسابات الأعضاء.",
    },
  ];

  return (
    <>
      <section className="py-8 md:py-14 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(40_62%_68%/.3)] bg-[hsl(40_62%_68%/.08)] px-4 py-1.5 text-xs text-primary mb-5">
          <Award className="h-3.5 w-3.5 text-primary" />
          <span>{isEn ? "Vision & Legal Entity" : "رؤيتنا ورسالتنا"}</span>
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.25]">
          {isEn ? (
            <>
              Building a Solid Financial Future,<br />
              <span className="gold-text">With Confidence & Trust from Florida, USA.</span>
            </>
          ) : (
            <>
              نبني مستقبلاً ماليًا واعدًا،<br />
              <span className="gold-text">بخطوات ثابتة وموثوقة.</span>
            </>
          )}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          {isEn ? (
            <>
              <strong className="text-foreground font-semibold">IRTIQA Asset Management LLC</strong> was incorporated in the State of Florida, United States, to deliver an institutional digital wealth model based on transparent annual memberships and automated daily yields.
            </>
          ) : (
            <>
              انطلقت شركة ومنصة <strong className="text-foreground font-semibold">ارتقاء</strong> في ولاية فلوريدا بالولايات المتحدة الأمريكية لتقديم نموذج استثماري عصري قائم على العضوية السنوية والعوائد اليومية المنتظمة، لتمكين الأفراد من تنمية أصولهم الرقمية ضمن بيئة آمنة وشفافة.
            </>
          )}
        </p>
      </section>

      {/* Grid of Core Values */}
      <div className="grid gap-5 sm:grid-cols-2 mb-10">
        {visionValues.map((v, i) => (
          <motion.div
            key={v.t}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(40_62%_68%/.12)] text-primary mb-5">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-medium">{v.t}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{v.d}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* How It Works Section */}
      <div className="glass rounded-3xl p-6 sm:p-10 mb-12">
        <div className="max-w-2xl mb-8">
          <p className="text-xs tracking-[0.2em] text-accent mb-2">{isEn ? "METHODOLOGY" : "منهجية العمل"}</p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold">{isEn ? "How to Begin Your Journey with IRTIQA" : "كيف تبدأ رحلتك مع ارتقاء؟"}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {isEn ? "Four straightforward steps to benefit from verified membership and automated daily earnings." : "أربع خطوات بسيطة تفصلك عن الاستفادة من مزايا العضوية وتحقيق أرباحك اليومية."}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative rounded-2xl bg-[hsl(200_24%_12%/.6)] border border-white/5 p-5">
            <span className="font-display text-3xl font-bold text-primary/40 block mb-2">01</span>
            <h4 className="font-display font-medium text-base mb-1.5">{isEn ? "Sign Up & Verify" : "التسجيل والانضمام"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{isEn ? "Register your phone number with a verified referral invitation code." : "إنشاء حسابك برقم الهاتف واستخدام رمز دعوة معتمد من أحد الأعضاء الفاعلين."}</p>
          </div>

          <div className="relative rounded-2xl bg-[hsl(200_24%_12%/.6)] border border-white/5 p-5">
            <span className="font-display text-3xl font-bold text-accent/40 block mb-2">02</span>
            <h4 className="font-display font-medium text-base mb-1.5">{isEn ? "Activate Your Tier" : "اختيار وتفعيل الخطة"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{isEn ? "Select your tier, transfer USDT via Polygon, and confirm your transaction receipt." : "اختر الخطة المناسبة وقم بالتحويل عبر شبكة Polygon ثم تأكيد الإيصال."}</p>
          </div>

          <div className="relative rounded-2xl bg-[hsl(200_24%_12%/.6)] border border-white/5 p-5">
            <span className="font-display text-3xl font-bold text-primary/40 block mb-2">03</span>
            <h4 className="font-display font-medium text-base mb-1.5">{isEn ? "Daily Automated Yield" : "استحقاق الأرباح اليومية"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{isEn ? "Fixed daily returns credited directly into your portfolio balance every 24 hours." : "يُضاف العائد اليومي الثابت آلياً إلى رصيدك كل 24 ساعة طوال فترة عضويتك."}</p>
          </div>

          <div className="relative rounded-2xl bg-[hsl(200_24%_12%/.6)] border border-white/5 p-5">
            <span className="font-display text-3xl font-bold text-accent/40 block mb-2">04</span>
            <h4 className="font-display font-medium text-base mb-1.5">{isEn ? "Direct Payouts" : "سحب الأرباح بسهولة"}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{isEn ? "Request payout at any time directly to your Polygon USDT wallet with zero friction." : "طلب سحب رصيدك في أي وقت إلى محفظتك الرقمية بعملة USDT دون تعقيد."}</p>
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center py-6">
        <h3 className="font-display text-2xl font-semibold mb-3">{isEn ? "Ready to Elevate Your Financial Growth?" : "مستعد للارتقاء بأهدافك المالية؟"}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{isEn ? "Join the IRTIQA community today and explore available membership tiers." : "انضم إلى مجتمع ارتقاء اليوم واستكشف الخطط المتاحة لبدء رحلة استثمارية واثقة."}</p>
        <Link href="/plans" data-testid="link-about-plans" className="btn-gold inline-flex items-center gap-2 px-8 py-3.5 text-sm font-medium">
          <Zap className="h-4 w-4" />
          <span>{isEn ? "Explore Membership Tiers" : "استعرض خطط العضوية"}</span>
        </Link>
      </div>
    </>
  );
}
