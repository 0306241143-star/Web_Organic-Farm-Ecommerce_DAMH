/* Reads the current shopping cart context. */
import { useContext } from "react";
import CartContext from "./cartStateContext";

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart phải được sử dụng bên trong CartProvider.");
  }

  return context;
}
