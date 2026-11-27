# XanhFarm — Website thương mại điện tử nông sản sạch

XanhFarm là ứng dụng web kết nối nông trại với người tiêu dùng. Hệ thống hỗ trợ bán nông sản, quản lý quy trình canh tác và kho theo lô, truy xuất nguồn gốc bằng QR, đồng thời cung cấp các công cụ vận hành cho nhân viên và quản trị viên.

## Chức năng

| Khu vực | Chức năng chính |
| --- | --- |
| Khách vãng lai | Xem trang chủ, danh mục và chi tiết sản phẩm; tìm kiếm, lọc sản phẩm; xem câu chuyện nông trại; tra cứu nguồn gốc bằng mã QR. |
| Khách hàng | Quản lý giỏ hàng và địa chỉ; đặt hàng; đăng ký gói định kỳ; theo dõi đơn hàng, điểm thưởng và gửi khiếu nại kèm bằng chứng trong vòng 24 giờ từ khi giao hàng thành công. |
| Nhân viên nông trại | Quản lý mùa vụ, lô canh tác, nhật ký, lô thu hoạch, chứng nhận và hồ sơ kiểm định; ghi nhận hao hụt và truy xuất lô. |
| Nhân viên bán hàng (Sales) | Xử lý đơn hàng, điều phối giao hàng, quản lý tồn kho theo FEFO, chương trình Flash Sale, khiếu nại khách hàng và xử lý cảnh báo thiếu hàng cho đơn định kỳ. |
| Quản trị viên (Admin) | Quản lý sản phẩm, danh mục, gói định kỳ, tài khoản và phân quyền; cấu hình hệ thống; xem báo cáo doanh thu, đơn hàng, hao hụt và khách mua lại. |

Giao diện React được thiết kế responsive theo hướng mobile-first. API Laravel kiểm soát truy cập bằng Sanctum và RBAC; các API được tổ chức theo nhóm vai trò.

## Công nghệ

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, React Router, Axios.
- **Backend:** PHP 8.2+, Laravel 12, Laravel Sanctum.
- **Cơ sở dữ liệu:** MySQL 8+ được khuyến nghị; SQLite có thể dùng cho môi trường phát triển và kiểm thử.
- **Tích hợp tùy chọn:** ApiPay cho thanh toán, Goong Maps cho tính khoảng cách, Cloudflare R2 cho lưu trữ media.

## Cấu trúc dự án

