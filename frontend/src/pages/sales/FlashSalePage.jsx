import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import FlashSaleCampaignCard from "../../components/sales/FlashSaleCampaignCard";
import FlashSaleForm from "../../components/sales/FlashSaleForm";
import Pagination from "../../components/common/Pagination";
import { salesApi } from "../../services/salesApi";

const emptyMeta = { current_page: 1, last_page: 1, per_page: 10, total: 0 };

export default function FlashSalePage() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStatus, setCampaignStatus] = useState("ALL");
  const [campaignPage, setCampaignPage] = useState(1);
  const [campaignMeta, setCampaignMeta] = useState(emptyMeta);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignReload, setCampaignReload] = useState(0);
  const [batches, setBatches] = useState([]);
  const [batchSearch, setBatchSearch] = useState("");
  const [batchLoading, setBatchLoading] = useState(true);
  const [batchReload, setBatchReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busyCampaignId, setBusyCampaignId] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    salesApi
      .getFlashSales({
        status: campaignStatus,
        page: campaignPage,
        per_page: 10,
      })
      .then((response) => {
        if (!active) return;
        setCampaigns(response.data || []);
        setCampaignMeta(response.meta || emptyMeta);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải chương trình Flash Sale.");
      })
      .finally(() => {
        if (active) setCampaignLoading(false);
      });

    return () => {
      active = false;
    };
  }, [campaignStatus, campaignPage, campaignReload]);

  useEffect(() => {
    let active = true;
    salesApi
      .getInventory({
        status: "ALL",
        search: batchSearch || undefined,
        per_page: 50,
      })
      .then((response) => {
        if (active) setBatches(response.data || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải danh sách lô hàng.");
      })
      .finally(() => {
        if (active) setBatchLoading(false);
      });

    return () => {
      active = false;
    };
  }, [batchSearch, batchReload]);

  const createCampaign = async (data) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await salesApi.createFlashSale(data);
      setNotice(response.message || "Đã tạo chương trình Flash Sale.");
      setFormKey((value) => value + 1);
      setCampaignLoading(true);
      setCampaignReload((value) => value + 1);
      setBatchLoading(true);
      setBatchReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message || "Không thể tạo chương trình Flash Sale.");
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign, enabled) => {
    setBusyCampaignId(campaign.campaign_id);
    setError("");
    setNotice("");
    try {
      const response = await salesApi.setFlashSaleEnabled(campaign.campaign_id, enabled);
      setNotice(response.message || "Đã cập nhật trạng thái chương trình.");
      setCampaignLoading(true);
      setCampaignReload((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message || "Không thể cập nhật chương trình Flash Sale.");
    } finally {
      setBusyCampaignId(null);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#006e1c]">
          Bán hàng & chăm sóc khách hàng
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#00450d]">
          <Flame className="h-6 w-6" />
          Quản lý Flash Sale
        </h1>
        <p className="mt-1 text-sm text-[#5a6357]">
          Tạo khuyến mãi theo lô hàng, giới hạn số lượng và bật/tắt chương trình.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <FlashSaleForm
        key={formKey}
        batches={batches}
        batchSearch={batchSearch}
        onBatchSearchChange={(value) => {
          setBatchLoading(true);
          setError("");
          setBatchSearch(value);
        }}
        loadingBatches={batchLoading}
        saving={saving}
        onSubmit={createCampaign}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#00450d]">Các chương trình đã tạo</h2>
            <p className="text-xs text-[#5a6357]">{campaignMeta.total} chương trình</p>
          </div>
          <label className="grid gap-1.5 text-xs font-bold text-[#5a6357]">
            Trạng thái chương trình
            <select
              value={campaignStatus}
              onChange={(event) => {
                setCampaignLoading(true);
                setCampaignStatus(event.target.value);
                setCampaignPage(1);
              }}
              className="min-w-52 rounded-xl border border-[#c0c9bb]/60 bg-white px-3 py-2.5 text-sm text-[#191c1b] outline-none focus:border-[#006e1c]"
            >
              <option value="ALL">Tất cả</option>
              <option value="Dang_dien_ra">Đang bật</option>
              <option value="Sap_dien_ra">Tạm tắt / sắp diễn ra</option>
              <option value="Da_ket_thuc">Đã kết thúc</option>
            </select>
          </label>
        </div>

        {campaignLoading ? (
          <div className="rounded-2xl border border-[#c0c9bb]/40 bg-white py-12 text-center text-sm text-[#5a6357]">
            Đang tải chương trình...
          </div>
        ) : campaigns.length > 0 ? (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <FlashSaleCampaignCard
                key={campaign.campaign_id}
                campaign={campaign}
                busy={busyCampaignId === campaign.campaign_id}
                onToggle={toggleCampaign}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#c0c9bb]/60 bg-white py-12 text-center text-sm text-[#5a6357]">
            Chưa có chương trình Flash Sale.
          </div>
        )}

        <Pagination
          currentPage={campaignMeta.current_page}
          lastPage={campaignMeta.last_page}
          total={campaignMeta.total}
          perPage={campaignMeta.per_page}
          onPageChange={(nextPage) => {
            setCampaignLoading(true);
            setCampaignPage(nextPage);
          }}
          itemLabel="chương trình"
        />
      </section>
    </div>
  );
}
