<?php

/*
 * Luồng bán hàng: xử lý bằng chứng khiếu nại, hoàn tiền theo phương thức hỗ trợ hoặc tạo đơn bù.
 */

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\DonHang;
use App\Models\KhieuNai;
use App\Models\TepBangChung;
use App\Services\SalesComplaintResolutionService;
use App\Traits\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClaimResolveController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:Cho_xu_ly,Dang_xu_ly,Da_giai_quyet,Tu_choi'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ], [
            'search.max' => 'Từ khóa tìm kiếm không được vượt quá 100 ký tự.',
            'status.in' => 'Trạng thái khiếu nại không hợp lệ.',
            'page.integer' => 'Số trang phải là số nguyên.',
            'page.min' => 'Số trang phải lớn hơn 0.',
            'per_page.integer' => 'Số hồ sơ mỗi trang phải là số nguyên.',
            'per_page.min' => 'Mỗi trang phải có ít nhất 1 hồ sơ.',
            'per_page.max' => 'Mỗi trang không được vượt quá 50 hồ sơ.',
        ]);

        $query = KhieuNai::query()
            ->with([
                'donHang.khachHang',
                'donHang.diaChi',
                'donHang.thanhToans',
                'donHang.giaoHang',
                'tepBangChungs',
                'hoanTien',
                'nhanVienXuLy',
            ])
            ->when(
                $validated['status'] ?? null,
                fn (Builder $builder, string $status) => $builder->where('Trang_thai', $status)
            )
            ->when(
                trim((string) ($validated['search'] ?? '')) !== '',
                function (Builder $builder) use ($validated): void {
                    $search = trim($validated['search']);
                    $builder->where(function (Builder $searchQuery) use ($search): void {
                        if (ctype_digit($search)) {
                            $searchQuery->where('Ma_khieu_nai', (int) $search)
                                ->orWhere('Ma_don_hang', (int) $search);
                        }

                        $searchQuery->orWhereHas('donHang.khachHang', function (Builder $customerQuery) use ($search): void {
                            $customerQuery->where('Ho_ten', 'like', "%{$search}%")
                                ->orWhere('So_dien_thoai', 'like', "%{$search}%");
                        });
                    });
                }
            );

        $paginator = $query
            ->orderByDesc('Ma_khieu_nai')
            ->paginate((int) ($validated['per_page'] ?? 10));

        $counts = KhieuNai::query()
            ->selectRaw('Trang_thai, COUNT(*) AS tong')
            ->groupBy('Trang_thai')
            ->pluck('tong', 'Trang_thai');
        $statusCounts = collect(['Cho_xu_ly', 'Dang_xu_ly', 'Da_giai_quyet', 'Tu_choi'])
            ->mapWithKeys(fn (string $status) => [$status => (int) $counts->get($status, 0)])
            ->all();

        return $this->successResponse(
            message: 'Lấy danh sách khiếu nại thành công.',
            data: [
                'claims' => $paginator->getCollection()
                    ->map(fn (KhieuNai $claim): array => $this->formatClaim($claim))
                    ->all(),
                'counts' => $statusCounts,
            ],
            meta: [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ]
        );
    }

    public function show(int $claimId): JsonResponse
    {
        $claim = $this->claimQuery()
            ->with([
                'donHang.chiTiets.sanPham',
                'donHang.thanhToans',
                'donHang.giaoHang',
            ])
            ->whereKey($claimId)
            ->firstOrFail();

        return $this->successResponse(
            'Lấy chi tiết hồ sơ khiếu nại thành công.',
            $this->formatClaim($claim, detailed: true)
        );
    }

    public function receive(
        int $claimId,
        Request $request,
        SalesComplaintResolutionService $resolution
    ): JsonResponse {
        $claim = $resolution->receive(
            $claimId,
            (int) $request->user()->getAuthIdentifier()
        );

        return $this->successResponse(
            'Đã tiếp nhận hồ sơ khiếu nại.',
            $this->formatClaim($this->claimQuery()->whereKey($claim->Ma_khieu_nai)->firstOrFail())
        );
    }

    public function resolve(
        int $claimId,
        Request $request,
        SalesComplaintResolutionService $resolution
    ): JsonResponse {
        $validated = $request->validate([
            'ket_qua' => ['required', 'in:chap_nhan,tu_choi'],
            'phuong_an_xu_ly' => ['required_if:ket_qua,chap_nhan', 'nullable', 'in:hoan_tien,giao_bu'],
            'phan_hoi_cskh' => ['required', 'string', 'min:5', 'max:3000'],
            'so_tien_hoan' => ['required_if:phuong_an_xu_ly,hoan_tien', 'nullable', 'numeric', 'gt:0'],
            'items' => ['required_if:phuong_an_xu_ly,giao_bu', 'nullable', 'array', 'min:1', 'max:20'],
            'items.*.chi_tiet_don_hang_id' => ['required_with:items', 'integer', 'min:1', 'distinct'],
            'items.*.so_luong_bu' => ['required_with:items', 'numeric', 'min:1'],
        ], [
            'ket_qua.required' => 'Vui lòng chọn kết quả xử lý khiếu nại.',
            'ket_qua.in' => 'Kết quả xử lý khiếu nại không hợp lệ.',
            'phuong_an_xu_ly.required_if' => 'Vui lòng chọn phương án giải quyết khiếu nại.',
            'phuong_an_xu_ly.in' => 'Phương án giải quyết khiếu nại không hợp lệ.',
            'phan_hoi_cskh.required' => 'Vui lòng nhập nội dung phản hồi khách hàng.',
            'phan_hoi_cskh.min' => 'Nội dung phản hồi phải có ít nhất 5 ký tự.',
            'phan_hoi_cskh.max' => 'Nội dung phản hồi không được vượt quá 3.000 ký tự.',
            'so_tien_hoan.required_if' => 'Vui lòng nhập số tiền cần hoàn.',
            'so_tien_hoan.numeric' => 'Số tiền hoàn phải là số hợp lệ.',
            'so_tien_hoan.gt' => 'Số tiền hoàn phải lớn hơn 0.',
            'items.required_if' => 'Vui lòng chọn ít nhất một sản phẩm cần giao bù.',
            'items.array' => 'Danh sách sản phẩm giao bù không hợp lệ.',
            'items.min' => 'Vui lòng chọn ít nhất một sản phẩm cần giao bù.',
            'items.max' => 'Không thể giao bù quá 20 dòng sản phẩm trong một lần.',
            'items.*.chi_tiet_don_hang_id.required_with' => 'Vui lòng chọn sản phẩm thuộc đơn hàng gốc.',
            'items.*.chi_tiet_don_hang_id.distinct' => 'Không được chọn trùng dòng sản phẩm.',
            'items.*.so_luong_bu.required_with' => 'Vui lòng nhập số lượng cần giao bù.',
            'items.*.so_luong_bu.min' => 'Số lượng giao bù phải ít nhất là 1.',
        ]);

        $claim = $resolution->resolve(
            $claimId,
            (int) $request->user()->getAuthIdentifier(),
            $validated
        );
        $claim = $this->claimQuery()
            ->with([
                'donHang.chiTiets.sanPham',
                'donHang.thanhToans',
                'donHang.giaoHang',
            ])
            ->whereKey($claim->Ma_khieu_nai)
            ->firstOrFail();

        return $this->successResponse(
            $claim->Hinh_thuc_xu_ly === 'Hoan_tien'
                ? 'Đã duyệt khiếu nại. Khoản hoàn tiền đang chờ thực hiện thanh toán.'
                : 'Đã hoàn tất xử lý khiếu nại.',
            $this->formatClaim($claim, detailed: true)
        );
    }

    private function claimQuery(): Builder
    {
        return KhieuNai::query()->with([
            'donHang.khachHang',
            'donHang.diaChi',
            'tepBangChungs',
            'hoanTien',
            'nhanVienXuLy',
        ]);
    }

    private function formatClaim(KhieuNai $claim, bool $detailed = false): array
    {
        $order = $claim->donHang;
        $replacement = $claim->Ma_don_giao_bu
            ? DonHang::query()
                ->with(['chiTiets.sanPham', 'thanhToans', 'giaoHang'])
                ->find($claim->Ma_don_giao_bu)
            : ($claim->Hinh_thuc_xu_ly === 'Giao_bu'
                ? DonHang::query()
                    ->with(['chiTiets.sanPham', 'thanhToans', 'giaoHang'])
                    ->where('Ma_khieu_nai', $claim->Ma_khieu_nai)
                    ->where('Ma_don_goc', $claim->Ma_don_hang)
                    ->where('Loai_don', 'Giao_bu')
                    ->first()
                : null);

        return [
            'claim_id' => (int) $claim->Ma_khieu_nai,
            'order_id' => (int) $claim->Ma_don_hang,
            'reason' => $claim->Ly_do,
            'description' => $claim->Mo_ta_chi_tiet,
            'status' => $claim->Trang_thai,
            'resolution' => $claim->Hinh_thuc_xu_ly,
            'refund_amount' => $claim->So_tien_hoan !== null
                ? (float) $claim->So_tien_hoan
                : ($claim->hoanTien ? (float) $claim->hoanTien->So_tien : null),
            'refund_status' => $claim->hoanTien?->Trang_thai,
            'feedback' => $claim->Phan_hoi_cskh,
            'replacement_order_id' => $replacement === null
                ? null
                : (int) $replacement->Ma_don_hang,
            'handler' => $claim->nhanVienXuLy?->Ho_ten,
            'received_at' => $claim->Ngay_tiep_nhan,
            'submitted_at' => $claim->created_at,
            'resolved_at' => $claim->Ngay_xu_ly,
            'customer' => [
                'name' => $order?->khachHang?->Ho_ten,
                'phone' => $order?->khachHang?->So_dien_thoai,
                'email' => $order?->khachHang?->Email,
            ],
            'order' => $order ? $this->formatOrder($order, $detailed) : null,
            'replacement_order' => $replacement
                ? $this->formatOrder($replacement, $detailed)
                : null,
            'evidence' => $claim->tepBangChungs->map(
                fn (TepBangChung $evidence): array => [
                    'id' => (int) $evidence->Ma_tep,
                    'type' => $this->mediaType($evidence),
                    'url' => $evidence->Duong_dan,
                ]
            )->all(),
        ];
    }

    private function formatOrder(DonHang $order, bool $detailed): array
    {
        $address = $order->diaChi;
        $data = [
            'order_id' => (int) $order->Ma_don_hang,
            'order_type' => $order->Loai_don,
            'status' => $order->Trang_thai,
            'total' => (float) $order->Tong_tien,
            'subtotal' => (float) $order->Tien_hang,
            'shipping_fee' => (float) $order->Phi_giao_hang,
            'ordered_at' => $order->Ngay_dat,
            'address' => $address ? [
                'recipient_name' => $address->Ten_nguoi_nhan,
                'phone' => $address->So_dien_thoai_nguoi_nhan,
                'detail' => implode(', ', array_filter([
                    $address->Dia_chi_chi_tiet,
                    $address->Phuong_xa,
                    $address->Quan_huyen,
                    $address->Tinh_thanh,
                ])),
            ] : null,
            'payments' => $order->thanhToans->map(fn ($payment): array => [
                'method' => $payment->Phuong_thuc,
                'status' => $payment->Trang_thai,
                'amount' => (float) $payment->So_tien,
            ])->all(),
            'delivery' => $order->giaoHang ? [
                'carrier' => $order->giaoHang->Don_vi_van_chuyen,
                'tracking_number' => $order->giaoHang->Ma_van_don,
                'status' => $order->giaoHang->Trang_thai,
            ] : null,
        ];

        if ($detailed) {
            $data['items'] = $order->chiTiets->map(fn ($item): array => [
                'detail_id' => (int) $item->Ma_ct_don_hang,
                'product_id' => (int) $item->Ma_san_pham,
                'name' => $item->sanPham?->Ten_san_pham ?? 'Sản phẩm không còn trong danh mục',
                'unit' => $item->sanPham?->Don_vi_tinh,
                'quantity' => (float) $item->So_luong,
                'unit_price' => (float) $item->Don_gia,
                'line_total' => (float) $item->Thanh_tien,
            ])->all();
        }

        return $data;
    }

    private function mediaType(TepBangChung $evidence): string
    {
        $path = parse_url((string) $evidence->Duong_dan, PHP_URL_PATH) ?: (string) $evidence->Duong_dan;
        if ($evidence->Loai_tep === 'Video' || preg_match('/\.(mp4|mov|webm|m4v)$/i', $path)) {
            return 'video';
        }

        return 'image';
    }
}
