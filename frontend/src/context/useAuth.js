/* Truy cập ngữ cảnh xác thực hiện tại; yêu cầu sử dụng trong AuthProvider. */
import { useContext } from "react";
import AuthContext from "./authStateContext";

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider.");
  }

  return context;
}
