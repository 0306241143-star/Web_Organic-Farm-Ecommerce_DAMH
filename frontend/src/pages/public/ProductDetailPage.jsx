/* Product details with a direct route into any recurring package containing this product. */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { storefrontApi } from "../../services/storefrontApi";

function getErrorMessage(error) {
  return error.response?.data?.message || "Không thể tải thông tin sản phẩm.";
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [packageErrorMessage, setPackageErrorMessage] = useState("");

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
                    <Link
                      to={`/subscriptions?package_id=${encodeURIComponent(item.id)}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      Đăng ký gói này
                    </Link>
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
