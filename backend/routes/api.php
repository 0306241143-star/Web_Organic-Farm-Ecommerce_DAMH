<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

$standardOk = fn (string $message, mixed $data = null) => response()->json([
    'success'    => true,
    'message'    => $message,
    'error_code' => null,
    'data'       => $data,
    'meta'       => null,
    'errors'     => null,
], 200);

// 1. Endpoint kiểm tra kết nối, JSON, FormData & Exception 500
Route::get('/ping', [AuthController::class, 'ping']);

Route::post('/test/json', function (Request $request) use ($standardOk) {
    $validated = $request->validate([
        'ten_san_pham' => ['required', 'string', 'max:100'],
        'so_luong'     => ['required', 'integer', 'min:1'],
    ], [
        'ten_san_pham.required' => 'Vui lòng nhập tên sản phẩm.',
        'so_luong.required'     => 'Vui lòng nhập số lượng.',
        'so_luong.integer'      => 'Số lượng phải là số nguyên.',
        'so_luong.min'          => 'Số lượng tối thiểu là 1.',
    ]);

    return $standardOk('Nhận dữ liệu JSON thành công.', $validated);
});

Route::post('/test/upload', function (Request $request) use ($standardOk) {
    $request->validate([
        'mo_ta' => ['required', 'string', 'max:255'],
        'file'  => ['required', 'file', 'mimes:jpg,jpeg,png,webp,mp4,mov,pdf', 'max:20480'],
    ], [
        'mo_ta.required' => 'Vui lòng nhập mô tả tệp đính kèm.',
        'file.required'  => 'Vui lòng chọn tệp ảnh hoặc video.',
        'file.mimes'     => 'Chỉ chấp nhận tệp jpg, jpeg, png, webp, mp4, mov, pdf.',
        'file.max'       => 'Dung lượng tệp tối đa là 20MB.',
    ]);

    $file = $request->file('file');
    return $standardOk('Nhận FormData (multipart boundary) thành công.', [
        'mo_ta'         => $request->input('mo_ta'),
        'original_name' => $file->getClientOriginalName(),
        'mime_type'     => $file->getMimeType(),
        'size_bytes'    => $file->getSize(),
    ]);
});

Route::get('/test/error-500', function () {
    throw new \RuntimeException('Giả lập lỗi hệ thống nội bộ 500 để kiểm thử Exception Handler.');
});

// 2. Nhóm Xác thực API (/api/auth/*)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// 3. Nhóm Công khai (public)
Route::prefix('public')->group(function () use ($standardOk) {
    Route::get('/danh-muc', fn () => $standardOk('API Danh mục (CV04.7)', []));
    Route::get('/san-pham', fn () => $standardOk('API Danh sách & Lọc sản phẩm (CV04.7 - CV04.8)', []));
    Route::get('/san-pham/{id}', fn ($id) => $standardOk("API Chi tiết sản phẩm #{$id} (CV04.9)"));
    Route::get('/cau-chuyen-thuong-hieu', fn () => $standardOk('API Câu chuyện thương hiệu (CV04.10)'));
    Route::get('/truy-xuat-qr/{maLo}', fn ($maLo) => $standardOk("API Truy xuất QR lô {$maLo} (CV04.11)"));
});

// Webhook MoMo IPN
Route::post('/webhooks/momo-ipn', fn () => $standardOk('MoMo IPN Endpoint Ready'));

// 4. Nhóm Khách hàng (customer)
Route::middleware(['auth:sanctum', 'role:customer'])->prefix('customer')->group(function () use ($standardOk) {
    Route::get('/ping-role', [AuthController::class, 'pingRole'])->defaults('area', 'customer');
    Route::get('/gio-hang', fn () => $standardOk('API Giỏ hàng (CV04.12)', []));
    Route::post('/don-hang', fn () => $standardOk('API Đặt mua lẻ & MoMo (CV04.13)'));
    Route::post('/goi-dinh-ky', fn () => $standardOk('API Đăng ký gói định kỳ (CV04.14)'));
    Route::get('/don-hang', fn () => $standardOk('API Theo dõi đơn hàng (CV04.15)', []));
    Route::post('/khieu-nai', fn () => $standardOk('API Gửi khiếu nại (CV04.16)'));
});

// 5. Nhóm Nhân viên Nông trại (farm_staff)
Route::middleware(['auth:sanctum', 'role:farm_staff,admin'])->prefix('farm')->group(function () use ($standardOk) {
    Route::get('/ping-role', [AuthController::class, 'pingRole'])->defaults('area', 'farm');
    Route::get('/mua-vu', fn () => $standardOk('API Mùa vụ & Nhật ký canh tác (CV04.17)', []));
    Route::post('/lo-hang', fn () => $standardOk('API Tạo lô thu hoạch (CV04.18)'));
    Route::post('/chung-nhan', fn () => $standardOk('API Tải chứng nhận & kiểm định (CV04.19)'));
    Route::get('/lo-hang/{id}/qr', fn ($id) => $standardOk("API Sinh & in QR lô #{$id} (CV04.20)"));
    Route::post('/xuat-huy', fn () => $standardOk('API Kiểm kho & xuất hủy hao hụt (CV04.21)'));
});

// 6. Nhóm Nhân viên Bán hàng / CSKH (sales)
Route::middleware(['auth:sanctum', 'role:sales,admin'])->prefix('sales')->group(function () use ($standardOk) {
    Route::get('/ping-role', [AuthController::class, 'pingRole'])->defaults('area', 'sales');
    Route::get('/don-hang', fn () => $standardOk('API Xem & duyệt đơn hàng (CV04.22)', []));
    Route::get('/ton-kho-fefo', fn () => $standardOk('API Tồn kho FEFO & Flash Sale (CV04.23)', []));
    Route::patch('/don-hang/{id}/giao-nhan', fn ($id) => $standardOk("API Điều phối giao nhận đơn #{$id} (CV04.24)"));
    Route::get('/khieu-nai', fn () => $standardOk('API Giải quyết khiếu nại (CV04.25)', []));
});

// 7. Nhóm Quản trị viên (admin)
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () use ($standardOk) {
    Route::get('/ping-role', [AuthController::class, 'pingRole'])->defaults('area', 'admin');
    Route::get('/nguoi-dung', fn () => $standardOk('API Quản lý tài khoản & RBAC (CV04.26)', []));
    Route::get('/cau-hinh', fn () => $standardOk('API Cấu hình tham số vận hành (CV04.27)'));
    Route::get('/bao-cao', fn () => $standardOk('API Báo cáo & thống kê quản trị (CV04.28)'));
});