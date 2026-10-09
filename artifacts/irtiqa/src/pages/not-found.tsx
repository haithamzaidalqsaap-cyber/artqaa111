import { Link } from 'wouter';
import { AlertCircle, Home } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export default function NotFound() {
  const { isEn } = useLanguage();
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-8 max-w-md w-full text-center border border-border/80 space-y-5">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(40_62%_68%/.12)] text-primary">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isEn ? "404 - Page Not Found" : "404 - الصفحة غير موجودة"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {isEn
              ? "The requested link may be broken or the page might have been relocated."
              : "قد يكون الرابط المطلوب غير صحيح أو تم نقل الصفحة."}
          </p>
        </div>
        <Link href="/" className="btn-gold inline-flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium rounded-xl">
          <Home className="h-4 w-4" />
          {isEn ? "Return to Dashboard" : "العودة إلى لوحتي"}
        </Link>
      </div>
    </div>
  );
}
