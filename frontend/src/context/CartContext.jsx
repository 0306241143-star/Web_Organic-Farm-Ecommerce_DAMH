/* Shares the retail cart state across storefront pages and components. */
import { useMemo, useState } from "react";
import CartContext from "./cartStateContext";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const value = useMemo(() => ({ items, setItems }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
