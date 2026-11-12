/* Shared storefront frame for guests and customers. */
import { Outlet } from "react-router-dom";
import StorefrontFooter from "../components/navigation/StorefrontFooter";
import StorefrontHeader from "../components/navigation/StorefrontHeader";

export default function StorefrontLayout() {
  return (
    <div className="storefront-layout">
      <StorefrontHeader />
      <main>
        <Outlet />
      </main>
      <StorefrontFooter />
    </div>
  );
}
