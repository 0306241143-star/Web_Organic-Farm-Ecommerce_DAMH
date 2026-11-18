/* System-wide top-center floating toast notifications and confirm dialog manager. */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

const MAX_TOASTS = 3;

const VARIANT_STYLES = {
  success: {
    container: "bg-white/95 border-emerald-200/90 text-slate-800 shadow-lg shadow-emerald-950/10",
    iconWrap: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
    bar: "bg-emerald-500",
    Icon: CheckCircle2,
    role: "status",
  },
  error: {
    container: "bg-white/95 border-red-200/90 text-slate-800 shadow-lg shadow-red-950/10",
    iconWrap: "bg-red-50 text-red-600 border border-red-200/80",
    bar: "bg-red-500",
    Icon: AlertCircle,
    role: "alert",
  },
  warning: {
    container: "bg-white/95 border-amber-200/90 text-slate-800 shadow-lg shadow-amber-950/10",
    iconWrap: "bg-amber-50 text-amber-600 border border-amber-200/80",
    bar: "bg-amber-500",
    Icon: AlertTriangle,
    role: "status",
  },
  info: {
    container: "bg-white/95 border-slate-200/90 text-slate-800 shadow-lg shadow-slate-900/10",
    iconWrap: "bg-slate-100 text-slate-700 border border-slate-200",
    bar: "bg-slate-600",
    Icon: Info,
    role: "status",
  },
};

const CONFIRM_STYLES = {
  danger: {
    iconWrap: "bg-red-50 text-red-600 border border-red-200/80",
    confirmBtn: "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20",
    Icon: AlertCircle,
  },
  warning: {
    iconWrap: "bg-amber-50 text-amber-600 border border-amber-200/80",
    confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20",
    Icon: AlertTriangle,
  },
  primary: {
    iconWrap: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
    confirmBtn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20",
    Icon: CheckCircle2,
  },
};

/**
 * Kích hoạt thông báo nổi dùng chung toàn hệ thống (hiển thị tại top-giữa màn hình).
 * @param {string} message Nội dung thông báo
 * @param {"success"|"error"|"warning"|"info"} type Loại thông báo
 * @param {{ title?: string, duration?: number }} options Tùy chọn bổ sung
 */
export function showGlobalToast(message, type = "success", options = {}) {
  if (!message || typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app:toast", {
      detail: {
        type,
        message: String(message),
        title: options.title || "",
        duration: options.duration,
      },
    })
  );
}

/**
 * Mở hộp thoại xác nhận nổi dùng chung toàn hệ thống (thay thế hoàn toàn window.confirm của trình duyệt).
 * @param {{ title?: string, message: string, confirmLabel?: string, cancelLabel?: string, variant?: "danger"|"warning"|"primary" }} options
 * @returns {Promise<boolean>}
 */
export function confirmGlobalDialog(options) {
  if (typeof window === "undefined") return Promise.resolve(false);
  const config =
    typeof options === "string" ? { message: options } : options || {};

  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent("app:confirm", {
        detail: {
          title: config.title || "Xác nhận thao tác",
          message: config.message || "",
          confirmLabel: config.confirmLabel || "Xác nhận",
          cancelLabel: config.cancelLabel || "Hủy bỏ",
          variant: CONFIRM_STYLES[config.variant] ? config.variant : "primary",
          resolve,
        },
      })
    );
  });
}

