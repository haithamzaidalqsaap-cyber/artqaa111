import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Globe, Check } from "lucide-react";

export type Language = "ar" | "en";

export interface I18nContextType {
  lang: Language;
  setLang: (l: Language) => void;
  toggleLang: () => void;
  t: (path: string, fallback?: string) => string;
  isAr: boolean;
  isEn: boolean;
  dir: "rtl" | "ltr";
}

export const translations = {
  ar: {
    brand: {
      name: "ارتقاء",
      fullName: "شركة ارتقاء لإدارة الأصول الرقمية",
      tagline: "منصة العضوية والاستثمار الذكي",
      origin: "فلوريدا، الولايات المتحدة الأمريكية",
      legalNotice: "كيان مالي واستثماري مؤسس في ولاية فلوريدا، أمريكا",
    },
    nav: {
      dashboard: "لوحتي",
      plans: "الباقات",
      deposits: "شحن الرصيد",
      wallet: "المحفظة",
      team: "فريقي",
      profile: "الملف",
      about: "رؤيتنا",
      tasks: "المهام",
      admin: "الإدارة",
      logout: "خروج",
      login: "دخول",
      register: "تسجيل جديد",
    },
    common: {
      confirm: "تأكيد",
      cancel: "إلغاء",
      close: "إغلاق",
      copy: "نسخ",
      copied: "نُسخ",
      retry: "إعادة المحاولة",
      loading: "جارٍ التحميل...",
      search: "بحث",
      filter: "تصفية",
      all: "الكل",
      status: "الحالة",
      date: "التاريخ",
      amount: "المبلغ",
      network: "الشبكة",
      address: "العنوان",
      details: "التفاصيل",
      back: "رجوع",
      actions: "الإجراءات",
      save: "حفظ التغييرات",
      saved: "تم الحفظ بنجاح",
      error: "حدث خطأ ما",
      success: "تم بنجاح",
      language: "اللغة",
      selectLanguage: "اختر اللغة",
      arabic: "العربية",
      english: "English (US)",
      usdt: "USDT",
      polygon: "Polygon (MATIC)",
    },
    platformFounding: {
      buttonLabel: "متى تأسست المنصة؟",
      title: "تأسيس شركة ومنصة ارتقاء",
      subtitle: "بيانات التسجيل الرسمي والترخيص في الولايات المتحدة الأمريكية",
      officialAnnouncement: "الإعلان الرسمي والتوثيق القانوني",
      establishedMain: "تأسست الشركة في فلوريدا عام 2024",
      establishedDate: "15 مارس 2024 م",
      establishedDateSub: "15th of March, 2024 - Incorporated in Florida, USA",
      hqLocationTitle: "مقر التأسيس والولاية",
      hqLocationVal: "ولاية فلوريدا، الولايات المتحدة الأمريكية",
      hqLocationSub: "State of Florida, United States of America",
      launchDateTitle: "تاريخ الانطلاق الرسمي",
      launchDateVal: "15 مارس 2024 م",
      launchDateSub: "انطلاق العمليات المالية والاستثمارية",
      aboutTitle: "نبذة عن الكيان والاستثمار القانوني",
      aboutDesc: "تأسست شركة ومنصة ارتقاء (IRTIQA LLC) في ولاية فلوريدا بالولايات المتحدة الأمريكية لتقديم منظومة مالية رقمية عالمية لإدارة الأصول وتوزيع عوائد استثمارية يومية مستدامة، استناداً إلى تقنيات البلوكشين وأعلى معايير الحوكمة المالية الأمريكية والدولية.",
      badgeEncrypted: "بنية تحتية مشفرة عالمية",
      badgeRegistered: "تسجيل أمريكي معتمد (Florida, USA)",
      badgeSecure: "حماية مصرفية ورقابة رقمية",
      footerCopyright: "ارتقاء · Irtiqa Asset Management LLC © 2024 Florida, USA",
    },
    auth: {
      loginTitle: "مرحبًا بعودتك",
      loginSubtitle: "سجّل الدخول لمتابعة اشتراكك ومحفظتك الاستثمارية.",
      registerTitle: "ابدأ عضويتك",
      registerSubtitle: "انضم إلى مجتمع ارتقاء المالي خلال أقل من دقيقة.",
      inviteNotice: "العضوية في ارتقاء بالدعوة المعتمدة. أدخل رمز الدعوة الذي حصلت عليه من أحد الأعضاء.",
      phoneLabel: "رقم الهاتف",
      passwordLabel: "كلمة المرور",
      referralLabel: "رمز الدعوة (6 أحرف أو أرقام)",
      fullNameLabel: "الاسم الكامل",
      loginBtn: "تسجيل الدخول",
      registerBtn: "إنشاء العضوية",
      checking: "جارٍ التحقق...",
      creating: "جارٍ الإنشاء...",
      noAccount: "ليس لديك حساب؟",
      hasAccount: "لديك حساب بالفعل؟",
      joinNow: "أنشئ عضويتك الآن",
      heroTitle: "استثمار رقمي رائد،",
      heroHighlight: "وعوائد يومية ثابتة وموثوقة من فلوريدا.",
      heroDesc: "انضم إلى مجتمع ارتقاء المالي واستفد من خطط العضوية السنوية التي تمنحك عائداً يومياً ثابتاً يُضاف إلى محفظتك الرقمية بكل سلاسة وأمان.",
      heroFeat1Title: "عوائد يومية منتظمة",
      heroFeat1Desc: "أرباح يومية ثابتة تُقيّد آلياً كل 24 ساعة في رصيدك طوال فترة العضوية.",
      heroFeat2Title: "عضوية نخبوية موثقة",
      heroFeat2Desc: "رقم عضوية خاص ونظام مكافآت ونقاط تميز يعزز مكانتك في مجتمع ارتقاء.",
      heroFeat3Title: "معاملات سريعة وآمنة",
      heroFeat3Desc: "إيداع وسحب مباشر لعملة USDT عبر شبكة Polygon مع أمان مالي وتدقيق موثوق.",
      explorePlans: "استعرض الخطط",
      ourVision: "رؤيتنا ورسالتنا",
      securityFooter: "منصة مشفرة وآمنة لحماية حسابك وعملياتك المالية بأعلى معايير الخصوصية والأمان الأمريكي.",
    },
    dashboard: {
      eyebrow: "لوحة العضو",
      welcome: "أهلًا،",
      defaultName: "عضو ارتقاء",
      desc: "متابعة فورية ومباشرة لمحفظتك الاستثمارية، أرباحك اليومية، وحركات حسابك في ارتقاء.",
      memberId: "رقم العضوية",
      availableBalance: "الرصيد المتاح",
      reservedBalance: "محجوز للسحب",
      creditedToday: "مُقيَّد اليوم",
      totalEarned: "إجمالي الأرباح المستلمة",
      nextAccrual: "الاستحقاق اليومي القادم",
      accrualDesc: "تُضاف الأرباح آلياً كل 24 ساعة",
      activeSubscription: "الاشتراك النشط",
      noSubscription: "لا يوجد اشتراك نشط",
      startDeposit: "بدء إيداع وتفعيل الخطة",
      dailyProfitRate: "الربح اليومي الثابت",
      daysProgress: "تقدم فترة الاشتراك",
      daysRemaining: "أيام متبقية",
      totalDays: "إجمالي الأيام",
      quickActions: "إجراءات سريعة",
      depositAction: "إيداع وتفعيل باقة",
      withdrawAction: "سحب الأرباح",
      teamAction: "دعوة وإدارة الفريق",
      tasksAction: "مهام إضافية ومكافآت",
      recentActivity: "آخر الحركات المالية",
      viewAllActivity: "عرض السجل الكامل",
      noActivity: "لا توجد حركات بعد. ستظهر هنا كل حركة تقييد على رصيدك.",
      pointsBadge: "نقاط التميز",
    },
    wallet: {
      eyebrow: "المحفظة الرقمية",
      title: "إدارة الرصيد والسحب",
      desc: "اسحب أرباحك مباشرة إلى عنوان محفظتك الرقمية بعملة USDT عبر شبكة Polygon.",
      payoutAddressTitle: "عنوان محفظة الاستلام (USDT Polygon)",
      saveAddressDesc: "احفظ عنوانك المعتمد بدقة. تُرسل جميع مسحوباتك تلقائياً إلى هذا العنوان.",
      saveAddressBtn: "حفظ العنوان المعتمد",
      addressSavedSuccess: "تم حفظ عنوان السحب بنجاح",
      requestWithdrawTitle: "طلب سحب جديد",
      availableToWithdraw: "المتاح للسحب",
      enterAmount: "المبلغ المراد سحبه (USDT)",
      withdrawFeeNotice: "تُقتطع رسوم السحب بنسبة 21% تلقائياً لتغطية رسوم تدقيق المعاملة وشبكة Polygon، وسيتم إرسال المبلغ الصافي (79%) مباشرة لمحفظتك.",
      netAmountReceived: "المبلغ الصافي المستلم",
      feeAmount: "رسوم السحب والمعالجة (21%)",
      sendWithdrawBtn: "إرسال طلب السحب",
      withdrawHistory: "سجل طلبات السحب",
      noWithdrawals: "لا توجد طلبات سحب سابقة.",
      allActivity: "سجل الحركات الكامل",
      cancelWithdraw: "إلغاء الطلب",
    },
    deposits: {
      eyebrow: "الإيداع",
      title: "اشتراك وتحديث العضوية عبر USDT",
      desc: "اختر باقتك أو قم بالترقية لباقة أعلى ودفع الفارق فقط. أنشئ الطلب أولًا لتحصل على عنوان الاستلام والمبلغ الدقيق.",
      depositHistory: "سجل الإيداعات",
      noDeposits: "لا توجد طلبات إيداع بعد.",
      selectPlan: "اختر الباقة المناسبة",
      currentPlanBadge: "باقتك الحالية",
      upgradeBadge: "ترقية",
      upgradeNotice: "ادفع فقط فارق السعر للانتقال إلى هذه الباقة",
      officialDepositAddress: "عنوان الإيداع الرسمي (Polygon Network)",
      copyAddress: "نسخ العنوان",
      uploadReceipt: "رفع إيصال التحويل",
      txidLabel: "معرف المعاملة (TXID / Hash)",
      submitDeposit: "تأكيد وإرسال الإيداع",
      waitingReview: "طلبك قيد المراجعة والتدقيق",
    },
    team: {
      eyebrow: "شجرة الفريق",
      title: "نظام الشراكة والمكافآت",
      desc: "ابنِ فريقك الاستثماري واستفد من عمولات متعددة المستويات تُضاف مباشرة إلى رصيدك.",
      referralLink: "رابط الدعوة الخاص بك",
      referralCode: "رمز الدعوة",
      totalMembers: "إجمالي الأعضاء",
      activeMembers: "الأعضاء النشطون",
      totalVolume: "حجم الاستثمارات",
      commissionsEarned: "إجمالي العمولات",
      level1: "المستوى الأول (8%)",
      level2: "المستوى الثاني (3%)",
      level3: "المستوى الثالث (1%)",
      teamList: "قائمة أعضاء الفريق",
      copyLink: "نسخ الرابط",
    },
    profile: {
      eyebrow: "الملف الشخصي",
      title: "هويتك في ارتقاء",
      name: "الاسم",
      phone: "الهاتف",
      role: "الدور",
      status: "الحالة",
      active: "نشط",
      inactive: "موقوف",
      admin: "مسؤول",
      member: "عضو",
      memberSince: "عضو منذ",
      honorPoints: "نقاط التميز",
      honorDesc: "نقاط ولاء وتقدير خاصة بعضويتك تعكس نشاطك وموثوقية حسابك في ارتقاء.",
      subscriptionDetails: "تفاصيل الاشتراك",
      planName: "الخطة",
      startsAt: "تاريخ البدء",
      expiresAt: "تاريخ الانتهاء",
      dailyProfit: "الربح اليومي الثابت",
      remainingDays: "الأيام المتبقية",
      languagePref: "لغة العرض والمنصة",
      languagePrefDesc: "اختر اللغة المفضلة لتصفح المنصة (العربية أو English).",
    },
    about: {
      badge: "رؤيتنا ورسالتنا",
      title: "نبني مستقبلاً ماليًا واعدًا،",
      highlight: "بخطوات ثابتة وموثوقة من فلوريدا.",
      desc: "انطلقت شركة ومنصة ارتقاء (IRTIQA LLC) في ولاية فلوريدا بالولايات المتحدة الأمريكية لتقديم نموذج استثماري عصري قائم على العضوية السنوية والعوائد اليومية المنتظمة، ضمن بيئة مشفرة وشفافة.",
      step1Title: "التسجيل والانضمام",
      step1Desc: "إنشاء حسابك برقم الهاتف واستخدام رمز دعوة معتمد من أحد الأعضاء الفاعلين.",
      step2Title: "اختيار وتفعيل الخطة",
      step2Desc: "اختر الخطة المناسبة وقم بالتحويل عبر شبكة Polygon ثم تأكيد الإيصال.",
      step3Title: "استحقاق الأرباح اليومية",
      step3Desc: "يُضاف العائد اليومي الثابت آلياً إلى رصيدك كل 24 ساعة طوال فترة عضويتك.",
      step4Title: "سحب الأرباح بسهولة",
      step4Desc: "طلب سحب رصيدك في أي وقت إلى محفظتك الرقمية بعملة USDT دون تعقيد.",
      ctaTitle: "مستعد للارتقاء بأهدافك المالية؟",
      ctaBtn: "استعرض خطط العضوية",
    },
  },

  en: {
    brand: {
      name: "IRTIQA",
      fullName: "IRTIQA Digital Asset Management LLC",
      tagline: "Premier Membership & Smart Investment Platform",
      origin: "Florida, United States",
      legalNotice: "Incorporated financial entity in the State of Florida, USA",
    },
    nav: {
      dashboard: "Dashboard",
      plans: "Plans",
      deposits: "Recharge",
      wallet: "Wallet",
      team: "Team",
      profile: "Profile",
      about: "Vision",
      tasks: "Tasks",
      admin: "Admin",
      logout: "Logout",
      login: "Sign In",
      register: "Register",
    },
    common: {
      confirm: "Confirm",
      cancel: "Cancel",
      close: "Close",
      copy: "Copy",
      copied: "Copied!",
      retry: "Retry",
      loading: "Loading...",
      search: "Search",
      filter: "Filter",
      all: "All",
      status: "Status",
      date: "Date",
      amount: "Amount",
      network: "Network",
      address: "Address",
      details: "Details",
      back: "Back",
      actions: "Actions",
      save: "Save Changes",
      saved: "Saved successfully",
      error: "An error occurred",
      success: "Successful",
      language: "Language",
      selectLanguage: "Select Language",
      arabic: "العربية (Arabic)",
      english: "English (US)",
      usdt: "USDT",
      polygon: "Polygon (MATIC)",
    },
    platformFounding: {
      buttonLabel: "When was the platform founded?",
      title: "Incorporation of IRTIQA Platform",
      subtitle: "Official Registration & Incorporation Details in the United States",
      officialAnnouncement: "Official Corporate Announcement",
      establishedMain: "Incorporated in Florida, USA in 2024",
      establishedDate: "March 15, 2024",
      establishedDateSub: "15th of March, 2024 - State of Florida, Division of Corporations",
      hqLocationTitle: "Headquarters & Jurisdiction",
      hqLocationVal: "State of Florida, United States",
      hqLocationSub: "Incorporated under Florida Corporate Law, USA",
      launchDateTitle: "Official Launch Date",
      launchDateVal: "March 15, 2024",
      launchDateSub: "Commencement of Official Investment Operations",
      aboutTitle: "Corporate Overview & Legal Standing",
      aboutDesc: "IRTIQA Asset Management LLC was established in the State of Florida, United States, to deliver an institutional-grade digital asset infrastructure providing automated daily yields, strict financial governance, and reliable blockchain settlements for members worldwide.",
      badgeEncrypted: "Encrypted Global Infrastructure",
      badgeRegistered: "Florida, USA Corporation Entity",
      badgeSecure: "Institutional Security & Auditing",
      footerCopyright: "IRTIQA · Irtiqa Asset Management LLC © 2024 Florida, USA",
    },
    auth: {
      loginTitle: "Welcome Back",
      loginSubtitle: "Sign in to monitor your membership portfolio and daily yields.",
      registerTitle: "Start Your Membership",
      registerSubtitle: "Join the IRTIQA financial community in under a minute.",
      inviteNotice: "Membership is strictly invitation-only. Please provide your 6-character referral code.",
      phoneLabel: "Phone Number",
      passwordLabel: "Password",
      referralLabel: "Referral Code (6 characters)",
      fullNameLabel: "Full Legal Name",
      loginBtn: "Sign In",
      registerBtn: "Create Membership",
      checking: "Verifying...",
      creating: "Creating...",
      noAccount: "Don't have an account?",
      hasAccount: "Already a member?",
      joinNow: "Create your membership now",
      heroTitle: "Pioneering Digital Wealth,",
      heroHighlight: "With Reliable Daily Yields From Florida.",
      heroDesc: "Join IRTIQA's institutional digital wealth platform. Benefit from annual membership tiers providing consistent daily returns credited seamlessly to your digital wallet.",
      heroFeat1Title: "Automated Daily Yields",
      heroFeat1Desc: "Fixed daily rewards credited automatically every 24 hours directly to your balance.",
      heroFeat2Title: "Elite Verified Membership",
      heroFeat2Desc: "Unique Member ID, honor recognition points, and VIP network benefits.",
      heroFeat3Title: "Fast & Secure Settlements",
      heroFeat3Desc: "Instant USDT deposits and withdrawals on Polygon network with institutional audit trails.",
      explorePlans: "View Investment Plans",
      ourVision: "Vision & Mission",
      securityFooter: "Fully encrypted platform protecting your account and transactions under US digital security standards.",
    },
    dashboard: {
      eyebrow: "Member Portal",
      welcome: "Welcome,",
      defaultName: "IRTIQA Member",
      desc: "Live portfolio tracking, daily automated yield distributions, and ledger activity in IRTIQA.",
      memberId: "Member ID",
      availableBalance: "Available Balance",
      reservedBalance: "Reserved for Withdrawal",
      creditedToday: "Credited Today",
      totalEarned: "Total Yield Earned",
      nextAccrual: "Next Daily Distribution",
      accrualDesc: "Yields credited automatically every 24 hours",
      activeSubscription: "Active Plan",
      noSubscription: "No Active Subscription",
      startDeposit: "Make a Deposit to Activate",
      dailyProfitRate: "Fixed Daily Yield",
      daysProgress: "Membership Term",
      daysRemaining: "days remaining",
      totalDays: "Total Days",
      quickActions: "Quick Actions",
      depositAction: "Deposit & Upgrade",
      withdrawAction: "Withdraw Yield",
      teamAction: "Referral Network",
      tasksAction: "Bounty Tasks",
      recentActivity: "Recent Ledger Activity",
      viewAllActivity: "View Full Activity",
      noActivity: "No activity records found yet. All ledger movements will appear here.",
      pointsBadge: "Honor Points",
    },
    wallet: {
      eyebrow: "Digital Wallet",
      title: "Balance & Payout Management",
      desc: "Withdraw your profits directly to your Polygon USDT wallet address with automated settlement.",
      payoutAddressTitle: "Designated Payout Address (USDT Polygon)",
      saveAddressDesc: "Save your verified address carefully. All withdrawals are dispatched to this destination.",
      saveAddressBtn: "Save Payout Address",
      addressSavedSuccess: "Payout address saved successfully",
      requestWithdrawTitle: "New Withdrawal Request",
      availableToWithdraw: "Available for Payout",
      enterAmount: "Amount to withdraw (USDT)",
      withdrawFeeNotice: "A 21% processing and verification fee is deducted automatically. You will receive the net 79% directly to your registered wallet.",
      netAmountReceived: "Net Amount Dispatched",
      feeAmount: "Processing & Gas Fee (21%)",
      sendWithdrawBtn: "Submit Withdrawal Request",
      withdrawHistory: "Withdrawal Requests History",
      noWithdrawals: "No withdrawal requests found.",
      allActivity: "Complete Ledger History",
      cancelWithdraw: "Cancel Request",
    },
    deposits: {
      eyebrow: "Deposit",
      title: "Membership Activation via USDT",
      desc: "Select your tier or upgrade to a higher tier by paying the price difference only. Initiate an order to receive your deposit address.",
      depositHistory: "Deposit History",
      noDeposits: "No deposit records yet.",
      selectPlan: "Select Your Investment Tier",
      currentPlanBadge: "Current Active Tier",
      upgradeBadge: "Upgrade",
      upgradeNotice: "Pay the difference only to upgrade to this tier",
      officialDepositAddress: "Official Deposit Address (Polygon Network)",
      copyAddress: "Copy Address",
      uploadReceipt: "Upload Payment Receipt",
      txidLabel: "Transaction Hash (TXID)",
      submitDeposit: "Confirm & Submit Deposit",
      waitingReview: "Your deposit is pending manual review",
    },
    team: {
      eyebrow: "Network & Team",
      title: "Partnership & Multi-Tier Rewards",
      desc: "Grow your private investor network and earn multi-tier commissions credited instantly to your account balance.",
      referralLink: "Your Invitation Link",
      referralCode: "Referral Code",
      totalMembers: "Total Network Size",
      activeMembers: "Active Investors",
      totalVolume: "Total Network Volume",
      commissionsEarned: "Commissions Earned",
      level1: "Tier 1 Direct (8%)",
      level2: "Tier 2 Secondary (3%)",
      level3: "Tier 3 Extended (1%)",
      teamList: "Network Members List",
      copyLink: "Copy Invite Link",
    },
    profile: {
      eyebrow: "Member Profile",
      title: "Your IRTIQA Identity",
      name: "Full Name",
      phone: "Phone Number",
      role: "Account Role",
      status: "Account Status",
      active: "Active",
      inactive: "Suspended",
      admin: "Administrator",
      member: "Member",
      memberSince: "Member Since",
      honorPoints: "Honor Points",
      honorDesc: "Loyalty and prestige score reflecting your activity and verified reputation in IRTIQA.",
      subscriptionDetails: "Subscription Details",
      planName: "Tier",
      startsAt: "Start Date",
      expiresAt: "Expiration Date",
      dailyProfit: "Fixed Daily Yield",
      remainingDays: "Remaining Days",
      languagePref: "Platform Display Language",
      languagePrefDesc: "Choose your preferred display language (Arabic or English US).",
    },
    about: {
      badge: "Vision & Mission",
      title: "Building a Solid Financial Future,",
      highlight: "With Confidence & Trust From Florida, USA.",
      desc: "IRTIQA LLC was incorporated in Florida, United States, to offer a modern institutional membership model delivering sustainable daily yields within an audited, transparent blockchain ecosystem.",
      step1Title: "Sign Up & Invitation",
      step1Desc: "Register your phone number with an official invite code from a verified member.",
      step2Title: "Activate Tier",
      step2Desc: "Select your desired investment tier and deposit USDT via Polygon network.",
      step3Title: "Daily Yield Accruals",
      step3Desc: "Fixed daily rewards are credited automatically every 24 hours to your portfolio.",
      step4Title: "Instant Withdrawals",
      step4Desc: "Withdraw your profits at any time directly to your Polygon USDT digital wallet.",
      ctaTitle: "Ready to Elevate Your Financial Growth?",
      ctaBtn: "Explore Membership Tiers",
    },
  },
};

