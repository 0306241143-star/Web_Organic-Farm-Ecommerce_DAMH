//Dropdown chọn danh mục khóa cứng chiều

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function CategoryDropdown({
  categories = [],
  value,
  onChange,
  placeholder = "Tất cả danh mục",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const selected = categories.find((c) => String(c.id) === String(value));

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full min-w-0 px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          open
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20"
            : "border-slate-200 hover:border-slate-300 hover:bg-white"
        }`}
      >
        <span className={`truncate flex-1 ${selected ? "font-semibold text-slate-800" : "text-slate-500"}`}>
          {selected ? selected.name : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
            open ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-40 w-full max-w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-1.5 space-y-0.5 max-h-56 overflow-y-auto"
        >
          {placeholder === "Tất cả danh mục" && (
            <button
              type="button"
              onClick={() => {
                onChange("ALL");
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer ${
                value === "ALL" || !value
                  ? "bg-emerald-50 text-emerald-900 font-bold"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span>Tất cả danh mục</span>
              {(value === "ALL" || !value) && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
            </button>
          )}
          {categories.map((cat) => {
            const isSelected = String(value) === String(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(String(cat.id));
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-900 font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate flex-1">{cat.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}