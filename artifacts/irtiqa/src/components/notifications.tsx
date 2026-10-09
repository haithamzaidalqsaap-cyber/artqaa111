import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gem,
  CheckCheck,
  X,
  Award,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Wallet,
} from "lucide-react";
import { useListActivity, getListActivityQueryKey, type Activity } from "@workspace/api-client-react";
import { dateAr, usdt, kindAr } from "@/lib/helpers";
import { live } from "@/lib/invalidate";

const STORAGE_KEY = "irtiqa_read_notifications";

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

type FilterKey = "all" | "finance" | "profits" | "honor" | "team";

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadIds());
  const ref = useRef<HTMLDivElement>(null);

  const { data: rawActivities, isLoading, refetch } = useListActivity({
    query: {
      enabled: !!userId,
      queryKey: getListActivityQueryKey(),
      ...live,
    },
  });

  const activities: Activity[] = Array.isArray(rawActivities)
    ? rawActivities
    : Array.isArray((rawActivities as any)?.data)
    ? (rawActivities as any).data
    : Array.isArray((rawActivities as any)?.items)
    ? (rawActivities as any).items
    : [];

  // Calculate unread count
  const unreadCount = activities.filter((a) => a && a.id && !readIds.has(a.id)).length;

  // Mark single as read
  const markAsRead = (id: string) => {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveReadIds(next);
  };

  // Mark all as read
  const markAllAsRead = () => {
    const next = new Set(readIds);
    activities.forEach((a) => next.add(a.id));
    setReadIds(next);
    saveReadIds(next);
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Filter activities
  const filteredActivities = activities.filter((a) => {
    if (!a) return false;
    if (filter === "all") return true;
    if (filter === "honor") return a.kind === "honor";
    if (filter === "profits") return a.kind === "accrual" || a.kind === "daily_profit";
    if (filter === "team") return a.kind === "referral_bonus";
    if (filter === "finance") {
      return (
        a.kind === "deposit" ||
        a.kind === "withdrawal" ||
        a.kind === "payout" ||
        a.kind === "refund" ||
        a.kind === "subscription" ||
        a.kind === "adjustment"
      );
    }
    return true;
  });

  const getNotificationIcon = (a: Activity) => {
    switch (a.kind) {
      case "honor":
        return a.amount >= 0 ? (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(42_72%_76%/.18)] text-primary border border-primary/30 shadow-sm">
            <Award className="h-4.5 w-4.5 text-primary" />
          </div>
        ) : (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-destructive/15 text-[hsl(4_80%_76%)] border border-destructive/30 shadow-sm">
            <Award className="h-4.5 w-4.5" />
          </div>
        );
      case "accrual":
      case "daily_profit":
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent border border-accent/30 shadow-sm">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
        );
      case "deposit":
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(210_60%_60%/.15)] text-[hsl(210_70%_75%)] border border-[hsl(210_60%_60%/.3)] shadow-sm">
            <ArrowDownToLine className="h-4.5 w-4.5" />
          </div>
        );
      case "withdrawal":
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(40_62%_68%/.15)] text-primary border border-[hsl(40_62%_68%/.3)] shadow-sm">
            <ArrowUpFromLine className="h-4.5 w-4.5" />
          </div>
        );
      case "payout":
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(168_42%_52%/.18)] text-accent border border-accent/30 shadow-sm">
            <CheckCircle2 className="h-4.5 w-4.5 text-accent" />
          </div>
        );
      case "refund":
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30 shadow-sm">
            <RotateCcw className="h-4.5 w-4.5" />
          </div>
        );
      case "referral_bonus":
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(280_60%_65%/.18)] text-[hsl(280_70%_75%)] border border-[hsl(280_60%_65%/.3)] shadow-sm">
            <Users className="h-4.5 w-4.5" />
          </div>
        );
      case "subscription":
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent border border-accent/30 shadow-sm">
            <Gem className="h-4.5 w-4.5" />
          </div>
        );
      case "adjustment":
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary border border-primary/30 shadow-sm">
            <Sliders className="h-4.5 w-4.5" />
          </div>
        );
      default:
        return (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/30 text-muted-foreground border border-border shadow-sm">
            <Clock className="h-4.5 w-4.5" />
          </div>
        );
    }
  };

  return (
    <div className="relative shrink-0" ref={ref}>
      {/* الجرس الزر الرئيسي */}
      <button
        data-testid="button-notifications"
        onClick={() => setOpen((o) => !o)}
        aria-label="الإشعارات والتنبيهات"
        className={`relative grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl transition-all border ${
          open
            ? "bg-[hsl(40_62%_68%/.18)] text-primary border-primary/40 shadow-md ring-2 ring-primary/20"
            : "btn-ghost text-muted-foreground hover:text-foreground hover:bg-background/40"
        }`}
      >
        <Bell className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${unreadCount > 0 ? "text-primary animate-pulse" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-[hsl(42_72%_76%)] to-[hsl(168_42%_52%)] px-1 text-[10px] font-bold text-black shadow-md ring-2 ring-background animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* النافذة المنسدلة للإشعارات */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-strong fixed inset-x-2 top-16 sm:absolute sm:inset-auto sm:top-12 sm:left-0 sm:w-[420px] max-h-[85vh] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 shadow-2xl z-50 flex flex-col border border-border/80"
          >
            {/* الهيدر */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm sm:text-base leading-none">الإشعارات والتنبيهات</h3>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">إيداع، سحب، أرباح، نقاط، وتحديثات المنصة</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    data-testid="button-mark-all-read"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline px-2 py-1 rounded-lg hover:bg-background/40 transition-colors"
                    title="تحديد الكل كمقروء"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">قراءة الكل</span>
                  </button>
                )}
                <button
                  data-testid="button-close-notifications"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-background/40 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* أزرار التصفية السريعة */}
            <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar text-xs">
              {[
                { id: "all", label: "الكل" },
                { id: "finance", label: "الإيداع والسحب" },
                { id: "profits", label: "الأرباح اليومية" },
                { id: "honor", label: "نقاط التميز" },
                { id: "team", label: "مكافآت الفريق" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id as FilterKey)}
                  className={`rounded-xl px-2.5 py-1.5 whitespace-nowrap text-[11px] font-medium transition-colors ${
                    filter === t.id
                      ? "bg-primary text-black font-semibold shadow-sm"
                      : "bg-background/25 text-muted-foreground hover:text-foreground hover:bg-background/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* قائمة الإشعارات القابلة للتمرير */}
            <div className="overflow-y-auto flex-1 divide-y divide-border/40 pr-1 max-h-[50vh] sm:max-h-[52vh] space-y-1">
              {isLoading ? (
                <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p>جارٍ تحميل الإشعارات...</p>
                </div>
              ) : filteredActivities.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <div className="mx-auto h-11 w-11 rounded-full border border-dashed border-border grid place-items-center text-muted-foreground">
                    <Bell className="h-5 w-5 opacity-40" />
                  </div>
                  <p className="font-medium text-foreground">لا توجد إشعارات في هذا القسم</p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    ستصلك هنا كافة الإشعارات المتعلقة بعمليات الإيداع والسحب والأرباح اليومية ونقاط التميز فور حدوثها.
                  </p>
                </div>
              ) : (
                filteredActivities.map((a) => {
                  const isUnread = !readIds.has(a.id);
                  const isHonor = a.kind === "honor";

                  return (
                    <div
                      key={a.id}
                      onClick={() => markAsRead(a.id)}
                      data-testid={`notification-item-${a.id}`}
                      className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer rounded-xl ${
                        isUnread
                          ? "bg-[hsl(40_62%_68%/.08)] hover:bg-[hsl(40_62%_68%/.12)] border border-primary/20"
                          : "hover:bg-background/30 border border-transparent"
                      }`}
                    >
                      {/* الأيقونة المعبرة */}
                      {getNotificationIcon(a)}

                      {/* تفاصيل الإشعار */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className={`text-xs leading-snug break-words ${
                              isUnread ? "font-semibold text-foreground" : "text-foreground/90 font-medium"
                            }`}
                          >
                            {a.title}
                          </p>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1" title="غير مقروء" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {dateAr(a.createdAt, true)}
                          </span>

                          {/* شارة المبلغ أو النقاط */}
                          {isHonor ? (
                            <span
                              className={`num font-semibold text-[11px] px-2 py-0.5 rounded-md border ${
                                a.amount >= 0
                                  ? "text-accent bg-accent/10 border-accent/25"
                                  : "text-[hsl(4_80%_76%)] bg-destructive/10 border-destructive/25"
                              }`}
                            >
                              {a.amount >= 0 ? `+${a.amount} نقاط` : `${a.amount} نقاط`}
                            </span>
                          ) : a.amount !== 0 ? (
                            <span
                              className={`num font-semibold text-[11px] px-2 py-0.5 rounded-md ${
                                a.amount > 0 ? "text-accent bg-accent/10" : "text-[hsl(12_70%_72%)] bg-destructive/10"
                              }`}
                            >
                              {a.amount > 0 ? "+" : ""}
                              {usdt(a.amount)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-background/30">
                              {kindAr[a.kind] || "تنبيه"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* تذييل */}
            <div className="pt-2.5 mt-1 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                تحديثات فورية ومباشرة
              </span>
              <button
                onClick={() => refetch()}
                className="text-primary hover:underline flex items-center gap-1 font-medium"
              >
                تحديث الآن
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
