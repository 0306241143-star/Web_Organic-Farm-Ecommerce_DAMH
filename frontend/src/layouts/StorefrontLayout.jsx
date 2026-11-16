/* Shared storefront frame for guests and customers. */
import { Outlet } from "react-router-dom";
import StorefrontFooter from "../components/navigation/StorefrontFooter";
import StorefrontHeader from "../components/navigation/StorefrontHeader";

export default function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      <StorefrontHeader />
      <main className="flex-1 w-full pt-20">
        <Outlet />
      </main>
      <StorefrontFooter />
    </div>
  );
}
