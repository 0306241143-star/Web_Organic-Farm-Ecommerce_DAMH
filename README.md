# 🌿 Hệ Thống Website Thương Mại Điện Tử Nông Sản Sạch

## 1. Giới thiệu đồ án

**Website Thương mại điện tử Nông sản sạch** là nền tảng kết nối trực tiếp nông trại với người tiêu dùng cuối, kết hợp quy trình bán lẻ, đăng ký gói rau củ định kỳ và hệ thống **truy xuất nguồn gốc minh bạch qua mã QR**.

### Các nhóm vai trò & Nghiệp vụ cốt lõi
1. **Khách vãng lai (Guest):**
   - Xem danh mục, tìm kiếm và lọc nông sản theo khoảng giá, chứng nhận chất lượng (VietGAP, Organic).
   - Xem trang Câu chuyện thương hiệu, triết lý canh tác và hồ sơ năng lực nông trại.
   - Quét mã QR trên bao bì để truy xuất nguồn gốc lô hàng (ngày thu hoạch, người phụ trách, hạn sử dụng, nhật ký chăm sóc và giấy kiểm định đất/nước).
2. **Khách hàng (Customer):**
   - Quản lý giỏ hàng, đặt mua lẻ với phí vận chuyển tính tự động theo khoảng cách thực tế (km) từ nông trại đến địa chỉ nhận.
   - Thanh toán trực tuyến qua **ApiPay** (Open Banking/chuyển khoản ngân hàng).
   - Đăng ký gói nông sản định kỳ theo tháng (ví dụ: 3kg/lần vào Thứ 3 & Thứ 6 hằng tuần) để hệ thống tự động sinh đơn theo lịch.
   - Theo dõi đơn hàng và gửi yêu cầu khiếu nại/hoàn tiền kèm bằng chứng hình ảnh hoặc video.
3. **Nhân viên Nông trại (Farm Staff):**
   - Quản lý mùa vụ, cập nhật nhật ký canh tác theo mốc (gieo hạt, bón phân, tưới tiêu, thu hoạch) đính kèm hình ảnh/video thực tế.
   - Tạo lô hàng thu hoạch, tải lên chứng nhận chất lượng, kết quả kiểm định định kỳ và sinh/in tem mã QR cho từng lô.
   - *Ràng buộc bảo mật:* Không có quyền xem báo cáo doanh thu hoặc thông tin cá nhân của khách hàng.
4. **Nhân viên Bán hàng & CSKH (Sales):**
   - Xác nhận đơn hàng mua lẻ và đơn tự động sinh từ gói định kỳ.
   - Quản lý tồn kho theo lô áp dụng nguyên tắc **FEFO** (ưu tiên xuất lô có hạn sử dụng gần nhất), ghi nhận hao hụt/xuất hủy và cấu hình **Flash Sale** cho lô cận hạn.
   - Điều phối giao nhận và tiếp nhận, xử lý khiếu nại (hoàn tiền theo phương thức được hỗ trợ hoặc tạo đơn giao bù).
5. **Quản trị viên (Admin):**
   - Quản lý tài khoản và thiết lập ma trận phân quyền người dùng (RBAC).
   - Cấu hình tham số vận hành hệ thống (đơn giá ship/km, tỷ lệ điểm thưởng, ngưỡng cảnh báo cận hạn).
   - Xem báo cáo thống kê tổng quan: Doanh thu, số lượng đơn hàng, tỷ lệ hao hụt hàng hóa và tỷ lệ khách hàng mua lại.

---

## 2. Thành viên thực hiện

