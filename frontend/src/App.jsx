/* Điểm gốc ứng dụng: khởi tạo trạng thái xác thực, giỏ hàng và router. */
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppRouter from "./routes/AppRouter";
import GlobalToast from "./components/GlobalToast";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <GlobalToast />
        <AppRouter />
      </CartProvider>
    </AuthProvider>
  );
}