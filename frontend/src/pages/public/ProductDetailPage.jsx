/* Product details with a direct route into any recurring package containing this product. */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, ShoppingCart } from "lucide-react";
import { showGlobalToast } from "../../components/GlobalToast";
import { useCart } from "../../context/useCart";
import { storefrontApi } from "../../services/storefrontApi";
import { useAuth } from "../../context/useAuth";
import { notifyApiErrorToast } from "../../services/axiosClient";

function getErrorMessage(error) {
  return error.response?.data?.message || "Không thể tải thông tin sản phẩm.";
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [packageErrorMessage, setPackageErrorMessage] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const isInternalStaff = Boolean(
    user && ["admin", "farm_staff", "sales"].includes(user.role)
  );

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      storefrontApi.getProduct(productId),
      storefrontApi.getSubscriptions(),
    ])
      .then(([productResult, packagesResult]) => {
        if (!active) return;
        if (productResult.status === "fulfilled") {
          setProduct(productResult.value);
        } else {
          setErrorMessage(getErrorMessage(productResult.reason));
        }
        if (packagesResult.status === "fulfilled") {
          setPackages(packagesResult.value);
        } else {
          setPackageErrorMessage(getErrorMessage(packagesResult.reason));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId]);

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-12 text-center text-slate-600">Đang tải sản phẩm...</main>;
  }

  if (errorMessage || !product) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {errorMessage || "Không tìm thấy sản phẩm."}
        </p>
        <Link to="/products" className="mt-4 inline-block font-bold text-emerald-800 underline">Quay lại cửa hàng</Link>
      </main>
    );
  }

  const packagesIncludingProduct = packages.filter((item) =>
    item.items?.some((packageItem) => String(packageItem.product_id) === String(product.id))
  );
  const hasAvailableStock = product.in_stock ?? Number(product.available_stock) > 0;

  const handleAddToCart = async () => {
    if (addingToCart || !hasAvailableStock) return;
    if (!user) {
      navigate("/login", { state: { from: location } });
      showGlobalToast("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.", "info");
      return;
    }
    if (user.role !== "customer") {
      showGlobalToast("Chỉ tài khoản khách hàng mới có thể mua sản phẩm.", "warning");
      return;
    }

    setAddingToCart(true);
    try {
      await addItem(product);
      setAddedToCart(true);
      showGlobalToast(`Đã thêm "${product.name}" vào giỏ hàng.`, "success");
      setTimeout(() => setAddedToCart(false), 1500);
    } catch (requestError) {
      notifyApiErrorToast(requestError, "Không thể thêm sản phẩm vào giỏ hàng.");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link to="/products" className="text-sm font-bold text-emerald-800 underline">← Cửa hàng</Link>
      <div className="mt-5 grid gap-8 md:grid-cols-2">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="max-h-[34rem] w-full rounded-3xl bg-slate-100 object-cover"
          />
        ) : (
          <div className="flex min-h-72 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-900">
            Hình ảnh sản phẩm chưa có
          </div>
        )}
        <section>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
            {product.category?.name || "Nông sản sạch"}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">{product.name}</h1>
          <p className="mt-3 text-slate-600">{product.description || "Nông sản tươi sạch từ nông trại."}</p>
          <p className="mt-5 text-2xl font-extrabold text-emerald-900">
            {Number(product.effective_price ?? product.price).toLocaleString("vi-VN")}đ
            <span className="ml-1 text-base font-semibold text-slate-600">/{product.unit}</span>
          </p>
          {product.farm?.name && <p className="mt-3 text-sm text-slate-600">Nông trại: {product.farm.name}</p>}
          {isInternalStaff ? (
            <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Chế độ xem nội bộ — không thể mua sản phẩm.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={!hasAvailableStock || addingToCart}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:min-w-56"
            >
              {addingToCart ? (
                <span role="status">Đang thêm vào giỏ...</span>
              ) : addedToCart ? (
                <>
                  <Check className="h-5 w-5" aria-hidden="true" />
                  Đã thêm vào giỏ
                </>
              ) : !hasAvailableStock ? (
                "Tạm hết hàng"
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  Thêm vào giỏ hàng
                </>
              )}
            </button>
          )}

          <section className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-lg font-extrabold text-emerald-950">Có trong gói rau định kỳ</h2>
            {packageErrorMessage ? (
              <p role="alert" className="mt-2 text-sm text-red-800">{packageErrorMessage}</p>
            ) : packagesIncludingProduct.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {packagesIncludingProduct.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-emerald-950">
                      {item.name} · {Number(item.price).toLocaleString("vi-VN")}đ
                    </span>
                    {isInternalStaff ? (
                      <span className="inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800">
                        Chế độ xem nội bộ
                      </span>
                    ) : (
                      <Link
                        to={`/subscriptions?package_id=${encodeURIComponent(item.id)}`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                      >
                        Đăng ký gói này
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-700">
                Sản phẩm hiện chưa thuộc gói định kỳ đang mở bán.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