```text
.
├── backend/                                         # Backend Laravel, REST API và nghiệp vụ hệ thống
│   ├── app/
│   │   ├── Console/Commands/
│   │   │   ├── ExpirePendingRetailOrders.php        # Hủy đơn bán lẻ chờ thanh toán quá hạn
│   │   │   ├── GenerateRecurringOrders.php          # Sinh đơn hàng đến kỳ từ gói định kỳ
│   │   │   └── SyncBatchExpiryStatuses.php          # Đồng bộ trạng thái lô theo hạn sử dụng
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Api/
│   │   │   │   │   ├── Admin/
│   │   │   │   │   │   ├── CategoryController.php   # Quản trị danh mục sản phẩm
│   │   │   │   │   │   ├── FarmProfileController.php # Quản lý hồ sơ và hình ảnh nông trại
│   │   │   │   │   │   ├── ProductController.php    # Quản trị sản phẩm và giá bán
│   │   │   │   │   │   ├── ReportController.php     # Tổng hợp số liệu báo cáo quản trị
│   │   │   │   │   │   ├── SubscriptionPackageController.php # Quản lý gói nông sản định kỳ
│   │   │   │   │   │   ├── SystemSettingController.php # Đọc và cập nhật cấu hình vận hành
│   │   │   │   │   │   └── UserRoleController.php   # Quản lý tài khoản, vai trò và quyền
│   │   │   │   │   ├── Customer/
│   │   │   │   │   │   ├── CartController.php       # Quản lý giỏ hàng khách hàng
│   │   │   │   │   │   ├── CheckoutController.php   # Báo giá và khởi tạo thanh toán
│   │   │   │   │   │   ├── ClaimController.php      # Gửi và theo dõi khiếu nại
│   │   │   │   │   │   ├── OrderController.php      # Lịch sử và trạng thái đơn hàng
│   │   │   │   │   │   ├── RetailOrderController.php # Đặt mua lẻ và xử lý đơn bán lẻ
│   │   │   │   │   │   ├── RewardPointController.php # Ví điểm thưởng và lịch sử điểm
│   │   │   │   │   │   └── SubscriptionController.php # Đăng ký và quản lý gói định kỳ
│   │   │   │   │   ├── FarmStaff/
│   │   │   │   │   │   ├── BatchController.php      # Quản lý lô thu hoạch
│   │   │   │   │   │   ├── BatchQrController.php    # Tạo và cung cấp dữ liệu mã QR lô hàng
│   │   │   │   │   │   ├── CertificateController.php # Quản lý chứng nhận và hồ sơ kiểm định
│   │   │   │   │   │   ├── CultivationPlotController.php # Quản lý lô đất canh tác
│   │   │   │   │   │   ├── FarmInfoController.php   # Cập nhật thông tin nông trại
│   │   │   │   │   │   ├── FarmingLogController.php # Quản lý nhật ký canh tác
│   │   │   │   │   │   └── SeasonController.php     # Quản lý mùa vụ
│   │   │   │   │   ├── Public/
│   │   │   │   │   │   ├── BrandStoryController.php # Nội dung thương hiệu và nông trại
│   │   │   │   │   │   ├── CategoryController.php   # Danh mục hiển thị công khai
│   │   │   │   │   │   ├── ProductController.php    # Danh sách, tìm kiếm và chi tiết sản phẩm
│   │   │   │   │   │   ├── QrTraceController.php    # Tra cứu nguồn gốc lô qua mã QR
│   │   │   │   │   │   └── StorefrontController.php # Dữ liệu tổng hợp cho trang cửa hàng
│   │   │   │   │   ├── Sales/
│   │   │   │   │   │   ├── ClaimResolveController.php # Xử lý khiếu nại, hoàn tiền hoặc giao bù
│   │   │   │   │   │   ├── DeliveryController.php   # Điều phối và cập nhật giao hàng
│   │   │   │   │   │   ├── FlashSaleController.php  # Quản lý chương trình Flash Sale
│   │   │   │   │   │   ├── InventoryFefoController.php # Tồn kho FEFO và ghi nhận hao hụt
│   │   │   │   │   │   └── OrderProcessController.php # Xác nhận và xử lý đơn hàng bán
│   │   │   │   │   └── Webhook/
│   │   │   │   │       └── ApiPayWebhookController.php # Xác minh webhook và cập nhật thanh toán
│   │   │   │   ├── Auth/
│   │   │   │   │   ├── AuthenticatedSessionController.php # Đăng nhập và đăng xuất
│   │   │   │   │   ├── EmailVerificationNotificationController.php # Gửi lại email xác minh
│   │   │   │   │   ├── NewPasswordController.php    # Đặt mật khẩu mới sau khi khôi phục
│   │   │   │   │   ├── PasswordResetLinkController.php # Gửi liên kết đặt lại mật khẩu
│   │   │   │   │   ├── RegisteredUserController.php # Đăng ký tài khoản khách hàng
│   │   │   │   │   └── VerifyEmailController.php    # Xác minh địa chỉ email
│   │   │   │   └── Controller.php                   # Lớp cơ sở cho các controller
│   │   │   ├── Middleware/
│   │   │   │   ├── CheckPermission.php               # Kiểm tra quyền thao tác
│   │   │   │   ├── CheckRole.php                     # Kiểm tra vai trò người dùng
│   │   │   │   ├── CheckRoleOrPermission.php         # Kiểm tra vai trò hoặc quyền
│   │   │   │   └── EnsureEmailIsVerified.php         # Yêu cầu tài khoản xác minh email
│   │   │   └── Requests/
│   │   │       ├── Auth/
│   │   │       │   └── LoginRequest.php              # Kiểm tra dữ liệu đăng nhập
│   │   │       ├── Customer/
│   │   │       │   ├── StoreClaimRequest.php         # Kiểm tra yêu cầu gửi khiếu nại
│   │   │       │   ├── StoreOrderRequest.php         # Kiểm tra dữ liệu tạo đơn hàng
│   │   │       │   └── StoreSubscriptionRequest.php  # Kiểm tra đăng ký gói định kỳ
│   │   │       ├── FarmStaff/
│   │   │       │   ├── RecordWastageRequest.php      # Kiểm tra phiếu hao hụt nông trại
│   │   │       │   ├── StoreBatchRequest.php         # Kiểm tra dữ liệu tạo lô thu hoạch
│   │   │       │   ├── StoreFarmingLogRequest.php    # Kiểm tra dữ liệu nhật ký canh tác
│   │   │       │   └── UploadCertificateRequest.php # Kiểm tra tệp chứng nhận tải lên
│   │   │       └── Sales/
│   │   │           ├── RecordWastageRequest.php      # Kiểm tra phiếu hao hụt của Sales
│   │   │           ├── ResolveClaimRequest.php       # Kiểm tra phương án xử lý khiếu nại
│   │   │           └── StoreFlashSaleRequest.php     # Kiểm tra dữ liệu tạo Flash Sale
│   │   ├── Models/                                    # Các model Eloquent ánh xạ dữ liệu nghiệp vụ
│   │   │   ├── BienDongKho.php                       # Biến động tồn kho, hao hụt và xuất hủy
│   │   │   ├── CauHinhHeThong.php                    # Cấu hình vận hành hệ thống
│   │   │   ├── ChiTietDonHang.php                    # Dòng sản phẩm trong đơn hàng
│   │   │   ├── ChiTietFlashSale.php                  # Sản phẩm và giá trong Flash Sale
│   │   │   ├── ChiTietGioHang.php                    # Dòng sản phẩm trong giỏ hàng
│   │   │   ├── ChiTietGoi.php                        # Sản phẩm thuộc gói định kỳ
│   │   │   ├── ChungNhan.php                         # Chứng nhận của nông trại
│   │   │   ├── ChuongTrinhFlashSale.php              # Chương trình Flash Sale
│   │   │   ├── DangKyGoi.php                         # Đăng ký gói định kỳ của khách hàng
│   │   │   ├── DanhMuc.php                           # Danh mục sản phẩm
│   │   │   ├── DiaChiGiaoHang.php                    # Địa chỉ giao hàng khách hàng
│   │   │   ├── DiemTichLuy.php                       # Giao dịch điểm thưởng
│   │   │   ├── DonHang.php                           # Đơn hàng
│   │   │   ├── GiaoHang.php                          # Thông tin và trạng thái giao hàng
│   │   │   ├── GioHang.php                           # Giỏ hàng khách hàng
│   │   │   ├── GoiDinhKy.php                         # Gói nông sản định kỳ
│   │   │   ├── HinhAnhNongTrai.php                   # Hình ảnh hồ sơ nông trại
│   │   │   ├── HinhAnhSanPham.php                    # Hình ảnh sản phẩm
│   │   │   ├── HoanTien.php                          # Thông tin hoàn tiền
│   │   │   ├── KetQuaKiemDinh.php                    # Kết quả kiểm định nông sản hoặc môi trường
│   │   │   ├── KhieuNai.php                          # Khiếu nại khách hàng
│   │   │   ├── LichGiaoDinhKy.php                    # Lịch giao của gói định kỳ
│   │   │   ├── LoCanhTac.php                         # Lô đất canh tác
│   │   │   ├── LoHang.php                            # Lô hàng thu hoạch và tồn kho
│   │   │   ├── MaQrTruyXuat.php                      # Mã QR truy xuất nguồn gốc
│   │   │   ├── MuaVu.php                             # Mùa vụ canh tác
│   │   │   ├── NguoiDung.php                         # Tài khoản người dùng và quan hệ RBAC
│   │   │   ├── NhatKyCanhTac.php                     # Nhật ký các hoạt động canh tác
│   │   │   ├── NongTrai.php                          # Thông tin nông trại
│   │   │   ├── PhanBoLoHang.php                      # Phân bổ lô hàng cho đơn hàng
│   │   │   ├── Quyen.php                             # Quyền trong ma trận phân quyền
│   │   │   ├── SanPham.php                           # Sản phẩm nông sản
│   │   │   ├── TepBangChung.php                      # Tệp ảnh/video bằng chứng khiếu nại
│   │   │   ├── TepNhatKy.php                         # Tệp đính kèm nhật ký canh tác
│   │   │   ├── ThanhToan.php                         # Giao dịch thanh toán
│   │   │   └── VaiTro.php                            # Vai trò người dùng
│   │   ├── Notifications/
│   │   │   └── QueuedResetPasswordNotification.php   # Email đặt lại mật khẩu gửi qua queue
│   │   ├── Providers/
│   │   │   └── AppServiceProvider.php                # Đăng ký cấu hình và dịch vụ dùng chung
│   │   ├── Services/                                 # Dịch vụ xử lý nghiệp vụ và tích hợp ngoài
│   │   │   ├── ApiPayPaymentService.php              # Tạo và tra cứu giao dịch ApiPay
│   │   │   ├── CartPricingService.php                # Tính giá giỏ hàng và tồn kho khả dụng
│   │   │   ├── Catalog/
│   │   │   │   ├── FlashSaleManagementService.php    # Logic tạo và cập nhật Flash Sale
│   │   │   │   └── ProductCatalogService.php         # Logic truy vấn và lọc danh mục sản phẩm
│   │   │   ├── CultivationPlotService.php            # Tính trạng thái và sản lượng lô canh tác
│   │   │   ├── FefoStockService.php                  # Phân bổ tồn kho theo hạn sử dụng FEFO
│   │   │   ├── GoongGeocodingService.php             # Tra cứu tọa độ địa chỉ qua Goong
│   │   │   ├── Order/
│   │   │   │   ├── OrderCancellationService.php      # Hủy đơn và hoàn lại tài nguyên liên quan
│   │   │   │   ├── OrderCreationService.php          # Tạo đơn hàng và chi tiết đơn
│   │   │   │   ├── SalesOrderProcessingService.php   # Quy trình xử lý đơn của nhân viên bán hàng
│   │   │   │   └── ShippingEstimationException.php   # Lỗi nghiệp vụ khi ước tính giao hàng
│   │   │   ├── QrCodeGeneratorService.php            # Sinh mã QR cho lô hàng
│   │   │   ├── R2StorageService.php                  # Tải lên và quản lý tệp Cloudflare R2
│   │   │   ├── RewardPointService.php                # Cộng, trừ và quy đổi điểm thưởng
│   │   │   ├── SalesComplaintResolutionService.php   # Giải quyết khiếu nại bán hàng
│   │   │   ├── ShippingDistanceService.php           # Tính khoảng cách và phí giao hàng
│   │   │   ├── SubscriptionAddressGeocodingException.php # Lỗi địa chỉ khi xác định tọa độ giao hàng
│   │   │   └── SubscriptionGeneratorService.php     # Sinh đơn từ lịch giao gói định kỳ
│   │   └── Traits/
│   │       └── ApiResponse.php                       # Định dạng phản hồi API thống nhất
│   ├── bootstrap/
│   │   ├── app.php                                   # Khởi tạo Laravel, đăng ký route và alias middleware
│   │   └── providers.php                             # Danh sách service provider của ứng dụng
│   ├── config/                                        # Cấu hình Laravel và dịch vụ tích hợp
│   ├── database/
│   │   ├── factories/
│   │   │   └── UserFactory.php                       # Tạo người dùng giả lập cho kiểm thử
│   │   ├── migrations/
│   │   │   ├── 0001_01_01_000000_create_users_table.php # Tạo bảng người dùng mặc định Laravel
│   │   │   ├── 0001_01_01_000001_create_cache_table.php # Tạo bảng cache
│   │   │   ├── 0001_01_01_000002_create_jobs_table.php # Tạo bảng hàng đợi
│   │   │   ├── 2026_11_17_043908_create_rbac_and_users_domain_tables.php # Tạo tài khoản, vai trò và quyền
│   │   │   ├── 2026_11_17_044048_create_farm_and_catalog_domain_tables.php # Tạo nông trại và danh mục
│   │   │   ├── 2026_11_17_044107_create_cultivation_batches_and_inventory_domain_tables.php # Tạo mùa vụ, lô và kho
│   │   │   ├── 2026_11_17_044130_create_cart_subscriptions_and_flash_sales_domain_tables.php # Tạo giỏ, gói định kỳ và Flash Sale
│   │   │   ├── 2026_11_17_044149_create_orders_payments_delivery_and_complaints_domain_tables.php # Tạo đơn, thanh toán, giao hàng và khiếu nại
│   │   │   ├── 2026_11_17_044154_create_database_performance_functions.php # Tạo chỉ mục/hàm phục vụ truy vấn
│   │   │   ├── 2026_11_17_052528_create_laravel_system_tables.php # Tạo các bảng hệ thống Laravel
│   │   │   ├── 2026_11_18_201513_add_trang_thai_to_danh_muc_table.php # Bổ sung trạng thái danh mục
│   │   │   ├── 2026_11_19_010000_add_idempotency_key_to_dang_ky_goi_table.php # Bổ sung khóa chống xử lý lặp đăng ký
│   │   │   ├── 2026_11_19_020000_add_reward_point_conversion_setting.php # Bổ sung cấu hình quy đổi điểm thưởng
│   │   │   ├── 2026_11_22_000000_create_hinh_anh_san_pham_table.php # Tạo bảng ảnh sản phẩm
│   │   │   ├── 2026_11_22_000001_add_la_anh_chinh_to_hinh_anh_san_pham_table.php # Đánh dấu ảnh chính sản phẩm
│   │   │   ├── 2026_11_23_000000_add_cod_payment_method.php # Bổ sung phương thức thanh toán COD
│   │   │   └── 2026_11_23_000001_add_sales_order_filter_index.php # Thêm chỉ mục lọc đơn hàng Sales
│   │   └── seeders/
│   │       ├── DatabaseSeeder.php                    # Nạp dữ liệu mẫu chính
│   │       └── sql/seed_nong_san_sach.sql             # Dữ liệu mẫu vai trò, tài khoản và nghiệp vụ
│   ├── public/                                        # Điểm vào HTTP và tài nguyên công khai backend
│   ├── resources/                                     # Thư mục tài nguyên Laravel (hiện không có logic giao diện)
│   ├── routes/
│   │   ├── api/
│   │   │   ├── admin.php                             # API quản trị viên
│   │   │   ├── customer.php                          # API khách hàng
│   │   │   ├── farm.php                              # API nhân viên nông trại
│   │   │   ├── public.php                            # API công khai
│   │   │   └── sales.php                             # API nhân viên bán hàng
│   │   ├── api.php                                   # Khai báo xác thực và nạp các nhóm API
│   │   ├── auth.php                                  # Route xác thực web của Laravel
│   │   ├── console.php                               # Lịch chạy các tác vụ định kỳ
│   │   └── web.php                                   # Route web mặc định
│   ├── storage/                                      # Log, cache và tệp do ứng dụng tạo
│   ├── tests/
│   │   ├── Feature/
│   │   │   ├── Auth/
│   │   │   │   ├── AuthenticationTest.php             # Kiểm thử đăng nhập và đăng xuất
│   │   │   │   ├── EmailVerificationTest.php          # Kiểm thử xác minh email
│   │   │   │   ├── PasswordResetTest.php              # Kiểm thử quy trình khôi phục mật khẩu
│   │   │   │   └── RegistrationTest.php               # Kiểm thử đăng ký tài khoản
│   │   │   ├── AdminApiTest.php                       # Kiểm thử API quản trị, thống kê và cấu hình
│   │   │   ├── ApiIntegrationTest.php                 # Kiểm thử tích hợp API và định dạng phản hồi
│   │   │   ├── ApiPayPaymentMethodMigrationTest.php   # Kiểm thử migration phương thức thanh toán
│   │   │   ├── ApiPayWebhookTest.php                  # Kiểm thử xác minh webhook ApiPay
│   │   │   ├── BrandStoryTest.php                     # Kiểm thử API câu chuyện thương hiệu
│   │   │   ├── ConcurrencyStockTest.php               # Kiểm thử đồng thời và an toàn tồn kho
│   │   │   ├── CustomerCartTest.php                   # Kiểm thử nghiệp vụ giỏ hàng
│   │   │   ├── CustomerCheckoutTest.php               # Kiểm thử báo giá và thanh toán đơn hàng
│   │   │   ├── CustomerClaimsTest.php                 # Kiểm thử gửi khiếu nại khách hàng
│   │   │   ├── CustomerOrderManagementTest.php        # Kiểm thử quản lý đơn hàng khách hàng
│   │   │   ├── CustomerSubscriptionTest.php           # Kiểm thử đăng ký và quản lý gói định kỳ
│   │   │   ├── ExampleTest.php                        # Kiểm thử mẫu mặc định của Laravel
│   │   │   ├── QrTraceTest.php                        # Kiểm thử truy xuất nguồn gốc bằng QR
│   │   │   ├── R2StorageServiceTest.php               # Kiểm thử lưu trữ tệp trên R2
│   │   │   ├── RbacSecurityTest.php                   # Kiểm thử xác thực và phân quyền RBAC
│   │   │   ├── SalesComplaintWorkflowTest.php         # Kiểm thử quy trình xử lý khiếu nại của Sales
│   │   │   ├── SalesInventoryAndFlashSaleTest.php    # Kiểm thử kho FEFO và Flash Sale
│   │   │   └── SalesOrderManagementTest.php          # Kiểm thử quy trình đơn hàng Sales
│   │   ├── Unit/
│   │   │   ├── ApiPayPaymentServiceTest.php           # Kiểm thử dịch vụ thanh toán ApiPay
│   │   │   ├── ExampleTest.php                        # Kiểm thử unit mẫu mặc định Laravel
│   │   │   └── FefoStockServiceTest.php               # Kiểm thử phân bổ tồn kho theo FEFO
│   │   └── TestCase.php                               # Lớp cơ sở cho các bài kiểm thử
│   ├── .env.example                                  # Mẫu cấu hình môi trường backend
│   ├── artisan                                       # CLI quản trị Laravel
│   ├── composer.json                                 # Khai báo dependency và lệnh Composer
│   └── phpunit.xml                                   # Cấu hình PHPUnit
└── frontend/
    ├── public/                                       # Tài nguyên tĩnh công khai
    ├── src/
    │   ├── components/
    │   │   ├── admin/
    │   │   │   ├── catalog/
    │   │   │   │   ├── AdminCategoryListTab.jsx      # Tab danh sách danh mục quản trị
    │   │   │   │   ├── AdminProductListTab.jsx       # Tab danh sách sản phẩm quản trị
    │   │   │   │   ├── AdminSubscriptionListTab.jsx  # Tab quản lý gói định kỳ
    │   │   │   │   ├── CategoryDropdown.jsx          # Bộ chọn danh mục
    │   │   │   │   ├── CategoryFormModal.jsx         # Form thêm và sửa danh mục
    │   │   │   │   ├── ProductFormModal.jsx          # Form thêm và sửa sản phẩm
    │   │   │   │   └── SubscriptionPackageFormModal.jsx # Form thêm và sửa gói định kỳ
    │   │   │   ├── settings/
    │   │   │   │   ├── FarmProfileSettingTab.jsx     # Cấu hình hồ sơ nông trại
    │   │   │   │   ├── LoyaltySettingTab.jsx        # Cấu hình điểm thưởng
    │   │   │   │   └── ShippingSettingTab.jsx        # Cấu hình vận chuyển
    │   │   │   ├── users/
    │   │   │   │   ├── RolePermissionMatrixTab.jsx   # Ma trận quyền theo vai trò
    │   │   │   │   └── UserListTab.jsx               # Danh sách tài khoản
    │   │   │   ├── KpiStatCards.jsx                  # Thẻ KPI báo cáo quản trị
    │   │   │   ├── modals/UserPermissionModal.jsx    # Form tạo/sửa tài khoản và phân quyền
    │   │   │   └── RevenueAndWastageCharts.jsx       # Biểu đồ doanh thu, sản lượng và hao hụt
    │   │   ├── auth/
    │   │   │   ├── ForgotPasswordModal.jsx           # Form yêu cầu khôi phục mật khẩu
    │   │   │   ├── LoginModal.jsx                    # Form đăng nhập dạng modal
    │   │   │   └── RegisterModal.jsx                 # Form đăng ký dạng modal
    │   │   ├── common/
    │   │   │   ├── Badge.jsx                         # Nhãn trạng thái dùng chung
    │   │   │   ├── Button.jsx                        # Nút dùng chung
    │   │   │   ├── EmptyState.jsx                    # Giao diện trạng thái không có dữ liệu
    │   │   │   ├── FileUploader.jsx                  # Chọn và tải tệp lên
    │   │   │   ├── MediaViewer.jsx                   # Xem ảnh, video và tài liệu
    │   │   │   └── Pagination.jsx                    # Điều khiển phân trang
    │   │   ├── customer/
    │   │   │   ├── checkout/
    │   │   │   │   ├── CheckoutDeliveryAndPayment.jsx # Địa chỉ giao và phương thức thanh toán
    │   │   │   │   ├── CheckoutItemList.jsx           # Danh sách mặt hàng khi thanh toán
    │   │   │   │   ├── CheckoutPendingPayment.jsx     # Trạng thái đơn chờ thanh toán
    │   │   │   │   └── CheckoutSummaryCard.jsx        # Tóm tắt chi phí thanh toán
    │   │   │   ├── modals/CreateClaimModal.jsx        # Form gửi khiếu nại kèm bằng chứng
    │   │   │   ├── orders/
    │   │   │   │   ├── ClaimHistoryCard.jsx           # Thẻ lịch sử khiếu nại
    │   │   │   │   ├── OrderHistoryCard.jsx           # Thẻ lịch sử đơn hàng
    │   │   │   │   ├── orderHistoryUtils.jsx          # Hàm định dạng dữ liệu lịch sử mua hàng
    │   │   │   │   ├── SubscriptionHistoryCard.jsx    # Thẻ lịch sử gói định kỳ
    │   │   │   ├── profile/
    │   │   │   │   ├── AddressBookTab.jsx             # Quản lý sổ địa chỉ
    │   │   │   │   ├── OrdersHistoryTab.jsx           # Tab lịch sử đơn hàng
    │   │   │   │   ├── ProfileInfoTab.jsx             # Thông tin hồ sơ khách hàng
    │   │   │   │   └── RewardHistoryTab.jsx           # Lịch sử điểm thưởng
    │   │   │   ├── AddressDistancePicker.jsx          # Chọn địa chỉ và xem khoảng cách giao
    │   │   │   ├── CartSummaryBox.jsx                  # Tóm tắt giỏ hàng
    │   │   │   ├── SubscriptionPendingPayment.jsx     # Trạng thái thanh toán gói định kỳ
    │   │   │   └── SubscriptionScheduleForm.jsx       # Chọn lịch giao gói định kỳ
    │   │   ├── farm/
    │   │   │   ├── batches/
    │   │   │   │   ├── BatchDetailPanel.jsx           # Chi tiết lô hàng và các thông tin liên quan
    │   │   │   │   ├── BatchFilterBar.jsx             # Bộ lọc danh sách lô hàng
    │   │   │   │   ├── BatchTable.jsx                 # Bảng lô thu hoạch
    │   │   │   │   ├── BatchTraceModal.jsx            # Xem nhanh dữ liệu truy xuất lô
    │   │   │   │   └── BatchWastageModal.jsx          # Ghi nhận hao hụt từ lô hàng
    │   │   │   ├── certificates/
    │   │   │   │   ├── CertificateDeleteModal.jsx    # Xác nhận xóa chứng nhận
    │   │   │   │   ├── CertificateDetailPanel.jsx    # Chi tiết chứng nhận
    │   │   │   │   ├── CertificateFormModal.jsx      # Thêm và sửa hồ sơ chứng nhận
    │   │   │   │   ├── CertificatePreviewModal.jsx   # Xem trước tệp chứng nhận
    │   │   │   │   ├── CertificateStatCards.jsx      # Thống kê trạng thái chứng nhận
    │   │   │   │   ├── CertificateTable.jsx          # Danh sách chứng nhận
    │   │   │   │   └── InspectionResultModal.jsx     # Chi tiết kết quả kiểm định
    │   │   │   ├── modals/
    │   │   │   │   ├── AddFarmingLogModal.jsx         # Ghi nhật ký canh tác
    │   │   │   │   ├── CreateBatchModal.jsx           # Tạo lô thu hoạch
    │   │   │   │   └── QrPrintPreviewModal.jsx        # Xem trước tem QR để in
    │   │   │   ├── seasons/
    │   │   │   │   ├── PlotFormModal.jsx              # Thêm và sửa lô đất canh tác
    │   │   │   │   ├── PlotListSection.jsx            # Danh sách lô đất
    │   │   │   │   ├── PlotTimelinePanel.jsx          # Dòng thời gian hoạt động lô đất
    │   │   │   │   ├── SeasonFormModal.jsx            # Thêm và sửa mùa vụ
    │   │   │   │   └── SeasonListSection.jsx          # Danh sách mùa vụ
    │   │   │   ├── wastage/
    │   │   │   │   ├── InventoryAuditTab.jsx          # Kiểm kê tồn kho
    │   │   │   │   ├── RecordWastageModal.jsx         # Ghi nhận hao hụt hoặc xuất hủy
    │   │   │   │   ├── WastageHistoryTab.jsx          # Lịch sử hao hụt và điều chỉnh kho
    │   │   │   │   └── WastageStatCards.jsx           # KPI tồn kho và hao hụt
    │   │   │   └── FarmingLogTimeline.jsx             # Dòng thời gian nhật ký canh tác
    │   │   ├── home/
    │   │   │   ├── CategoryGridSection.jsx            # Lưới danh mục trang chủ
    │   │   │   ├── FarmJourneySection.jsx             # Câu chuyện hành trình nông trại
    │   │   │   ├── FeaturedProductsSection.jsx        # Sản phẩm nổi bật
    │   │   │   ├── FlashSaleSection.jsx               # Khu vực Flash Sale
    │   │   │   ├── GreenhouseShowcaseSection.jsx      # Hình ảnh giới thiệu nông trại
    │   │   │   ├── HeroSection.jsx                    # Khối giới thiệu chính trang chủ
    │   │   │   ├── SubscriptionPackagesSection.jsx    # Các gói định kỳ trên trang chủ
    │   │   │   └── TrustBadgesSection.jsx             # Nhãn chứng nhận và tạo độ tin cậy
    │   │   ├── navigation/
    │   │   │   ├── header/
    │   │   │   │   ├── HeaderUserMenu.jsx             # Menu tài khoản trên header
    │   │   │   │   └── MobileNavDrawer.jsx            # Menu điều hướng trên thiết bị di động
    │   │   │   ├── DynamicSidebar.jsx                 # Menu dashboard thay đổi theo vai trò
    │   │   │   ├── StorefrontFooter.jsx               # Footer cửa hàng
    │   │   │   └── StorefrontHeader.jsx               # Header cửa hàng
    │   │   ├── public/
    │   │   │   ├── product-detail/
    │   │   │   │   ├── ProductDetailGallery.jsx       # Bộ ảnh chi tiết sản phẩm
    │   │   │   │   ├── ProductPurchasePanel.jsx       # Giá, số lượng và thao tác mua
    │   │   │   │   └── ProductQualityDetails.jsx      # Chất lượng và thông tin sản phẩm
    │   │   │   ├── ProductCard.jsx                    # Thẻ sản phẩm
    │   │   │   ├── ProductFilterSidebar.jsx           # Bộ lọc danh sách sản phẩm
    │   │   │   ├── QrCodeScanner.jsx                  # Quét mã QR bằng camera
    │   │   │   └── QrTraceTimeline.jsx                # Hiển thị các mốc truy xuất nguồn gốc
    │   │   ├── sales/
    │   │   │   ├── modals/
    │   │   │   │   ├── DispatchOrderModal.jsx         # Điều phối giao đơn hàng
    │   │   │   │   ├── RecordWastageModal.jsx         # Ghi nhận hao hụt tồn kho
    │   │   │   │   └── ResolveClaimModal.jsx          # Xử lý khiếu nại khách hàng
    │   │   │   ├── orders/
    │   │   │   │   ├── SalesOrderDetailPanel.jsx      # Chi tiết đơn hàng cho Sales
    │   │   │   │   └── SalesOrderTable.jsx            # Bảng đơn hàng cho Sales
    │   │   │   ├── ExpiringAlertBanner.jsx            # Cảnh báo lô hàng sắp hết hạn
    │   │   │   ├── FefoBatchTable.jsx                 # Bảng lô hàng sắp xếp theo FEFO
    │   │   │   ├── FlashSaleCampaignCard.jsx          # Thẻ chương trình Flash Sale
    │   │   │   ├── FlashSaleForm.jsx                  # Form dữ liệu Flash Sale
    │   │   │   └── FlashSaleFormModal.jsx             # Modal tạo hoặc sửa Flash Sale
    │   │   ├── ErrorDisplay.jsx                       # Hiển thị lỗi API hoặc lỗi trang
    │   │   └── GlobalToast.jsx                        # Thông báo toàn cục
    │   ├── context/
    │   │   ├── AuthContext.jsx                        # Provider trạng thái đăng nhập
    │   │   ├── authStateContext.js                    # Context trạng thái xác thực
    │   │   ├── CartContext.jsx                        # Provider trạng thái giỏ hàng
    │   │   ├── cartStateContext.js                    # Context trạng thái giỏ hàng
    │   │   ├── useAuth.js                             # Hook truy cập phiên và vai trò
    │   │   └── useCart.js                             # Hook truy cập giỏ hàng
    │   ├── hooks/
    │   │   ├── useDebounce.js                         # Trì hoãn cập nhật giá trị tìm kiếm
    │   │   └── usePaymentPolling.js                   # Kiểm tra định kỳ trạng thái thanh toán
    │   ├── layouts/
    │   │   ├── DashboardLayout.jsx                    # Khung giao diện khu vực nội bộ
    │   │   └── StorefrontLayout.jsx                   # Khung giao diện cửa hàng
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   ├── AdminDashboardPage.jsx             # Dashboard báo cáo và thống kê
    │   │   │   ├── CatalogManagePage.jsx              # Quản lý sản phẩm, danh mục và gói
    │   │   │   ├── SystemSettingsPage.jsx             # Cấu hình hệ thống
    │   │   │   └── UserManagementPage.jsx             # Quản lý tài khoản và phân quyền
    │   │   ├── auth/
    │   │   │   ├── ForgotPasswordPage.jsx             # Khôi phục mật khẩu
    │   │   │   ├── LoginPage.jsx                      # Đăng nhập
    │   │   │   └── RegisterPage.jsx                   # Đăng ký
    │   │   ├── customer/
    │   │   │   ├── CartPage.jsx                       # Giỏ hàng
    │   │   │   ├── CheckoutPage.jsx                   # Xác nhận đơn và thanh toán
    │   │   │   ├── OrderHistoryPage.jsx               # Lịch sử mua hàng
    │   │   │   ├── RewardWalletPage.jsx               # Hồ sơ, đơn hàng và ví điểm thưởng
    │   │   │   └── SubscriptionRegisterPage.jsx       # Đăng ký gói định kỳ
    │   │   ├── farm/
    │   │   │   ├── BatchHarvestPage.jsx               # Quản lý lô thu hoạch
    │   │   │   ├── CertificateManagePage.jsx          # Quản lý chứng nhận và kiểm định
    │   │   │   ├── InventoryWastagePage.jsx           # Kiểm kê và hao hụt nông trại
    │   │   │   └── SeasonManagePage.jsx               # Quản lý mùa vụ và lô canh tác
    │   │   ├── public/
    │   │   │   ├── BrandStoryPage.jsx                 # Câu chuyện thương hiệu
    │   │   │   ├── HomePage.jsx                       # Trang chủ cửa hàng
    │   │   │   ├── ProductCatalogPage.jsx             # Danh mục và tìm kiếm sản phẩm
    │   │   │   ├── ProductDetailPage.jsx              # Chi tiết sản phẩm
    │   │   │   └── QrTraceabilityPage.jsx             # Tra cứu truy xuất nguồn gốc
    │   │   ├── sales/
    │   │   │   ├── CustomerClaimPage.jsx              # Quản lý khiếu nại
    │   │   │   ├── FefoBatchTable.jsx                 # Trang/bảng tồn kho FEFO
    │   │   │   ├── FlashSalePage.jsx                  # Quản lý Flash Sale
    │   │   │   ├── InventoryFefoPage.jsx              # Quản lý tồn kho theo FEFO
    │   │   │   └── SalesOrderPage.jsx                 # Quản lý đơn hàng bán
    │   │   └── ApiTestPage.jsx                        # Trang kiểm tra API môi trường phát triển
    │   ├── routes/
    │   │   ├── AppRouter.jsx                          # Khai báo đường dẫn toàn ứng dụng
    │   │   ├── ProtectedRoute.jsx                     # Chặn trang yêu cầu đăng nhập
    │   │   └── RoleGuard.jsx                          # Giới hạn trang theo vai trò
    │   ├── services/
    │   │   ├── adminApi.js                            # API quản trị viên
    │   │   ├── authApi.js                             # API đăng nhập, đăng ký và khôi phục mật khẩu
    │   │   ├── axiosClient.js                         # Axios client và xử lý xác thực/phản hồi chung
    │   │   ├── customerApi.js                         # API khách hàng
    │   │   ├── farmApi.js                             # API nhân viên nông trại
    │   │   ├── publicApi.js                           # API nội dung công khai
    │   │   ├── salesApi.js                            # API nhân viên bán hàng
    │   │   └── storefrontApi.js                       # API dữ liệu trang cửa hàng
    │   ├── App.css                                    # Kiểu dáng cấp ứng dụng
    │   ├── App.jsx                                    # Component gốc và provider ứng dụng
    │   ├── assets/                                    # Tài nguyên ảnh và biểu tượng; không liệt kê từng file
    │   ├── index.css                                  # Kiểu dáng và chỉ thị Tailwind toàn cục
    │   └── main.jsx                                   # Điểm khởi chạy React
    ├── .env.example                                   # Mẫu cấu hình API URL cho frontend
    ├── .oxlintrc.json                                 # Cấu hình Oxlint
    ├── index.html                                     # HTML gốc của ứng dụng Vite
    ├── package-lock.json                              # Khóa phiên bản dependency frontend
    ├── package.json                                   # Dependency và lệnh chạy/build/lint
    └── vite.config.js                                 # Cấu hình Vite và plugin Tailwind
```

