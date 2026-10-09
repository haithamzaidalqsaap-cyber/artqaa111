import { CheckCircle2, AlertCircle, Bell } from 'lucide-react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="shrink-0 mt-0.5">
                {variant === 'destructive' ? (
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-destructive/20 text-[hsl(4_80%_76%)] border border-destructive/30">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                ) : variant === 'success' ? (
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-accent/20 text-accent border border-accent/30">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-[hsl(40_62%_68%/.15)] text-primary border border-[hsl(40_62%_68%/.25)]">
                    <Bell className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="grid gap-1 flex-1 min-w-0 text-right">
                {title && <ToastTitle className="font-display font-medium text-sm leading-tight text-foreground">{title}</ToastTitle>}
                {description && (
                  <ToastDescription className="text-xs text-muted-foreground leading-relaxed">{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