const LanguageContext = createContext<I18nContextType>({
  lang: "ar",
  setLang: () => {},
  toggleLang: () => {},
  t: (path: string, fallback?: string) => fallback || path,
  isAr: true,
  isEn: false,
  dir: "rtl",
});

const STORAGE_KEY = "irtiqa_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Arabic as specifically instructed: "خلي عربيه الأساس حاليا"
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ar") return saved;
    } catch {}
    return "ar";
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === "ar" ? "en" : "ar");
  };

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    if (lang === "en") {
      document.body.classList.add("lang-en");
      document.body.classList.remove("lang-ar");
    } else {
      document.body.classList.add("lang-ar");
      document.body.classList.remove("lang-en");
    }
  }, [lang, dir]);

  const t = (path: string, fallback?: string): string => {
    const keys = path.split(".");
    let current: any = translations[lang];
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        // Fallback to English or Arabic if missing
        let fallbackVal: any = translations[lang === "ar" ? "en" : "ar"];
        for (const fk of keys) {
          if (fallbackVal && typeof fallbackVal === "object" && fk in fallbackVal) {
            fallbackVal = fallbackVal[fk];
          } else {
            return fallback || path;
          }
        }
        return typeof fallbackVal === "string" ? fallbackVal : fallback || path;
      }
    }
    return typeof current === "string" ? current : fallback || path;
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      isAr: lang === "ar",
      isEn: lang === "en",
      dir,
    }),
    [lang, dir]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({
  className = "",
  variant = "badge",
  showOrigin = false,
}: {
  className?: string;
  variant?: "badge" | "button" | "minimal";
  showOrigin?: boolean;
}) {
  const { lang, setLang, toggleLang, isAr } = useLanguage();

  if (variant === "minimal") {
    return (
      <button
        type="button"
        onClick={toggleLang}
        data-testid="button-language-toggle"
        title={isAr ? "Switch to English (US)" : "التبديل إلى العربية"}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/50 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-muted/40 hover:border-primary/50 cursor-pointer ${className}`}
      >
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span className="font-semibold">{isAr ? "EN" : "عربي"}</span>
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 rounded-2xl border border-[hsl(40_62%_68%/.25)] bg-[hsl(220_24%_9%/.85)] p-1 backdrop-blur-md ${className}`}>
      <button
        type="button"
        onClick={() => setLang("ar")}
        data-testid="button-lang-ar"
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
          lang === "ar"
            ? "bg-[hsl(40_62%_68%/.2)] text-primary border border-[hsl(40_62%_68%/.4)] font-semibold shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
        }`}
      >
        <span className="text-xs">🇸🇦</span>
        <span>العربية</span>
      </button>

      <button
        type="button"
        onClick={() => setLang("en")}
        data-testid="button-lang-en"
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
          lang === "en"
            ? "bg-[hsl(40_62%_68%/.2)] text-primary border border-[hsl(40_62%_68%/.4)] font-semibold shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
        }`}
      >
        <span className="text-xs">🇺🇸</span>
        <span>English</span>
      </button>

      {showOrigin && (
        <span className="hidden sm:inline-block border-l border-border/40 pl-2 ml-1 text-[10px] text-muted-foreground/80 tracking-wider font-mono">
          FLORIDA, USA
        </span>
      )}
    </div>
  );
}
