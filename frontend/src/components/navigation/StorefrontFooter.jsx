/* Shared footer for storefront pages. */
import { useState } from "react";
import { Link } from "react-router-dom";

export default function StorefrontFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="w-full bg-surface-container-low text-on-surface mt-16 border-t border-outline-variant/30" id="lien-he">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info & Trust Badges */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-xs group-hover:scale-102 transition-transform">
                <span className="material-symbols-outlined text-[24px]">eco</span>
              </div>
              <span className="font-headline-sm text-[22px] text-primary-container font-extrabold tracking-tight">
                XanhFarm
              </span>
            </Link>

            <p className="font-body-sm text-[13px] text-on-surface-variant max-w-sm leading-relaxed">
              Hệ sinh thái nông sản hữu cơ nguyên bản từ nông trại xanh đạt chuẩn VietGAP & USDA Organic.
              Mang trọn vị ngọt mát thuần khiết tới từng bữa cơm gia đình Việt.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-[12px] font-bold text-primary border border-outline-variant/30 shadow-2xs">
                VietGAP Certified
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-[12px] font-bold text-secondary border border-outline-variant/30 shadow-2xs">
                USDA Organic
              </span>
              <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-[12px] font-bold text-on-surface border border-outline-variant/30 shadow-2xs">
                OCOP 4 Sao
              </span>
            </div>
          </div>

          {/* Danh mục nông sản */}
          <div className="space-y-3">
            <h4 className="font-label-lg text-primary font-bold text-[14px] uppercase tracking-wider">
              Danh Mục Nông Sản
            </h4>
            <ul className="space-y-2 text-[13px] text-on-surface-variant">
              <li>
                <Link to="/products?category=rau-cu" className="hover:text-primary transition-colors">
                  Rau củ hữu cơ Đà Lạt
                </Link>
              </li>
              <li>
                <Link to="/products?category=trai-cay" className="hover:text-primary transition-colors">
                  Trái cây nhiệt đới tươi
                </Link>
              </li>
              <li>
                <Link to="/products?category=nam-thao-moc" className="hover:text-primary transition-colors">
                  Nấm tươi & Thảo mộc
                </Link>
              </li>
              <li>
                <Link to="/products?category=gao-hat" className="hover:text-primary transition-colors">
                  Gạo & Hạt dinh dưỡng
                </Link>
              </li>
              <li>
                <Link to="/products?category=combo-tuan" className="hover:text-primary transition-colors">
                  Combo rau củ tuần
                </Link>
              </li>
            </ul>
          </div>

          {/* Chính sách & Hỗ trợ */}
          <div className="space-y-3">
            <h4 className="font-label-lg text-primary font-bold text-[14px] uppercase tracking-wider">
              Chính Sách & Hỗ Trợ
            </h4>
            <ul className="space-y-2 text-[13px] text-on-surface-variant">
              <li>
                <Link to="/brand" className="hover:text-primary transition-colors">
                  Chính sách giao hàng 2H
                </Link>
              </li>
              <li>
                <Link to="/brand" className="hover:text-primary transition-colors">
                  Cam kết bồi hoàn & đổi trả 100%
                </Link>
              </li>
              <li>
                <Link to="/trace/KH-2026-001" className="hover:text-primary transition-colors">
                  Truy xuất nguồn gốc QR
                </Link>
              </li>
              <li>
                <Link to="/subscriptions" className="hover:text-primary transition-colors">
                  Đăng ký nhận rau định kỳ (-20%)
                </Link>
              </li>
              <li>
                <Link to="/brand" className="hover:text-primary transition-colors">
                  Chính sách bảo mật & Điều khoản
                </Link>
              </li>
            </ul>
          </div>

          {/* Nhận thông báo & Ưu đãi */}
          <div className="space-y-3">
            <h4 className="font-label-lg text-primary font-bold text-[14px] uppercase tracking-wider">
              Ưu Đãi Đăng Ký
            </h4>
            <p className="text-[12px] text-on-surface-variant">
              Nhận ngay voucher <span className="font-bold text-secondary">giảm 10%</span> cho đơn hàng đầu tiên cùng cẩm nang sống xanh mỗi tuần.
            </p>
            {subscribed ? (
              <div className="p-3 rounded-xl bg-secondary-fixed/40 border border-secondary/30 text-secondary text-[12px] font-bold">
                ✓ Đã ghi nhận email! Mã ưu đãi 10% đã được gửi vào hộp thư của bạn.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label="Nhập địa chỉ email nhận ưu đãi"
                  placeholder="Nhập email của bạn..."
                  required
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-[12px] focus:outline-none focus:ring-1 focus:ring-secondary text-on-surface"
                />
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl bg-primary-container text-on-primary font-bold text-[12px] hover:bg-secondary transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
                >
                  Đăng Ký Nhận Mã
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-outline-variant/30 flex flex-col md:flex-row items-center justify-between text-[12px] text-on-surface-variant gap-4">
          <p>© 2026 Nông Sản Sạch XanhFarm Việt Nam. Bảo lưu mọi quyền.</p>
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
              65 Huỳnh Thúc Kháng, Phường Bến Nghé (hoặc Phường Sài Gòn cũ), Quận 1, Thành phố Hồ Chí Minh.
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">phone_in_talk</span>
              Hotline: 1900 6868
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