| STT | Họ và Tên | Nhiệm vụ chính |
| :---: | :--- | :--- |
| 1 | **Nguyễn Hoài Linh** | Khởi tạo cấu trúc dự án (Laravel & React), kết nối API, cấu hình Cloudflare R2, xây dựng luồng Xác thực & Phân quyền RBAC. |
| 2 | **Ngô Gia Bảo** | Thiết kế CSDL MySQL (Migration & Model), luồng Chi tiết sản phẩm, Truy xuất QR, Quản lý đơn hàng & Tồn kho FEFO / Flash Sale. |
| 3 | **Lê Minh Quân** | Phụ trách tích hợp ApiPay & Goong Maps API và luồng Khách hàng (triển khai chức năng theo các giai đoạn dự án). |
| 4 | **Nguyễn Vũ Anh Khoa** | Thiết kế Storefront Layout, Dashboard Layout (Menu động) và xây dựng toàn bộ phân hệ Nhân viên Nông trại (Mùa vụ, Nhật ký, Lô hàng, In QR). |
| 5 | **Lê Minh Tài** | Xây dựng Trang chủ, Danh mục, Bộ lọc tìm kiếm, Câu chuyện thương hiệu, Điều phối giao nhận và Trung tâm xử lý khiếu nại CSKH. |

---

## 3. Công nghệ & Các cấu hình đã cài đặt

### Backend (`backend/`)
- **Framework:** Laravel (PHP >= 8.2) theo kiến trúc RESTful API.
- **Xác thực & Phân quyền:**
  - `laravel/breeze` (chế độ API) + `laravel/sanctum`: Xác thực bằng Bearer Token (`auth:sanctum`).
  - `spatie/laravel-permission`: Quản lý vai trò (`customer`, `farm_staff`, `sales`, `admin`) và phân quyền qua Middleware `role`.
- **Quản lý Media & Lưu trữ đám mây:**
  - `league/flysystem-aws-s3-v3` + `spatie/laravel-medialibrary`: Kết nối **Cloudflare R2** lưu trữ ảnh/video nhật ký canh tác, bằng chứng khiếu nại và bản scan kiểm định.
- **Tiện ích nghiệp vụ:**
  - `spatie/laravel-query-builder`: Tìm kiếm và lọc sản phẩm/đơn hàng đa tiêu chí.
  - `simplesoftwareio/simple-qrcode` & `barryvdh/laravel-dompdf`: Sinh mã QR lô hàng và xuất file PDF in tem nhãn.
  - `maatwebsite/excel`: Xuất báo cáo thống kê quản trị ra Excel.
- **Tích hợp bên thứ ba:** Backend khởi tạo yêu cầu thanh toán ApiPay và xác nhận giao dịch qua webhook có chữ ký HMAC; cấu hình Goong Maps Distance Matrix API đã sẵn sàng, phần tính khoảng cách sẽ được triển khai riêng.

### Frontend (`frontend/`)
- **Core:** React.js (khởi tạo bằng Vite) & **Tailwind CSS v4** (`@tailwindcss/vite`).
- **Định tuyến & Bảo mật UI:** `react-router-dom` kết hợp `ProtectedRoute` và `RoleGuard` bảo vệ khu vực giao diện theo từng vai trò.
- **Kết nối API:** `axios` cấu hình Interceptors tự động đính kèm Token, hỗ trợ `FormData` upload media và bắt lỗi tập trung (`401`, `403`, `422`, `500`).
- **Icon:** `lucide-react`.

---

## 4. Cấu trúc thư mục dự án

*(Đã lược bỏ các tệp cấu hình mặc định của IDE, cache hệ thống và thư viện `vendor`/`node_modules`)*

