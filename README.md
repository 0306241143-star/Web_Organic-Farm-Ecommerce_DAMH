# XanhFarm — Website thương mại điện tử nông sản sạch

XanhFarm là ứng dụng web kết nối nông trại với người tiêu dùng. Hệ thống hỗ trợ bán nông sản, quản lý quy trình canh tác và kho theo lô, truy xuất nguồn gốc bằng QR, đồng thời cung cấp các công cụ vận hành cho nhân viên và quản trị viên.

## Chức năng

| Khu vực | Chức năng chính |
| --- | --- |
| Khách vãng lai | Xem trang chủ, danh mục và chi tiết sản phẩm; tìm kiếm, lọc sản phẩm; xem câu chuyện nông trại; tra cứu nguồn gốc bằng mã QR. |
| Khách hàng | Quản lý giỏ hàng và địa chỉ; đặt hàng; đăng ký gói định kỳ; theo dõi đơn hàng, điểm thưởng và gửi khiếu nại kèm bằng chứng. |
| Nhân viên nông trại | Quản lý mùa vụ, lô canh tác, nhật ký, lô thu hoạch, chứng nhận và hồ sơ kiểm định; ghi nhận hao hụt và truy xuất lô. |
| Nhân viên bán hàng (Sales) | Xử lý đơn hàng, điều phối giao hàng, quản lý tồn kho theo FEFO, chương trình Flash Sale và khiếu nại khách hàng. |
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
├── backend/
│   ├── app/                 # API controllers, models, services, middleware
│   ├── database/            # Migrations, seeders và dữ liệu mẫu
│   ├── routes/              # API routes, phân nhóm theo nghiệp vụ
│   └── tests/               # Feature và unit tests
└── frontend/
    └── src/
        ├── components/      # UI components theo nghiệp vụ
        ├── context/         # Trạng thái xác thực và giỏ hàng
        ├── layouts/         # Storefront và dashboard layouts
        ├── pages/           # Giao diện public, customer, farm, sales, admin
        ├── routes/          # Routing và bảo vệ trang theo vai trò
        └── services/        # API clients
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
