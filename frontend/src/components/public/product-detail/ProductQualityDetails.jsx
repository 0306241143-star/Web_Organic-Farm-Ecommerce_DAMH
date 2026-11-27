import { Link } from "react-router-dom";
import {
  CalendarDays,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import QrTraceTimeline from "../QrTraceTimeline";

function formatDate(value) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN").format(date);
}

export default function ProductQualityDetails({ product }) {
  const certifications = Array.isArray(product.certifications)
    ? product.certifications
    : [];
  const cultivationLogs = Array.isArray(product.cultivation_logs)
    ? product.cultivation_logs
    : [];
  const qrCode = product.trace_qr_code || product.trace_batch?.qr_code || "";
  const traceBatch = product.trace_batch || null;
  const tracePath = qrCode ? `/trace/${encodeURIComponent(qrCode)}` : "";

  return (
    <div id="product-traceability-section" className="mt-10 space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Khối 1: Mã QR Truy xuất nguồn gốc lô hàng */}
        <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-[#f4fbf6] to-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-[#006e1c]" />
              <h2 className="text-lg font-extrabold text-[#00450d]">
                Truy xuất nguồn gốc &amp; Mã QR
              </h2>
            </div>
            {qrCode && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-[#00450d]">
                {qrCode}
              </span>
            )}
          </div>

          {qrCode ? (
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="mx-auto flex h-44 w-44 shrink-0 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-white p-2.5 shadow-2xs sm:mx-0">
                {product.trace_qr_data_uri ? (
                  <img
                    src={product.trace_qr_data_uri}
                    alt={`Mã QR truy xuất nguồn gốc ${qrCode}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <QrCode className="h-28 w-28 text-[#00450d]" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2.5 text-sm">
                <p className="leading-6 text-[#41493e]">
                  Quét mã QR bằng camera điện thoại hoặc bấm liên kết bên dưới để
                  kiểm tra trọn vẹn hành trình canh tác của lô hàng.
                </p>

                {traceBatch && (
                  <dl className="grid grid-cols-2 gap-2 rounded-2xl border border-[#c0c9bb]/35 bg-white/90 p-3 text-xs">
                    <div>
                      <dt className="text-[#5a6357]">Lô canh tác</dt>
                      <dd className="mt-0.5 truncate font-bold text-[#191c1b]">
                        {traceBatch.plot_name || "Đang cập nhật"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#5a6357]">Ngày gieo trồng</dt>
                      <dd className="mt-0.5 font-bold text-[#191c1b]">
                        {formatDate(traceBatch.planting_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#5a6357]">Ngày thu hoạch</dt>
                      <dd className="mt-0.5 font-bold text-[#006e1c]">
                        {formatDate(traceBatch.harvest_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#5a6357]">Hạn sử dụng</dt>
                      <dd className="mt-0.5 font-bold text-[#191c1b]">
                        {formatDate(traceBatch.expiry_date)}
                      </dd>
                    </div>
                  </dl>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <Link
                    to={tracePath}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#00450d] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#006e1c]"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Mở trang truy xuất nguồn gốc
                  </Link>
                  <a
                    href={tracePath}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#006e1c]/40 bg-white px-3 py-2 text-xs font-bold text-[#006e1c] transition-colors hover:bg-emerald-50"
                  >
                    <span>Mở tab mới</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-[#f8faf8] p-4 text-sm text-[#5a6357]">
              Sản phẩm hiện chưa gắn mã QR truy xuất cho lô hàng mở bán.
            </p>
          )}
        </section>

        {/* Khối 2: Chứng nhận chất lượng */}
        <section className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#006e1c]" />
            <h2 className="text-lg font-extrabold text-[#00450d]">
              Chứng nhận chất lượng
            </h2>
          </div>
          {certifications.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {certifications.map((certification) => (
                <li
                  key={`${certification.id}-${certification.batch_id || "product"}`}
                  className="rounded-2xl bg-[#f8faf8] p-4"
                >
                  <p className="break-words font-bold text-[#191c1b]">
                    {certification.standard || certification.name}
                  </p>
                  {certification.standard !== certification.name && (
                    <p className="mt-1 break-words text-sm text-[#41493e]">
                      {certification.name}
                    </p>
                  )}
                  {certification.issuer && (
                    <p className="mt-1 text-xs text-[#5a6357]">
                      Đơn vị cấp: {certification.issuer}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#5a6357]">
                    Hiệu lực đến: {formatDate(certification.expires_at)}
                  </p>
                  {certification.file_url && (
                    <a
                      href={certification.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-xs font-bold text-[#006e1c] hover:text-[#00450d]"
                    >
                      Xem tệp chứng nhận
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[#5a6357]">
              Sản phẩm chưa có thông tin chứng nhận.
            </p>
          )}
        </section>
      </div>

      {/* Khối 3: Nhật ký canh tác thực tế tại nông trại */}
      <section className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#006e1c]" />
            <h2 className="text-lg font-extrabold text-[#00450d]">
              Nhật ký canh tác
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {traceBatch?.plot_name && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#c0c9bb]/40 bg-[#f8faf8] px-3 py-1 font-semibold text-[#41493e]">
                <Sprout className="h-3.5 w-3.5 text-[#006e1c]" />
                {traceBatch.plot_name}
              </span>
            )}
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-bold text-[#006e1c]">
              {cultivationLogs.length} mốc ghi nhận
            </span>
          </div>
        </div>
        <QrTraceTimeline entries={cultivationLogs} />
      </section>

      {/* Khối 4: Mô tả sản phẩm */}
      {product.description && (
        <section className="rounded-3xl border border-[#c0c9bb]/35 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-[#00450d]">
            Mô tả sản phẩm
          </h2>
          <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-[#41493e]">
            {product.description}
          </p>
        </section>
      )}
    </div>
  );
}