## Cài đặt và chạy local

### Yêu cầu

- PHP **8.2 trở lên** và Composer.
- Node.js **20.19+** hoặc **22.13+**, cùng npm.
- MySQL 8+ nếu dùng MySQL; SQLite có sẵn trong PHP nếu chọn SQLite.

### 1. Cấu hình Backend

Mở PowerShell tại thư mục gốc dự án:

```powershell
cd backend
composer install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
php artisan key:generate
```

Mặc định, `.env.example` chọn SQLite. Tạo tệp cơ sở dữ liệu nếu chưa có rồi chạy migrations và dữ liệu mẫu:

```powershell
if (-not (Test-Path database\database.sqlite)) {
    New-Item -ItemType File -Path database\database.sqlite | Out-Null
}
php artisan migrate --seed
```

Nếu dùng MySQL, cập nhật `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` và `DB_PASSWORD` trong `backend/.env`, tạo database trước, sau đó chạy `php artisan migrate --seed`.

Khởi động API:

```powershell
php artisan serve
```

Backend mặc định chạy tại `http://127.0.0.1:8000`.

### 2. Cấu hình Frontend

Mở một terminal khác tại thư mục gốc:

```powershell
cd frontend
npm ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

`frontend/.env.example` đã cấu hình `VITE_API_URL=http://127.0.0.1:8000/api`. Nếu backend chạy ở địa chỉ khác, cập nhật biến này trong `frontend/.env`. Mở URL Vite hiển thị trong terminal (thường là `http://localhost:5173`).

