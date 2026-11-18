/* Thanh điều khiển phân trang dùng chung cho bảng và danh sách sản phẩm. */
import { ChevronLeft, ChevronRight } from "lucide-react";

function buildPageRange(currentPage, lastPage) {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(lastPage - 1, currentPage + 1);

  if (start > 2) pages.push("ellipsis-left");
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  if (end < lastPage - 1) pages.push("ellipsis-right");
  pages.push(lastPage);

  return pages;
}

export default function Pagination({
  currentPage = 1,
  lastPage = 1,
  total = 0,
  perPage = 12,
  onPageChange,
  itemLabel = "sản phẩm",
}) {
  if (total <= 0 || typeof onPageChange !== "function") {
    return null;
  }

  const safeLastPage = Math.max(1, lastPage);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeLastPage);
  const pages = buildPageRange(safeCurrentPage, safeLastPage);
  const startItem = (safeCurrentPage - 1) * perPage + 1;
  const endItem = Math.min(total, safeCurrentPage * perPage);

  return (
    <nav
      aria-label="Phân trang danh sách"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#c0c9bb]/30"
    >
      <p className="text-[13px] text-[#5a6357] tabular-nums">
        Hiển thị{" "}
        <span className="font-bold text-[#191c1b]">
          {startItem}–{endItem}
        </span>{" "}
        trên tổng số <span className="font-bold text-[#191c1b]">{total}</span>{" "}
        {itemLabel}{" "}
        <span className="text-[#5a6357]/85">({perPage} / trang)</span>
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          aria-label="Trang trước"
          className="min-w-[38px] min-h-[38px] px-2.5 rounded-xl border border-[#c0c9bb]/50 bg-white text-[#41493e] hover:border-[#00450d]/50 hover:text-[#00450d] disabled:opacity-45 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((entry) => {
          if (typeof entry !== "number") {
            return (
              <span
                key={entry}
                className="px-2 text-[13px] font-semibold text-[#5a6357] select-none"
              >
                ...
              </span>
            );
          }

          const isActive = entry === safeCurrentPage;
          return (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={isActive ? "page" : undefined}
              className={`min-w-[38px] min-h-[38px] px-3 rounded-xl text-[13px] font-bold tabular-nums transition-all cursor-pointer ${
                isActive
                  ? "bg-[#00450d] text-white shadow-xs"
                  : "bg-white text-[#41493e] border border-[#c0c9bb]/50 hover:border-[#00450d]/50 hover:text-[#00450d]"
              }`}
            >
              {entry}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeLastPage, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= safeLastPage}
          aria-label="Trang kế tiếp"
          className="min-w-[38px] min-h-[38px] px-2.5 rounded-xl border border-[#c0c9bb]/50 bg-white text-[#41493e] hover:border-[#00450d]/50 hover:text-[#00450d] disabled:opacity-45 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
