/* Thư viện hình ảnh chi tiết sản phẩm: hỗ trợ chuyển qua lại nhiều ảnh và chọn thumbnail. */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Leaf, QrCode } from "lucide-react";

export default function ProductDetailGallery({ product }) {
  const imageList = useMemo(() => {
    const raw = [];
    if (Array.isArray(product?.images)) {
      for (const item of product.images) {
        const url = typeof item === "string" ? item : item?.url;
        if (url) raw.push(url);
      }
    }
    if (product?.image_url) {
      raw.unshift(product.image_url);
    }
    return [...new Set(raw)];
  }, [product]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState(() => new Set());

  useEffect(() => {
    setActiveIndex(0);
    setFailedUrls(new Set());
  }, [product?.id]);

  const validImages = imageList.filter((url) => !failedUrls.has(url));
  const safeIndex = validImages.length > 0 ? Math.min(activeIndex, validImages.length - 1) : 0;
  const currentUrl = validImages[safeIndex] || "";
  const hasMultiple = validImages.length > 1;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % validImages.length);
  };

  return (
    <div className="space-y-3">
      {/* Khung ảnh chính */}
      <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#c0c9bb]/35 bg-[#f2f4f2]">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={`${product.name} - ảnh ${safeIndex + 1}`}
            onError={() =>
              setFailedUrls((prev) => {
                const next = new Set(prev);
                next.add(currentUrl);
                return next;
              })
            }
            className="h-full w-full object-cover transition-all duration-200"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-50 to-lime-50 text-[#006e1c]">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-[#c0c9bb]/35 bg-white/85">
              <Leaf className="h-10 w-10" aria-hidden="true" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">
              {product.category?.name || "Nông sản sạch"}
            </span>
          </div>
        )}

        {/* Nút điều hướng trái / phải khi có nhiều ảnh */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-[#c0c9bb]/50 bg-white/90 text-[#191c1b] shadow-sm opacity-90 hover:bg-[#00450d] hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Ảnh tiếp theo"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-[#c0c9bb]/50 bg-white/90 text-[#191c1b] shadow-sm opacity-90 hover:bg-[#00450d] hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <span className="absolute bottom-3 right-3 rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white tabular-nums">
              {safeIndex + 1} / {validImages.length}
            </span>
          </>
        )}

        {product.trace_qr_code && (
          <Link
            to={`/trace/${encodeURIComponent(product.trace_qr_code)}`}
            title={`Truy xuất nguồn gốc mã ${product.trace_qr_code}`}
            aria-label={`Truy xuất nguồn gốc ${product.name}`}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-[#c0c9bb]/40 bg-white/95 text-[#00450d] shadow-xs transition-colors hover:bg-[#00450d] hover:text-white"
          >
            <QrCode className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Dải ảnh thu nhỏ (Thumbnails) bên dưới */}
      {hasMultiple && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {validImages.map((url, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Xem ảnh ${idx + 1}`}
                className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-2 border-[#00450d] ring-2 ring-[#00450d]/20 opacity-100"
                    : "border-[#c0c9bb]/50 opacity-65 hover:opacity-100"
                }`}
              >
                <img
                  src={url}
                  alt={`${product.name} thu nhỏ ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}