### Dịch vụ nền tùy chọn

Các terminal dưới đây chạy từ thư mục `backend`:

```powershell
php artisan queue:work --tries=3
```

Để chạy các lịch tác vụ tự động (đơn định kỳ, đơn chờ thanh toán và trạng thái hạn sử dụng lô):

```powershell
php artisan schedule:work
```

Để kiểm thử email cục bộ, có thể chạy Mailpit và cấu hình SMTP trong `backend/.env` (Mailpit mặc định dùng cổng SMTP `1025`, giao diện xem thư `8025`). Nếu không cấu hình SMTP, email dùng cấu hình mặc định trong `.env`.

## Tích hợp bên thứ ba

Các khóa sau chỉ đặt trong `backend/.env`, không đưa vào frontend hoặc Git:

- **ApiPay:** cấu hình `APIPAY_ACCESS_KEY`, `APIPAY_SECRET_KEY`, `APIPAY_WEBHOOK_SECRET`, `APIPAY_WEBHOOK_URL` và `APIPAY_BANK_PUBLIC_ID` để bật luồng thanh toán. Webhook cần URL HTTPS có thể truy cập từ ApiPay.
- **Goong Maps:** cấu hình `GOONG_API_KEY` để sử dụng các chức năng geocoding và tính khoảng cách giao hàng.
- **Cloudflare R2:** thêm `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT` và các giá trị phù hợp cho `R2_DEFAULT_REGION`, `R2_URL`, `R2_USE_PATH_STYLE_ENDPOINT` vào `backend/.env` để lưu trữ ảnh, video và tài liệu.

