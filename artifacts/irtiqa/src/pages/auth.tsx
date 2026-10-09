import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, Redirect } from "wouter";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, Lock, UserRound, Eye, EyeOff, ArrowLeft, ArrowRight, Fingerprint, Sunrise, Scale, Ticket, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useLogin, useRegister, getGetSessionQueryKey } from "@workspace/api-client-react";
import { Backdrop, Logo } from "@/components/brand";
import { TelegramButton, useSessionUser } from "@/components/shell";
import { CountryPhoneInput } from "@/components/country-phone-input";
import { apiError } from "@/lib/helpers";
import { useLanguage, LanguageSwitcher } from "@/lib/i18n";

function AuthLayout({ children, title, sub }: { children: ReactNode; title: string; sub: string }) {
  const { t, isEn, dir } = useLanguage();

  const story = [
    {
      icon: Sunrise,
      t: isEn ? "Automated Daily Yields" : "عوائد يومية منتظمة",
      d: isEn
        ? "Fixed daily yields credited automatically every 24 hours directly into your balance."
        : "أرباح يومية ثابتة تُقيّد آلياً كل 24 ساعة في رصيدك طوال فترة العضوية.",
    },
    {
      icon: Fingerprint,
      t: isEn ? "Elite Verified Membership" : "عضوية نخبوية موثقة",
      d: isEn
        ? "Personalized Member ID, loyalty honor points, and verified prestige in IRTIQA."
        : "رقم عضوية خاص ونظام مكافآت ونقاط تميز يعزز مكانتك في مجتمع ارتقاء.",
    },
    {
      icon: Scale,
      t: isEn ? "Institutional Security" : "معاملات سريعة وآمنة",
      d: isEn
        ? "Direct USDT settlements on Polygon network with institutional financial controls."
        : "إيداع وسحب مباشر لعملة USDT عبر شبكة Polygon مع أمان مالي وتدقيق موثوق.",
    },
  ];

  return (
    <div className="grain relative min-h-[100dvh] overflow-hidden" dir={dir}>
      <Backdrop />
      {/* Top bar with Language Switcher */}
      <div className="relative z-20 mx-auto max-w-6xl px-5 pt-4 flex justify-between items-center">
        <Link href="/" className="inline-block">
          <Logo size={36} />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="badge" showOrigin />
        </div>
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-7 px-5 py-7 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:py-10">
        <section className="mx-auto w-full max-w-md lg:max-w-none">
          <motion.div initial={{ opacity: 0, x: dir === "rtl" ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .8 }}>
            <h2 className={`font-display mt-4 text-center text-3xl font-semibold leading-[1.25] sm:text-5xl xl:text-6xl ${dir === "rtl" ? "lg:text-right" : "lg:text-left"} lg:leading-[1.2]`}>
              {isEn ? (
                <>
                  Pioneering Digital Wealth,<br />
                  <span className="gold-text">Reliable Daily Yields from Florida.</span>
                </>
              ) : (
                <>
                  استثمار رقمي رائد،<br />
                  <span className="gold-text">وعوائد يومية ثابتة وموثوقة.</span>
                </>
              )}
            </h2>
            <p className={`mx-auto mt-4 max-w-md text-center leading-relaxed text-muted-foreground ${dir === "rtl" ? "lg:mx-0 lg:text-right" : "lg:mx-0 lg:text-left"} lg:mt-6 lg:leading-loose text-base`}>
              {isEn
                ? "Join IRTIQA's institutional wealth ecosystem. Enjoy fixed annual membership tiers providing consistent daily returns credited seamlessly to your digital wallet."
                : "انضم إلى مجتمع ارتقاء المالي واستفد من خطط العضوية السنوية التي تمنحك عائداً يومياً ثابتاً يُضاف إلى محفظتك الرقمية بكل سلاسة وأمان."}
            </p>
            <div className={`mx-auto mt-5 max-w-md space-y-2 ${dir === "rtl" ? "lg:mx-0" : "lg:mx-0"} lg:mt-10 lg:space-y-3`}>
              {story.map((s, i) => (
                <motion.div key={s.t} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3 + i * .12 }}
                  className="glass flex gap-4 rounded-2xl p-3.5 lg:p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(168_42%_52%/.12)] text-accent"><s.icon className="h-5 w-5" /></div>
                  <div className={dir === "rtl" ? "text-right" : "text-left"}>
                    <p className="font-display font-medium">{s.t}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className={`mt-6 flex justify-center gap-6 text-sm lg:mt-8 ${dir === "rtl" ? "lg:justify-start" : "lg:justify-start"}`}>
              <Link href="/plans" data-testid="link-plans" className="text-primary hover:underline underline-offset-4 font-medium">
                {isEn ? "View Investment Plans" : "استعرض الخطط"}
              </Link>
              <Link href="/about" data-testid="link-about" className="text-muted-foreground hover:text-foreground">
                {isEn ? "Our Vision & US Entity" : "رؤيتنا ورسالتنا"}
              </Link>
            </div>
          </motion.div>
        </section>

        <motion.section initial={{ opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-b from-[hsl(40_62%_68%/.35)] via-transparent to-[hsl(168_42%_52%/.25)]" />
          <div className={`glass-strong relative rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-8 md:p-10 ${dir === "rtl" ? "text-right" : "text-left"}`}>
            <h1 className="font-display text-3xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
            <div className="hairline my-7" />
            {children}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground/80 text-center">
              <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
              <span>
                {isEn
                  ? "Fully encrypted & audited platform operating under US digital asset security standards."
                  : "منصة مشفرة وآمنة لحماية حسابك وعملياتك المالية بأعلى معايير الخصوصية."}
              </span>
            </div>
          </div>
        </motion.section>
      </div>
      <TelegramButton />
    </div>
  );
}

function Field({ icon: Icon, label, type = "text", value, onChange, testid, placeholder, auto }: {
  icon: typeof Phone; label: string; type?: string; value: string; onChange: (v: string) => void; testid: string; placeholder?: string; auto?: string;
}) {
  const [show, setShow] = useState(false);
  const { dir } = useLanguage();
  const isPw = type === "password";
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted-foreground">{label}</span>
      <div className="relative">
        <Icon className={`absolute ${dir === "rtl" ? "right-4" : "left-4"} top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground`} />
        <input data-testid={testid} type={isPw && !show ? "password" : isPw ? "text" : type} value={value} autoComplete={auto}
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          dir={type === "tel" ? "ltr" : undefined}
          className={`field ${dir === "rtl" ? "pr-11" : "pl-11"} ${isPw ? (dir === "rtl" ? "pl-11" : "pr-11") : ""} ${type === "tel" ? (dir === "rtl" ? "text-right" : "text-left") : ""}`} />
        {isPw && (
          <button type="button" data-testid={`toggle-${testid}`} onClick={() => setShow(!show)}
            className={`absolute ${dir === "rtl" ? "left-4" : "right-4"} top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer`}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

function ErrLine({ msg }: { msg: string }) {
  if (!msg) return null;
  return <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} data-testid="text-error"
    className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-[hsl(4_80%_78%)]">{msg}</motion.p>;
}

function useAuthSuccess() {
  const qc = useQueryClient();
  const [, setLoc] = useLocation();
  return (s: { user: unknown }) => {
    qc.clear();
    qc.setQueryData(getGetSessionQueryKey(), s);
    setLoc("/dashboard");
  };
}

export function LoginPage() {
  const { user } = useSessionUser();
  const { isEn, dir } = useLanguage();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const done = useAuthSuccess();
  const login = useLogin({
    mutation: {
      onSuccess: done,
      onError: (e) => setErr(apiError(e, isEn ? "Incorrect phone number or password" : "رقم الهاتف أو كلمة المرور غير صحيحة")),
    },
  });
  if (user) return <Redirect to="/dashboard" />;

  const submit = (e: FormEvent) => {
    e.preventDefault(); setErr("");
    const p = phone.replace(/\s/g, "");
    if (!p) return setErr(isEn ? "Please enter your phone number" : "يرجى إدخال رقم الهاتف");
    if (p.replace(/[^0-9]/g, "").length < 8) return setErr(isEn ? "Enter a valid phone number" : "أدخل رقم هاتف صحيح");
    if (password.length < 8) return setErr(isEn ? "Password must be at least 8 characters" : "كلمة المرور 8 أحرف على الأقل");
    login.mutate({ data: { phone: p, password } });
  };

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <AuthLayout
      title={isEn ? "Welcome Back" : "مرحبًا بعودتك"}
      sub={isEn ? "Sign in to monitor your subscription & investment portfolio." : "سجّل الدخول لمتابعة اشتراكك ومحفظتك الاستثمارية."}
    >
      <form onSubmit={submit} className="space-y-5">
        <CountryPhoneInput value={phone} onChange={setPhone} testid="input-phone" auto="tel" />
        <Field
          icon={Lock}
          label={isEn ? "Password" : "كلمة المرور"}
          type="password"
          value={password}
          onChange={setPassword}
          testid="input-password"
          auto="current-password"
        />
        <ErrLine msg={err} />
        <button data-testid="button-login" disabled={login.isPending} className="btn-gold group flex w-full items-center justify-center gap-2 py-3.5 cursor-pointer">
          <span>{login.isPending ? (isEn ? "Verifying..." : "جارٍ التحقق...") : (isEn ? "Sign In" : "تسجيل الدخول")}</span>
          <ArrowIcon className={`h-4 w-4 transition-transform ${dir === "rtl" ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isEn ? "Don't have an account? " : "ليس لديك حساب؟ "}
        <Link href="/register" data-testid="link-register" className="text-primary hover:underline underline-offset-4">
          {isEn ? "Create your membership now" : "أنشئ عضويتك الآن"}
        </Link>
      </p>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { user } = useSessionUser();
  const { isEn, dir } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState(() => (new URLSearchParams(window.location.search).get("ref") ?? "").trim().toUpperCase());
  const [err, setErr] = useState("");

  const done = useAuthSuccess();
  const reg = useRegister({
    mutation: {
      onSuccess: done,
      onError: (e) => setErr(apiError(e, isEn ? "Could not create account" : "تعذر إنشاء الحساب")),
    },
  });
  if (user) return <Redirect to="/dashboard" />;

  const strength = Math.min(4, [password.length >= 8, /[A-Z]/.test(password) || /[a-z]/.test(password), /\d/.test(password), /[^\w]/.test(password) || password.length >= 12].filter(Boolean).length);

  const handlePhoneChange = (newPhone: string) => {
    setPhone(newPhone);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault(); setErr("");
    const p = phone.replace(/\s/g, "");
    if (name.trim().length < 2) return setErr(isEn ? "Full name must be at least 2 letters" : "الاسم حرفان على الأقل");
    if (!p) return setErr(isEn ? "Please enter your phone number" : "يرجى إدخال رقم الهاتف");
    if (p.replace(/[^0-9]/g, "").length < 8) return setErr(isEn ? "Enter a valid phone number" : "أدخل رقم هاتف صحيح");
    if (password.length < 8) return setErr(isEn ? "Password must be at least 8 characters" : "كلمة المرور 8 أحرف على الأقل");
    const rc = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(rc)) return setErr(isEn ? "Referral code must be 6 letters or digits." : "رمز الدعوة يجب أن يتكوّن من 6 أحرف أو أرقام.");
    reg.mutate({ data: { name: name.trim(), phone: p, password, referralCode: rc } as any });
  };

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <AuthLayout
      title={isEn ? "Start Your Membership" : "ابدأ عضويتك"}
      sub={isEn ? "Join the IRTIQA investment ecosystem in under a minute." : "انضم إلى مجتمع ارتقاء خلال أقل من دقيقة."}
    >
      <p data-testid="text-invite-only" className="mb-5 rounded-xl border border-[hsl(40_60%_70%/.25)] bg-[hsl(40_40%_90%/.05)] px-4 py-3 text-sm text-muted-foreground">
        {isEn ? (
          <>
            Membership is strictly by <span className="text-primary font-medium">Verified Invitation</span>. Please enter the invitation code provided by your sponsor.
          </>
        ) : (
          <>
            العضوية في ارتقاء <span className="text-primary font-medium">بالدعوة المعتمدة</span>. أدخل رمز الدعوة الذي حصلت عليه من أحد الأعضاء.
          </>
        )}
      </p>
      <form onSubmit={submit} className="space-y-5">
        <Field
          icon={Ticket}
          label={isEn ? "Referral Code (6 characters)" : "رمز الدعوة (6 أحرف أو أرقام)"}
          value={code.slice(0, 6)}
          onChange={(v) => setCode(v.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase())}
          testid="input-referral-code"
          placeholder="A7K2P9"
          auto="off"
        />
        <Field
          icon={UserRound}
          label={isEn ? "Full Name" : "الاسم الكامل"}
          value={name}
          onChange={setName}
          testid="input-name"
          auto="name"
        />
        <CountryPhoneInput value={phone} onChange={handlePhoneChange} testid="input-phone" auto="tel" />
        <div>
          <Field
            icon={Lock}
            label={isEn ? "Password" : "كلمة المرور"}
            type="password"
            value={password}
            onChange={setPassword}
            testid="input-password"
            auto="new-password"
          />
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full bg-gradient-to-l from-[hsl(42_72%_76%)] to-[hsl(168_42%_52%)] origin-right" animate={{ scaleX: i < strength ? 1 : 0 }} />
              </div>
            ))}
          </div>
        </div>
        <ErrLine msg={err} />
        <button data-testid="button-register" disabled={reg.isPending} className="btn-gold group flex w-full items-center justify-center gap-2 py-3.5 cursor-pointer">
          <span>{reg.isPending ? (isEn ? "Creating..." : "جارٍ الإنشاء...") : (isEn ? "Create Membership" : "إنشاء العضوية")}</span>
          <ArrowIcon className={`h-4 w-4 transition-transform ${dir === "rtl" ? "group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isEn ? "Already have an account? " : "لديك حساب بالفعل؟ "}
        <Link href="/" data-testid="link-login" className="text-primary hover:underline underline-offset-4">
          {isEn ? "Sign In" : "سجّل الدخول"}
        </Link>
      </p>
    </AuthLayout>
  );
}
