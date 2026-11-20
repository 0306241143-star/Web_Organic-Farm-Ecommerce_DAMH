/* Shares the server-backed retail cart across storefront pages and components. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CartContext from "./cartStateContext";
import { useAuth } from "./useAuth";
import { customerApi } from "../services/customerApi";

export function CartProvider({ children }) {
  const { user } = useAuth();
  // Đổi tài khoản sẽ tạo state mới, tránh lộ/hiển thị tạm giỏ của phiên trước.
  const cartKey = user?.role === "customer" ? `customer:${user.id}` : "guest";

  return (
    <CartStateProvider key={cartKey} user={user}>
      {children}
    </CartStateProvider>
  );
}

function CartStateProvider({ children, user }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(user?.role === "customer");
  const [error, setError] = useState("");
  const cartRevision = useRef(0);
  const mutationQueue = useRef(Promise.resolve());

  const applyCartResponse = useCallback((response) => {
    const nextItems = response?.data?.items;
    setItems(Array.isArray(nextItems) ? nextItems : []);
    setError("");
    return nextItems || [];
  }, []);

  const refreshCart = useCallback(async () => {
    if (user?.role !== "customer") {
      return [];
    }

    // Bỏ qua phản hồi GET cũ nếu thao tác thêm/sửa/xóa hoàn tất trong lúc đang tải.
    const revisionAtRequest = cartRevision.current;
    setIsLoading(true);
    try {
      const response = await customerApi.getCart();
      if (revisionAtRequest === cartRevision.current) {
        return applyCartResponse(response);
      }
      return response?.data?.items || [];
    } catch (requestError) {
      setError(requestError.message || "Không thể tải giỏ hàng.");
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, [applyCartResponse, user?.role]);

  const enqueueCartMutation = useCallback((mutation) => {
    const result = mutationQueue.current.then(mutation);
    mutationQueue.current = result.catch(() => {});
    return result;
  }, []);

  const addItem = useCallback(async (product, quantity = 1) => {
    if (user?.role !== "customer") {
      throw new Error("Chỉ khách hàng đã đăng nhập mới có thể thêm sản phẩm vào giỏ.");
    }

    return enqueueCartMutation(async () => {
      const response = await customerApi.addCartItem({
        product_id: product.id,
        quantity,
      });
      cartRevision.current += 1;
      return applyCartResponse(response);
    });
  }, [applyCartResponse, enqueueCartMutation, user?.role]);

  const updateItem = useCallback(async (productId, quantity) => {
    if (user?.role !== "customer") {
      throw new Error("Vui lòng đăng nhập bằng tài khoản khách hàng để sửa giỏ hàng.");
    }

    return enqueueCartMutation(async () => {
      const response = await customerApi.updateCartItem(productId, { quantity });
      cartRevision.current += 1;
      return applyCartResponse(response);
    });
  }, [applyCartResponse, enqueueCartMutation, user?.role]);

  const removeItem = useCallback(async (productId) => {
    if (user?.role !== "customer") {
      throw new Error("Vui lòng đăng nhập bằng tài khoản khách hàng để xóa sản phẩm.");
    }

    return enqueueCartMutation(async () => {
      const response = await customerApi.removeCartItem(productId);
      cartRevision.current += 1;
      return applyCartResponse(response);
    });
  }, [applyCartResponse, enqueueCartMutation, user?.role]);

  useEffect(() => {
    if (user?.role !== "customer") return undefined;

    // Tải giỏ đã lưu sau đăng nhập; cleanup ngăn cập nhật state sau khi đổi phiên/unmount.
    let active = true;
    const revisionAtRequest = cartRevision.current;
    customerApi.getCart()
      .then((response) => {
        if (active && revisionAtRequest === cartRevision.current) {
          applyCartResponse(response);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải giỏ hàng.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyCartResponse, user?.id, user?.role]);

  const value = useMemo(() => ({
    items,
    isLoading,
    error,
    refreshCart,
    addItem,
    updateItem,
    removeItem,
  }), [items, isLoading, error, refreshCart, addItem, updateItem, removeItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
