import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Minus, PackageX, Plus, ShoppingCart } from "lucide-react";
import Button from "../../common/Button";
import { showGlobalToast } from "../../GlobalToast";
import { useAuth } from "../../../context/useAuth";
import { useCart } from "../../../context/useCart";
import { notifyApiErrorToast } from "../../../services/axiosClient";
import { formatCurrencyVnd } from "../../../services/publicApi";

export default function ProductPurchasePanel({ product }) {
  const { items, addItem } = useCart();
  const { user, isLoading, hasRole, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const availableStock = Math.max(0, Number(product.available_stock) || 0);
  const cartItems = Array.isArray(items) ? items : [];
  const cartItem = cartItems.find(
    (item) => String(item.id) === String(product.id)
  );
  const maxAddQuantity = Math.max(
    0,
    Math.round((availableStock - (Number(cartItem?.quantity) || 0)) * 100) / 100
  );
  const [quantity, setQuantity] = useState(1);
  const effectivePrice = Number(product.effective_price ?? product.price);
  const isDiscounted = effectivePrice < Number(product.price);
  const isCustomer = hasRole("customer");
  const canAddToCart = maxAddQuantity >= 0.01;
  const [isAdding, setIsAdding] = useState(false);

  // Giữ số lượng trong giới hạn còn mua được sau khi trừ số lượng đang có trong giỏ.
  useEffect(() => {
    if (canAddToCart) {
      setQuantity((current) => Math.min(current, maxAddQuantity));
    }
  }, [canAddToCart, maxAddQuantity]);

  // Làm tròn số lượng theo đơn vị thập phân và kẹp trong phạm vi cho phép.
  const updateQuantity = (value) => {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const rounded = Math.round(next * 100) / 100;
    setQuantity(Math.min(maxAddQuantity, Math.max(0.01, rounded)));
  };

  // Chặn khách chưa đăng nhập hoặc tài khoản không phải khách hàng trước khi thao tác giỏ hàng.
  const requireCustomer = (guestMessage = "") => {
    if (isLoading) return false;
    if (!user) {
      openLoginModal();
      if (guestMessage) showGlobalToast(guestMessage, "info");
      return false;
    }
    if (!isCustomer) {
      showGlobalToast("Vui lòng đăng nhập bằng tài khoản khách hàng.", "warning");
      return false;
    }
    return true;
  };

  // Kiểm tra trùng thao tác, tồn kho và quyền tài khoản trước khi gọi API thêm giỏ hàng.
  const addToCart = async () => {
    if (
      isAdding ||
      !canAddToCart ||
      quantity > maxAddQuantity
    ) {
      return;
    }
    if (
      !requireCustomer(
        "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng."
      )
    ) {
      return;
    }

    setIsAdding(true);
    try {
      await addItem(product, quantity);
      setQuantity(1);
      showGlobalToast(`Đã thêm "${product.name}" vào giỏ hàng.`, "success");
    } catch (error) {
      notifyApiErrorToast(error, "Không thể thêm sản phẩm vào giỏ hàng.");
    } finally {
      setIsAdding(false);
    }
  };

  const openSubscription = () => {
    if (!requireCustomer()) return;
    navigate("/subscriptions", {
      state: {
        product: {
          id: product.id,
          name: product.name,
          unit: product.unit,
          price: effectivePrice,
        },
      },
    });
  };

  return (
    <section
      aria-label="Thông tin mua hàng"
      className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5 sm:p-6 shadow-2xs"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-extrabold tracking-tight text-[#00450d]">
          {formatCurrencyVnd(effectivePrice)}
        </span>
        <span className="text-sm text-[#5a6357]">/ {product.unit || "kg"}</span>
        {isDiscounted && (
          <span className="text-sm text-[#5a6357] line-through">
            {formatCurrencyVnd(product.price)}
          </span>
        )}
        {product.discount_percent > 0 && (
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
            Giảm {product.discount_percent}%
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-y border-[#c0c9bb]/25 py-3">
        {availableStock > 0 ? (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#006e1c]" />
            <span className="text-sm font-semibold text-[#006e1c]">
              Còn {availableStock.toLocaleString("vi-VN")} {product.unit || "kg"}
            </span>
          </>
        ) : (
          <>
            <PackageX className="h-4 w-4 shrink-0 text-[#5a6357]" />
            <span className="text-sm font-semibold text-[#5a6357]">
              Hiện tạm hết hàng
            </span>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <label htmlFor="detail-product-quantity" className="text-sm font-bold text-[#191c1b]">
          Số lượng
        </label>
        <div className="flex items-center rounded-xl border border-[#c0c9bb]/60">
          <button
            type="button"
            onClick={() => updateQuantity(quantity - 1)}
            disabled={isAdding || !canAddToCart || quantity <= 1}
            aria-label="Giảm số lượng"
            className="flex h-10 w-10 items-center justify-center text-[#41493e] hover:text-[#00450d] disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            id="detail-product-quantity"
            type="number"
            min="0.01"
            max={maxAddQuantity}
            step="0.01"
            value={canAddToCart ? quantity : 0}
            disabled={isAdding || !canAddToCart}
            onChange={(event) => updateQuantity(event.target.value)}
            className="h-10 w-16 border-x border-[#c0c9bb]/40 bg-transparent text-center text-sm font-bold tabular-nums outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => updateQuantity(quantity + 1)}
            disabled={isAdding || !canAddToCart || quantity >= maxAddQuantity}
            aria-label="Tăng số lượng"
            className="flex h-10 w-10 items-center justify-center text-[#41493e] hover:text-[#00450d] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Button
        onClick={addToCart}
        disabled={
          isAdding ||
          !canAddToCart ||
          quantity < 1 ||
          quantity > maxAddQuantity
        }
        className="mt-5 w-full"
        size="lg"
      >
        <ShoppingCart className="h-4 w-4" />
        {isAdding
          ? "Đang thêm vào giỏ..."
          : canAddToCart
            ? "Thêm vào giỏ hàng"
            : "Tạm hết hàng"}
      </Button>

      <Button
        variant="outline"
        className="mt-3 w-full"
        disabled={isLoading}
        onClick={openSubscription}
      >
        Đăng ký gói giao định kỳ
      </Button>

    </section>
  );
}
