import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Share2,
  Users,
  Link2,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  QrCode,
  Search,
  ArrowUpDown,
  Filter,
  Award,
  Clock,
  Send,
  MessageCircle,
  Calculator,
  Layers,
  Network,
  Zap,
  ChevronRight
} from "lucide-react";
import { useGetTeam, getGetTeamQueryKey, useGetSession } from "@workspace/api-client-react";
import { PageHead, Skel, ErrorBox } from "@/components/brand";
import { formatDate, usdt } from "@/lib/helpers";
import { useLanguage } from "@/lib/i18n";

export function TeamPage() {
  const { isEn, lang } = useLanguage();
  const q = useGetTeam({ query: { queryKey: getGetTeamQueryKey(), refetchInterval: 30000 } });
  const session = useGetSession();
  const [copied, setCopied] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "free" | "investor" | "pending">("all");
  const [sortBy, setSortBy] = useState<"newest" | "volume" | "honor">("newest");

  // Calculator State
  const [simL1, setSimL1] = useState(5);
  const [simL2PerL1, setSimL2PerL1] = useState(3);
  const [simL3PerL2, setSimL3PerL2] = useState(2);
  const [simAvgDeposit, setSimAvgDeposit] = useState(100);

  const code = q.data?.referralCode || session.data?.user?.referralCode || session.data?.user?.memberId || "admin1";
  const link = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/register?ref=${encodeURIComponent(code)}`;
  const members = Array.isArray(q.data?.members) ? q.data.members : [];
  const stats = q.data?.stats;

  const totalMembers = stats?.totalMembers ?? members.length;
  const activeMembers = stats?.activeMembers ?? members.filter((m: any) => m.planId).length;
  const freeMembers = stats?.freeMembers ?? members.filter((m: any) => m.planId === "starter").length;
  const investorMembers = stats?.investorMembers ?? members.filter((m: any) => m.planId && m.planId !== "starter").length;
  const todayJoined = stats?.todayJoined ?? 0;
  const totalVolume = stats?.totalVolume ?? members.reduce((sum: number, m: any) => sum + (Number(m.totalDeposited) || 0), 0);
  const avgHonor = stats?.avgHonor ?? (members.length > 0 ? Math.round(members.reduce((sum: number, m: any) => sum + (Number(m.honorPoints) || 100), 0) / members.length) : 100);
  const totalCommissionEarned = stats?.totalCommissionEarned ?? 0;

  // Multi-tier stats
  const l1Count = stats?.level1Count ?? members.filter((m: any) => (m.level ?? 1) === 1).length;
  const l1Active = stats?.level1Active ?? members.filter((m: any) => (m.level ?? 1) === 1 && m.planId).length;
  const l1Volume = stats?.level1Volume ?? 0;
  const l1Earned = stats?.level1Earned ?? (l1Volume * 0.08);

  const l2Count = stats?.level2Count ?? members.filter((m: any) => m.level === 2).length;
  const l2Active = stats?.level2Active ?? members.filter((m: any) => m.level === 2 && m.planId).length;
  const l2Volume = stats?.level2Volume ?? 0;
  const l2Earned = stats?.level2Earned ?? (l2Volume * 0.03);

  const l3Count = stats?.level3Count ?? members.filter((m: any) => m.level === 3).length;
  const l3Active = stats?.level3Active ?? members.filter((m: any) => m.level === 3 && m.planId).length;
  const l3Volume = stats?.level3Volume ?? 0;
  const l3Earned = stats?.level3Earned ?? (l3Volume * 0.01);

  // Simulation calculations
  const simTotalL1Count = simL1;
  const simTotalL2Count = simL1 * simL2PerL1;
  const simTotalL3Count = simTotalL2Count * simL3PerL2;

  const simL1Volume = simTotalL1Count * simAvgDeposit;
  const simL2Volume = simTotalL2Count * simAvgDeposit;
  const simL3Volume = simTotalL3Count * simAvgDeposit;

  const simL1Commission = simL1Volume * 0.08;
  const simL2Commission = simL2Volume * 0.03;
  const simL3Commission = simL3Volume * 0.01;
  const simTotalCommission = simL1Commission + simL2Commission + simL3Commission;

  // Calculate Affiliate Tier Rank
  const affiliateTier = useMemo(() => {
    if (totalMembers >= 30 || totalVolume >= 5000) {
      return {
        title: isEn ? "Diamond IRTIQA Ambassador" : "سفير ارتقاء الماسي",
        level: isEn ? "Tier 4" : "المستوى 4",
        color: "from-amber-400 to-amber-600",
        nextTarget: null,
        progress: 100
      };
    }
    if (totalMembers >= 15 || totalVolume >= 2000) {
      return {
        title: isEn ? "Golden Network Leader" : "قائد شبكة ذهبي",
        level: isEn ? "Tier 3" : "المستوى 3",
        color: "from-yellow-400 to-amber-500",
        nextTarget: isEn ? "30 members or 5,000 USDT" : "30 عضواً أو 5,000 USDT",
        progress: Math.min(100, Math.round((totalMembers / 30) * 100))
      };
    }
    if (totalMembers >= 5 || totalVolume >= 500) {
      return {
        title: isEn ? "Silver Network Mentor" : "موجّه شبكة فضي",
        level: isEn ? "Tier 2" : "المستوى 2",
        color: "from-slate-300 to-slate-400",
        nextTarget: isEn ? "15 members or 2,000 USDT" : "15 عضواً أو 2,000 USDT",
        progress: Math.min(100, Math.round((totalMembers / 15) * 100))
      };
    }
    return {
      title: isEn ? "Bronze Founding Member" : "عضو مؤسس برونزي",
      level: isEn ? "Tier 1" : "المستوى 1",
      color: "from-orange-400 to-amber-700",
      nextTarget: isEn ? "5 members or 500 USDT" : "5 أعضاء أو 500 USDT",
      progress: Math.min(100, Math.round((totalMembers / 5) * 100))
    };
  }, [totalMembers, totalVolume, isEn]);

  const copy = async (v: string, k: string) => {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(k);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* ignore */
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "دعوة حصرية إلى منصة ارتقاء",
          text: `انضم إلى شبكتي الاستثمارية في منصة ارتقاء برمز الدعوة الخاص بي (${code}):`,
          url: link,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy(link, "link");
    }
  };

  const shareWhatsApp = () => {
    const text = `انضم إلى منصة ارتقاء الاستثمارية عبر رمز دعوتي المعتمد [${code}]:\n${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareTelegram = () => {
    const text = `انضم إلى منصة ارتقاء عبر رمز دعوتي: ${code}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, "_blank");
  };

  // Filter and sort members list
  const filteredMembers = useMemo(() => {
    return members
      .filter((m: any) => {
        // Level filter
        if (levelFilter !== "all" && String(m.level ?? 1) !== levelFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const qLower = searchQuery.toLowerCase().trim();
          const matchName = (m.name || "").toLowerCase().includes(qLower);
          const matchId = String(m.memberId || "").toLowerCase().includes(qLower);
          const matchPhone = (m.phone || "").toLowerCase().includes(qLower);
          const matchInviter = (m.inviterName || "").toLowerCase().includes(qLower);
          if (!matchName && !matchId && !matchPhone && !matchInviter) return false;
        }

        // Status filter
        if (statusFilter === "active") return Boolean(m.planId);
        if (statusFilter === "free") return m.planId === "starter";
        if (statusFilter === "investor") return m.planId && m.planId !== "starter";
        if (statusFilter === "pending") return !m.planId;
        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "volume") return (Number(b.totalDeposited) || 0) - (Number(a.totalDeposited) || 0);
        if (sortBy === "honor") return (Number(b.honorPoints) || 100) - (Number(a.honorPoints) || 100);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [members, levelFilter, searchQuery, statusFilter, sortBy]);

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow={isEn ? "Affiliate & Rewards Program" : "نظام المكافآت والعمولات"}
        title={isEn ? "Multi-Tier Referral Network (3 Levels)" : "نظام مستويات الإحالة المتعددة (3 Levels)"}
        desc={isEn ? "Earn continuous cumulative commissions across 3 tiers: 8% direct Level 1, 3% Level 2, and 1% Level 3." : "اكسب عمولات تراكمية مستمرة على 3 أجيال متتالية: 8% للمستوى الأول المباشر، 3% للمستوى الثاني، و1% للمستوى الثالث."}
      />

      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Skel className="h-36" />
          <Skel className="h-36" />
          <Skel className="h-36" />
          <Skel className="h-36" />
          <Skel className="h-64 md:col-span-4" />
        </div>
      ) : q.isError ? (
        <ErrorBox onRetry={() => q.refetch()} />
      ) : (
        <>
          {/* Top Sticky/Hero Referral Code Bar - Fully Responsive & Immediately Visible on Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl sm:rounded-3xl border border-accent/40 bg-gradient-to-r from-card via-card/95 to-accent/10 p-3.5 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 min-w-0"
          >
            <div className="flex items-center gap-3 min-w-0 w-full md:w-auto">
              <div className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-accent/15 border border-accent/30 text-accent font-bold shadow-inner">
                <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] sm:text-xs text-muted-foreground block font-medium">
                  {isEn ? "Your Personal Referral Code:" : "رمز الإحالة الخاص بك (دعوة الأعضاء):"}
                </span>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span
                    data-testid="top-referral-code"
                    dir="ltr"
                    className="font-display text-xl sm:text-2xl md:text-3xl font-black text-accent tracking-wider select-all break-all"
                  >
                    {code || "admin1"}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(code || "admin1", "top-code")}
                    className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-bold text-accent border border-accent/30 bg-accent/10 hover:bg-accent/20 transition-all active:scale-95"
                  >
                    {copied === "top-code" ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied === "top-code" ? (isEn ? "Copied!" : "تم النسخ!") : (isEn ? "Copy Code" : "نسخ الرمز")}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
              <button
                type="button"
                onClick={() => copy(link, "top-link")}
                className="btn-gold flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl shadow-sm active:scale-95"
              >
                {copied === "top-link" ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                <span>{copied === "top-link" ? (isEn ? "Link Copied!" : "تم نسخ الرابط!") : (isEn ? "Copy Referral Link" : "نسخ رابط الإحالة")}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className={`btn-ghost flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-xl font-medium ${showQr ? "bg-accent/15 text-accent border border-accent/30" : ""}`}
              >
                <QrCode className="h-4 w-4" />
                <span>{showQr ? (isEn ? "Hide QR" : "إخفاء الباركود") : (isEn ? "QR Code" : "رمز QR")}</span>
              </button>
            </div>
          </motion.div>

          {/* Top Tier & Rank Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong relative overflow-hidden rounded-3xl p-5 sm:p-6 border border-accent/20 bg-gradient-to-r from-card via-card/80 to-accent/5"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${affiliateTier.color} text-slate-950 shadow-lg shadow-accent/10`}>
                  <Award className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium border border-accent/30 bg-accent/10 text-accent">
                      {affiliateTier.level}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{isEn ? "Leadership Rank" : "رتبة الشراكة والقيادة"}</span>
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold mt-1 text-foreground">
                    {affiliateTier.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {isEn
                      ? <>Total network: <strong className="text-foreground">{totalMembers} members</strong> across 3 tiers with <strong className="text-primary">{usdt(totalVolume)}</strong> liquidity</>
                      : <>إجمالي شبكتك: <strong className="text-foreground">{totalMembers} عضواً</strong> عبر المستويات الثلاثة بإجمالي سيولة <strong className="text-primary">{usdt(totalVolume)}</strong></>}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className={`btn-ghost flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm rounded-xl font-medium ${showCalculator ? "bg-accent/15 text-accent border border-accent/30" : ""}`}
                >
                  <Calculator className="h-4 w-4 text-accent" />
                  <span>{showCalculator ? (isEn ? "Hide Calculator" : "إخفاء الحاسبة") : (isEn ? "Earnings Calculator" : "حاسبة أرباح الشبكة")}</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* 3-Tier Multi-Level Cards Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Level 1 Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass rounded-3xl p-5 border border-amber-500/20 bg-gradient-to-b from-card to-amber-500/5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 grid place-items-center font-bold text-sm">
                    L1
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-foreground">{isEn ? "Level 1 (Direct)" : "المستوى الأول (مباشر)"}</h4>
                    <span className="text-[11px] text-muted-foreground">{isEn ? "Registered directly with your code" : "أعضاء سجلوا برمزك مباشرة"}</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                  {isEn ? "8% Commission" : "8% عمولة"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "Registered Members" : "الأعضاء المسجلون"}</span>
                  <p className="font-display text-2xl font-bold text-amber-400 mt-0.5">{l1Count} <span className="text-xs font-normal text-muted-foreground">({l1Active} {isEn ? "active" : "نشط"})</span></p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "L1 Volume" : "حجم إيداعات L1"}</span>
                  <p className="font-display text-lg font-bold text-foreground mt-0.5">{usdt(l1Volume)}</p>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded-xl bg-background/40 border border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{isEn ? "Estimated Earnings:" : "أرباح العمولات المقدرة:"}</span>
                <span className="font-bold text-amber-400 font-mono">+{usdt(l1Earned)}</span>
              </div>
            </motion.div>

            {/* Level 2 Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-3xl p-5 border border-sky-500/20 bg-gradient-to-b from-card to-sky-500/5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-sky-500/20 text-sky-400 grid place-items-center font-bold text-sm">
                    L2
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-foreground">{isEn ? "Level 2 (Tier 2)" : "المستوى الثاني (فرعي)"}</h4>
                    <span className="text-[11px] text-muted-foreground">{isEn ? "Invited by Level 1 members" : "أعضاء دعاهم أعضاء المستوى 1"}</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-mono">
                  {isEn ? "3% Commission" : "3% عمولة"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "Registered Members" : "الأعضاء المسجلون"}</span>
                  <p className="font-display text-2xl font-bold text-sky-400 mt-0.5">{l2Count} <span className="text-xs font-normal text-muted-foreground">({l2Active} {isEn ? "active" : "نشط"})</span></p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "L2 Volume" : "حجم إيداعات L2"}</span>
                  <p className="font-display text-lg font-bold text-foreground mt-0.5">{usdt(l2Volume)}</p>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded-xl bg-background/40 border border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{isEn ? "Estimated Earnings:" : "أرباح العمولات المقدرة:"}</span>
                <span className="font-bold text-sky-400 font-mono">+{usdt(l2Earned)}</span>
              </div>
            </motion.div>

            {/* Level 3 Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-3xl p-5 border border-purple-500/20 bg-gradient-to-b from-card to-purple-500/5 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-purple-500/20 text-purple-400 grid place-items-center font-bold text-sm">
                    L3
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-foreground">{isEn ? "Level 3 (Tier 3)" : "المستوى الثالث (الجيل الثالث)"}</h4>
                    <span className="text-[11px] text-muted-foreground">{isEn ? "Invited by Level 2 members" : "أعضاء دعاهم أعضاء المستوى 2"}</span>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-mono">
                  {isEn ? "1% Commission" : "1% عمولة"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "Registered Members" : "الأعضاء المسجلون"}</span>
                  <p className="font-display text-2xl font-bold text-purple-400 mt-0.5">{l3Count} <span className="text-xs font-normal text-muted-foreground">({l3Active} {isEn ? "active" : "نشط"})</span></p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">{isEn ? "L3 Volume" : "حجم إيداعات L3"}</span>
                  <p className="font-display text-lg font-bold text-foreground mt-0.5">{usdt(l3Volume)}</p>
                </div>
              </div>

              <div className="mt-3 p-2.5 rounded-xl bg-background/40 border border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{isEn ? "Estimated Earnings:" : "أرباح العمولات المقدرة:"}</span>
                <span className="font-bold text-purple-400 font-mono">+{usdt(l3Earned)}</span>
              </div>
            </motion.div>
          </div>

          {/* Interactive Network Multi-Tier Calculator (Simulate earnings) */}
          <AnimatePresence>
            {showCalculator && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-strong rounded-3xl p-5 sm:p-6 border border-accent/30 space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-accent" />
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {isEn ? "Multi-Tier Network Earnings Simulator" : "حاسبة ومحاكي أرباح شبكة الإحالات المتعددة"}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{isEn ? "Live Interactive Simulation" : "محاكاة تفاعلية فورية"}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">{isEn ? "Direct Members (L1)" : "أعضاء مباشرين (L1)"}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={simL1}
                        onChange={(e) => setSimL1(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <span className="font-mono text-sm font-bold text-amber-400 w-8 text-left">{simL1}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">{isEn ? "Invites per Member for L2" : "دعوات كل عضو لـ L2"}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={simL2PerL1}
                        onChange={(e) => setSimL2PerL1(Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                      <span className="font-mono text-sm font-bold text-sky-400 w-8 text-left">{simL2PerL1}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">{isEn ? "Invites per Member for L3" : "دعوات كل عضو لـ L3"}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={simL3PerL2}
                        onChange={(e) => setSimL3PerL2(Number(e.target.value))}
                        className="w-full accent-purple-400"
                      />
                      <span className="font-mono text-sm font-bold text-purple-400 w-8 text-left">{simL3PerL2}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">{isEn ? "Average Member Tier ($)" : "متوسط باقة العضو ($)"}</label>
                    <select
                      value={simAvgDeposit}
                      onChange={(e) => setSimAvgDeposit(Number(e.target.value))}
                      className="w-full rounded-xl border border-border/60 bg-background/50 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="25" className="bg-card">25 USDT {isEn ? "(Bronze Plan)" : "(باقة برونز)"}</option>
                      <option value="50" className="bg-card">50 USDT {isEn ? "(Silver Plan)" : "(باقة سيلفر)"}</option>
                      <option value="100" className="bg-card">100 USDT {isEn ? "(Gold Plan)" : "(باقة جولد)"}</option>
                      <option value="250" className="bg-card">250 USDT {isEn ? "(Platinum Plan)" : "(باقة بلاتينيوم)"}</option>
                      <option value="500" className="bg-card">500 USDT {isEn ? "(VIP Plan)" : "(باقة VIP)"}</option>
                      <option value="1000" className="bg-card">1000 USDT {isEn ? "(Elite Plan)" : "(باقة النخبة)"}</option>
                    </select>
                  </div>
                </div>

                {/* Simulated Results Banner */}
                <div className="p-4 rounded-2xl bg-background/40 border border-border/60 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">{isEn ? "Total Network Size" : "إجمالي أعضاء الشبكة"}</span>
                    <p className="font-display text-xl font-bold text-foreground mt-0.5">
                      {simTotalL1Count + simTotalL2Count + simTotalL3Count} {isEn ? "Members" : "عضو"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">{isEn ? "L1 Commission (8%)" : "عمولة L1 (8%)"}</span>
                    <p className="font-display text-lg font-bold text-amber-400 mt-0.5">{usdt(simL1Commission)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">{isEn ? "L2 Commission (3%)" : "عمولة L2 (3%)"}</span>
                    <p className="font-display text-lg font-bold text-sky-400 mt-0.5">{usdt(simL2Commission)}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">{isEn ? "L3 Commission (1%)" : "عمولة L3 (1%)"}</span>
                    <p className="font-display text-lg font-bold text-purple-400 mt-0.5">{usdt(simL3Commission)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-accent/10 border border-accent/30 text-sm">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />
                    {isEn ? "Estimated Cumulative Network Yield:" : "إجمالي العائد التراكمي المتوقع لشبكتك:"}
                  </span>
                  <span className="font-display text-xl sm:text-2xl font-bold text-accent font-mono">
                    {usdt(simTotalCommission)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Referral Invite & Share Box */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Share & Link Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-strong rounded-3xl p-5 sm:p-6 lg:col-span-2 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {isEn ? "Direct Referral Code & Link" : "رمز ورابط الإحالة المباشر"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEn
                      ? "Anyone registering with your code enters your Level 1 (L1). When they invite others, your network grows into Level 2 (L2) and Level 3 (L3)."
                      : "أي شخص يسجل برمزك يُسجل فوراً في مستواك الأول L1، وعندما يدعو غيره يمتد لمستواك الثاني L2 والثالث L3."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className={`btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl ${showQr ? "bg-accent/15 text-accent border border-accent/30" : ""}`}
                >
                  <QrCode className="h-4 w-4" />
                  <span>{showQr ? (isEn ? "Hide" : "إخفاء") : (isEn ? "QR" : "باركود")}</span>
                </button>
              </div>

              {/* Code Box */}
              <div className="rounded-2xl border border-[hsl(40_60%_70%/.35)] bg-gradient-to-r from-[hsl(40_40%_90%/.08)] via-[hsl(40_40%_90%/.04)] to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15 border border-accent/30 text-accent shadow-inner">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground block font-medium">
                      {isEn ? "Personal Invitation Code:" : "رمز الدعوة الشخصي:"}
                    </span>
                    <div
                      data-testid="text-referral-code"
                      dir="ltr"
                      className="font-display text-xl sm:text-2xl md:text-3xl font-black tracking-wider text-accent mt-0.5 select-all break-all"
                    >
                      {code || "admin1"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="button-copy-code"
                  onClick={() => copy(code || "admin1", "code")}
                  className="btn-gold flex items-center justify-center gap-2 px-5 py-3 text-xs sm:text-sm rounded-xl font-bold w-full sm:w-auto shrink-0 shadow-md transition-transform active:scale-95"
                >
                  {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied === "code" ? (isEn ? "Code Copied!" : "تم نسخ الرمز!") : (isEn ? "Copy Invite Code" : "نسخ رمز الدعوة")}</span>
                </button>
              </div>

              {/* Link Box */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Link2 className="h-3.5 w-3.5 text-accent" />
                  {isEn ? "Direct Registration Link:" : "رابط التسجيل المباشر:"}
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div
                    data-testid="text-referral-link"
                    dir="ltr"
                    className="flex-1 break-all rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-left text-xs sm:text-sm font-mono text-muted-foreground select-all"
                  >
                    {link}
                  </div>
                  <button
                    type="button"
                    data-testid="button-copy-link"
                    onClick={() => copy(link, "link")}
                    className="btn-ghost shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm rounded-xl font-medium w-full sm:w-auto"
                  >
                    {copied === "link" ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                    <span>{copied === "link" ? (isEn ? "Copied" : "تم النسخ") : (isEn ? "Copy Link" : "نسخ الرابط")}</span>
                  </button>
                </div>
              </div>

              {/* Social Channels */}
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  data-testid="button-share-link"
                  onClick={shareNative}
                  className="btn-gold flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl shadow-sm"
                >
                  <Share2 className="h-4 w-4" />
                  {isEn ? "Instant Share" : "مشاركة فورية"}
                </button>
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="btn-ghost border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  {isEn ? "WhatsApp Share" : "مشاركة واتساب"}
                </button>
                <button
                  type="button"
                  onClick={shareTelegram}
                  className="btn-ghost border-sky-500/30 hover:bg-sky-500/10 text-sky-400 flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-xl"
                >
                  <Send className="h-4 w-4 text-sky-400" />
                  {isEn ? "Telegram Share" : "مشاركة تيليجرام"}
                </button>
              </div>
            </motion.div>

            {/* QR Code & Fast Rules */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center gap-2 text-primary font-display font-medium text-base">
                  <Network className="h-5 w-5 text-accent" />
                  {isEn ? "Commission Structure Chart" : "مخطط هيكل العمولات"}
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="font-medium text-amber-300">{isEn ? "Level 1 (Direct L1)" : "المستوى الأول (Direct L1)"}</span>
                    <span className="font-bold text-amber-400">{isEn ? "8% per deposit" : "8% من كل إيداع"}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
                    <span className="font-medium text-sky-300">{isEn ? "Level 2 (Indirect L2)" : "المستوى الثاني (Indirect L2)"}</span>
                    <span className="font-bold text-sky-400">{isEn ? "3% per deposit" : "3% من كل إيداع"}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <span className="font-medium text-purple-300">{isEn ? "Level 3 (Team L3)" : "المستوى الثالث (Team L3)"}</span>
                    <span className="font-bold text-purple-400">{isEn ? "1% per deposit" : "1% من كل إيداع"}</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              {showQr && (
                <div className="p-3 rounded-2xl bg-white text-slate-900 text-center flex flex-col items-center justify-center space-y-1">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(link)}`}
                    alt="QR Code"
                    className="w-28 h-28 mx-auto"
                    loading="lazy"
                  />
                  <p className="text-[10px] font-bold text-slate-800">{isEn ? "Scan for Direct Registration" : "امسح للتسجيل المباشر"}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Network Directory with Level Tabs & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-3xl p-5 sm:p-6 space-y-5"
          >
            {/* Header & Level Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  {isEn ? "Network Directory & Members List" : "سجل ودليل أعضاء الشبكة"}
                  <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted/40">
                    {isEn ? `${filteredMembers.length} of ${members.length}` : `${filteredMembers.length} من ${members.length}`}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEn
                    ? "Explore network members across tiers (L1, L2, L3) with activity status and sponsor tracing."
                    : "استعرض الأعضاء بحسب مستواهم في الشجرة (L1، L2، L3) مع تتبع نشاطهم ومصادر إحالتهم."}
                </p>
              </div>

              {/* Level Selector Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background/60 border border-border/60 text-xs flex-wrap">
                <button
                  type="button"
                  onClick={() => setLevelFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${levelFilter === "all" ? "bg-accent text-slate-950 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {isEn ? `All Levels (${members.length})` : `جميع المستويات (${members.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setLevelFilter("1")}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${levelFilter === "1" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {isEn ? `Level 1 (${l1Count})` : `المستوى 1 (${l1Count})`}
                </button>
                <button
                  type="button"
                  onClick={() => setLevelFilter("2")}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${levelFilter === "2" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {isEn ? `Level 2 (${l2Count})` : `المستوى 2 (${l2Count})`}
                </button>
                <button
                  type="button"
                  onClick={() => setLevelFilter("3")}
                  className={`px-3 py-1.5 rounded-lg transition-all font-medium ${levelFilter === "3" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {isEn ? `Level 3 (${l3Count})` : `المستوى 3 (${l3Count})`}
                </button>
              </div>
            </div>

            {/* Search and Secondary Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/40">
              {/* Search Bar */}
              <div className="relative min-w-[240px] flex-1 sm:flex-initial">
                <Search className={`absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                <input
                  type="text"
                  placeholder={isEn ? "Search by member ID, name, or phone..." : "بحث بالاسم، المعرف، الهاتف، أو الداعي..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isEn ? "pl-9 pr-3" : "pr-9 pl-3"} py-2 text-xs sm:text-sm rounded-xl border border-border/60 bg-background/50 focus:outline-none focus:border-accent text-foreground placeholder:text-muted-foreground/60`}
                />
              </div>

              {/* Status & Sort Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/50 px-2.5 py-1.5 text-muted-foreground">
                  <Filter className="h-3 w-3" />
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="all" className="bg-card">{isEn ? "All Statuses" : "جميع الحالات"}</option>
                    <option value="active" className="bg-card">{isEn ? "Active Subscriptions" : "المشتركون النشطون"}</option>
                    <option value="investor" className="bg-card">{isEn ? "Investment Tiers ($25+)" : "باقات الاستثمار ($25+)"}</option>
                    <option value="free" className="bg-card">{isEn ? "Starter Free Plan" : "الباقة المجانية"}</option>
                    <option value="pending" className="bg-card">{isEn ? "Awaiting Deposit" : "بانتظار الاشتراك"}</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/50 px-2.5 py-1.5 text-muted-foreground">
                  <ArrowUpDown className="h-3 w-3" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="bg-transparent text-foreground focus:outline-none cursor-pointer text-xs"
                  >
                    <option value="newest" className="bg-card">{isEn ? "Newest Members" : "الأحدث تسجيلاً"}</option>
                    <option value="volume" className="bg-card">{isEn ? "Highest Volume" : "الأعلى إيداعاً"}</option>
                    <option value="honor" className="bg-card">{isEn ? "Honor Score" : "أعلى نقاط شرف"}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Member Cards List */}
            {filteredMembers.length === 0 ? (
              <div data-testid="text-team-empty" className="py-14 text-center rounded-2xl border border-dashed border-border/60 bg-background/20">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(168_42%_52%/.12)] text-accent">
                  <Users className="h-6 w-6" />
                </div>
                <h4 className="mt-4 font-display text-base font-medium text-foreground">
                  {members.length === 0
                    ? (isEn ? "No members have joined under this level yet" : "لم ينضم أي عضو في هذا المستوى بعد")
                    : (isEn ? "No members match the search filters" : "لا توجد نتائج تطابق خيارات البحث")}
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  {members.length === 0
                    ? (isEn
                        ? "Share your invitation link to register your first Level 1 member, and guide them to invite others for Level 2 & 3."
                        : "شارك رابط الدعوة لتسجيل أول عضو في مستواك الأول L1، ثم وجهه لدعوة أصدقائه لتفعيل L2 و L3.")
                    : (isEn ? "Try changing your search keywords or switching tier tabs." : "جرب تغيير مصطلح البحث أو اختيار مستوى آخر.")}
                </p>
                {members.length === 0 && (
                  <button
                    type="button"
                    onClick={shareNative}
                    className="btn-gold inline-flex items-center gap-2 px-4 py-2 mt-4 text-xs font-medium rounded-xl"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {isEn ? "Share Invite Link Now" : "مشاركة رابط الدعوة الآن"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredMembers.map((m: any, i: number) => {
                  const level = m.level ?? 1;
                  const isStarter = m.planId === "starter";
                  const isPaid = m.planId && m.planId !== "starter";
                  const honor = Number(m.honorPoints ?? 100);

                  const levelBadge = level === 1
                    ? { text: isEn ? "L1 Direct (8%)" : "L1 مباشر (8%)", bg: "bg-amber-500/15 text-amber-300 border-amber-500/30" }
                    : level === 2
                    ? { text: isEn ? "L2 Sub (3%)" : "L2 فرعي (3%)", bg: "bg-sky-500/15 text-sky-300 border-sky-500/30" }
                    : { text: isEn ? "L3 Tier 3 (1%)" : "L3 جيل 3 (1%)", bg: "bg-purple-500/15 text-purple-300 border-purple-500/30" };

                  return (
                    <motion.div
                      key={m.memberId || m.id || i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      data-testid={`row-member-${m.memberId}`}
                      className="rounded-2xl border border-border/50 bg-background/30 hover:bg-background/50 hover:border-accent/30 transition-all p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="relative">
                          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display font-bold text-base shadow-sm ${level === 1 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : level === 2 ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-purple-500/20 text-purple-400 border border-purple-500/30"}`}>
                            {(m.name || "U").trim().charAt(0)}
                          </div>
                          <span className="absolute -bottom-1 -right-1 flex h-4 px-1 items-center justify-center rounded-full bg-slate-900 border border-border text-[9px] text-foreground font-mono font-bold">
                            L{level}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-sm text-foreground">
                              {m.name}
                            </p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${levelBadge.bg}`}>
                              {levelBadge.text}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span dir="ltr" className="font-mono text-xs text-muted-foreground/80">
                              #{m.memberId}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(m.createdAt, lang, true)}
                            </span>
                            {m.inviterName && level > 1 && (
                              <>
                                <span>•</span>
                                <span className="text-[11px] text-muted-foreground/90">
                                  {isEn ? "Via: " : "بواسطة: "}<strong className="text-foreground">{m.inviterName}</strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Plan Status & Volume */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        {/* Plan Tag */}
                        <div className={isEn ? "text-left" : "text-right"}>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl font-medium border ${
                              isPaid
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : isStarter
                                ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                                : "bg-muted/40 text-muted-foreground border-border/60"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? "bg-amber-400" : isStarter ? "bg-sky-400" : "bg-muted-foreground"}`} />
                            {m.planName || (isEn ? "Awaiting Deposit" : "بانتظار الاشتراك")}
                          </span>
                          {Number(m.totalDeposited) > 0 && (
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {isEn ? "Volume: " : "إيداع: "}<span className="text-primary font-medium">{usdt(m.totalDeposited)}</span>
                            </p>
                          )}
                        </div>

                        {/* Honor Badge */}
                        <div className="text-left shrink-0 pl-1">
                          <div className={`text-xs font-mono font-medium flex items-center gap-1 ${honor >= 90 ? "text-emerald-400" : "text-amber-400"}`}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{honor} {isEn ? "Honor" : "شرف"}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block text-left">
                            {honor >= 90 ? (isEn ? "Verified" : "موثوق") : (isEn ? "Evaluating" : "قيد التقييم")}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
