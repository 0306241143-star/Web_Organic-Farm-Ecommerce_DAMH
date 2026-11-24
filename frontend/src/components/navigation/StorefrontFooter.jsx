/* Shared compact footer for storefront pages with dynamic farm, certification, and category data. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Sprout,
  Truck,
} from "lucide-react";
import { publicApi } from "../../services/publicApi";

const DEFAULT_BRAND_INFO = {
  farms: [
    {
      id: 1,
      name: "Nông Trại Xanh Củ Chi",
      address: "Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh",
      brand_story:
        "Hệ sinh thái nông sản hữu cơ nguyên bản từ vườn đến bàn ăn, minh bạch truy xuất nguồn gốc qua mã QR.",
    },
  ],
  certifications: ["VietGAP", "Hữu cơ TCVN 11041", "GlobalGAP"],
  contact: {
    hotline: "1900 6868",
    working_hours: "8:00 - 20:00",
    email: "contact@xanhfarm.vn",
  },
};

export default function StorefrontFooter() {
  const [brandInfo, setBrandInfo] = useState(DEFAULT_BRAND_INFO);
  const [categories, setCategories] = useState([]);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.allSettled([publicApi.getBrandStory(), publicApi.getCategories()]).then(
      ([brandRes, catRes]) => {
        if (!active) return;

        if (brandRes.status === "fulfilled" && brandRes.value?.data) {
          const remote = brandRes.value.data;
          setBrandInfo({
            farms:
              Array.isArray(remote.farms) && remote.farms.length > 0
                ? remote.farms
                : DEFAULT_BRAND_INFO.farms,
            certifications:
              Array.isArray(remote.certifications) && remote.certifications.length > 0
                ? remote.certifications
                : DEFAULT_BRAND_INFO.certifications,
            contact: {
              ...DEFAULT_BRAND_INFO.contact,
              ...(remote.contact || {}),
            },
          });
        }

        if (catRes.status === "fulfilled" && Array.isArray(catRes.value?.data)) {
          setCategories(catRes.value.data.slice(0, 4));
        }
      }
    );

    return () => {
      active = false;
    };
  }, []);

  const primaryFarm = brandInfo.farms[0] || DEFAULT_BRAND_INFO.farms[0];

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setIsSubscribed(true);
      setNewsletterEmail("");
      setTimeout(() => setIsSubscribed(false), 4000);
    }
  };

  return (
    <footer className="w-full bg-[#f2f4f2] text-[#191c1b] border-t border-[#c0c9bb]/35 mt-8 sm:mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-7">
          {/* ================= CỘT 1: THƯƠNG HIỆU, CHỨNG NHẬN & ĐỊA CHỈ NÔNG TRẠI ĐỘNG (5 CỘT) ================= */}
          <div className="sm:col-span-2 lg:col-span-5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link to="/" className="inline-flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00450d] to-[#006e1c] text-white flex items-center justify-center shadow-2xs">
                  <Sprout className="w-4 h-4 text-[#91f78e]" />
                </div>
                <span className="font-extrabold text-[19px] tracking-tight text-[#00450d]">
                  XanhFarm
                </span>
              </Link>

              {/* Huy hiệu tiêu chuẩn chứng nhận động từ DB */}
              <div className="flex flex-wrap gap-1.5">
                {brandInfo.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-[11px] font-bold text-[#00450d] border border-[#c0c9bb]/45"
                  >
                    <ShieldCheck className="w-3 h-3 text-[#006e1c] shrink-0" />
                    <span>{cert}</span>
                  </span>
                ))}
              </div>
            </div>

            <p className="text-[12px] text-[#41493e] leading-relaxed line-clamp-2">
              {primaryFarm.brand_story || DEFAULT_BRAND_INFO.farms[0].brand_story}
            </p>

            {/* Danh sách cơ sở nông trại động từ bảng nong_trai */}
            <div className="space-y-1 text-[12px] text-[#5a6357]">
              {brandInfo.farms.map((farm) => (
                <div key={farm.id} className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#006e1c] shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    <strong className="text-[#191c1b] font-semibold">{farm.name}:</strong>{" "}
                    {farm.address}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ================= CỘT 2: DANH MỤC NÔNG SẢN ĐỘNG (2 CỘT) ================= */}
          <div className="lg:col-span-2 space-y-2">
            <h4 className="font-extrabold text-[12px] text-[#00450d] uppercase tracking-wider">
              Danh Mục
            </h4>
            <ul className="space-y-1.5 text-[12.5px] text-[#41493e]">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      to={`/products?category=${cat.id}`}
                      className="hover:text-[#00450d] transition-colors line-clamp-1"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <Link to="/products" className="hover:text-[#00450d] transition-colors">
                    Tất cả nông sản sạch
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/subscriptions"
                  className="hover:text-[#00450d] transition-colors font-semibold text-[#006e1c]"
                >
                  Gói rau định kỳ
                </Link>
              </li>
            </ul>
          </div>

          {/* ================= CỘT 3: DỊCH VỤ & TRUY XUẤT (2 CỘT) ================= */}
          <div className="lg:col-span-2 space-y-2">
            <h4 className="font-extrabold text-[12px] text-[#00450d] uppercase tracking-wider">
              Dịch Vụ
            </h4>
            <ul className="space-y-1.5 text-[12.5px] text-[#41493e]">
              <li className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
                <span className="truncate">Giao nhanh 2H giữ lạnh</span>
              </li>
              <li>
                <Link
                  to="/trace"
                  className="inline-flex items-center gap-1.5 text-[#00450d] hover:underline font-semibold"
                >
                  <QrCode className="w-3.5 h-3.5 shrink-0" />
                  <span>Truy xuất tem QR</span>
                </Link>
              </li>
              <li>
                <Link to="/brand" className="hover:text-[#00450d] transition-colors">
                  Câu chuyện thương hiệu
                </Link>
              </li>
            </ul>
          </div>

          {/* ================= CỘT 4: ĐĂNG KÝ NHẬN TIN & LIÊN HỆ GỌN (3 CỘT) ================= */}
          <div className="lg:col-span-3 space-y-2">
            <h4 className="font-extrabold text-[12px] text-[#00450d] uppercase tracking-wider">
              Kết Nối & Hỗ Trợ
            </h4>

            <form onSubmit={handleSubscribe} className="space-y-1">
              <div className="flex gap-1.5">
                <input
                  type="email"
                  required
                  placeholder="Nhận voucher ưu đãi qua email..."
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-[12px] bg-white border border-[#c0c9bb]/55 rounded-lg outline-none focus:border-[#00450d] transition-all"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-[12px] font-bold text-white bg-[#00450d] hover:bg-[#006e1c] rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  Gửi
                </button>
              </div>
              {isSubscribed && (
                <p className="text-[11px] font-semibold text-[#006e1c] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Đã đăng ký nhận ưu đãi thành công!</span>
                </p>
              )}
            </form>

            <div className="pt-1 space-y-1 text-[12px] text-[#5a6357]">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
                <span>
                  CSKH:{" "}
                  <strong className="text-[#191c1b]">{brandInfo.contact.hotline}</strong> (
                  {brandInfo.contact.working_hours})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
                <span className="truncate">{brandInfo.contact.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= BOTTOM BAR THU GỌN ================= */}
        <div className="mt-5 pt-3.5 border-t border-[#c0c9bb]/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11.5px] text-[#5a6357]">
          <p>
            © {new Date().getFullYear()} XanhFarm — Nông sản sạch truy xuất nguồn gốc.
          </p>
          <div className="flex items-center gap-3">
            <Link to="/brand" className="hover:text-[#00450d] transition-colors">
              Tiêu chuẩn chất lượng
            </Link>
            <span>•</span>
            <Link to="/trace" className="hover:text-[#00450d] transition-colors">
              Kiểm tra mã lô
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}