/* Shares the retail cart state across storefront pages and components. */
import { useCallback, useMemo, useState } from "react";
import CartContext from "./cartStateContext";

export function CartProvider({ children }) {
  const [items, setItemsState] = useState([]);
  const [serverCartCount, setServerCartCount] = useState(null);
  const setItems = useCallback((updater) => {
    setServerCartCount(null);
    setItemsState(updater);
  }, []);
  const value = useMemo(
    () => ({ items, setItems, serverCartCount, setServerCartCount }),
    [items, setItems, serverCartCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
