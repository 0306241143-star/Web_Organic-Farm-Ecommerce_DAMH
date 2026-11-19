import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Leaf,
  MapPin,
  PackageCheck,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import QrCodeScanner from "../../components/public/QrCodeScanner";
import QrTraceTimeline from "../../components/public/QrTraceTimeline";
import { publicApi } from "../../services/publicApi";

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(date);
}

export default function QrTraceabilityPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [requestResult, setRequestResult] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);
  const requestKey = `${code || ""}:${reloadCount}`;

  useEffect(() => {
    if (!code) return undefined;

    let active = true;

    publicApi.getQrTrace(code)
      .then((response) => {
        if (!active) return;
        if (!response?.success || !response?.data) {
          setRequestResult({
            requestKey,
            errorMessage: "Mã QR không trả về thông tin truy xuất hợp lệ.",
          });
          return;
        }
        setRequestResult({ requestKey, trace: response.data });
      })
      .catch((error) => {
        if (!active) return;
        setRequestResult({
          requestKey,
          errorMessage: error?.status === 404
            ? "Không tìm thấy mã QR. Vui lòng kiểm tra mã trên bao bì."
            : "Không thể tải thông tin truy xuất. Vui lòng thử lại.",
        });
      });

    return () => {
      active = false;
    };
  }, [code, requestKey]);

  const currentResult = requestResult?.requestKey === requestKey
    ? requestResult
    : null;
  const trace = currentResult?.trace || null;
  const errorMessage = currentResult?.errorMessage || "";
  const isLoading = Boolean(code) && !currentResult;

  const openTrace = (scannedCode) => {
    navigate(`/trace/${encodeURIComponent(scannedCode)}`);
  };

  const batchExpired = Boolean(trace?.batch?.is_expired);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#006e1c] hover:text-[#00450d]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách sản phẩm
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-[#006e1c]">
            <QrCode className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#00450d] sm:text-3xl">
              Truy xuất nguồn gốc
            </h1>
            <p className="mt-1 text-sm text-[#5a6357]">
              Kiểm tra hành trình canh tác và chất lượng theo mã QR lô hàng.
            </p>
          </div>
        </div>
      </div>

      <QrCodeScanner onCodeScanned={openTrace} />

      {!code && (
        <section className="rounded-3xl border border-dashed border-[#c0c9bb] bg-white p-6 text-center sm:p-8">
          <QrCode className="mx-auto h-10 w-10 text-[#006e1c]" />
          <h2 className="mt-3 text-lg font-extrabold text-[#00450d]">
            Quét mã trên bao bì để bắt đầu
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5a6357]">
            Cho phép truy cập camera hoặc nhập mã QR để xem thông tin sản phẩm,
            lô thu hoạch, nhật ký canh tác và chứng nhận kiểm định.
          </p>
        </section>
      )}

      {isLoading && (
        <div
          role="status"
          className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-8 text-center text-sm font-semibold text-[#5a6357]"
        >
          Đang tải thông tin truy xuất...
        </div>
      )}

      {errorMessage && (
        <section
          role="alert"
          className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          <p className="font-bold">{errorMessage}</p>
          {code && (
            <button
              type="button"
              onClick={() => setReloadCount((current) => current + 1)}
              className="mt-3 min-h-10 rounded-xl border border-red-300 px-4 font-bold hover:bg-red-100"
            >
              Thử tải lại
            </button>
          )}
        </section>
      )}

      {trace && !isLoading && (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-950 to-[#006e1c] p-5 text-white shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                {trace.product?.image_url ? (
                  <img
                    src={trace.product.image_url}
                    alt={trace.product.name || "Sản phẩm truy xuất"}
                    className="h-20 w-20 shrink-0 rounded-2xl bg-white/10 object-cover"
                  />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                    <Leaf className="h-9 w-9 text-emerald-100" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    Sản phẩm truy xuất
                  </p>
                  <h2 className="mt-1 break-words text-xl font-extrabold sm:text-2xl">
                    {trace.product?.name || "Nông sản"}
                  </h2>
                  <p className="mt-2 break-all text-sm text-emerald-100">
                    Mã QR: {trace.qr_code}
                  </p>
                  {trace.product?.id && (
                    <Link
                      to={`/products/${trace.product.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-white underline underline-offset-2"
                    >
                      Xem chi tiết sản phẩm
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                Đã xác thực mã lô
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5">
              <div className="flex items-center gap-2 text-[#006e1c]">
                <MapPin className="h-5 w-5" />
                <h2 className="font-extrabold text-[#00450d]">Nông trại</h2>
              </div>
              <p className="mt-3 font-bold text-[#191c1b]">
                {trace.farm?.name || "Chưa cập nhật"}
              </p>
              {trace.farm?.address && (
                <p className="mt-1 text-sm leading-6 text-[#5a6357]">
                  {trace.farm.address}
                </p>
              )}
              {trace.plot?.name && (
                <p className="mt-2 text-sm text-[#41493e]">
                  Lô canh tác: <span className="font-semibold">{trace.plot.name}</span>
                </p>
              )}
              {trace.season?.name && (
                <p className="mt-1 text-sm text-[#41493e]">
                  Mùa vụ: <span className="font-semibold">{trace.season.name}</span>
                </p>
              )}
            </article>

            <article className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5">
              <div className="flex items-center gap-2 text-[#006e1c]">
                <PackageCheck className="h-5 w-5" />
                <h2 className="font-extrabold text-[#00450d]">Thông tin lô hàng</h2>
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-[#5a6357]">Ngày thu hoạch</dt>
                  <dd className="font-semibold text-[#191c1b]">
                    {formatDate(trace.batch?.harvest_date)}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-[#5a6357]">Hạn sử dụng</dt>
                  <dd className={batchExpired ? "font-bold text-red-700" : "font-semibold text-[#191c1b]"}>
                    {formatDate(trace.batch?.expiry_date)}
                    {batchExpired && " · Đã hết hạn"}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-[#5a6357]">Ngày gieo trồng</dt>
                  <dd className="font-semibold text-[#191c1b]">
                    {formatDate(trace.plot?.planting_date)}
                  </dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#006e1c]" />
              <h2 className="text-lg font-extrabold text-[#00450d]">
                Chứng nhận kiểm định
              </h2>
            </div>
            {trace.certifications?.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {trace.certifications.map((certificate) => (
                  <li
                    key={certificate.id}
                    className="rounded-2xl bg-[#f8faf8] p-4"
                  >
                    <p className="break-words font-bold text-[#191c1b]">
                      {certificate.name}
                    </p>
                    <p className="mt-1 text-sm text-[#5a6357]">
                      Đơn vị cấp: {certificate.issuer}
                    </p>
                    <p className="mt-1 text-xs text-[#5a6357]">
                      Ngày cấp: {formatDate(certificate.issued_date)} · Hạn chứng nhận:{" "}
                      {formatDate(certificate.expiry_date)}
                    </p>
                    {certificate.file_url && (
                      <a
                        href={certificate.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-[#006e1c] hover:text-[#00450d]"
                      >
                        Xem chứng nhận
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#5a6357]">
                Lô hàng chưa có chứng nhận kiểm định được công khai.
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#006e1c]" />
              <h2 className="text-lg font-extrabold text-[#00450d]">
                Nhật ký canh tác
              </h2>
            </div>
            <QrTraceTimeline entries={trace.cultivation_logs || []} />
          </section>

          <p className="text-center text-xs text-[#5a6357]">
            Mã QR đã được quét {Number(trace.scan_count || 0).toLocaleString("vi-VN")} lần.
          </p>
        </div>
      )}
    </div>
  );
}
