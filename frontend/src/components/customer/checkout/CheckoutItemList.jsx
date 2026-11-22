/* Cột trái trang thanh toán: danh sách nông sản đặt mua (chỉ cuộn khi vượt chiều cao màn hình). */
import { useState } from "react";
import { Apple, Carrot, Leaf, ShoppingBag, Sprout } from "lucide-react";
import { formatCurrencyVnd } from "../../../services/publicApi";

function pickCategoryVisual(categoryName = "") {
  const normalized = String(categoryName).toLowerCase();
  if (normalized.includes("trái cây") || normalized.includes("quả")) {
    return {
      Icon: Apple,
      accent: "from-emerald-50 to-lime-50/70 text-[#006e1c]",
    };
  }
  if (normalized.includes("củ")) {
    return {
      Icon: Carrot,
      accent: "from-amber-50/80 to-emerald-50/60 text-[#00450d]",
    };
  }
  if (normalized.includes("gia vị") || normalized.includes("thảo mộc")) {
    return {
      Icon: Sprout,
      accent: "from-teal-50/70 to-emerald-50 text-[#006e1c]",
    };
  }
  return {
    Icon: Leaf,
    accent: "from-[#f2f4f2] to-emerald-50/80 text-[#00450d]",
  };
}

function CheckoutItemThumb({ item, name, categoryName }) {
  const [imgFailed, setImgFailed] = useState(false);
  const rawImage =
    item.image_url || item.image || item.product?.image_url || item.product?.image || "";
  const showImage = Boolean(rawImage) && !imgFailed;
  const { Icon: FallbackIcon, accent } = pickCategoryVisual(categoryName);

  if (showImage) {
    return (
      <img
        src={rawImage}
        alt={name}
        onError={() => setImgFailed(true)}
        className="w-14 h-14 rounded-2xl object-cover border border-[#c0c9bb]/40 shrink-0"
      />
    );
  }

  return (
    <div
      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accent} border border-[#c0c9bb]/40 flex items-center justify-center shrink-0`}
    >
      <FallbackIcon className="w-6 h-6" aria-hidden="true" />
    </div>
  );
}

export default function CheckoutItemList({ items, itemsSubtotal }) {
  return (
    <section
      aria-label="Danh sách nông sản đặt mua"
      className="lg:col-span-6 lg:max-h-full flex flex-col rounded-3xl bg-white border border-[#c0c9bb]/50 shadow-2xs overflow-hidden"
    >
      <div className="shrink-0 px-5 py-3.5 border-b border-[#c0c9bb]/35 flex items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-[#006e1c]" />
          <h2 className="text-sm sm:text-base font-extrabold text-[#00450d]">
            Danh Sách Nông Sản ({items.length} mặt hàng)
          </h2>
        </div>
        <span className="text-xs font-bold text-[#5a6357] tabular-nums">
          {formatCurrencyVnd(itemsSubtotal)}
        </span>
      </div>

      {/* Chỉ hiện thanh cuộn khi danh sách vượt quá chiều cao khung nhìn */}
      <div className="overflow-y-auto divide-y divide-[#c0c9bb]/25 px-5 py-1">
        {items.map((item) => (
          <div
            key={item.productId}
            className="py-3.5 flex items-center justify-between gap-3.5"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <CheckoutItemThumb
                item={item.raw}
                name={item.name}
                categoryName={item.categoryName}
              />
              <div className="min-w-0">
                <p className="text-sm sm:text-[15px] font-extrabold text-[#191c1b] truncate">
                  {item.name}
                </p>
                <p className="text-xs text-[#5a6357] mt-0.5 tabular-nums">
                  Đơn giá: {formatCurrencyVnd(item.unitPrice)} / {item.unit}
                </p>
                <p className="text-xs text-[#5a6357] tabular-nums">
                  Số lượng: <strong className="text-[#191c1b]">{item.quantity}</strong>{" "}
                  {item.unit}
                </p>
              </div>
            </div>

            <span className="text-sm sm:text-base font-extrabold text-[#191c1b] tabular-nums shrink-0">
              {formatCurrencyVnd(item.subtotal)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}