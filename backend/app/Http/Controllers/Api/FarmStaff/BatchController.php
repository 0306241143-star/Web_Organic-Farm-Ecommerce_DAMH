<?php

/*
 * Luồng nhân viên nông trại: quản lý lô thu hoạch, tạo lô từ mốc thu hoạch, sinh QR và ghi nhận hao hụt (CV04.18, CV04.20, CV04.21).
 */

namespace App\Http\Controllers\Api\FarmStaff;

use App\Http\Controllers\Controller;
use App\Http\Requests\FarmStaff\StoreBatchRequest;
use App\Models\BienDongKho;
use App\Models\LoCanhTac;
use App\Models\LoHang;
use App\Models\MaQrTruyXuat;
use App\Models\NhatKyCanhTac;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BatchController extends Controller
{
    use ApiResponse;

    /**
     * Danh sách tất cả các lô hàng thu hoạch kèm thống kê tồn kho.
     */
    public function index(Request $request): JsonResponse
    {
        $query = LoHang::with([
            'loCanhTac.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Hinh_anh_dai_dien',
            'loCanhTac.muaVu:Ma_mua_vu,Ten_mua_vu',
            'nhanVienPhuTrach:Ma_nguoi_dung,Ho_ten',
            'maQrTruyXuat',
            'bienDongKhos',
            'chungNhans',
        ])->latest('created_at');

        // Tìm kiếm theo từ khóa: mã lô, tên lô, tên nông sản, mã QR
        if ($request->filled('search')) {
            $keyword = trim($request->query('search'));
            $query->where(function ($q) use ($keyword) {
                $q->where('Ma_lo_hang', $keyword)
                    ->orWhereHas('loCanhTac', function ($plotQ) use ($keyword) {
                        $plotQ->where('Ten_lo', 'like', "%{$keyword}%")
                            ->orWhereHas('sanPham', function ($prodQ) use ($keyword) {
                                $prodQ->where('Ten_san_pham', 'like', "%{$keyword}%");
                            });
                    })
                    ->orWhereHas('maQrTruyXuat', function ($qrQ) use ($keyword) {
                        $qrQ->where('Chuoi_ma_qr', 'like', "%{$keyword}%");
                    });
            });
        }

        // Lọc theo trạng thái lô hàng
        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('Trang_thai', $request->query('status'));
        }

        // Lọc theo lô canh tác
        if ($request->filled('plot_id')) {
            $query->where('Ma_lo_canh_tac', $request->query('plot_id'));
        }

        $batches = $query->get()->map(function ($batch) {
            return $this->formatBatchResource($batch);
        });

        // Thống kê nhanh phục vụ KPI Cards
        $now = Carbon::today();
        $allBatches = LoHang::all();
        $stats = [
            'total_batches'          => $allBatches->count(),
            'active_batches'         => $allBatches->where('Trang_thai', 'Con_hang')->count(),
            'expiring_soon_batches'  => $allBatches->where('Trang_thai', 'Sap_het_han')->count(),
            'depleted_batches'       => $allBatches->where('Trang_thai', 'Het_hang')->count(),
            'total_initial_qty'      => (float) $allBatches->sum('So_luong_thu_hoach'),
            'total_available_qty'    => (float) $allBatches->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])->sum('So_luong_con_lai'),
        ];

        return $this->successResponse(
            message: 'Lấy danh sách lô hàng thu hoạch thành công.',
            data: [
                'batches' => $batches,
                'stats'   => $stats,
            ]
        );
    }

    /**
     * Khởi tạo lô hàng thu hoạch mới (CV04.18 - Trỏ từ mốc Thu hoạch hoặc tạo trực tiếp).
     */
    public function store(StoreBatchRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $plotId = $validated['Ma_lo_canh_tac'];
        $plot = LoCanhTac::with(['sanPham', 'muaVu'])->findOrFail($plotId);

        $harvestDate = Carbon::parse($validated['Ngay_thu_hoach'])->toDateString();
        $expiryDate = Carbon::parse($validated['Han_su_dung'])->toDateString();
        $harvestQty = (float) $validated['So_luong_thu_hoach'];
        $staffId = Auth::id() ?? 1;

        // Tự động phân loại trạng thái ban đầu: nếu HSD cận hạn (<= 2 ngày) thì Sap_het_han, ngược lại Con_hang
        $daysUntilExpiry = Carbon::today()->diffInDays(Carbon::parse($expiryDate), false);
        $status = ($daysUntilExpiry <= 2 && $daysUntilExpiry >= 0) ? 'Sap_het_han' : 'Con_hang';

        $batch = DB::transaction(function () use ($plot, $staffId, $harvestDate, $expiryDate, $harvestQty, $status, $validated) {
            // 1. Tạo bản ghi lô hàng thu hoạch
            $newBatch = LoHang::create([
                'Ma_lo_canh_tac'          => $plot->Ma_lo_canh_tac,
                'Ma_nhan_vien_phu_trach'  => $staffId,
                'Ngay_thu_hoach'          => $harvestDate,
                'Han_su_dung'             => $expiryDate,
                'So_luong_thu_hoach'      => $harvestQty,
                'So_luong_con_lai'        => $harvestQty,
                'Trang_thai'              => $status,
            ]);

            // 2. Chuyển trạng thái lô canh tác sang 'Da_thu_hoach'
            if ($plot->Trang_thai !== 'Da_thu_hoach') {
                $plot->update(['Trang_thai' => 'Da_thu_hoach']);
            }

            // 3. Nếu lô canh tác chưa có bản ghi mốc 'Thu_hoach' trong nhật ký, tự động ghi nhận để đảm bảo truy xuất nguồn gốc (UC14.1)
            $existingHarvestLog = NhatKyCanhTac::where('Ma_lo_canh_tac', $plot->Ma_lo_canh_tac)
                ->where('Loai_hoat_dong', 'Thu_hoach')
                ->exists();

            if (! $existingHarvestLog) {
                $logNote = ! empty($validated['Ghi_chu'])
                    ? $validated['Ghi_chu']
                    : "Thu hoạch nông sản hoàn tất. Sản lượng đạt {$harvestQty} " . ($plot->sanPham?->Don_vi_tinh ?? 'kg') . ". Đã khởi tạo lô hàng thành phẩm #LH-" . $newBatch->Ma_lo_hang . " nhập kho bảo quản.";

                NhatKyCanhTac::create([
                    'Ma_lo_canh_tac'      => $plot->Ma_lo_canh_tac,
                    'Ma_nhan_vien'        => $staffId,
                    'Loai_hoat_dong'      => 'Thu_hoach',
                    'Thoi_gian_thuc_hien' => $harvestDate . ' ' . date('H:i:s'),
                    'Noi_dung'            => $logNote,
                ]);
            }

            // 4. Tự động sinh mã truy xuất QR định danh duy nhất cho lô (CV04.20)
            $qrCodeString = sprintf(
                'QR-LH%s-P%s-%03d',
                Carbon::parse($harvestDate)->format('Ymd'),
                $plot->Ma_lo_canh_tac,
                $newBatch->Ma_lo_hang
            );

            MaQrTruyXuat::create([
                'Ma_lo_hang'        => $newBatch->Ma_lo_hang,
                'Ma_nhan_vien_tao'  => $staffId,
                'Chuoi_ma_qr'       => $qrCodeString,
                'Duong_dan_anh_qr'  => "/uploads/qr/qr_lh_{$newBatch->Ma_lo_hang}.png",
                'So_luot_quet'      => 0,
            ]);

            return $newBatch;
        });

        // Xóa cache mùa vụ và nhật ký để đồng bộ dữ liệu tức thời
        Cache::forget('farm_seasons_all');
        Cache::forget("farm_logs_plot_{$plot->Ma_lo_canh_tac}");

        $batch->load([
            'loCanhTac.sanPham',
            'loCanhTac.muaVu',
            'nhanVienPhuTrach',
            'maQrTruyXuat',
            'bienDongKhos',
        ]);

        return $this->successResponse(
            message: "Tạo lô hàng thu hoạch #LH-{$batch->Ma_lo_hang} thành công.",
            data: $this->formatBatchResource($batch),
            status: 201
        );
    }

    /**
     * Chi tiết lô hàng thu hoạch kèm toàn bộ dòng thời gian canh tác truy xuất nguồn gốc.
     */
    public function show(int $id): JsonResponse
    {
        $batch = LoHang::with([
            'loCanhTac.sanPham',
            'loCanhTac.muaVu',
            'loCanhTac.nhatKyCanhTacs.tepNhatKys',
            'loCanhTac.nhatKyCanhTacs.nhanVien:Ma_nguoi_dung,Ho_ten',
            'nhanVienPhuTrach:Ma_nguoi_dung,Ho_ten',
            'maQrTruyXuat',
            'bienDongKhos.nhanVien:Ma_nguoi_dung,Ho_ten',
            'chungNhans',
        ])->findOrFail($id);

        $formatted = $this->formatBatchResource($batch);

        // Bổ sung timeline canh tác đầy đủ phục vụ modal truy xuất nguồn gốc
        $formatted['timeline'] = $batch->loCanhTac?->nhatKyCanhTacs
            ->sortBy('Thoi_gian_thuc_hien')
            ->values()
            ->map(function ($log) {
                return [
                    'id'            => $log->Ma_nhat_ky,
                    'activity_type' => $log->Loai_hoat_dong,
                    'action_time'   => $log->Thoi_gian_thuc_hien?->format('Y-m-d H:i:s'),
                    'content'       => $log->Noi_dung,
                    'staff_name'    => $log->nhanVien?->Ho_ten ?? 'Kỹ thuật viên',
                    'media'         => $log->tepNhatKys->map(fn ($m) => [
                        'id'   => $m->Ma_tep,
                        'type' => $m->Loai_tep,
                        'url'  => $m->Duong_dan,
                        'note' => $m->Mo_ta,
                    ]),
                ];
            });

        // Bổ sung lịch sử biến động kho (hao hụt, xuất hủy)
        $formatted['disposals'] = $batch->bienDongKhos->map(function ($bd) {
            return [
                'id'            => $bd->Ma_bien_dong,
                'type'          => $bd->Loai_bien_dong,
                'quantity'      => (float) $bd->So_luong,
                'reason'        => $bd->Ly_do,
                'recorded_at'   => $bd->Ngay_ghi_nhan,
                'staff_name'    => $bd->nhanVien?->Ho_ten ?? 'Nhân viên kho',
            ];
        });

        // Bổ sung chứng nhận & kết quả kiểm định gắn vào lô hàng
        $certController = app(CertificateController::class);
        $formatted['certificates'] = $batch->chungNhans
            ->sortByDesc('Ma_chung_nhan')
            ->values()
            ->map(fn ($cert) => $certController->formatCertificateResource($cert));

        return $this->successResponse(
            message: 'Lấy thông tin chi tiết lô hàng thu hoạch thành công.',
            data: $formatted
        );
    }

    /**
     * Cập nhật thông tin lô hàng (Hạn sử dụng, ghi chú, trạng thái).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $batch = LoHang::findOrFail($id);

        $validated = $request->validate([
            'expiry_date' => ['nullable', 'date', 'after_or_equal:' . $batch->Ngay_thu_hoach],
            'status'      => ['nullable', 'string', 'in:Con_hang,Sap_het_han,Het_hang,Da_huy'],
            'notes'       => ['nullable', 'string', 'max:500'],
        ], [
            'expiry_date.after_or_equal' => 'Hạn sử dụng phải sau hoặc bằng ngày thu hoạch.',
            'status.in'                  => 'Trạng thái lô hàng không hợp lệ.',
        ]);

        if (! empty($validated['expiry_date'])) {
            $batch->Han_su_dung = $validated['expiry_date'];
        }

        if (! empty($validated['status'])) {
            $batch->Trang_thai = $validated['status'];
        }

        $batch->save();

        $batch->load([
            'loCanhTac.sanPham',
            'loCanhTac.muaVu',
            'nhanVienPhuTrach',
            'maQrTruyXuat',
            'bienDongKhos',
        ]);

        return $this->successResponse(
            message: 'Cập nhật lô hàng thu hoạch thành công.',
            data: $this->formatBatchResource($batch)
        );
    }

    /**
     * Ghi nhận hao hụt / xuất hủy lô hàng nông sản (CV04.21 / UC18).
     */
    public function recordWastage(Request $request, int $id): JsonResponse
    {
        $batch = LoHang::findOrFail($id);

        $validated = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.01', 'max:' . $batch->So_luong_con_lai],
            'type'     => ['required', 'string', 'in:Hao_hut,Xuat_huy,Dieu_chinh'],
            'reason'   => ['required', 'string', 'max:255'],
        ], [
            'quantity.required' => 'Vui lòng nhập số lượng hao hụt / xuất hủy.',
            'quantity.max'      => "Số lượng xuất hủy ({$request->input('quantity')}) không được vượt quá số lượng tồn kho còn lại ({$batch->So_luong_con_lai}).",
            'type.in'           => 'Loại biến động kho không hợp lệ.',
            'reason.required'   => 'Vui lòng nhập lý do hao hụt hoặc xuất hủy.',
        ]);

        DB::transaction(function () use ($batch, $validated) {
            $staffId = Auth::id() ?? 1;
            $qty = (float) $validated['quantity'];

            // 1. Thêm bản ghi biến động kho
            BienDongKho::create([
                'Ma_lo_hang'     => $batch->Ma_lo_hang,
                'Ma_nhan_vien'   => $staffId,
                'Loai_bien_dong' => $validated['type'],
                'So_luong'       => $qty,
                'Ly_do'          => $validated['reason'],
                'Ngay_ghi_nhan'  => now(),
            ]);

            // 2. Trừ trực tiếp số lượng tồn kho của đúng lô hàng đó (UC18 Basic Flow 4)
            $newRemaining = max(0, (float) $batch->So_luong_con_lai - $qty);
            $batch->So_luong_con_lai = $newRemaining;
            
            $daysLeft = Carbon::today()->diffInDays(Carbon::parse($batch->Han_su_dung), false);
            if ($newRemaining == 0) {
                $batch->Trang_thai = 'Het_hang';
            } elseif ($daysLeft <= 2 && $daysLeft >= 0) {
                $batch->Trang_thai = 'Sap_het_han';
            }
            
            $batch->save();
        });

        $batch->load([
            'loCanhTac.sanPham',
            'loCanhTac.muaVu',
            'nhanVienPhuTrach',
            'maQrTruyXuat',
            'bienDongKhos',
        ]);

        return $this->successResponse(
            message: 'Ghi nhận hao hụt và cập nhật tồn kho thành công.',
            data: $this->formatBatchResource($batch)
        );
    }

    /**
     * Danh sách các lô canh tác đủ điều kiện tạo lô thu hoạch (Hỗ trợ luồng "Trỏ từ mốc Thu hoạch").
     */
    public function eligiblePlots(): JsonResponse
    {
        $plots = LoCanhTac::with([
            'sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Hinh_anh_dai_dien',
            'muaVu:Ma_mua_vu,Ten_mua_vu',
            'nhatKyCanhTacs' => function ($q) {
                $q->where('Loai_hoat_dong', 'Thu_hoach')->latest('Thoi_gian_thuc_hien');
            },
            'loHangs',
        ])
            ->orderByRaw("CASE WHEN Trang_thai = 'Dang_canh_tac' THEN 0 ELSE 1 END")
            ->latest('Ngay_gieo_trong')
            ->get()
            ->map(function ($plot) {
                $harvestLog = $plot->nhatKyCanhTacs->first();
                $existingBatchesCount = $plot->loHangs->count();

                return [
                    'id'                   => $plot->Ma_lo_canh_tac,
                    'plot_name'            => $plot->Ten_lo,
                    'area_m2'              => (float) $plot->Dien_tich,
                    'planting_date'        => $plot->Ngay_gieo_trong,
                    'status'               => $plot->Trang_thai,
                    'product_id'           => $plot->Ma_san_pham,
                    'product_name'         => $plot->sanPham?->Ten_san_pham,
                    'product_unit'         => $plot->sanPham?->Don_vi_tinh ?? 'kg',
                    'product_image'        => $plot->sanPham?->Hinh_anh_dai_dien,
                    'season_id'            => $plot->Ma_mua_vu,
                    'season_name'          => $plot->muaVu?->Ten_mua_vu,
                    'has_harvest_log'      => ! is_null($harvestLog),
                    'harvest_date'         => $harvestLog ? Carbon::parse($harvestLog->Thoi_gian_thuc_hien)->format('Y-m-d') : null,
                    'harvest_log_content'  => $harvestLog?->Noi_dung,
                    'existing_batches'     => $existingBatchesCount,
                ];
            });

        return $this->successResponse(
            message: 'Lấy danh sách lô canh tác sẵn sàng thu hoạch thành công.',
            data: $plots
        );
    }

    /**
     * Chuẩn hóa cấu trúc trả về của một Lô hàng thu hoạch.
     */
    private function formatBatchResource(LoHang $batch): array
    {
        $today = Carbon::today();
        $expiry = Carbon::parse($batch->Han_su_dung);
        $daysUntilExpiry = (int) $today->diffInDays($expiry, false);

        $statusLabel = match ($batch->Trang_thai) {
            'Con_hang'     => 'Còn hàng',
            'Sap_het_han'  => 'Sắp hết hạn',
            'Het_hang'     => 'Hết hàng',
            'Da_huy'       => 'Đã hủy',
            default        => $batch->Trang_thai,
        };

        $qr = $batch->maQrTruyXuat ? [
            'id'          => $batch->maQrTruyXuat->Ma_qr,
            'code'        => $batch->maQrTruyXuat->Chuoi_ma_qr,
            'image_url'   => $batch->maQrTruyXuat->Duong_dan_anh_qr,
            'scan_count'  => (int) $batch->maQrTruyXuat->So_luot_quet,
        ] : null;

        $batchCode = $qr['code'] ?? sprintf('LH-%s-%03d', Carbon::parse($batch->Ngay_thu_hoach)->format('Ymd'), $batch->Ma_lo_hang);

        return [
            'id'                   => $batch->Ma_lo_hang,
            'batch_code'           => $batchCode,
            'plot_id'              => $batch->Ma_lo_canh_tac,
            'plot_name'            => $batch->loCanhTac?->Ten_lo ?? "Lô #{$batch->Ma_lo_canh_tac}",
            'season_name'          => $batch->loCanhTac?->muaVu?->Ten_mua_vu ?? 'Mùa vụ chung',
            'product_id'           => $batch->loCanhTac?->Ma_san_pham,
            'product_name'         => $batch->loCanhTac?->sanPham?->Ten_san_pham ?? 'Nông sản hữu cơ',
            'product_unit'         => $batch->loCanhTac?->sanPham?->Don_vi_tinh ?? 'kg',
            'product_image'        => $batch->loCanhTac?->sanPham?->Hinh_anh_dai_dien,
            'staff_id'             => $batch->Ma_nhan_vien_phu_trach,
            'staff_name'           => $batch->nhanVienPhuTrach?->Ho_ten ?? 'Kỹ thuật viên nông trại',
            'harvest_date'         => Carbon::parse($batch->Ngay_thu_hoach)->format('Y-m-d'),
            'expiry_date'          => Carbon::parse($batch->Han_su_dung)->format('Y-m-d'),
            'days_until_expiry'    => $daysUntilExpiry,
            'is_expiring_soon'     => $batch->Trang_thai === 'Sap_het_han' || ($daysUntilExpiry <= 2 && $daysUntilExpiry >= 0),
            'harvest_quantity'     => (float) $batch->So_luong_thu_hoach,
            'remaining_quantity'   => (float) $batch->So_luong_con_lai,
            'status'               => $batch->Trang_thai,
            'status_label'         => $statusLabel,
            'qr'                   => $qr,
            'certificates_count'   => $batch->relationLoaded('chungNhans') ? $batch->chungNhans->count() : $batch->chungNhans()->count(),
            'wastage_total'        => (float) $batch->bienDongKhos->sum('So_luong'),
            'created_at'           => $batch->created_at?->toISOString(),
        ];
    }

    /**
     * Danh sách lịch sử hao hụt / xuất hủy toàn bộ các lô hàng (CV04.21 / UC18).
     */
    public function disposalsList(Request $request): JsonResponse
    {
        $disposals = BienDongKho::with([
            'loHang.loCanhTac.sanPham',
            'loHang.maQrTruyXuat',
            'nhanVien:Ma_nguoi_dung,Ho_ten',
        ])
            ->latest('Ngay_ghi_nhan')
            ->get()
            ->map(function ($bd) {
                return [
                    'id'            => $bd->Ma_bien_dong,
                    'batch_id'      => $bd->Ma_lo_hang,
                    'batch_code'    => $bd->loHang?->maQrTruyXuat?->Chuoi_ma_qr ?? "LH-{$bd->Ma_lo_hang}",
                    'product_name'  => $bd->loHang?->loCanhTac?->sanPham?->Ten_san_pham ?? 'Nông sản',
                    'product_unit'  => $bd->loHang?->loCanhTac?->sanPham?->Don_vi_tinh ?? 'kg',
                    'plot_name'     => $bd->loHang?->loCanhTac?->Ten_lo ?? 'Lô canh tác',
                    'type'          => $bd->Loai_bien_dong,
                    'type_label'    => match ($bd->Loai_bien_dong) {
                        'Hao_hut'   => 'Hao hụt tự nhiên',
                        'Xuat_huy'  => 'Xuất hủy hư hỏng',
                        'Dieu_chinh'=> 'Điều chỉnh kiểm kê',
                        default     => $bd->Loai_bien_dong,
                    },
                    'quantity'      => (float) $bd->So_luong,
                    'reason'        => $bd->Ly_do,
                    'recorded_at'   => Carbon::parse($bd->Ngay_ghi_nhan)->format('Y-m-d H:i:s'),
                    'staff_name'    => $bd->nhanVien?->Ho_ten ?? 'Kỹ thuật viên nông trại',
                ];
            });

        return $this->successResponse(
            message: 'Lấy lịch sử biến động kho thành công.',
            data: $disposals
        );
    }
}