Các biến môi trường cơ bản được liệt kê trong [`backend/.env.example`](backend/.env.example) và [`frontend/.env.example`](frontend/.env.example). Không commit tệp `.env` hoặc khóa API thật.

## Kiểm thử và build

Chạy các lệnh từ thư mục tương ứng:

```powershell
# Backend
cd backend
php artisan test

# Frontend (terminal riêng)
cd frontend
npm run lint
npm run build
```

## Tài khoản dữ liệu mẫu

Sau khi chạy `php artisan migrate --seed`, có thể đăng nhập bằng các tài khoản dưới đây. Mật khẩu seed chung là `password`; chỉ sử dụng trong môi trường local và đổi thông tin trước khi triển khai.

| Vai trò | Email | Khu vực |
| --- | --- | --- |
| Admin | `admin@nongsansach.vn` | `/admin` |
| Sales | `sales.ha@nongsansach.vn` | `/sales/orders` |
| Nhân viên nông trại | `farm.kythuat@nongsansach.vn` | `/farm/seasons` |
| Khách hàng | `ngocanh.khach@gmail.com` | Trang cửa hàng |

> **Lưu ý:** `php artisan migrate:fresh --seed` sẽ xóa toàn bộ bảng và dữ liệu hiện có trước khi tạo lại. Chỉ dùng lệnh này khi có chủ đích làm mới database local.

## Thành viên thực hiện

| Họ và tên | Đóng góp chính |
| --- | --- |
| Nguyễn Hoài Linh | Khởi tạo ứng dụng, tích hợp API, xác thực và RBAC. |
| Ngô Gia Bảo | Cơ sở dữ liệu, danh mục, truy xuất QR, đơn hàng và kho FEFO/Flash Sale. |
| Lê Minh Quân | Tích hợp ApiPay, Goong Maps và chức năng khách hàng. |
| Nguyễn Vũ Anh Khoa | Layout, điều hướng và chức năng quản lý nông trại. |
| Lê Minh Tài | Trang cửa hàng, danh mục, câu chuyện thương hiệu, giao hàng và khiếu nại. |
