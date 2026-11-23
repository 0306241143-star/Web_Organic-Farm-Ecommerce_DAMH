/* Admin system settings page orchestrating Page 1 (Shipping & Loyalty) and Page 2 (Farm Profile & Images). */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  SlidersHorizontal,
  Sprout,
} from "lucide-react";
import { adminApi } from "../../services/adminApi";
import { showGlobalToast, confirmGlobalDialog } from "../../components/GlobalToast";
import ShippingSettingTab from "../../components/admin/settings/ShippingSettingTab";
import LoyaltySettingTab from "../../components/admin/settings/LoyaltySettingTab";
import FarmProfileSettingTab from "../../components/admin/settings/FarmProfileSettingTab";

const DEFAULT_SHIPPING_RATE = 2000;
const DEFAULT_POINT_VALUE = 1000;

export default function SystemSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activePage = searchParams.get("tab") === "farm" ? "farm" : "general";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // State cho Page 1 (Phí vận chuyển & Điểm thưởng Loyalty)
  const [savedValues, setSavedValues] = useState({
    don_gia_ship_km: String(DEFAULT_SHIPPING_RATE),
    diem_quy_doi_vnd: String(DEFAULT_POINT_VALUE),
  });
  const [form, setForm] = useState({
    don_gia_ship_km: String(DEFAULT_SHIPPING_RATE),
    diem_quy_doi_vnd: String(DEFAULT_POINT_VALUE),
  });

  // State cho Page 2 (Thông tin & Hình ảnh nông trại)
  const [savedFarmSnapshot, setSavedFarmSnapshot] = useState("");
  const [farmForm, setFarmForm] = useState({
    Ten_nong_trai: "",
    Dia_chi: "",
    Vi_do: "10.9985000",
    Kinh_do: "106.5123000",
    Cau_chuyen_thuong_hieu: "",
    Triet_ly_canh_tac: "",
    Ho_so_nang_luc: "",
  });
  const [existingFarmImages, setExistingFarmImages] = useState([]);
  const [newFarmImageFiles, setNewFarmImageFiles] = useState([]);
  const [externalFarmImageUrls, setExternalFarmImageUrls] = useState([]);

  const buildFarmSnapshot = (fForm, imgs) =>
    JSON.stringify({
      ...fForm,
      images: imgs.map((i) => ({ id: i.id, caption: i.caption || "" })),
    });

  const fetchAllSettings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [settingRes, farmRes] = await Promise.allSettled([
      adminApi.getSettings(),
      adminApi.getFarmSettings(),
    ]);

    if (settingRes.status === "fulfilled") {
      const payload = settingRes.value?.data?.data ?? settingRes.value?.data ?? {};
      const shipRate = String(payload.don_gia_ship_km ?? DEFAULT_SHIPPING_RATE);
      const pointVal = String(payload.diem_quy_doi_vnd ?? DEFAULT_POINT_VALUE);

      setSavedValues({
        don_gia_ship_km: shipRate,
        diem_quy_doi_vnd: pointVal,
      });
      setForm({
        don_gia_ship_km: shipRate,
        diem_quy_doi_vnd: pointVal,
      });
    }

    if (farmRes.status === "fulfilled") {
      const farm = farmRes.value?.data?.data ?? farmRes.value?.data ?? {};
      const nextFarmForm = {
        Ten_nong_trai: farm.name || "",
        Dia_chi: farm.address || "",
        Vi_do: String(farm.latitude ?? "10.9985000"),
        Kinh_do: String(farm.longitude ?? "106.5123000"),
        Cau_chuyen_thuong_hieu: farm.brand_story || "",
        Triet_ly_canh_tac: farm.farming_philosophy || "",
        Ho_so_nang_luc: farm.capacity_profile || "",
      };
      const imgs = Array.isArray(farm.images) ? farm.images : [];
      setFarmForm(nextFarmForm);
      setExistingFarmImages(imgs);
      setNewFarmImageFiles([]);
      setExternalFarmImageUrls([]);
      setSavedFarmSnapshot(buildFarmSnapshot(nextFarmForm, imgs));
    }

    if (settingRes.status === "rejected" || farmRes.status === "rejected") {
      const err =
        settingRes.status === "rejected" ? settingRes.reason : farmRes.reason;
      showGlobalToast(
        err?.response?.data?.message || "Không thể tải đầy đủ dữ liệu cấu hình.",
        "error"
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAllSettings(false);
  }, [fetchAllSettings]);

  const switchSubPage = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "farm") next.set("tab", "farm");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const isNumericDirty = useMemo(() => {
    return (
      Number(form.don_gia_ship_km) !== Number(savedValues.don_gia_ship_km) ||
      Number(form.diem_quy_doi_vnd) !== Number(savedValues.diem_quy_doi_vnd)
    );
  }, [form, savedValues]);

  const isFarmDirty = useMemo(() => {
    if (newFarmImageFiles.length > 0 || externalFarmImageUrls.length > 0) {
      return true;
    }
    return buildFarmSnapshot(farmForm, existingFarmImages) !== savedFarmSnapshot;
  }, [
    farmForm,
    existingFarmImages,
    newFarmImageFiles.length,
    externalFarmImageUrls.length,
    savedFarmSnapshot,
  ]);

  const isDirty = activePage === "farm" ? isFarmDirty : isNumericDirty;

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (activePage === "farm") {
      if (!farmForm.Ten_nong_trai.trim() || !farmForm.Dia_chi.trim()) {
        showGlobalToast("Vui lòng nhập đầy đủ tên và địa chỉ cơ sở nông trại.", "error");
        return;
      }

      setSaving(true);
      try {
        const fd = new FormData();
        fd.append("Ten_nong_trai", farmForm.Ten_nong_trai.trim());
        fd.append("Dia_chi", farmForm.Dia_chi.trim());
        fd.append("Vi_do", String(farmForm.Vi_do));
        fd.append("Kinh_do", String(farmForm.Kinh_do));
        fd.append("Cau_chuyen_thuong_hieu", farmForm.Cau_chuyen_thuong_hieu || "");
        fd.append("Triet_ly_canh_tac", farmForm.Triet_ly_canh_tac || "");
        fd.append("Ho_so_nang_luc", farmForm.Ho_so_nang_luc || "");

        existingFarmImages.forEach((img, idx) => {
          fd.append(`existing_images[${idx}][id]`, String(img.id));
          fd.append(`existing_images[${idx}][caption]`, img.caption || "");
        });

        newFarmImageFiles.forEach((item, idx) => {
          fd.append("images[]", item.file);
          fd.append(`image_captions[${idx}]`, item.caption || "");
        });

        externalFarmImageUrls.forEach((url) => {
          fd.append("image_urls[]", url);
        });

        const res = await adminApi.updateFarmSettings(fd);
        const updated = res?.data?.data ?? {};
        const nextFarmForm = {
          Ten_nong_trai: updated.name ?? farmForm.Ten_nong_trai,
          Dia_chi: updated.address ?? farmForm.Dia_chi,
          Vi_do: String(updated.latitude ?? farmForm.Vi_do),
          Kinh_do: String(updated.longitude ?? farmForm.Kinh_do),
          Cau_chuyen_thuong_hieu: updated.brand_story ?? "",
          Triet_ly_canh_tac: updated.farming_philosophy ?? "",
          Ho_so_nang_luc: updated.capacity_profile ?? "",
        };
        const nextImgs = Array.isArray(updated.images) ? updated.images : existingFarmImages;

        newFarmImageFiles.forEach((item) => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });

        setFarmForm(nextFarmForm);
        setExistingFarmImages(nextImgs);
        setNewFarmImageFiles([]);
        setExternalFarmImageUrls([]);
        setSavedFarmSnapshot(buildFarmSnapshot(nextFarmForm, nextImgs));

        window.dispatchEvent(
          new CustomEvent("farm-info-updated", { detail: { address: nextFarmForm.Dia_chi } })
        );
        showGlobalToast("Đã lưu thông tin và bộ sưu tập hình ảnh nông trại!");
      } catch (err) {
        showGlobalToast(
          err?.response?.data?.message || "Không thể lưu thông tin nông trại.",
          "error"
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    // Lưu cấu hình Page 1 (Ship + Điểm thưởng)
    const shipRate = Number(form.don_gia_ship_km);
    const pointVal = Number(form.diem_quy_doi_vnd);

    if (!Number.isFinite(shipRate) || shipRate < 1 || shipRate > 10000000) {
      showGlobalToast("Đơn giá giao hàng/km phải từ 1đ đến 10.000.000đ.", "error");
      return;
    }
    if (!Number.isInteger(pointVal) || pointVal < 1 || pointVal > 10000000) {
      showGlobalToast("Giá trị quy đổi 1 điểm thưởng phải là số nguyên từ 1đ trở lên.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await adminApi.updateSettings({
        don_gia_ship_km: shipRate,
        diem_quy_doi_vnd: pointVal,
      });
      const updated = res?.data?.data ?? {};
      const nextShip = String(updated.don_gia_ship_km ?? shipRate);
      const nextPoint = String(updated.diem_quy_doi_vnd ?? pointVal);

      setSavedValues({
        don_gia_ship_km: nextShip,
        diem_quy_doi_vnd: nextPoint,
      });
      setForm({
        don_gia_ship_km: nextShip,
        diem_quy_doi_vnd: nextPoint,
      });

      showGlobalToast("Đã lưu cấu hình tham số hệ thống thành công!");
    } catch (err) {
      showGlobalToast(
        err?.response?.data?.message || "Không thể cập nhật cấu hình hệ thống.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    const confirmed = await confirmGlobalDialog({
      title: "Khôi phục tham số mặc định?",
      message: `Đặt lại đơn giá giao hàng về ${DEFAULT_SHIPPING_RATE.toLocaleString("vi-VN")}đ/km và quy đổi điểm thưởng về ${DEFAULT_POINT_VALUE.toLocaleString("vi-VN")}đ/điểm?`,
      confirmLabel: "Đặt Lại Mặc Định",
      variant: "warning",
    });
    if (!confirmed) return;

    setForm({
      don_gia_ship_km: String(DEFAULT_SHIPPING_RATE),
      diem_quy_doi_vnd: String(DEFAULT_POINT_VALUE),
    });
  };

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* KHỐI CỐ ĐỊNH SÁT MÉP TRÊN: Tiêu đề + Nút hành động + 2 Page */}
      <div className="shrink-0 z-20 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3.5 pb-3 space-y-3">
          {/* Hàng 1: Tiêu đề & Nút Lưu / Làm mới */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider">
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span>Thiết Lập Vận Hành & Hồ Sơ Nông Trại</span>
              </div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                  {activePage === "general"
                    ? "Cấu Hình Phí Vận Chuyển & Điểm Thưởng"
                    : "Cấu Hình Thông Tin & Hình Ảnh Nông Trại"}
                </h1>
                {isDirty && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 text-[10.5px] font-bold shrink-0">
                    Chưa lưu thay đổi
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fetchAllSettings(true)}
                disabled={refreshing || saving}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                title="Tải lại dữ liệu từ máy chủ"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
                />
              </button>

              {activePage === "general" && (
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  disabled={saving}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Đưa các ô nhập về giá trị mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mặc định</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading || !isDirty}
                className="px-4 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? "Đang lưu..." : "Lưu Cấu Hình"}</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Thanh chuyển 2 Page */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
              <button
                type="button"
                onClick={() => switchSubPage("general")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  activePage === "general"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Page 1: Phí vận chuyển & Điểm thưởng</span>
              </button>

              <button
                type="button"
                onClick={() => switchSubPage("farm")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  activePage === "farm"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Sprout className="w-3.5 h-3.5" />
                <span>Page 2: Thông tin & Hình ảnh nông trại</span>
                <span
                  className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-extrabold tabular-nums ${
                    activePage === "farm"
                      ? "bg-white/25 text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  {existingFarmImages.length}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/70 tabular-nums">
                Ship:{" "}
                <strong>{Number(savedValues.don_gia_ship_km).toLocaleString("vi-VN")}đ/km</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/70 tabular-nums">
                1 điểm ={" "}
                <strong>{Number(savedValues.diem_quy_doi_vnd).toLocaleString("vi-VN")}đ</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VÙNG NỘI DUNG TỪNG PAGE (CUỘN ĐỘC LẬP) */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5">
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-medium">
                Đang tải cấu hình tham số hệ thống...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              {activePage === "general" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ShippingSettingTab
                    value={form.don_gia_ship_km}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, don_gia_ship_km: val }))
                    }
                  />
                  <LoyaltySettingTab
                    value={form.diem_quy_doi_vnd}
                    onChange={(val) =>
                      setForm((prev) => ({ ...prev, diem_quy_doi_vnd: val }))
                    }
                  />
                </div>
              ) : (
                <FarmProfileSettingTab
                  farmForm={farmForm}
                  onChangeField={(field, val) =>
                    setFarmForm((prev) => ({ ...prev, [field]: val }))
                  }
                  existingImages={existingFarmImages}
                  onUpdateExistingImages={setExistingFarmImages}
                  newImageFiles={newFarmImageFiles}
                  onChangeNewImageFiles={setNewFarmImageFiles}
                  externalUrls={externalFarmImageUrls}
                  onChangeExternalUrls={setExternalFarmImageUrls}
                />
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}