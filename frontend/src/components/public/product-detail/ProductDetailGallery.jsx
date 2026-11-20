import { useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, QrCode } from "lucide-react";

export default function ProductDetailGallery({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(product.image_url) && !imageFailed;

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-[#c0c9bb]/35 bg-[#f2f4f2]">
      {showImage ? (
        <img
          src={product.image_url}
          alt={product.name}
          onError={() => setImageFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-50 to-lime-50 text-[#006e1c]">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-[#c0c9bb]/35 bg-white/85">
            <Leaf className="h-10 w-10" aria-hidden="true" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider">
            {product.category?.name || "Nông sản sạch"}
          </span>
        </div>
      )}
      {product.trace_qr_code && (
        <Link
          to={`/trace/${encodeURIComponent(product.trace_qr_code)}`}
          title={`Truy xuất nguồn gốc mã ${product.trace_qr_code}`}
          aria-label={`Truy xuất nguồn gốc ${product.name}`}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-xl border border-[#c0c9bb]/40 bg-white/95 text-[#00450d] shadow-xs transition-colors hover:bg-[#00450d] hover:text-white"
        >
          <QrCode className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
