/* Public product detail page opened from a catalog card. */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import ProductDetailGallery from "../../components/public/product-detail/ProductDetailGallery";
import ProductQualityDetails from "../../components/public/product-detail/ProductQualityDetails";
import ProductPurchasePanel from "../../components/public/product-detail/ProductPurchasePanel";
import { publicApi } from "../../services/publicApi";

function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
      <div className="h-4 w-44 rounded bg-[#e6e9e7]" />
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mt-7">
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
  const [requestResult, setRequestResult] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const validProductId = /^\d+$/.test(productId || "");
  const requestKey = `${productId}:${reloadTick}`;

  useEffect(() => {
    let active = true;

    if (!validProductId) return () => {
      active = false;
    };

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
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
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách nông sản
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <nav aria-label="Điều hướng đường dẫn" className="text-[13px] text-[#5a6357]">
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

        <div className="grid lg:grid-cols-2 gap-7 lg:gap-12 mt-6 items-start">
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
              <h1 className="mt-1 break-words text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191c1b]">
                {detail.name}
              </h1>
              {detail.farm?.name && (
                <p className="mt-2 text-sm text-[#5a6357]">
                  Nông trại: <span className="font-semibold">{detail.farm.name}</span>
                  {detail.farm.address ? ` · ${detail.farm.address}` : ""}
                </p>
              )}
            </div>
            <ProductPurchasePanel key={detail.id} product={detail} />
          </div>
        </div>

        <ProductQualityDetails product={detail} />

      </div>
    </div>
  );
}