```text
nong-san-sach/
├── backend/                                        # Mã nguồn Backend Laravel API
│   ├── app/
│   │   ├── Console/Commands/
│   │   │   └── GenerateRecurringOrders.php         # Cronjob tự động sinh đơn hàng định kỳ theo lịch gói tháng
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Auth/                           # Bộ Controller xác thực từ Laravel Breeze API
│   │   │   │   │   ├── AuthenticatedSessionController.php  # Đăng nhập (trả Token + Roles) & Đăng xuất
│   │   │   │   │   ├── RegisteredUserController.php        # Đăng ký tài khoản Khách hàng mới
│   │   │   │   │   ├── PasswordResetLinkController.php     # Gửi yêu cầu quên mật khẩu qua Email
│   │   │   │   │   ├── NewPasswordController.php           # Đặt lại mật khẩu mới
│   │   │   │   │   ├── EmailVerificationNotificationController.php # Gửi lại email xác thực
│   │   │   │   │   └── VerifyEmailController.php           # Xác nhận liên kết kích hoạt email
│   │   │   │   └── Api/
│   │   │   │       ├── Public/                     # Nhóm API công khai (Guest & Customer)
│   │   │   │       │   ├── CategoryController.php  # Lấy danh sách danh mục nông sản
│   │   │   │       │   ├── ProductController.php   # Danh sách, tìm kiếm, lọc theo giá/chứng nhận & chi tiết SP
│   │   │   │       │   ├── BrandStoryController.php# Lấy nội dung câu chuyện thương hiệu & hồ sơ nông trại
│   │   │   │       │   └── QrTraceController.php   # Tra cứu thông tin lô hàng, nhật ký & kiểm định qua mã QR
│   │   │   │       ├── Customer/                   # Nhóm API Khách hàng (yêu cầu role:customer)
│   │   │   │       │   ├── CartController.php      # Thêm, sửa số lượng, xóa giỏ hàng & kiểm tra tồn kho
│   │   │   │       │   ├── CheckoutController.php  # Tạo yêu cầu thanh toán ApiPay cho đơn hàng chờ thanh toán
│   │   │   │       │   ├── SubscriptionController.php # Đăng ký & quản lý gói rau củ định kỳ theo tháng
│   │   │   │       │   ├── OrderController.php     # Xem lịch sử đơn hàng & tiến trình giao nhận
│   │   │   │       │   ├── RewardPointController.php # Xem ví điểm thưởng & quy đổi điểm ưu đãi
│   │   │   │       │   └── ClaimController.php     # Gửi yêu cầu khiếu nại/hoàn tiền kèm bằng chứng ảnh/video
│   │   │   │       ├── FarmStaff/                  # Nhóm API Nhân viên Nông trại (chặn doanh thu & thông tin khách)
│   │   │   │       │   ├── SeasonController.php    # Quản lý thông tin mùa vụ canh tác
│   │   │   │       │   ├── FarmingLogController.php# Ghi nhật ký (gieo hạt, bón phân, tưới, thu hoạch) + media R2
│   │   │   │       │   ├── BatchController.php     # Tạo lô thu hoạch (ngày thu hoạch, người phụ trách, HSD)
│   │   │   │       │   ├── CertificateController.php # Upload chứng nhận chất lượng & bản scan kiểm định đất/nước
│   │   │   │       │   └── BatchQrController.php   # Sinh mã QR duy nhất cho lô & xuất dữ liệu in tem nhãn
│   │   │   │       ├── Sales/                      # Nhóm API Nhân viên Bán hàng & CSKH
│   │   │   │       │   ├── OrderProcessController.php # Xem & xác nhận đơn mua lẻ và đơn tự sinh từ gói định kỳ
│   │   │   │       │   ├── InventoryFefoController.php # Quản lý kho theo lô FEFO, ghi nhận hao hụt & xuất hủy
│   │   │   │       │   ├── FlashSaleController.php # Nhận cảnh báo lô cận hạn & cấu hình giảm giá Flash Sale
│   │   │   │       │   ├── DeliveryController.php  # Cấu hình điều phối giao hàng & cập nhật trạng thái vận chuyển
│   │   │   │       │   └── ClaimResolveController.php # Xem bằng chứng khiếu nại, duyệt hoàn tiền hoặc tạo đơn giao bù
│   │   │   │       ├── Admin/                      # Nhóm API Quản trị viên
│   │   │   │       │   ├── UserRoleController.php  # Quản lý tài khoản & gán vai trò/quyền hạn (RBAC)
│   │   │   │       │   ├── SystemSettingController.php # Cấu hình đơn giá ship/km, tỷ lệ điểm thưởng, cảnh báo HSD
│   │   │   │       │   └── ReportController.php    # Thống kê doanh thu, số đơn, tỷ lệ hao hụt & tỷ lệ mua lại
│   │   │   │       └── Webhook/
│   │   │   │           └── ApiPayWebhookController.php # Xác minh webhook và cập nhật trạng thái thanh toán
│   │   │   ├── Middleware/
│   │   │   │   └── EnsureEmailIsVerified.php       # Kiểm tra trạng thái xác thực email của tài khoản
│   │   │   └── Requests/                           # Lớp kiểm tra tính hợp lệ dữ liệu đầu vào (Validation)
│   │   │       ├── Auth/LoginRequest.php           # Validate thông tin đăng nhập & giới hạn số lần thử sai
│   │   │       ├── Customer/                       # StoreOrderRequest, StoreSubscriptionRequest, StoreClaimRequest
│   │   │       ├── FarmStaff/                      # StoreFarmingLogRequest, StoreBatchRequest, UploadCertificateRequest
│   │   │       └── Sales/                          # RecordWastageRequest, StoreFlashSaleRequest, ResolveClaimRequest
│   │   ├── Models/
│   │   │   └── User.php                            # Model người dùng (tích hợp Sanctum HasApiTokens & Spatie HasRoles)
│   │   ├── Providers/
│   │   │   └── AppServiceProvider.php              # Đăng ký các Service & cấu hình dùng chung toàn ứng dụng
│   │   └── Services/                               # Tầng xử lý logic nghiệp vụ chuyên sâu
│   │       ├── FefoStockService.php                # Thuật toán chọn lô có HSD gần nhất & trừ tồn kho tự động
│   │       ├── ApiPayPaymentService.php             # Gọi API ApiPay để tạo và tra cứu yêu cầu thanh toán
│   │       ├── QrCodeGeneratorService.php          # Sinh mã QR định danh truy xuất nguồn gốc từng lô hàng
│   │       ├── ShippingDistanceService.php         # Điểm tích hợp dự kiến cho Goong Maps (triển khai ở Giai đoạn 4)
│   │       └── SubscriptionGeneratorService.php    # Logic tự động khởi tạo đơn hàng khi đến kỳ giao gói tháng
│   ├── bootstrap/
│   │   └── app.php                                 # Khai báo routing, alias middleware RBAC & chuẩn hóa JSON lỗi
│   ├── config/
│   │   ├── cors.php                                # Cấu hình cho phép Frontend React truy cập API
│   │   ├── database.php                            # Cấu hình kết nối cơ sở dữ liệu MySQL
│   │   ├── filesystems.php                         # Khai báo disk 'r2' kết nối Cloudflare R2 Storage
│   │   ├── sanctum.php                             # Cấu hình thời hạn & cơ chế hoạt động của Access Token
│   │   └── services.php                            # Khai báo thông số kết nối ApiPay & Goong Maps API
│   ├── database/
│   │   ├── migrations/                             # Các tệp tạo cấu trúc bảng MySQL (users, tokens, RBAC, nghiệp vụ...)
│   │   └── seeders/DatabaseSeeder.php              # Khởi tạo dữ liệu mẫu vai trò (Roles) & tài khoản mặc định
│   ├── routes/
│   │   ├── api.php                                 # Định tuyến toàn bộ RESTful API chia theo 5 nhóm quyền
│   │   ├── auth.php                                # Định tuyến xác thực (register, login, logout, reset-password)
│   │   └── console.php                             # Khai báo lịch chạy Cronjob tự động sinh đơn định kỳ
│   ├── .env.example                                # Tệp mẫu các biến môi trường cần cấu hình
│   └── composer.json                               # Danh sách các gói thư viện PHP/Laravel của dự án
│
└── frontend/                                       # Mã nguồn Frontend React.js + Tailwind CSS
    ├── src/
    │   ├── components/
    │   │   ├── admin/                              # Thành phần giao diện dành cho Quản trị viên
    │   │   │   ├── modals/UserPermissionModal.jsx  # Hộp thoại cấp tài khoản & thiết lập phân quyền vai trò
    │   │   │   ├── KpiStatCards.jsx                # Thẻ hiển thị chỉ số doanh thu, số đơn, hao hụt, mua lại
    │   │   │   └── RevenueAndWastageCharts.jsx     # Biểu đồ thống kê doanh thu & tỷ lệ hao hụt kho
    │   │   ├── common/                             # Các thành phần UI tái sử dụng toàn hệ thống
    │   │   │   ├── Badge.jsx, Button.jsx, EmptyState.jsx, Pagination.jsx
    │   │   │   ├── FileUploader.jsx                # Thành phần tải lên nhiều ảnh/video/PDF
    │   │   │   └── MediaViewer.jsx                 # Trình xem trước hình ảnh, video & tài liệu kiểm định
    │   │   ├── customer/                           # Thành phần giao diện dành cho Khách hàng
    │   │   │   ├── modals/CreateClaimModal.jsx     # Hộp thoại gửi khiếu nại kèm tải lên bằng chứng ảnh/video
    │   │   │   ├── AddressDistancePicker.jsx       # Nhập địa chỉ & hiển thị khoảng cách km tính phí ship
    │   │   │   ├── CartSummaryBox.jsx              # Bảng tóm tắt giỏ hàng & kiểm tra tồn kho khả dụng
    │   │   │   └── SubscriptionScheduleForm.jsx    # Biểu mẫu chọn gói rau tháng & ngày giao trong tuần
    │   │   ├── farm/                               # Thành phần giao diện dành cho Nhân viên Nông trại
    │   │   │   ├── modals/AddFarmingLogModal.jsx   # Hộp thoại ghi mốc nhật ký canh tác & upload media
    │   │   │   ├── modals/CreateBatchModal.jsx     # Hộp thoại tạo lô thu hoạch (ngày thu hoạch, HSD, phụ trách)
    │   │   │   ├── modals/QrPrintPreviewModal.jsx  # Hộp thoại xem trước & xuất in tem mã QR dán bao bì
    │   │   │   └── FarmingLogTimeline.jsx          # Dòng thời gian hiển thị các mốc chăm sóc mùa vụ
    │   │   ├── navigation/                         # Thành phần điều hướng chính của 2 Layout
    │   │   │   ├── StorefrontHeader.jsx            # Header khu vực mua sắm (tự đổi trạng thái khi đăng nhập)
    │   │   │   ├── StorefrontFooter.jsx            # Chân trang thông tin nông trại & chứng nhận chất lượng
    │   │   │   └── DynamicSidebar.jsx              # Thanh menu bên trái tự động ẩn/hiện mục theo quyền RBAC
    │   │   ├── public/                             # Thành phần giao diện khu vực Công khai
    │   │   │   ├── ProductCard.jsx                 # Thẻ hiển thị thông tin tóm tắt sản phẩm nông sản
    │   │   │   ├── ProductFilterSidebar.jsx        # Bộ lọc tìm kiếm theo khoảng giá & chứng nhận an toàn
    │   │   │   └── QrTraceTimeline.jsx             # Hiển thị chi tiết nguồn gốc lô & nhật ký khi quét QR
    │   │   └── sales/                              # Thành phần giao diện dành cho Nhân viên Sales / CSKH
    │   │       ├── modals/DispatchOrderModal.jsx   # Hộp thoại cấu hình điều phối vận chuyển đơn hàng
    │   │       ├── modals/RecordWastageModal.jsx   # Hộp thoại ghi nhận số lượng dập nát/hao hụt hoặc xuất hủy
    │   │       ├── modals/ResolveClaimModal.jsx    # Hộp thoại xem bằng chứng & duyệt hoàn tiền / tạo đơn bù
    │   │       ├── ExpiringAlertBanner.jsx         # Thông báo cảnh báo lô hàng sắp hết hạn để chạy Flash Sale
    │   │       └── FefoBatchTable.jsx              # Bảng quản lý tồn kho theo lô sắp xếp ưu tiên HSD gần nhất
    │   ├── context/                                # Quản lý trạng thái toàn cục (React Context)
    │   │   ├── AuthContext.jsx, authStateContext.js, useAuth.js # Lưu phiên đăng nhập, Token, Role & điều hướng
    │   │   └── CartContext.jsx, cartStateContext.js, useCart.js # Đồng bộ dữ liệu giỏ hàng mua lẻ
    │   ├── layouts/                                # Hai khung giao diện chính của hệ thống
    │   │   ├── StorefrontLayout.jsx                # Khung giao diện công khai & khách hàng (Mobile-first)
    │   │   └── DashboardLayout.jsx                 # Khung làm việc nội bộ dùng chung cho Farm Staff, Sales, Admin
    │   ├── pages/                                  # Các trang màn hình chính chia theo 5 khu vực + Auth
    │   │   ├── auth/                               # LoginPage, RegisterPage, ForgotPasswordPage
    │   │   ├── public/                             # HomePage, ProductCatalogPage, ProductDetailPage, BrandStoryPage, QrTraceabilityPage
    │   │   ├── customer/                           # CartPage, CheckoutPage, SubscriptionRegisterPage, OrderHistoryPage, RewardWalletPage
    │   │   ├── farm/                               # SeasonManagePage, BatchHarvestPage, CertificateManagePage
    │   │   ├── sales/                              # SalesOrderPage, InventoryFefoPage, FlashSalePage, CustomerClaimPage
    │   │   └── admin/                              # AdminDashboardPage, UserManagementPage, SystemSettingsPage
    │   ├── routes/                                 # Cấu hình định tuyến & bảo vệ truy cập trang
    │   │   ├── AppRouter.jsx                       # Khai báo toàn bộ đường dẫn URL của ứng dụng
    │   │   ├── ProtectedRoute.jsx                  # Chặn người dùng chưa đăng nhập vào trang nội bộ/cá nhân
    │   │   └── RoleGuard.jsx                       # Ngăn chặn truy cập trái vai trò (tránh vượt quyền URL)
    │   └── services/                               # Lớp giao tiếp API ánh xạ trực tiếp với Backend Laravel
    │       ├── axiosClient.js                      # Cấu hình Axios, đính kèm Bearer Token & chuẩn hóa bắt lỗi
    │       ├── authApi.js, publicApi.js, customerApi.js, farmApi.js, salesApi.js, adminApi.js
    ├── index.html                                  # Tệp HTML gốc khởi chạy ứng dụng React
    ├── package.json                                # Danh sách thư viện Frontend & các lệnh chạy Vite
    └── vite.config.js                              # Cấu hình Vite tích hợp plugin Tailwind CSS
```

