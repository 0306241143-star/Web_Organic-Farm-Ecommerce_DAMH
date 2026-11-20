/* Product detail page opened from a catalog card. */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import ProductDetailGallery from "../../components/public/product-detail/ProductDetailGallery";
import ProductQualityDetails from "../../components/public/product-detail/ProductQualityDetails";
import ProductPurchasePanel from "../../components/public/product-detail/ProductPurchasePanel";
import { useAuth } from "../../context/useAuth";
import { publicApi } from "../../services/publicApi";
import { storefrontApi } from "../../services/storefrontApi";

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6">
      <div className="h-4 w-44 rounded bg-[#e6e9e7]" />
      <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="aspect-[4/3] rounded-3xl bg-[#e6e9e7]" />
        <div className="space-y-5">
          <div className="h-7 w-2/3 rounded bg-[#e6e9e7]" />
          <div className="h-4 w-1/3 rounded bg-[#eceeec]" />
          <div className="h-36 rounded-3xl bg-[#e6e9e7]" />
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { user } = useAuth();
  const [requestResult, setRequestResult] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [packages, setPackages] = useState([]);
  const [packageErrorMessage, setPackageErrorMessage] = useState("");
  const validProductId = /^\d+$/.test(productId || "");
  const requestKey = `${productId}:${reloadTick}`;
  const isInternalStaff = Boolean(
    user && ["admin", "farm_staff", "sales"].includes(user.role)
  );

  useEffect(() => {
    let active = true;

    if (!validProductId) {
      return () => {
        active = false;
      };
    }

    publicApi
      .getProduct(productId)
      .then((response) => {
        if (!active) return;
        if (!response?.success || !response?.data) {
          setRequestResult({
            requestKey,
            errorMessage: "Máy chủ chưa trả về thông tin sản phẩm hợp lệ.",
          });
          return;
        }
        setRequestResult({ requestKey, detail: response.data });
      })
      .catch((error) => {
        if (!active) return;
        setRequestResult({
          requestKey,
          errorMessage:
            error?.status === 404
              ? "Sản phẩm không tồn tại hoặc hiện đã tạm ngưng bán."
              : "Không thể tải thông tin sản phẩm. Vui lòng thử lại.",
        });
      });

    storefrontApi
      .getSubscriptions()
      .then((availablePackages) => {
        if (active) setPackages(availablePackages);
      })
      .catch((error) => {
        if (active) {
          setPackageErrorMessage(
            error?.response?.data?.message ||
              "Không thể tải danh sách gói định kỳ."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [productId, reloadTick, requestKey, validProductId]);

  const currentResult =
    requestResult?.requestKey === requestKey ? requestResult : null;

  if (validProductId && !currentResult) return <ProductDetailSkeleton />;

  const detail = currentResult?.detail;
  if (!detail) {
    const errorMessage = validProductId
      ? currentResult?.errorMessage
      : "Không tìm thấy sản phẩm nông sản này.";

    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <EmptyState
          icon={RefreshCw}
          title="Không thể hiển thị chi tiết sản phẩm"
          message={errorMessage}
          actionLabel={validProductId ? "Thử tải lại" : ""}
          onAction={
            validProductId ? () => setReloadTick((tick) => tick + 1) : null
          }
        />
        <Link
          to="/products"
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#00450d] hover:text-[#006e1c]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách nông sản
        </Link>
      </div>
    );
  }

  const packagesIncludingProduct = packages.filter((item) =>
    item.items?.some(
      (packageItem) => String(packageItem.product_id) === String(detail.id)
    )
  );

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <nav
          aria-label="Điều hướng đường dẫn"
          className="text-[13px] text-[#5a6357]"
        >
          <Link to="/" className="hover:text-[#00450d]">
            Trang chủ
          </Link>
          <span className="mx-2">/</span>
          {detail.category ? (
            <Link
              to={`/products?category=${detail.category.id}`}
              className="hover:text-[#00450d]"
            >
              {detail.category.name}
            </Link>
          ) : (
            <Link to="/products" className="hover:text-[#00450d]">
              Nông sản
            </Link>
          )}
          <span className="mx-2">/</span>
          <span aria-current="page" className="font-semibold text-[#191c1b]">
            {detail.name}
          </span>
        </nav>

        <div className="mt-6 grid items-start gap-7 lg:grid-cols-2 lg:gap-12">
          <ProductDetailGallery product={detail} />
          <div className="space-y-5">
            <div>
              {detail.category && (
                <Link
                  to={`/products?category=${detail.category.id}`}
                  className="text-xs font-extrabold uppercase tracking-wider text-[#006e1c] hover:text-[#00450d]"
                >
                  {detail.category.name}
                </Link>
              )}
              <h1 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-[#191c1b] sm:text-3xl">
                {detail.name}
              </h1>
              {detail.farm?.name && (
                <p className="mt-2 text-sm text-[#5a6357]">
                  Nông trại:{" "}
                  <span className="font-semibold">{detail.farm.name}</span>
                  {detail.farm.address ? ` · ${detail.farm.address}` : ""}
                </p>
              )}
            </div>
            {isInternalStaff ? (
              <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Chế độ xem nội bộ. Tài khoản nhân viên không thể thực hiện mua hàng.
              </p>
            ) : (
              <ProductPurchasePanel key={detail.id} product={detail} />
            )}
          </div>
        </div>

        <ProductQualityDetails product={detail} />

        <section className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-emerald-950">
            Có trong gói rau định kỳ
          </h2>
          {packageErrorMessage ? (
            <p role="alert" className="mt-2 text-sm text-red-800">
              {packageErrorMessage}
            </p>
          ) : packagesIncludingProduct.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {packagesIncludingProduct.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
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
            <p className="mt-2 text-sm text-emerald-950">
              {packageErrorMessage
                ? ""
                : "Sản phẩm hiện chưa thuộc gói định kỳ đang mở bán."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
