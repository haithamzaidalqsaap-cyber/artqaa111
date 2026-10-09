import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Building2, Calendar, MapPin, ShieldCheck, Landmark, CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface PlatformFoundingButtonProps {
  className?: string;
  variant?: "badge" | "button";
}

export function PlatformFoundingButton({ className = "", variant = "badge" }: PlatformFoundingButtonProps) {
  const [open, setOpen] = useState(false);
  const { lang, setLang, isEn, dir } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          data-testid="button-platform-founded"
          className={`group inline-flex items-center gap-1.5 rounded-xl border border-[hsl(40_62%_68%/.35)] bg-[hsl(40_62%_68%/.08)] px-3 py-1.5 text-xs font-medium text-foreground transition-all duration-200 hover:bg-[hsl(40_62%_68%/.16)] hover:border-primary/60 hover:shadow-[0_0_15px_hsl(40_62%_68%/.15)] cursor-pointer active:scale-95 ${className}`}
        >
          <Building2 className="h-3.5 w-3.5 text-primary transition-transform group-hover:scale-110" />
          <span>{isEn ? "When was the platform founded?" : "متى تأسست المنصة؟"}</span>
        </button>
      </DialogTrigger>

      <DialogContent
        dir={dir}
        className={`glass-strong max-w-lg border-[hsl(40_62%_68%/.3)] bg-[hsl(220_24%_9%/.98)] p-5 sm:p-7 rounded-3xl shadow-2xl backdrop-blur-2xl ${
          isEn ? "text-left" : "text-right"
        }`}
      >
        <DialogHeader className={`space-y-3 ${isEn ? "text-left sm:text-left" : "text-right sm:text-right"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[hsl(40_62%_68%/.4)] bg-gradient-to-br from-[hsl(40_62%_68%/.2)] to-[hsl(168_42%_52%/.15)] text-primary shadow-[0_0_20px_hsl(40_62%_68%/.2)]">
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg sm:text-xl font-bold gold-text">
                  {isEn ? "Incorporation of IRTIQA Platform" : "تأسيس شركة ومنصة ارتقاء"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isEn
                    ? "Official Corporate Registration & US Filing Details"
                    : "بيانات التسجيل الرسمي وتاريخ انطلاق المنصة في أمريكا"}
                </DialogDescription>
              </div>
            </div>

            {/* Quick in-modal language switcher */}
            <button
              type="button"
              onClick={() => setLang(isEn ? "ar" : "en")}
              data-testid="button-modal-lang-toggle"
              className="inline-flex items-center gap-1 rounded-xl border border-[hsl(40_62%_68%/.3)] bg-[hsl(40_62%_68%/.1)] px-2.5 py-1 text-xs font-semibold text-primary hover:bg-[hsl(40_62%_68%/.2)] transition-colors cursor-pointer"
            >
              <Globe className="h-3 w-3" />
              <span>{isEn ? "العربية" : "English"}</span>
            </button>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          {/* Main highlight banner */}
          <div className="relative overflow-hidden rounded-2xl border border-[hsl(40_62%_68%/.35)] bg-gradient-to-r from-[hsl(40_62%_68%/.12)] via-[hsl(40_62%_68%/.06)] to-transparent p-4 sm:p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {isEn ? "OFFICIAL ANNOUNCEMENT" : "الإعلان الرسمي والتوثيق"}
              </p>
              <p className="mt-1 font-display text-base sm:text-lg font-bold text-foreground">
                {isEn ? "Incorporated in Florida, USA in 2024" : "تأسست الشركة في فلوريدا عام 2024"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isEn ? (
                  <>
                    Date of Filing: <span className="font-semibold text-foreground">March 15, 2024</span> (State of Florida, USA)
                  </>
                ) : (
                  <>
                    بتاريخ <span className="font-semibold text-foreground">15 مارس 2024</span> (15th of March, 2024)
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Structured detailed cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/50 bg-background/40 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <MapPin className="h-3.5 w-3.5" />
                <span>{isEn ? "State of Incorporation" : "مقر التأسيس"}</span>
              </div>
              <p className="font-semibold text-sm text-foreground">
                {isEn ? "Florida, United States" : "ولاية فلوريدا، أمريكا"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isEn ? "State of Florida, Division of Corporations" : "State of Florida, United States"}
              </p>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/40 p-3.5 space-y-1">
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Calendar className="h-3.5 w-3.5" />
                <span>{isEn ? "Establishment Date" : "تاريخ التأسيس"}</span>
              </div>
              <p className="font-semibold text-sm text-foreground">
                {isEn ? "March 15, 2024" : "15 مارس 2024 م"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isEn ? "Official Commencement of Global Operations" : "انطلاق النشاط الاستثماري الرسمي"}
              </p>
            </div>
          </div>

          {/* Description and trust guarantees */}
          <div className="rounded-2xl border border-border/40 bg-background/30 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span>{isEn ? "Corporate Standing & Governance" : "نبذة عن الكيان والاستثمار"}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isEn
                ? "IRTIQA Asset Management LLC was founded in the State of Florida, USA, to provide an institutional digital asset infrastructure that powers automated daily yield distribution and transparent blockchain-backed financial solutions in compliance with international financial security standards."
                : "تأسست شركة ومنصة ارتقاء الاستثمارية في ولاية فلوريدا بالولايات المتحدة الأمريكية بهدف تقديم منظومة رقمية متكاملة لإدارة وتنمية الأصول الاستثمارية الرقمية، مع توفير عوائد يومية منتظمة للأعضاء وفق أعلى معايير الشفافية والحوكمة الرقمية الصارمة."}
            </p>
            <div className="pt-2 border-t border-border/30 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-accent" />
                <span>{isEn ? "Encrypted Infrastructure" : "بنية تحتية مشفرة"}</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-accent" />
                <span>{isEn ? "Florida, US Registered" : "تسجيل تجاري معتمد (Florida, USA)"}</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-accent" />
                <span>{isEn ? "Institutional Security" : "حماية وأمان متقدم"}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 pt-3 border-t border-border/40">
          <span className="text-[11px] text-muted-foreground/80 font-mono">
            {isEn ? "IRTIQA LLC · Florida, USA © 2024" : "ارتقاء · Irtiqa Platform © 2024 Florida, USA"}
          </span>
          <DialogClose asChild>
            <button
              type="button"
              className="btn-gold py-2 px-5 text-xs sm:text-sm font-medium rounded-xl cursor-pointer"
            >
              {isEn ? "Close" : "إغلاق"}
            </button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
