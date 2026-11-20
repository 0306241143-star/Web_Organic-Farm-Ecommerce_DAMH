/* Thẻ hiển thị sản phẩm nông sản: hình ảnh, giá bán, ưu đãi, chứng nhận, tồn kho và mã QR truy xuất. */
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
    return { Icon: Apple, accent: "from-emerald-50 to-lime-50/70 text-[#006e1c]" };
  }
  if (normalized.includes("củ")) {
    return { Icon: Carrot, accent: "from-amber-50/70 to-emerald-50/60 text-[#00450d]" };
  }
  if (normalized.includes("gia vị") || normalized.includes("thảo mộc")) {
    return { Icon: Sprout, accent: "from-teal-50/70 to-emerald-50 text-[#006e1c]" };
  }
  return { Icon: Leaf, accent: "from-[#f2f4f2] to-emerald-50/80 text-[#00450d]" };
}

/* ================= THÀNH PHẦN CON 1: KHUNG ẢNH SẢN PHẨM & NHÃN NỔI ================= */
function ProductMediaBox({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(product?.image_url) && !imageFailed;
  const primaryStandard = product?.certification_standards?.[0] || "";
  const { Icon: FallbackIcon, accent } = pickCategoryVisual(product?.category?.name);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#f2f4f2] border border-[#c0c9bb]/25">
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
            className={`w-full h-full bg-gradient-to-br ${accent} flex flex-col items-center justify-center p-5 text-center transition-transform duration-500 group-hover:scale-[1.03]`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white/85 border border-[#c0c9bb]/35 shadow-2xs flex items-center justify-center mb-2.5">
              <FallbackIcon className="w-7 h-7" aria-hidden="true" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#41493e]/80 line-clamp-1">
              {product?.category?.name || "Nông sản hữu cơ"}
            </span>
          </div>
        )}
      </Link>

      {/* Góc trên bên trái: Nhãn giảm giá Flash Sale và Chứng nhận chất lượng */}
      <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 max-w-[78%]">
        {product.is_flash_sale && product.discount_percent > 0 && (
          <Badge variant="flash" size="xs" icon={Flame}>
            -{product.discount_percent}%
          </Badge>
        )}
        {primaryStandard && (
          <Badge variant="surface" size="xs" icon={ShieldCheck}>
            {primaryStandard}
          </Badge>
        )}
      </div>

      {/* Góc trên bên phải: Liên kết trực tiếp truy xuất nguồn gốc QR */}
      {product.trace_qr_code && (
        <Link
          to={`/trace/${encodeURIComponent(product.trace_qr_code)}`}
          title={`Truy xuất nguồn gốc mã ${product.trace_qr_code}`}
          aria-label={`Truy xuất nguồn gốc ${product.name}`}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl bg-white/95 hover:bg-[#00450d] text-[#00450d] hover:text-white border border-[#c0c9bb]/40 shadow-xs flex items-center justify-center transition-colors"
        >
          <QrCode className="w-4 h-4" />
        </Link>
      )}

      {/* Góc dưới bên trái: Ngày thu hoạch gần nhất */}
      {product.in_stock && product.latest_harvest_date && (
        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-white/92 backdrop-blur-xs border border-[#c0c9bb]/35 text-[11px] font-semibold text-[#41493e] tabular-nums">
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
    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 tabular-nums">
      <span
        className={`text-[18px] font-extrabold tracking-tight ${
          isSale ? "text-orange-600" : "text-[#00450d]"
        }`}
      >
        {formatCurrencyVnd(effectivePrice)}
      </span>
      <span className="text-[12px] font-medium text-[#5a6357]">
        / {product.unit || "kg"}
      </span>
      {isSale && product.price > effectivePrice && (
        <span className="text-[12px] font-medium text-[#5a6357] line-through">
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
    <div className="mt-4 pt-3.5 border-t border-[#c0c9bb]/25 flex items-center justify-between gap-2">
      <div className="min-w-0">
        {inStock ? (
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#006e1c] tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Còn {formattedQty} {product.unit || "kg"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5a6357]">
            <PackageX className="w-3.5 h-3.5 shrink-0 text-[#5a6357]" />
            <span className="truncate">Tạm hết hàng</span>
          </div>
        )}
        {product.active_batches_count > 0 && product.nearest_expiry_date && (
          <p className="text-[11px] text-[#5a6357] mt-0.5 tabular-nums truncate">
            HSD {formatShortDate(product.nearest_expiry_date)}
          </p>
        )}
      </div>

      {isInternalStaff ? (
        <span className="shrink-0 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-[11px] font-bold">
          Chế độ xem nội bộ
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
          className={`shrink-0 min-w-[38px] min-h-[38px] px-3 rounded-xl text-[12.5px] font-bold inline-flex items-center justify-center gap-1.5 transition-all ${
            isAdding
              ? "bg-[#eceeec] text-[#5a6357] cursor-wait"
              : inStock
              ? "bg-[#00450d] hover:bg-[#006e1c] text-white shadow-2xs cursor-pointer"
              : "bg-[#eceeec] text-[#5a6357] cursor-not-allowed"
          }`}
        >
          {isAdding ? (
            <span role="status">Đang thêm...</span>
          ) : (
            <>
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{inStock ? "Thêm" : "Hết hàng"}</span>
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
    <div className="rounded-3xl bg-white border border-[#c0c9bb]/30 p-3.5 animate-pulse">
      <div className="aspect-[4/3] w-full rounded-2xl bg-[#eceeec]" />
      <div className="mt-3.5 space-y-2.5 px-1">
        <div className="h-3 w-24 rounded-full bg-[#eceeec]" />
        <div className="h-4.5 w-4/5 rounded-lg bg-[#e6e9e7]" />
        <div className="h-3.5 w-full rounded-lg bg-[#f2f4f2]" />
        <div className="h-5 w-28 rounded-lg bg-[#e6e9e7] mt-2" />
        <div className="pt-3 mt-3 border-t border-[#eceeec] flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-[#eceeec]" />
          <div className="h-9 w-20 rounded-xl bg-[#e6e9e7]" />
        </div>
      </div>
    </div>
  );
}

/* ================= THÀNH PHẦN CHÍNH: THẺ SẢN PHẨM ================= */
export default function ProductCard({ product, onAddToCart = null }) {
  const { addItem } = useCart();
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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

    // Khớp với quyền backend: chỉ khách hàng đăng nhập mới được lưu giỏ vào tài khoản.
    if (!user) {
      navigate("/login", { state: { from: location } });
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
    <article className="group flex flex-col rounded-3xl bg-white border border-[#c0c9bb]/35 p-3.5 shadow-2xs hover:shadow-xl hover:border-[#006e1c]/35 hover:-translate-y-0.5 transition-all duration-200">
      <ProductMediaBox product={product} />

      <div className="flex-1 flex flex-col px-1 pt-3.5">
        {product.category?.name && (
          <Link
            to={`/products?category=${product.category.id}`}
            className="text-[11.5px] font-bold uppercase tracking-wider text-[#006e1c] hover:text-[#00450d] transition-colors truncate"
          >
            {product.category.name}
          </Link>
        )}

        <Link
          to={`/products/${product.id}`}
          className="mt-1 text-[16px] font-bold text-[#191c1b] group-hover:text-[#00450d] leading-snug line-clamp-2 transition-colors"
        >
          {product.name}
        </Link>

        {product.description && (
          <p className="mt-1.5 text-[13px] text-[#5a6357] leading-relaxed line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-3">
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
