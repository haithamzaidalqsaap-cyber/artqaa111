import { useState, type ReactNode } from "react";
import { Link, useLocation, Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, ArrowDownToLine, Gem, Wallet, UserRound, Info, ShieldCheck, LogOut, Send, X, LogIn, Users,
} from "lucide-react";
import { useGetSession, getGetSessionQueryKey, useLogout, useGetSettings, getGetSettingsQueryKey, type User } from "@workspace/api-client-react";
import { Backdrop, Logo, Skel } from "./brand";
import { NotificationBell } from "./notifications";
import { useLanguage, LanguageSwitcher } from "@/lib/i18n";

export function useSessionUser() {
  const q = useGetSession({ query: { queryKey: getGetSessionQueryKey(), refetchOnWindowFocus: true, staleTime: 15000 } });
  return { user: q.data?.user ?? null, isLoading: q.isLoading };
}

function Nav({ user }: { user: User | null }) {
  const [loc, setLoc] = useLocation();
  const qc = useQueryClient();
  const { t, isEn } = useLanguage();
  const logout = useLogout({
    mutation: {
      onMutate: () => {
        try {
          localStorage.removeItem("irtiqa_token");
          sessionStorage.clear();
        } catch {}
      },
      onSettled: () => {
        try {
          localStorage.removeItem("irtiqa_token");
          sessionStorage.clear();
        } catch {}
        qc.clear();
        qc.setQueryData(getGetSessionQueryKey(), { user: null });
        setLoc("/");
      },
    },
  });

  const memberNav = [
    { href: "/dashboard", label: t("nav.dashboard", "لوحتي"), icon: LayoutDashboard },
    { href: "/plans", label: t("nav.plans", "الباقات"), icon: Gem },
    { href: "/deposits", label: t("nav.deposits", "شحن الرصيد"), icon: ArrowDownToLine },
    { href: "/wallet", label: t("nav.wallet", "المحفظة"), icon: Wallet },
    { href: "/team", label: t("nav.team", "فريقي"), icon: Users },
    { href: "/profile", label: t("nav.profile", "الملف"), icon: UserRound },
    { href: "/about", label: t("nav.about", "رؤيتنا"), icon: Info },
  ];

  const items = user
    ? [...memberNav, ...(user.role === "admin" ? [{ href: "/admin", label: t("nav.admin", "الإدارة"), icon: ShieldCheck }] : [])]
    : [
        { href: "/plans", label: t("nav.plans", "الخطط"), icon: Gem },
        { href: "/about", label: t("nav.about", "رؤيتنا"), icon: Info },
      ];

  return (
    <>
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="glass mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-2 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3">
          <Link href={user ? "/dashboard" : "/"} data-testid="link-home" className="shrink-0">
            <Logo size={32} />
          </Link>
          <nav className="hidden lg:flex items-center gap-1">
            {items.map((i) => {
              const active = loc === i.href;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  data-testid={`link-nav-${i.href.slice(1)}`}
                  className={`relative rounded-xl px-3 py-2 text-sm transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="navpill"
                      className="absolute inset-0 rounded-xl bg-[hsl(40_40%_90%/.07)] border border-[hsl(40_60%_70%/.2)]"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{i.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher variant="minimal" />
            {user ? (
              <>
                <NotificationBell userId={user.id} />
                {user.role === "admin" && (
                  <Link href="/admin" className="lg:hidden shrink-0 text-xs sm:text-sm text-primary px-1.5 font-medium">
                    {t("nav.admin", "الإدارة")}
                  </Link>
                )}
                <button
                  data-testid="button-logout"
                  onClick={() => logout.mutate()}
                  disabled={logout.isPending}
                  className="btn-ghost flex shrink-0 items-center gap-1.5 px-2 py-2 text-xs sm:text-sm text-muted-foreground sm:px-3 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("nav.logout", "خروج")}</span>
                </button>
              </>
            ) : (
              <Link
                href="/"
                data-testid="link-login"
                className="btn-gold flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm"
              >
                <LogIn className="h-4 w-4" />
                <span>{t("nav.login", "دخول")}</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      {user && (
        <nav className="lg:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] inset-x-2 sm:inset-x-4 z-30 glass-strong rounded-2xl flex items-center justify-around gap-1 px-1 py-1.5 shadow-2xl">
          {items.filter((i) => i.href !== "/about" && i.href !== "/admin").slice(0, 6).map((i) => {
            const active = loc === i.href;
            return (
              <Link
                key={i.href}
                href={i.href}
                data-testid={`link-mnav-${i.href.slice(1)}`}
                className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[10px] font-medium sm:text-xs ${
                  active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i.icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="text-center leading-[1.1] max-w-full text-[9px] sm:text-[11px] font-medium break-words sm:break-normal px-0.5">{i.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}

export function TelegramButton() {
  const [open, setOpen] = useState(false);
  const { isEn } = useLanguage();
  const { data } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey(), staleTime: 60000 } });
  const url = data?.telegramUrl?.trim();
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] lg:bottom-6 left-3 sm:left-5 z-40">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
            className="glass-strong absolute bottom-16 left-0 w-[calc(100vw-2.5rem)] max-w-72 rounded-2xl p-4 text-sm sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-medium">
                {isEn ? "Telegram Support" : "الدعم عبر تيليجرام"}
              </p>
              <button data-testid="button-close-support" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            {url ? (
              <>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {isEn ? "Connect directly with our support team via our official channel." : "تواصل مع فريق الدعم مباشرة عبر القناة الرسمية التي حددتها الإدارة."}
                </p>
                <a data-testid="link-telegram" href={url} target="_blank" rel="noopener noreferrer" className="btn-gold block text-center py-2.5">
                  {isEn ? "Open Chat" : "فتح المحادثة"}
                </a>
              </>
            ) : (
              <p data-testid="text-support-unavailable" className="text-muted-foreground leading-relaxed">
                {isEn ? "Support channel is currently undergoing maintenance. Will be available shortly." : "قناة الدعم غير مفعّلة حاليًا. ستظهر هنا فور إضافة رابط رسمي من الإدارة. لا تتواصل مع أي حساب يدّعي تمثيل ارتقاء خارج هذا الزر."}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button data-testid="button-support" onClick={() => setOpen((o) => !o)} aria-label="Support"
        className="group relative grid h-[52px] w-[52px] place-items-center rounded-full glass-strong transition-transform hover:scale-105 cursor-pointer">
        <span className="absolute inset-0 rounded-full border border-[hsl(168_42%_52%/.4)] animate-ping opacity-30" />
        <Send className="h-5 w-5 text-accent -scale-x-100" />
      </button>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { user } = useSessionUser();
  return (
    <div className="grain relative min-h-[100dvh] w-full overflow-x-hidden">
      <Backdrop />
      <Nav user={user} />
      <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto max-w-6xl px-3 pt-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:px-4 sm:pt-8 lg:px-6 lg:pb-16">
        {children}
      </motion.main>
      <TelegramButton />
    </div>
  );
}

export function Protected({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, isLoading } = useSessionUser();
  if (isLoading) {
    return (
      <Shell>
        <Skel className="h-10 w-60 mb-6" />
        <div className="grid gap-4 md:grid-cols-3"><Skel className="h-40 md:col-span-2" /><Skel className="h-40" /></div>
      </Shell>
    );
  }
  if (!user) return <Redirect to="/" />;
  if (admin && user.role !== "admin") return <Redirect to="/dashboard" />;
  return <Shell>{children}</Shell>;
}
