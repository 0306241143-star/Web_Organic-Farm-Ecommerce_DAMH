import { useEffect } from "react";
import { ExternalLink, FileText, X } from "lucide-react";

export default function MediaViewer({ media, onClose }) {
  useEffect(() => {
    if (!media) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [media, onClose]);

  if (!media?.url) return null;

  const isPdf = media.type === "pdf";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-viewer-title"
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-4 bg-[#064e2e] px-4 py-3.5 text-white sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-200">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="media-viewer-title"
                className="truncate text-sm font-extrabold sm:text-base"
              >
                {media.title || "Xem hồ sơ"}
              </h2>
              {media.subtitle && (
                <p className="mt-0.5 truncate text-xs text-emerald-100/80">
                  {media.subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Đóng trình xem"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-emerald-100 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#f0f2ef] p-2 sm:p-5">
          {isPdf ? (
            <iframe
              title={media.title || "Tài liệu PDF"}
              src={media.url}
              className="h-[72vh] min-h-[360px] w-full rounded-xl border border-[#dfe5dc] bg-white sm:h-[76vh]"
            />
          ) : (
            <img
              src={media.url}
              alt={media.title || "Hình ảnh chứng nhận"}
              className="max-h-[78vh] max-w-full rounded-xl object-contain shadow-sm"
            />
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[#e7ece4] bg-white px-4 py-3 sm:px-6">
          <p className="hidden min-w-0 truncate text-xs text-[#778272] sm:block">
            {isPdf ? "Bản xem trước PDF" : "Bản xem trước hình ảnh"}
          </p>
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#075b25] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#00450d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18823a] focus-visible:ring-offset-2"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Mở tệp gốc
          </a>
        </footer>
      </section>
    </div>
  );
}