export default function GlobalToast() {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id, duration) => {
      const existingTimer = timersRef.current.get(id);
      if (existingTimer) clearTimeout(existingTimer);
      const timer = setTimeout(() => {
        dismissToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  const settleConfirm = useCallback((accepted) => {
    setConfirmState((current) => {
      if (current?.resolve) {
        current.resolve(accepted);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    const timersMap = timersRef.current;

    const handleToastEvent = (e) => {
      const detail = e.detail || {};
      const message = typeof detail.message === "string" ? detail.message.trim() : "";
      if (!message) return;

      const type = VARIANT_STYLES[detail.type] ? detail.type : "success";
      const duration =
        typeof detail.duration === "number" && detail.duration > 0
          ? detail.duration
          : type === "error"
            ? 5000
            : 3800;
      const title = detail.title || "";

      setToasts((prev) => {
        const duplicate = prev.find((t) => t.message === message && t.type === type);
        if (duplicate) {
          scheduleDismiss(duplicate.id, duration);
          return prev;
        }

        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        scheduleDismiss(id, duration);

        const next = [{ id, type, title, message, duration }, ...prev];
        if (next.length > MAX_TOASTS) {
          const removed = next.slice(MAX_TOASTS);
          removed.forEach((item) => {
            const t = timersMap.get(item.id);
            if (t) {
              clearTimeout(t);
              timersMap.delete(item.id);
            }
          });
          return next.slice(0, MAX_TOASTS);
        }
        return next;
      });
    };

    const handleConfirmEvent = (e) => {
      const detail = e.detail || {};
      setConfirmState((prev) => {
        if (prev?.resolve) {
          prev.resolve(false);
        }
        return detail;
      });
    };

    window.addEventListener("app:toast", handleToastEvent);
    window.addEventListener("app:confirm", handleConfirmEvent);
    return () => {
      window.removeEventListener("app:toast", handleToastEvent);
      window.removeEventListener("app:confirm", handleConfirmEvent);
      timersMap.forEach((timer) => clearTimeout(timer));
      timersMap.clear();
    };
  }, [scheduleDismiss]);

  // Nhấn Escape để đóng hộp thoại xác nhận
  useEffect(() => {
    if (!confirmState) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        settleConfirm(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmState, settleConfirm]);

  const confirmStyle = confirmState
    ? CONFIRM_STYLES[confirmState.variant] || CONFIRM_STYLES.primary
    : null;
  const ConfirmIcon = confirmStyle?.Icon;

  return (
    <>
      {/* Thông báo nổi Top-Center dùng chung toàn hệ thống */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-relevant="additions removals"
          className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-[110] w-[calc(100%-1.5rem)] max-w-md pointer-events-none flex flex-col items-center gap-2"
        >
          {toasts.map((toast) => {
            const variant = VARIANT_STYLES[toast.type] || VARIANT_STYLES.success;
            const Icon = variant.Icon;

            return (
              <div
                key={toast.id}
                role={variant.role}
                onMouseEnter={() => {
                  const t = timersRef.current.get(toast.id);
                  if (t) {
                    clearTimeout(t);
                    timersRef.current.delete(toast.id);
                  }
                }}
                onMouseLeave={() => scheduleDismiss(toast.id, 2200)}
                className={`pointer-events-auto relative w-fit max-w-full min-w-[240px] sm:min-w-[300px] backdrop-blur-md border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200 ${variant.container}`}
              >
                <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${variant.iconWrap}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {toast.title && (
                      <p className="text-xs font-bold text-slate-900 leading-tight mb-0.5 break-words">
                        {toast.title}
                      </p>
                    )}
                    <p className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-snug break-words">
                      {toast.message}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    aria-label="Đóng thông báo"
                    title="Đóng thông báo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className={`h-0.5 w-full opacity-80 ${variant.bar}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Hộp thoại xác nhận Top-Center dùng chung toàn hệ thống (thay thế window.confirm) */}
      {confirmState && confirmStyle && ConfirmIcon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-confirm-title"
          className="fixed inset-0 z-[120] bg-slate-900/45 backdrop-blur-[2px] flex items-start justify-center pt-10 sm:pt-16 px-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) settleConfirm(false);
          }}
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${confirmStyle.iconWrap}`}
              >
                <ConfirmIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="global-confirm-title"
                  className="text-sm sm:text-base font-extrabold text-slate-800 leading-snug"
                >
                  {confirmState.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line break-words">
                  {confirmState.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => settleConfirm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Đóng hộp thoại xác nhận"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3.5 sm:px-6 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => settleConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => settleConfirm(true)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${confirmStyle.confirmBtn}`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
