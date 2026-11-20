import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HeroSection from "../../components/home/HeroSection";
import TrustBadgesSection from "../../components/home/TrustBadgesSection";
import CategoryGridSection from "../../components/home/CategoryGridSection";
import FlashSaleSection from "../../components/home/FlashSaleSection";
import FeaturedProductsSection from "../../components/home/FeaturedProductsSection";
import SubscriptionPackagesSection from "../../components/home/SubscriptionPackagesSection";
import FarmJourneySection from "../../components/home/FarmJourneySection";
import GreenhouseShowcaseSection from "../../components/home/GreenhouseShowcaseSection";
import { showGlobalToast } from "../../components/GlobalToast";
import { useAuth } from "../../context/useAuth";
import { useCart } from "../../context/useCart";
import { notifyApiErrorToast } from "../../services/axiosClient";

export default function HomePage() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const handleAddToCart = async (product) => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      showGlobalToast("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.", "info");
      return false;
    }

    if (user.role !== "customer") {
      showGlobalToast("Chỉ tài khoản khách hàng mới có thể mua sản phẩm.", "warning");
      return false;
    }

    const availableStock = Number(product.available_stock);
    if (!Number.isFinite(availableStock) || availableStock <= 0) {
      showGlobalToast("Sản phẩm hiện không còn đủ tồn kho.", "warning");
      return false;
    }

    try {
      await addItem(product);
      showGlobalToast(`Đã thêm "${product.name}" vào giỏ hàng.`, "success");
      return true;
    } catch (error) {
      notifyApiErrorToast(error, "Không thể thêm sản phẩm vào giỏ hàng.");
      return false;
    }
  };

  return (
    <div className="bg-[#f8faf8] min-h-screen pb-4">
      <HeroSection />
      <TrustBadgesSection />
      <CategoryGridSection />
      <FlashSaleSection onAddToCart={handleAddToCart} />
      <FeaturedProductsSection onAddToCart={handleAddToCart} />
      <SubscriptionPackagesSection />
      <FarmJourneySection />
      <GreenhouseShowcaseSection />
    </div>
  );
}