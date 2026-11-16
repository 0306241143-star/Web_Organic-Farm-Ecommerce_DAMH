/* Application root: installs shared state providers and frontend routes. */
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