import { ShieldCheck } from "lucide-react";

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

  return (
    <div className="mt-10 grid lg:grid-cols-2 gap-5">
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

      {product.description && (
        <section className="lg:col-span-2 rounded-3xl border border-[#c0c9bb]/35 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-[#00450d]">
            Mô tả sản phẩm
          </h2>
          <p className="mt-3 break-words whitespace-pre-line text-sm leading-7 text-[#41493e]">
            {product.description}
          </p>
        </section>
      )}

    </div>
  );
}