---

## 5. Hướng dẫn cấu hình và chạy dự án khi tải từ Git về

### Yêu cầu môi trường trên máy
- **PHP** >= 8.2 và **Composer**
- **Node.js** >= 18.x và **npm**
- **MySQL** >= 8.0 (XAMPP, Laragon hoặc Docker)

---

### Bước 1: Tải mã nguồn từ GitHub
```bash
git clone https://github.com/<ten-tai-khoan>/<ten-repo>.git
cd nong-san-sach
```

---

### Bước 2: Cài đặt và cấu hình Backend (Laravel)

1. Di chuyển vào thư mục `backend` và cài đặt các gói thư viện PHP:
```bash
cd backend
composer install
```

2. Tạo tệp biến môi trường `.env` từ tệp mẫu `.env.example` và sinh khóa bảo mật ứng dụng:
```bash
cp .env.example .env
php artisan key:generate
```

3. Mở tệp `backend/.env` và cập nhật các thông số kết nối thực tế của bạn:
Nội dung file lấy trong Page 1 của GoogleSheet phân công (Link: https://docs.google.com/spreadsheets/d/1ZZi2E22fx_av9RZEKb9CaVfWUn_D-lV-Y-HPzRZE2Ks/edit?gid=1813174237#gid=1813174237&range=B20:G20 )

4. Chuẩn bị thông tin dịch vụ cho **Giai đoạn 4** trong `backend/.env`:
   - **ApiPay:** `APIPAY_DASHBOARD_URL` chỉ là trang quản lý; API base URL mặc định là `https://app.apipay.vn/v1/client`. Điền `APIPAY_ACCESS_KEY` và `APIPAY_SECRET_KEY` lấy từ dashboard vào `.env` (không đưa lên Git). Tạo webhook trên dashboard trỏ đến `https://<backend-domain>/api/webhooks/apipay`, rồi đặt secret webhook tương ứng vào `APIPAY_WEBHOOK_SECRET`. ApiPay yêu cầu HTTPS truy cập công khai cho webhook.
   - **Goong Maps:** điền `GOONG_API_KEY` từ Goong Platform; `GOONG_DISTANCE_MATRIX_URL` đã đặt endpoint Distance Matrix mặc định. Giới hạn key theo các API cần dùng và không đưa key này vào biến `VITE_*` hoặc mã frontend.
   - Không commit thông tin xác thực thật. Luồng thanh toán ApiPay đã được nối cho đơn hàng đã tồn tại; giao dịch chỉ được xác nhận sau webhook đã xác minh chữ ký, nội dung và số tiền.
   - Endpoint `POST /api/customer/checkout` nhận `order_id` và `bank_public_id`, chỉ tạo thanh toán cho đơn chờ thanh toán của người dùng đang đăng nhập; URL thanh toán trả về trong `data.pay_url`. Luồng tạo đơn từ giỏ hàng và giao diện checkout vẫn cần được hoàn thiện riêng.
   - Webhook sandbox và webhook kiểm tra trực tiếp không cập nhật đơn hàng; chỉ webhook giao dịch thật đã xác minh mới có thể xác nhận thanh toán. Nếu yêu cầu tạo thanh toán bị timeout/lỗi không rõ kết quả, bản ghi vẫn ở trạng thái khởi tạo để chờ webhook/đối soát, không nên thử tạo yêu cầu mới ngay.
   - Chạy `php artisan migrate` để chuyển schema thanh toán hoàn toàn sang ApiPay (bao gồm SQLite); mã giao dịch cũ được lưu dưới dạng tham chiếu lưu trữ. ApiPay hiện chỉ xác nhận tiền vào, chưa triển khai hoàn tiền.

5. Khởi tạo các bảng dữ liệu trong MySQL và dữ liệu mẫu phân quyền:
```bash
php artisan migrate --seed
```

6. Khởi chạy máy chủ Backend API (mặc định chạy tại `http://localhost:8000`):
```bash
php artisan serve
```

*(Tùy chọn)* Mở thêm một cửa sổ terminal khác tại thư mục `backend/` để chạy tiến trình tự động tạo đơn hàng định kỳ theo lịch:
```bash
php artisan schedule:work
```

---

### Bước 3: Cài đặt và cấu hình Frontend (React)

1. Mở một cửa sổ terminal mới, di chuyển vào thư mục `frontend` và cài đặt thư viện:
```bash
cd frontend
npm install
```

2. Tạo tệp `frontend/.env` và khai báo địa chỉ máy chủ Backend API:
```env
VITE_API_URL=http://localhost:8000
```

3. Khởi chạy ứng dụng React (mặc định chạy tại `http://localhost:5173`):
```bash
npm run dev
```

Truy cập trình duyệt tại địa chỉ **`http://localhost:5173`** để bắt đầu sử dụng hệ thống.
