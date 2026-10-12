import { useRef, useState, type FormEvent, useEffect } from "react";
import { Link } from "wouter";
import { Copy, Check, AlertTriangle, Upload, ImageIcon, Settings2, FileText, XCircle, ArrowUpRight, Clock, ShieldCheck, Wallet, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  useGetSettings, getGetSettingsQueryKey, useListDeposits, getListDepositsQueryKey,
  useCreateDeposit, useSubmitDepositProof, useCancelDeposit, useRequestReceiptUpload, useGetDashboard, getGetDashboardQueryKey, type Deposit,
} from "@workspace/api-client-react";
import { PageHead, Skel, ErrorBox } from "@/components/brand";
import { useSessionUser } from "@/components/shell";
import { StatusPill } from "@/pages/member";
import { useToast } from "@/hooks/use-toast";
import { apiError, usdt, formatDate } from "@/lib/helpers";
import { useInvalidateAll, live } from "@/lib/invalidate";
import { useLanguage } from "@/lib/i18n";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const channelAr: Record<string, string> = { binance: "Binance", okx: "OKX" };
const TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

class ReceiptUploadError extends Error {}

async function processReceiptImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(processedFile);
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

async function uploadReceiptThroughApp(uploadId: string, file: File, isEn = false): Promise<void> {
  let response: Response;
  try {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("irtiqa_token") : null;
    response = await fetch(`/api/receipts/upload/${encodeURIComponent(uploadId)}/content`, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      credentials: "include",
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
  const settings = useGetSettings({ query: { queryKey: getGetSettingsQueryKey(), ...live } });
  const deps = useListDeposits({ query: { enabled: !!user, queryKey: getListDepositsQueryKey(), ...live } });
  const open = deps.data?.find((d) => d.status === "awaiting_receipt" || d.status === "pending");
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const cancel = useCancelDeposit({
    mutation: {
      onSuccess: () => { toast({ title: isEn ? "Recharge order cancelled" : "أُلغي طلب الشحن" }); inv(); setCancelTargetId(null); },
      onError: (e) => toast({ title: isEn ? "Cancellation failed" : "تعذر الإلغاء", description: apiError(e), variant: "destructive" }),
    },
  });

  return (
    <>
      <PageHead
        eyebrow={isEn ? "Account Recharge" : "شحن رصيد الحساب"}
        title={isEn ? "USDT Wallet Recharge (Polygon Network)" : "شحن رصيد المحفظة عبر عملة USDT (شبكة Polygon)"}
        desc={isEn
          ? "Recharge your account balance with USDT on the Polygon network. Transfer the funds and upload your transaction receipt for instant review and balance crediting."
          : "اشحن رصيد محفظتك بعملة USDT على شبكة Polygon. حوّل المبلغ المحدد وارفع صورة وصل التحويل للتأكد، وسيتم اعتماد الرصيد في حسابك فوراً لتفعيل الباقات أو سحب الأرباح."}
      />
      {deps.isLoading || settings.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]"><Skel className="h-96" /><Skel className="h-96" /></div>
      ) : deps.isError || settings.isError ? (
        <ErrorBox onRetry={() => { deps.refetch(); settings.refetch(); }} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div>{open ? <OpenOrder d={open} /> : <NewRechargeOrder />}</div>
          <div className="glass h-fit rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
              <h3 className="font-display font-medium">{isEn ? "Recharge History" : "سجل عمليات الشحن"}</h3>
              <Link href="/plans" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                <span>{isEn ? "Explore Plans" : "تصفح الباقات"}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            {!deps.data?.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{isEn ? "No recharge requests yet." : "لا توجد طلبات شحن بعد."}</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {deps.data.map((d) => (
                  <li key={d.id} data-testid={`row-deposit-${d.id}`} className="py-3.5 text-sm space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{d.planName || (isEn ? "Wallet Recharge" : "شحن رصيد المحفظة")} <span className="text-xs text-muted-foreground">· {channelAr[d.channel] ?? d.channel}</span></p>
                        <p className={`num text-xs text-primary font-semibold ${isEn ? "text-left" : "text-right"}`}>{usdt(d.amount)}</p>
                      </div>
                      <StatusPill status={d.status} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{isEn ? "Request date & time:" : "تاريخ ووقت الطلب:"}</span>
                      <span className="font-medium text-foreground">{formatDate(d.createdAt, lang, true)}</span>
                    </div>
                    {d.reviewedAt && (
                      <p className="text-[11px] text-muted-foreground">
                        {isEn ? "Review & approval date: " : "تاريخ المراجعة والاعتماد: "}<span className="text-foreground">{formatDate(d.reviewedAt, lang, true)}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                      {d.receiptUrl && <a href={d.receiptUrl} target="_blank" rel="noreferrer" data-testid={`link-receipt-${d.id}`} className="inline-flex items-center gap-1 text-primary"><ImageIcon className="h-3 w-3" />{isEn ? "Receipt" : "الإيصال"}</a>}
                      {(d.status === "awaiting_receipt" || d.status === "pending") && (
                        <button
                          type="button"
                          data-testid={`button-cancel-deposit-list-${d.id}`}
                          onClick={() => setCancelTargetId(d.id)}
                          className="text-xs text-[hsl(4_80%_76%)] hover:underline inline-flex items-center gap-1 cursor-pointer"
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
            <AlertDialogTitle className="font-display">{isEn ? "Cancel Recharge Order?" : "إلغاء طلب الشحن؟"}</AlertDialogTitle>
            <AlertDialogDescription>{isEn ? "Are you sure you want to cancel this order? Cancelling allows you to create a new recharge request." : "هل أنت متأكد من إلغاء هذا الطلب؟ الإلغاء يسمح لك بإنشاء طلب شحن جديد."}</AlertDialogDescription>
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

function NewRechargeOrder() {
  const { toast } = useToast();
  const inv = useInvalidateAll();
  const { isEn } = useLanguage();
  const { user } = useSessionUser();
  const dash = useGetDashboard({ query: { enabled: !!user, queryKey: getGetDashboardQueryKey() } });
  const settings = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });

  // Read pre-filled amount from query parameters if user arrived from Plans page
  const [amount, setAmount] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("amount");
      if (p && !isNaN(Number(p)) && Number(p) > 0) return p;
    }
    return "50";
  });
  const [channel, setChannel] = useState<"binance" | "okx">("binance");
  const [accepted, setAccepted] = useState(false);
  const [err, setErr] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reqUpload = useRequestReceiptUpload();
  const create = useCreateDeposit();
  const proof = useSubmitDepositProof();

  const presets = [4, 25, 50, 100, 250, 500, 1000];

  const pick = async (f: File | undefined) => {
    setErr("");
    if (!f) return;
    try {
      const processed = await processReceiptImage(f);
      if (processed.size > 5 * 1024 * 1024) {
        return setErr(isEn ? "Maximum receipt image size is 5MB" : "الحد الأقصى لحجم صورة الوصل هو 5 ميغابايت");
      }
      setFile(processed);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(processed));
    } catch {
      if (f.size > 5 * 1024 * 1024) {
        return setErr(isEn ? "Maximum receipt image size is 5MB" : "الحد الأقصى لحجم صورة الوصل هو 5 ميغابايت");
      }
      setFile(f);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const s = settings.data;

  if (!s?.ready || !s.depositsEnabled) {
    return (
      <div data-testid="empty-deposits-setup" className="glass rounded-3xl p-10 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[hsl(40_62%_68%/.1)] text-primary"><Settings2 className="h-7 w-7" /></div>
        <p className="font-display text-xl">{isEn ? "Recharge currently unavailable" : "شحن الرصيد غير متاح حاليًا"}</p>
        <p className="mt-2 text-muted-foreground leading-relaxed max-w-md mx-auto">
          {isEn ? "Deposit addresses are being configured by management. Please return shortly." : "تقوم الإدارة حاليًا بتهيئة عناوين الاستلام. يرجى العودة لاحقاً."}
        </p>
      </div>
    );
  }

  const busy = uploading || create.isPending || proof.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr("");

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount < 1) {
      return setErr(isEn ? "Please enter a valid amount (minimum 1 USDT)" : "أدخل مبلغ شحن صحيحاً (الحد الأدنى 1 USDT)");
    }
    if (!channel) return setErr(isEn ? "Please select receiving channel" : "اختر قناة الاستلام");
    if (!file) {
      return setErr(isEn ? "Please upload the transfer receipt image to verify your recharge" : "يرجى رفع صورة وصل التحويل للتأكد من عملية الشحن ومطابقتها");
    }
    if (!accepted) return setErr(isEn ? "You must accept the terms" : "يجب الموافقة على الشروط للمتابعة");

    setUploading(true);
    try {
      // 1. Request upload and push receipt content
      const up = await reqUpload.mutateAsync({ data: { contentType: file.type as (typeof TYPES)[number], size: file.size } });
      let directUploadSucceeded = false;
      try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("irtiqa_token") : null;
        const res = await fetch(up.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: file,
        });
        directUploadSucceeded = res.ok;
      } catch {
        // Fallback for mobile signed PUT
      }
      if (!directUploadSucceeded) await uploadReceiptThroughApp(up.uploadId, file, isEn);

      // 2. Create recharge order
      const dep = await create.mutateAsync({
        data: {
          planId: "recharge",
          amount: numAmount,
          channel,
          acceptedTerms: true,
        },
      });

      // 3. Immediately attach receipt proof so order transitions directly to pending review
      await proof.mutateAsync({ id: dep.id, data: { uploadId: up.uploadId } });

      setUploading(false);
      toast({
        title: isEn ? "Recharge request submitted successfully" : "تم تقديم طلب شحن الرصيد وإرسال الوصل بنجاح",
        description: isEn
          ? "Your receipt has been submitted. Management will verify payment and credit your balance shortly."
          : "تم استلام صورة الوصل بنجاح. سيتحقق المسؤول يدويًا من وصول التحويل لإضافة الرصيد إلى محفظتك.",
      });
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setAccepted(false);
      inv();
    } catch (x) {
      setUploading(false);
      const msg = x instanceof ReceiptUploadError ? x.message : apiError(x);
      setErr(msg);
      toast({
        title: isEn ? "Recharge failed" : "تعذر إتمام طلب الشحن",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const channels = (["binance", "okx"] as const).filter((c) => (c === "binance" ? s.binanceAddress : s.okxAddress));
  const currentBalance = dash.data?.user ? Number(dash.data.user.balance) : (user ? Number(user.balance) : 0);
  const targetAddress = channel === "binance" ? s.binanceAddress : s.okxAddress;

  return (
    <form onSubmit={submit} className="glass rounded-3xl p-4 space-y-6 sm:p-7">
      {/* Current Balance Banner & Direct link to Plans */}
      <div className="rounded-2xl border border-primary/30 bg-[hsl(40_62%_68%/.06)] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/20 text-primary shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{isEn ? "Current Available Balance" : "رصيدك المتاح حالياً في المحفظة"}</p>
            <p className="num text-xl sm:text-2xl font-bold gold-text mt-0.5">{usdt(currentBalance)}</p>
          </div>
        </div>
        <Link href="/plans" className="btn-ghost flex items-center gap-1.5 text-xs text-primary font-medium hover:bg-primary/10 px-3 py-2 rounded-xl">
          <span>{isEn ? "Browse & Activate Plans" : "استعراض الباقات وتفعيلها"}</span>
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      {/* Clear Separation Notice */}
      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-3.5 text-xs space-y-1.5 text-foreground">
        <p className="font-semibold text-accent flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{isEn ? "Recharge Wallet First, Then Activate Any Tier:" : "اشحن رصيد محفظتك، ثم فعّل أي باقة ترغب بها بنقرة واحدة:"}</span>
        </p>
        <p className="text-muted-foreground leading-relaxed">
          {isEn
            ? "Deposits here credit USDT directly to your available wallet balance. After approval, visit the Plans page to activate your chosen tier instantly with 1 click!"
            : "عملية الإيداع هنا مخصصة لشحن رصيد حسابك بعملة USDT. فور تأكيد الإيداع، يظهر الرصيد في محفظتك وتستطيع الانتقال إلى صفحة الباقات وتفعيل باقتك مباشرة بنقرة واحدة!"}
        </p>
      </div>

      {/* Step 1: Select Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-foreground">
            {isEn ? "1. Specify Recharge Amount (USDT)" : "1. تحديد مبلغ شحن الرصيد (USDT)"}
          </label>
          <span className="text-xs text-muted-foreground">{isEn ? "Min: 1 USDT" : "الحد الأدنى: 1 USDT"}</span>
        </div>

        {/* Quick Amount Presets */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
          {presets.map((val) => (
            <button
              type="button"
              key={val}
              onClick={() => { setAmount(String(val)); setErr(""); }}
              className={`rounded-xl border py-2.5 px-1 text-xs font-semibold num transition-colors cursor-pointer ${
                Number(amount) === val
                  ? "border-primary bg-primary/20 text-primary shadow-sm"
                  : "border-border/60 hover:bg-background/40 text-foreground"
              }`}
            >
              {val} USDT
            </button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="relative">
          <input
            type="number"
            step="any"
            min="1"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setErr(""); }}
            placeholder={isEn ? "Enter custom USDT amount" : "أو أدخل مبلغاً مخصصاً (مثال: 50)"}
            className="w-full rounded-2xl border border-border bg-background/40 py-3.5 px-4 text-sm font-semibold num text-foreground focus:border-primary focus:outline-none"
          />
          <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">USDT (Polygon)</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          {isEn
            ? "The recharge amount will be credited directly to your wallet upon admin confirmation."
            : "سيتم إضافة هذا المبلغ كاملاً إلى رصيدك المتاح فور تأكيد الإيداع، لتتمكن من تفعيل أي باقة ترغب بها."}
        </p>
      </div>

      {/* Step 2: Receiving Channel (Polygon Network) */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2.5">
          {isEn ? "2. Receiving Channel (Polygon Network)" : "2. اختيار قناة الاستلام (شبكة Polygon)"}
        </p>
        <div className="flex gap-3">
          {channels.map((c) => (
            <button
              type="button"
              key={c}
              data-testid={`select-channel-${c}`}
              onClick={() => setChannel(c)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                channel === c
                  ? "border-[hsl(40_62%_68%/.7)] bg-[hsl(40_62%_68%/.12)] text-primary shadow-sm"
                  : "border-border hover:bg-background/30 text-muted-foreground"
              }`}
            >
              {channelAr[c]} (Polygon USDT)
            </button>
          ))}
        </div>

        {/* Live Address Preview & QR Code */}
        {channel && targetAddress && (
          <div className="mt-4 flex flex-col sm:flex-row gap-4 items-center bg-[hsl(40_62%_68%/.03)] rounded-2xl border border-[hsl(40_62%_68%/.2)] p-4 min-w-0 w-full animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white p-2.5 rounded-2xl shrink-0 flex items-center justify-center border border-border shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetAddress)}`}
                alt="QR Code"
                className="w-24 h-24 sm:w-28 sm:h-28 select-none object-contain"
                loading="lazy"
              />
            </div>
            <div className={`flex-1 min-w-0 ${isEn ? "text-left sm:text-left" : "text-right sm:text-right"} space-y-1.5 w-full`}>
              <span className="text-xs text-muted-foreground block font-medium">
                {isEn ? `Official Receiving Address for ${channelAr[channel]} (Polygon):` : `عنوان الاستلام المباشر لـ ${channelAr[channel]} (شبكة Polygon):`}
              </span>
              <p className="num break-all text-xs sm:text-sm font-semibold text-primary select-all bg-background/20 p-2.5 rounded-xl border border-border/40 leading-relaxed font-mono">
                {targetAddress}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <CopyBtn text={targetAddress} id="channel-preview-address" />
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                  {isEn ? "Official verified IRTIQA wallet" : "عنوان محفظة رسمي ومعتمد في ارتقاء"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Mandatory Receipt Upload For Verification */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <span>{isEn ? "3. Upload Transfer Receipt (Required)" : "3. رفع صورة وصل التحويل (إلزامي للتأكد)"}</span>
          </label>
          <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-lg">
            {isEn ? "Verification Proof" : "إثبات العملية"}
          </span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,image/png,image/jpeg,image/webp,image/heic,image/heif"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
          data-testid="input-recharge-receipt-file"
        />

        {!file ? (
          <button
            type="button"
            data-testid="button-pick-recharge-receipt"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2.5 w-full rounded-2xl border-2 border-dashed border-primary/40 bg-background/20 p-6 text-center hover:bg-primary/5 hover:border-primary transition-colors cursor-pointer"
          >
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isEn ? "Click to choose transfer receipt image" : "انقر هنا لاختيار صورة وصل التحويل"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isEn ? "PNG, JPEG, or WebP (max 5MB)" : "الصيغ المدعومة: PNG أو JPEG أو WebP (الحد الأقصى 5 ميغابايت)"}
              </p>
            </div>
          </button>
        ) : (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground num">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-ghost text-xs py-1.5 px-2.5 text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                >
                  {isEn ? "Change" : "تغيير الصورة"}
                </button>
                <button
                  type="button"
                  onClick={removeFile}
                  className="btn-ghost text-xs py-1.5 px-2.5 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                >
                  {isEn ? "Remove" : "حذف"}
                </button>
              </div>
            </div>

            {previewUrl && (
              <div className="rounded-xl overflow-hidden border border-border/50 max-h-48 flex justify-center bg-background/40">
                <img
                  src={previewUrl}
                  alt="Receipt Preview"
                  className="max-h-48 object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          {isEn
            ? "Upload a screenshot from your wallet or exchange confirming the transfer so management can verify and credit your balance immediately."
            : "ارفع صورة إشعار التحويل من محفظتك أو منصتك لتتمكن الإدارة من مطابقة المعاملة يدوياً وإضافة الرصيد إلى محفظتك فوراً."}
        </p>
      </div>

      {/* Step 4: Terms & Agreement */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {isEn ? "4. Terms & Notices" : "4. تعليمات وشروط التحويل"}
        </p>
        <div className="max-h-40 overflow-y-auto rounded-2xl border border-border bg-[hsl(205_36%_7%/.5)] p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap space-y-2.5">
          <p className="text-foreground">{s.fundingDescription}</p>
          <div className="hairline" />
          <p className="text-muted-foreground">{s.terms}</p>
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-2.5 text-xs text-accent">
            {isEn
              ? "Important: Send USDT only on the Polygon network. Transfers on other networks cannot be recovered."
              : "تنبيه هام: أرسل عملة USDT فقط على شبكة Polygon (POL). أي إيداع على شبكة أخرى قد يضيع."}
          </div>
        </div>
        <label className="mt-3 flex items-start gap-3 text-sm cursor-pointer select-none">
          <input
            data-testid="checkbox-accept-terms"
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[hsl(40_62%_68%)] rounded cursor-pointer"
          />
          <span className="text-xs sm:text-sm text-foreground">
            {isEn
              ? "I have read and agree to the recharge instructions, and confirm that I transferred funds and attached the correct receipt."
              : "قرأت تعليمات التحويل وأوافق عليها، وأؤكد أنني حوّلت المبلغ المطلوب وأرفقت صورة إيصال التحويل الصحيحة."}
          </span>
        </label>
      </div>

      {err && <p className="text-sm text-[hsl(4_80%_76%)] font-medium">{err}</p>}

      <button
        data-testid="button-create-deposit"
        disabled={busy}
        className="btn-gold w-full py-3.5 font-bold text-sm cursor-pointer shadow-lg"
      >
        {busy
          ? (isEn ? "Uploading receipt & creating recharge order..." : "جارٍ رفع الوصل وتأكيد طلب الشحن...")
          : (isEn ? `Confirm Recharge & Submit Receipt (${amount ? Number(amount) : ""} USDT)` : `تأكيد شحن الرصيد وإرسال الوصل (${amount ? Number(amount) : ""} USDT)`)}
      </button>
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
            : "تم استلام صورة الإيصال بنجاح. سيتحقق المسؤول يدويًا من وصول التحويل لإضافة الرصيد إلى محفظتك.",
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
          title: isEn ? "Recharge order cancelled" : "تم إلغاء طلب الشحن بنجاح",
          description: isEn
            ? "Order closed. You can create a new recharge order at any time."
            : "تم إغلاق طلب الشحن. يمكنك إنشاء طلب جديد بالمبلغ الذي تريده في أي وقت.",
        });
        inv();
      },
      onError: (e) => toast({ title: isEn ? "Cancellation failed" : "تعذر إلغاء الطلب", description: apiError(e), variant: "destructive" }),
      onSettled: () => setConfirmCancel(false),
    },
  });

  const busy = uploading || proof.isPending;

  const pick = async (f: File | undefined) => {
    setErr("");
    if (!f) return;
    try {
      const processed = await processReceiptImage(f);
      if (processed.size > 5 * 1024 * 1024) {
        return setErr(isEn ? "Maximum image size is 5MB" : "الحد الأقصى لحجم الصورة 5 ميغابايت");
      }
      setFile(processed);
    } catch {
      if (f.size > 5 * 1024 * 1024) {
        return setErr(isEn ? "Maximum image size is 5MB" : "الحد الأقصى لحجم الصورة 5 ميغابايت");
      }
      setFile(f);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    if (!file) return setErr(isEn ? "Please attach the receipt image" : "أرفق صورة الإيصال");
    setUploading(true);
    try {
      const up = await reqUpload.mutateAsync({ data: { contentType: file.type as (typeof TYPES)[number], size: file.size } });
      let directUploadSucceeded = false;
      try {
        const token = typeof localStorage !== "undefined" ? localStorage.getItem("irtiqa_token") : null;
        const res = await fetch(up.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: file,
        });
        directUploadSucceeded = res.ok;
      } catch {
        // Fallback for mobile signed PUT
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
          <p className="font-display text-xl font-semibold">{isEn ? "Your Order is Under Review" : "طلب الشحن قيد المراجعة"}</p>
          <StatusPill status="pending" />
        </div>
        <p className="text-muted-foreground leading-relaxed text-sm">
          {d.receiptUrl
            ? (isEn
                ? "Transfer receipt uploaded successfully. Management will verify arrival on Polygon before crediting your balance."
                : "تم رفع إيصال التحويل بنجاح. سيتحقق المسؤول يدويًا من وصول التحويل على شبكة Polygon لإضافة الرصيد إلى محفظتك فوراً.")
            : (isEn
                ? "Your order is under review. Management will verify on-chain arrival before crediting your account. You can also upload your receipt below."
                : "تم تسجيل طلب الشحن وهو قيد المراجعة. سيتحقق المسؤول يدويًا من وصول التحويل. يمكنك أيضاً إرفاق صورة الإيصال أدناه لسرعة التحقق.")}
        </p>

        <dl className="grid gap-3 text-sm sm:grid-cols-2 rounded-2xl border border-border p-4 bg-background/20">
          <div>
            <dt className="text-xs text-muted-foreground">{isEn ? "Type" : "نوع الطلب"}</dt>
            <dd className="font-semibold text-foreground">{d.planName || (isEn ? "Wallet Recharge" : "شحن رصيد المحفظة")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{isEn ? "Recharge Amount" : "مبلغ الشحن المطلوب"}</dt>
            <dd className={`num font-bold ${isEn ? "text-left" : "text-right"} text-primary text-base`}>{usdt(d.amount)}</dd>
          </div>
          <div className="sm:col-span-2 border-t border-border/50 pt-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              {isEn ? "Order created at:" : "تاريخ إنشاء طلب الشحن:"}
            </span>
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
              <dd className="num text-xs sm:text-sm break-all text-primary font-semibold mt-1 font-mono">{d.address}</dd>
            </div>
          </div>
        </dl>

        {d.receiptUrl && (
          <div className="rounded-2xl border border-border/60 bg-background/30 p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>{isEn ? "Attached Transfer Receipt Image:" : "صورة وصل التحويل المرفقة:"}</span>
            </p>
            <a href={d.receiptUrl} target="_blank" rel="noreferrer" data-testid="link-pending-receipt" className="inline-block mt-1">
              <img src={d.receiptUrl} alt="Receipt" className="max-h-60 rounded-xl border border-border object-contain shadow-sm hover:opacity-90 transition-opacity" />
            </a>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <button type="button" data-testid="button-cancel-pending-deposit" onClick={() => setConfirmCancel(true)} disabled={cancel.isPending} className="btn-ghost flex items-center justify-center gap-2 w-full py-2.5 text-sm text-[hsl(4_80%_76%)] hover:bg-destructive/10 cursor-pointer">
            <XCircle className="h-4 w-4" /> {isEn ? "Cancel Recharge Order" : "إلغاء طلب الشحن"}
          </button>
        </div>

        <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <AlertDialogContent className="glass-strong border-border bg-transparent">
            <AlertDialogHeader className={isEn ? "text-left sm:text-left" : "text-right sm:text-right"}>
              <AlertDialogTitle className="font-display">{isEn ? "Cancel Recharge Order?" : "إلغاء طلب الشحن؟"}</AlertDialogTitle>
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

  // Awaiting receipt state
  return (
    <div className="space-y-4">
      <div data-testid="card-deposit-order" className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-xl font-semibold">{isEn ? "Transfer Exact USDT Amount" : "حوّل المبلغ المطلوب للمحفظة"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{isEn ? "Polygon Network (USDT)" : "على شبكة Polygon (POL)"}</p>
          </div>
          <StatusPill status={d.status} />
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-background/30 p-4 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">{isEn ? "Recharge Amount to Transfer" : "مبلغ الشحن المطلوب تحويله"}</p>
            <div className="flex items-center justify-between gap-3">
              <p data-testid="text-deposit-amount" className="num font-display text-3xl sm:text-4xl gold-text font-bold">{d.amount} <span className="text-sm font-normal text-muted-foreground">USDT</span></p>
              <CopyBtn text={String(d.amount)} id="amount" />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {isEn ? `Receiving Wallet Address · ${channelAr[d.channel] ?? d.channel}` : `عنوان المحفظة المعتمد · ${channelAr[d.channel] ?? d.channel}`}
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
                  {isEn ? "Scan QR code or copy official address below:" : "امسح الباركود للتحويل أو انسخ العنوان أدناه:"}
                </span>
                <p data-testid="text-deposit-address" className="num break-all text-xs sm:text-sm font-semibold text-primary select-all bg-background/20 p-2.5 rounded-xl border border-border/40 leading-relaxed font-mono">{d.address}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <CopyBtn text={d.address} id="address" />
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent shrink-0" />
                    {isEn ? "Official verified IRTIQA wallet" : "عنوان رسمي ومعتمد في ارتقاء"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
            <span className="text-muted-foreground">
              {d.planName}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
              {isEn ? "Order created at: " : "تاريخ إنشاء الطلب: "}
              <strong className="font-semibold text-foreground">{formatDate(d.createdAt, lang, true)}</strong>
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[hsl(12_60%_66%/.3)] bg-[hsl(12_60%_66%/.06)] p-4 text-xs sm:text-sm text-[hsl(12_70%_80%)] space-y-1.5 leading-relaxed">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />{isEn ? "Important Transfer Notice" : "تنبيهات هامة قبل التحويل"}</p>
          <p>{isEn ? "Send USDT exclusively on Polygon (POL) network. Any other asset or network cannot be recovered." : "أرسل عملة USDT فقط وعلى شبكة Polygon (POL) فقط. أي تحويل لعملة أخرى أو شبكة مختلفة قد يضيع."}</p>
          <p>{isEn ? "Account for your exchange withdrawal fee so the full exact amount reaches the destination." : "احتسب رسوم السحب من منصتك بحيث يصل المبلغ كاملاً."}</p>
        </div>
      </div>

      <form onSubmit={submit} className="glass rounded-3xl p-4 space-y-4 sm:p-7">
        <h3 className="font-display font-medium text-base">{isEn ? "After Transfer: Upload Receipt Image" : "بعد التحويل: أرفق صورة إيصال التحويل"}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isEn
            ? "Attach a screenshot or receipt of your transaction to speed up review and account crediting."
            : "أرفق لقطة شاشة لإشعار التحويل من محفظتك أو منصتك لتسريع التحقق وإضافة الرصيد لحسابك فوراً."}
        </p>
        <input ref={fileRef} type="file" accept="image/*,image/png,image/jpeg,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid="input-receipt-file" />
        <button
          type="button"
          data-testid="button-pick-receipt"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground hover:bg-[hsl(40_40%_90%/.03)] cursor-pointer"
        >
          <Upload className="h-4 w-4 text-primary" />
          {file ? <span className="text-foreground font-semibold">{file.name} · <span className="num">{(file.size / 1024 / 1024).toFixed(2)} MB</span></span> : (isEn ? "Choose receipt image (PNG / JPEG / WebP up to 5MB)" : "اختر صورة الإيصال (PNG / JPEG / WebP حتى 5MB)")}
        </button>
        {err && <p data-testid="text-proof-error" className="text-sm text-[hsl(4_80%_76%)]">{err}</p>}
        <button data-testid="button-submit-proof" disabled={busy} className="btn-gold w-full py-3.5 font-semibold text-sm cursor-pointer shadow-md">
          {uploading ? (isEn ? "Uploading image..." : "جارٍ رفع الصورة...") : proof.isPending ? (isEn ? "Submitting..." : "جارٍ الإرسال...") : (isEn ? "Submit Receipt for Review" : "إرسال الإيصال للمراجعة والاعتماد")}
        </button>
        <button type="button" data-testid="button-cancel-deposit" onClick={() => setConfirmCancel(true)} disabled={busy || cancel.isPending} className="btn-ghost w-full py-2.5 text-sm text-muted-foreground cursor-pointer">
          {isEn ? "Cancel Recharge Order" : "إلغاء الطلب"}
        </button>
      </form>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent className="glass-strong border-border bg-transparent">
          <AlertDialogHeader className={isEn ? "text-left sm:text-left" : "text-right sm:text-right"}>
            <AlertDialogTitle className="font-display">{isEn ? "Cancel Recharge Order?" : "إلغاء طلب الشحن؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEn
                ? "If you have already transferred funds, do NOT cancel. Instead, upload the receipt or contact support first."
                : "إذا كنت قد حوّلت المبلغ بالفعل فلا تلغِ الطلب، بل ارفع الإيصال لضمان مراجعة الإدارة واحتساب أموالك."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-row-reverse sm:justify-start">
            <AlertDialogAction data-testid="button-confirm-cancel" className="btn-gold border-0" disabled={cancel.isPending} onClick={(e) => { e.preventDefault(); cancel.mutate({ id: d.id }); }}>
              {cancel.isPending ? (isEn ? "Cancelling..." : "جارٍ الإلغاء...") : (isEn ? "I haven't transferred, Cancel Order" : "لم أحوّل بعد، ألغِ الطلب")}
            </AlertDialogAction>
            <AlertDialogCancel data-testid="button-keep-deposit" className="btn-ghost bg-transparent">{isEn ? "Keep Order" : "تراجع"}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
