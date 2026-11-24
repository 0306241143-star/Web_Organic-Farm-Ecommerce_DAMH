/* Thẻ hiển thị sản phẩm nông sản: tối ưu tỷ lệ hiển thị 2 cột trên mobile và 4 cột trên desktop. */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Apple,
  Carrot,
  CheckCircle2,
  Flame,
  Leaf,
  PackageX,
  Plus,
  QrCode,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import Badge from "../common/Badge";
import { showGlobalToast } from "../GlobalToast";
import { useCart } from "../../context/useCart";
import { useAuth } from "../../context/useAuth";
import { formatCurrencyVnd } from "../../services/publicApi";
import { notifyApiErrorToast } from "../../services/axiosClient";

function formatShortDate(isoDate) {
  if (!isoDate) return "";
  const parts = String(isoDate).slice(0, 10).split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

function pickCategoryVisual(categoryName = "") {
  const normalized = String(categoryName).toLowerCase();
  if (normalized.includes("trái cây") || normalized.includes("quả")) {
    return {
      Icon: Apple,
      accent: "from-emerald-50 via-lime-50/60 to-emerald-100/40 text-[#006e1c]",
    };
  }
  if (normalized.includes("củ")) {
    return {
      Icon: Carrot,
      accent: "from-amber-50/70 via-emerald-50/50 to-lime-50/60 text-[#00450d]",
    };
  }
  if (normalized.includes("gia vị") || normalized.includes("thảo mộc")) {
    return {
      Icon: Sprout,
      accent: "from-teal-50/70 via-emerald-50/70 to-lime-50/50 text-[#006e1c]",
    };
  }
  return {
    Icon: Leaf,
    accent: "from-[#f2f4f2] via-emerald-50/70 to-lime-50/50 text-[#00450d]",
  };
}

/* ================= THÀNH PHẦN CON 1: KHUNG ẢNH SẢN PHẨM & NHÃN NỔI ================= */
function ProductMediaBox({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(product?.image_url) && !imageFailed;
  const primaryStandard = product?.certification_standards?.[0] || "";
  const { Icon: FallbackIcon, accent } = pickCategoryVisual(product?.category?.name);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:rounded-2xl bg-[#f2f4f2] border border-[#c0c9bb]/25">
      <Link
        to={`/products/${product.id}`}
        className="block w-full h-full focus:outline-none"
        aria-label={`Xem chi tiết ${product.name}`}
      >
        {showImage ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${accent} flex flex-col items-center justify-center p-3 sm:p-4 text-center transition-transform duration-500 group-hover:scale-[1.03]`}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/90 border border-[#c0c9bb]/40 shadow-2xs flex items-center justify-center mb-1.5 sm:mb-2">
              <FallbackIcon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            </div>
            <span className="text-[9.5px] sm:text-[10.5px] font-extrabold uppercase tracking-wider text-[#41493e]/80 line-clamp-1">
              {product?.category?.name || "Nông sản hữu cơ"}
            </span>
          </div>
        )}
      </Link>

      {/* Góc trên bên trái: Nhãn giảm giá Flash Sale và Chứng nhận chất lượng */}
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-wrap items-center gap-1 max-w-[75%]">
        {product.is_flash_sale && product.discount_percent > 0 && (
          <Badge variant="flash" size="xs" icon={Flame}>
            -{product.discount_percent}%
          </Badge>
        )}
        {primaryStandard && (
          <Badge variant="surface" size="xs" icon={ShieldCheck}>
            <span className="truncate max-w-[85px] sm:max-w-none">{primaryStandard}</span>
          </Badge>
        )}
      </div>

      {/* Góc trên bên phải: Liên kết trực tiếp truy xuất nguồn gốc QR */}
      {product.trace_qr_code && (
        <Link
          to={`/trace/${encodeURIComponent(product.trace_qr_code)}`}
          title={`Truy xuất nguồn gốc mã ${product.trace_qr_code}`}
          aria-label={`Truy xuất nguồn gốc ${product.name}`}
          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/95 hover:bg-[#00450d] text-[#00450d] hover:text-white border border-[#c0c9bb]/40 shadow-xs flex items-center justify-center transition-colors"
        >
          <QrCode className="w-3.5 h-3.5" />
        </Link>
      )}

      {/* Góc dưới bên trái: Ngày thu hoạch gần nhất */}
      {product.in_stock && product.latest_harvest_date && (
        <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 px-2 py-0.5 rounded-full bg-white/92 backdrop-blur-xs border border-[#c0c9bb]/35 text-[9.5px] sm:text-[10.5px] font-semibold text-[#41493e] tabular-nums shadow-2xs">
          Thu hoạch {formatShortDate(product.latest_harvest_date)}
        </div>
      )}
    </div>
  );
}

/* ================= THÀNH PHẦN CON 2: HIỂN THỊ GIÁ BÁN & ĐƠN VỊ TÍNH ================= */
function ProductPriceDisplay({ product }) {
  const isSale = Boolean(product.is_flash_sale);
  const effectivePrice = product.effective_price ?? product.price;

  return (
    <div className="flex items-baseline flex-wrap gap-x-1 gap-y-0.5 tabular-nums">
      <span
        className={`text-[15px] sm:text-[17px] font-extrabold tracking-tight ${isSale ? "text-orange-600" : "text-[#00450d]"
          }`}
      >
        {formatCurrencyVnd(effectivePrice)}
      </span>
      <span className="text-[11px] sm:text-[11.5px] font-medium text-[#5a6357]">
        / {product.unit || "kg"}
      </span>
      {isSale && product.price > effectivePrice && (
        <span className="text-[10.5px] sm:text-[11.5px] font-medium text-[#5a6357] line-through">
          {formatCurrencyVnd(product.price)}
        </span>
      )}
    </div>
  );
}

/* ================= THÀNH PHẦN CON 3: TÌNH TRẠNG TỒN KHO & NÚT THÊM GIỎ HÀNG ================= */
function ProductStockFooter({ product, onQuickAdd, isInternalStaff, isAdding }) {
  const inStock = Boolean(product.in_stock);
  const stockQty = Number(product.available_stock || 0);
  const formattedQty = Number.isInteger(stockQty)
    ? stockQty.toLocaleString("vi-VN")
    : stockQty.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

  return (
    <div className="mt-2 sm:mt-2.5 pt-2 sm:pt-2.5 border-t border-[#c0c9bb]/25 flex items-center justify-between gap-1.5">
      <div className="min-w-0">
        {inStock ? (
          <div className="flex items-center gap-1 text-[10.5px] sm:text-[11.5px] font-semibold text-[#006e1c] tabular-nums">
            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">
              Còn {formattedQty} {product.unit || "kg"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10.5px] sm:text-[11.5px] font-semibold text-[#5a6357]">
            <PackageX className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-[#5a6357]" />
            <span className="truncate">Tạm hết</span>
          </div>
        )}
        {product.active_batches_count > 0 && product.nearest_expiry_date ? (
          <p className="text-[10px] sm:text-[10.5px] text-[#5a6357] mt-0.5 tabular-nums truncate">
            HSD {formatShortDate(product.nearest_expiry_date)}
          </p>
        ) : (
          <p className="text-[10px] text-transparent select-none mt-0.5">—</p>
        )}
      </div>

      {isInternalStaff ? (
        <span className="shrink-0 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-bold">
          Nội bộ
        </span>
      ) : (
        <button
          type="button"
          disabled={!inStock || isAdding}
          onClick={() => onQuickAdd(product)}
          aria-label={
            isAdding
              ? `Đang thêm ${product.name} vào giỏ hàng`
              : inStock
                ? `Thêm ${product.name} vào giỏ hàng`
                : `${product.name} hiện tạm hết hàng`
          }
          className={`shrink-0 h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-[12px] font-bold inline-flex items-center justify-center gap-0.5 sm:gap-1 transition-all ${isAdding
              ? "bg-[#eceeec] text-[#5a6357] cursor-wait"
              : inStock
                ? "bg-[#00450d] hover:bg-[#006e1c] text-white shadow-2xs cursor-pointer"
                : "bg-[#eceeec] text-[#5a6357] cursor-not-allowed"
            }`}
        >
          {isAdding ? (
            <span role="status">...</span>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>{inStock ? "Thêm" : "Hết"}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ================= KHUNG CHỜ TẢI DỮ LIỆU (SKELETON) CHO THẺ SẢN PHẨM ================= */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-[#c0c9bb]/35 p-2.5 sm:p-3 animate-pulse">
      <div className="aspect-[4/3] w-full rounded-xl sm:rounded-2xl bg-[#eceeec]" />
      <div className="mt-2.5 sm:mt-3 space-y-2 px-0.5">
        <div className="h-2.5 w-16 rounded-full bg-[#eceeec]" />
        <div className="h-4 w-4/5 rounded-lg bg-[#e6e9e7]" />
        <div className="hidden sm:block h-3 w-full rounded-lg bg-[#f2f4f2]" />
        <div className="h-4.5 w-24 rounded-lg bg-[#e6e9e7] mt-1.5" />
        <div className="pt-2 mt-2 border-t border-[#eceeec] flex items-center justify-between">
          <div className="h-3.5 w-16 rounded bg-[#eceeec]" />
          <div className="h-7.5 w-14 rounded-xl bg-[#e6e9e7]" />
        </div>
      </div>
    </div>
  );
}

/* ================= THÀNH PHẦN CHÍNH: THẺ SẢN PHẨM ================= */
export default function ProductCard({ product, onAddToCart = null }) {
  const { addItem } = useCart();
  const { user, openLoginModal } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const isInternalStaff = Boolean(
    user && ["admin", "farm_staff", "sales"].includes(user.role)
  );

  if (!product) return null;

  const handleQuickAdd = async (item) => {
    if (isAdding) return;
    if (isInternalStaff) {
      showGlobalToast(
        "Tài khoản nội bộ chỉ có quyền xem danh mục, không thể thực hiện mua hàng.",
        "warning"
      );
      return;
    }

    if (!item.in_stock) return;

    if (!user) {
      openLoginModal();
      showGlobalToast("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.", "info");
      return;
    }
    if (user.role !== "customer") {
      showGlobalToast("Chỉ tài khoản khách hàng mới có thể mua sản phẩm.", "warning");
      return;
    }

    setIsAdding(true);
    try {
      if (typeof onAddToCart === "function") {
        await onAddToCart(item);
      } else {
        await addItem(item);
        showGlobalToast(`Đã thêm "${item.name}" vào giỏ hàng.`, "success");
      }
    } catch (error) {
      notifyApiErrorToast(error, "Không thể thêm sản phẩm vào giỏ hàng.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="group flex flex-col rounded-2xl bg-white border border-[#c0c9bb]/40 p-2.5 sm:p-3 shadow-2xs hover:shadow-lg hover:border-[#006e1c]/40 hover:-translate-y-0.5 transition-all duration-200">
      <ProductMediaBox product={product} />

      <div className="flex-1 flex flex-col px-0.5 pt-2.5 sm:pt-3">
        {product.category?.name && (
          <Link
            to={`/products?category=${product.category.id}`}
            className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-[#006e1c] hover:text-[#00450d] transition-colors truncate"
          >
            {product.category.name}
          </Link>
        )}

        <Link
          to={`/products/${product.id}`}
          className="mt-0.5 sm:mt-1 text-[13.5px] sm:text-[15px] font-extrabold text-[#191c1b] group-hover:text-[#00450d] leading-snug line-clamp-2 min-h-[37px] sm:min-h-[41px] transition-colors"
        >
          {product.name}
        </Link>

        {product.description && (
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[2.4rem]">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-2 sm:pt-2.5">
          <ProductPriceDisplay product={product} />
          <ProductStockFooter
            product={product}
            onQuickAdd={handleQuickAdd}
            isInternalStaff={isInternalStaff}
            isAdding={isAdding}
          />
        </div>
      </div>
    </article>
  );
}