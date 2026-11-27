<?php

/*
 * Luồng công khai: danh sách, tìm kiếm, lọc đa tiêu chí và xem chi tiết sản phẩm nông sản.
 */

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\ChungNhan;
use App\Models\SanPham;
use App\Services\QrCodeGeneratorService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    use ApiResponse;

    /**
     * Danh sách nông sản đang mở bán hỗ trợ tìm kiếm, lọc danh mục, khoảng giá, chứng nhận, tồn kho FEFO, Flash Sale, sắp xếp và phân trang.
     */
    public function index(Request $request): JsonResponse
    {
        $allProducts = Cache::remember('public_catalog_products_v2', 120, function (): Collection {
            $soldCountMap = $this->loadSoldCountMap();

            return $this->loadActiveProducts()
                ->map(fn(SanPham $product) => $this->formatProduct(
                    $product,
                    false,
                    (float) ($soldCountMap[$product->Ma_san_pham] ?? 0)
                ))
                ->values();
        });

        $facets = $this->buildCatalogFacets($allProducts);
        $filtered = $this->applyFilters($allProducts, $request);
        $sorted = $this->applySort($filtered, (string) $request->query('sort', 'featured'));

        $perPage = max(1, min(48, (int) $request->query('per_page', 12)));
        $total = $sorted->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = max(1, min($lastPage, (int) $request->query('page', 1)));

        $items = $sorted->forPage($page, $perPage)->values();

        return $this->successResponse(
            message: 'Lấy danh sách sản phẩm nông sản thành công.',
            data: $items,
            meta: [
                'current_page' => $page,
                'per_page'     => $perPage,
                'total'        => $total,
                'last_page'    => $lastPage,
                'facets'       => $facets,
            ]
        );
    }

    /**
     * Xem chi tiết một sản phẩm nông sản kèm thông tin lô hàng FEFO, chứng nhận chất lượng, nhật ký canh tác, mã QR và sản phẩm cùng danh mục.
     */
    public function show(int $id): JsonResponse
    {
        $product = $this->baseProductQuery()
            ->where('Ma_san_pham', $id)
            ->first();

        if (! $product) {
            return $this->errorResponse(
                message: 'Không tìm thấy sản phẩm nông sản hoặc sản phẩm đã tạm ngưng bán.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        $soldCountMap = $this->loadSoldCountMap();

        $related = $this->baseProductQuery()
            ->where('Ma_danh_muc', $product->Ma_danh_muc)
            ->where('Ma_san_pham', '!=', $product->Ma_san_pham)
            ->limit(4)
            ->get()
            ->map(fn(SanPham $item) => $this->formatProduct(
                $item,
                false,
                (float) ($soldCountMap[$item->Ma_san_pham] ?? 0)
            ))
            ->values();

        $payload = $this->formatProduct(
            $product,
            true,
            (float) ($soldCountMap[$product->Ma_san_pham] ?? 0)
        );
        $payload['related_products'] = $related;

        return $this->successResponse(
            message: 'Lấy chi tiết sản phẩm nông sản thành công.',
            data: $payload
        );
    }

    private function loadSoldCountMap(): array
    {
        return DB::table('chi_tiet_don_hang as ctdh')
            ->join('don_hang as dh', 'ctdh.Ma_don_hang', '=', 'dh.Ma_don_hang')
            ->where('dh.Trang_thai', '!=', 'Da_huy')
            ->groupBy('ctdh.Ma_san_pham')
            ->pluck(DB::raw('COALESCE(SUM(ctdh.So_luong), 0) as total_sold'), 'ctdh.Ma_san_pham')
            ->toArray();
    }

    private function baseProductQuery()
    {
        return SanPham::query()
            ->where('Trang_thai', 'Dang_ban')
            ->with([
                'danhMuc:Ma_danh_muc,Ten_danh_muc,Mo_ta',
                'nongTrai:Ma_nong_trai,Ten_nong_trai,Dia_chi',
                'chungNhans',
                'loCanhTacs' => function ($plotQuery) {
                    $plotQuery->select([
                        'Ma_lo_canh_tac',
                        'Ma_san_pham',
                        'Ma_mua_vu',
                        'Ten_lo',
                        'Ngay_gieo_trong',
                        'Trang_thai',
                    ])->with([
                        'muaVu:Ma_mua_vu,Ten_mua_vu,Ngay_bat_dau,Ngay_ket_thuc',
                        'nhatKyCanhTacs' => function ($logQuery) {
                            $logQuery->select([
                                'Ma_nhat_ky',
                                'Ma_lo_canh_tac',
                                'Loai_hoat_dong',
                                'Thoi_gian_thuc_hien',
                                'Noi_dung',
                            ])
                                ->orderBy('Thoi_gian_thuc_hien')
                                ->with(['tepNhatKys:Ma_tep,Ma_nhat_ky,Loai_tep,Duong_dan,Mo_ta']);
                        },
                        'loHangs' => function ($batchQuery) {
                            $batchQuery->select([
                                'Ma_lo_hang',
                                'Ma_lo_canh_tac',
                                'Ngay_thu_hoach',
                                'Han_su_dung',
                                'So_luong_thu_hoach',
                                'So_luong_con_lai',
                                'Trang_thai',
                            ])->with([
                                'maQrTruyXuat:Ma_qr,Ma_lo_hang,Chuoi_ma_qr,So_luot_quet',
                                'chungNhans',
                                'chiTietFlashSales.flashSale',
                            ]);
                        },
                    ]);
                },
            ]);
    }

    private function loadActiveProducts(): Collection
    {
        return $this->baseProductQuery()
            ->orderByDesc('Ma_san_pham')
            ->get();
    }

    private function applyFilters(Collection $products, Request $request): Collection
    {
        $filtered = $products;

        // 1. Lọc theo danh mục
        $rawCategory = $request->query('category_id', $request->query('category'));
        if ($rawCategory !== null && trim((string) $rawCategory) !== '' && strtoupper((string) $rawCategory) !== 'ALL') {
            $categoryIds = collect(explode(',', (string) $rawCategory))
                ->map(fn($id) => (int) trim($id))
                ->filter(fn($id) => $id > 0)
                ->values();

            if ($categoryIds->isNotEmpty()) {
                $filtered = $filtered->filter(
                    fn(array $item): bool => isset($item['category']['id']) && $categoryIds->contains($item['category']['id'])
                );
            }
        }

        // 2. Tìm kiếm theo từ khóa
        $rawSearch = trim((string) $request->query('search', $request->query('q', '')));
        if ($rawSearch !== '') {
            $needleLower = mb_strtolower($rawSearch);
            $needleAscii = $this->normalizeText($rawSearch);

            $filtered = $filtered->filter(function (array $item) use ($needleLower, $needleAscii): bool {
                $haystackParts = [
                    $item['name'] ?? '',
                    $item['description'] ?? '',
                    $item['category']['name'] ?? '',
                    $item['farm']['name'] ?? '',
                    $item['unit'] ?? '',
                    implode(' ', $item['certification_standards'] ?? []),
                    implode(' ', array_map(fn($c) => ($c['name'] ?? '') . ' ' . ($c['issuer'] ?? ''), $item['certifications'] ?? [])),
                ];

                $haystack = implode(' ', array_filter($haystackParts));

                return str_contains(mb_strtolower($haystack), $needleLower)
                    || ($needleAscii !== '' && str_contains($this->normalizeText($haystack), $needleAscii));
            });
        }

        // 3. Lọc theo khoảng giá thực tế
        $minPrice = $request->query('min_price');
        if ($minPrice !== null && $minPrice !== '' && is_numeric($minPrice)) {
            $minVal = max(0, (float) $minPrice);
            $filtered = $filtered->filter(fn(array $item): bool => (float) $item['effective_price'] >= $minVal);
        }

        $maxPrice = $request->query('max_price');
        if ($maxPrice !== null && $maxPrice !== '' && is_numeric($maxPrice)) {
            $maxVal = max(0, (float) $maxPrice);
            $filtered = $filtered->filter(fn(array $item): bool => (float) $item['effective_price'] <= $maxVal);
        }

        // 4. Lọc theo chứng nhận chất lượng
        $rawCert = $request->query('certification', $request->query('cert'));
        if ($rawCert !== null && trim((string) $rawCert) !== '') {
            $selectedCerts = collect(explode(',', (string) $rawCert))
                ->map(fn($value) => $this->normalizeText($value))
                ->filter()
                ->values();

            if ($selectedCerts->isNotEmpty()) {
                $filtered = $filtered->filter(function (array $item) use ($selectedCerts): bool {
                    $standards = collect($item['certification_standards'] ?? [])
                        ->map(fn($label) => $this->normalizeText($label));
                    $certNames = collect($item['certifications'] ?? [])
                        ->map(fn($cert) => $this->normalizeText(($cert['name'] ?? '') . ' ' . ($cert['issuer'] ?? '')));

                    $combined = $standards->merge($certNames);

                    return $selectedCerts->contains(function (string $wanted) use ($combined): bool {
                        return $combined->contains(fn(string $text): bool => str_contains($text, $wanted));
                    });
                });
            }
        }

        // 5. Lọc theo trạng thái còn hàng FEFO
        if ($this->toBool($request->query('in_stock'))) {
            $filtered = $filtered->filter(fn(array $item): bool => $item['in_stock'] === true);
        }

        // 6. Lọc sản phẩm đang chạy Flash Sale
        if ($this->toBool($request->query('flash_sale'))) {
            $filtered = $filtered->filter(fn(array $item): bool => $item['is_flash_sale'] === true);
        }

        return $filtered->values();
    }

    private function applySort(Collection $products, string $sort): Collection
    {
        return match ($sort) {
            'best_selling' => $products->sort(function (array $a, array $b): int {
                $soldCmp = ($b['sold_count'] ?? 0) <=> ($a['sold_count'] ?? 0);
                if ($soldCmp !== 0) {
                    return $soldCmp;
                }

                $stockCmp = ($b['in_stock'] ? 1 : 0) <=> ($a['in_stock'] ? 1 : 0);
                if ($stockCmp !== 0) {
                    return $stockCmp;
                }

                return $b['id'] <=> $a['id'];
            })->values(),
            'price_asc'  => $products->sortBy([['effective_price', 'asc'], ['id', 'desc']])->values(),
            'price_desc' => $products->sortBy([['effective_price', 'desc'], ['id', 'desc']])->values(),
            'name_asc'   => $products->sortBy(fn(array $item) => $this->normalizeText($item['name'] ?? ''))->values(),
            'newest'     => $products->sortByDesc('id')->values(),
            'stock_desc' => $products->sortBy([['available_stock', 'desc'], ['id', 'desc']])->values(),
            default      => $products->sort(function (array $a, array $b): int {
                $scoreA = ($a['is_flash_sale'] ? 4 : 0) + ($a['in_stock'] ? 2 : 0) + (! empty($a['certifications']) ? 1 : 0);
                $scoreB = ($b['is_flash_sale'] ? 4 : 0) + ($b['in_stock'] ? 2 : 0) + (! empty($b['certifications']) ? 1 : 0);

                if ($scoreA !== $scoreB) {
                    return $scoreB <=> $scoreA;
                }

                return $b['id'] <=> $a['id'];
            })->values(),
        };
    }

    private function buildCatalogFacets(Collection $products): array
    {
        $certCounts = [];
        foreach ($products as $product) {
            foreach ($product['certification_standards'] ?? [] as $standard) {
                $certCounts[$standard] = ($certCounts[$standard] ?? 0) + 1;
            }
        }
        arsort($certCounts);

        $availableCertifications = [];
        foreach ($certCounts as $label => $count) {
            $availableCertifications[] = [
                'label' => $label,
                'count' => $count,
            ];
        }

        $prices = $products->pluck('effective_price')->map(fn($p) => (float) $p);

        return [
            'available_certifications' => $availableCertifications,
            'price_bounds'             => [
                'min' => $prices->isNotEmpty() ? $prices->min() : 0,
                'max' => $prices->isNotEmpty() ? $prices->max() : 0,
            ],
            'summary'                  => [
                'total_products'   => $products->count(),
                'in_stock_count'   => $products->where('in_stock', true)->count(),
                'flash_sale_count' => $products->where('is_flash_sale', true)->count(),
            ],
        ];
    }

    private function formatProduct(SanPham $product, bool $includeDetail = false, float $soldCount = 0): array
    {
        $allBatches = $product->loCanhTacs
            ->flatMap(fn($plot) => $plot->loHangs)
            ->values();

        $today = now()->toDateString();

        // Áp dụng quy tắc FEFO: chỉ tính lô còn hàng / sắp hết hạn, số lượng > 0 và chưa quá hạn
        $fefoBatches = $allBatches
            ->filter(
                fn($batch): bool =>
                in_array($batch->Trang_thai, ['Con_hang', 'Sap_het_han'], true)
                    && (float) $batch->So_luong_con_lai > 0
                    && (string) $batch->Han_su_dung >= $today
            )
            ->sortBy('Han_su_dung')
            ->values();

        $availableStock = round((float) $fefoBatches->sum(fn($batch) => (float) $batch->So_luong_con_lai), 2);
        $nearestBatch = $fefoBatches->first();
        $nearestExpiry = $nearestBatch?->Han_su_dung;
        $latestHarvest = $fefoBatches->sortByDesc('Ngay_thu_hoach')->first()?->Ngay_thu_hoach;

        $traceBatch = $fefoBatches->first(fn($batch) => $batch->maQrTruyXuat !== null)
            ?? $allBatches->sortByDesc('Ngay_thu_hoach')->first(fn($batch) => $batch->maQrTruyXuat !== null);
        $traceQrCode = $traceBatch?->maQrTruyXuat?->Chuoi_ma_qr;

        // Xác định Flash Sale đang hoạt động gắn vào lô còn hàng
        $regularPrice = (float) $product->Gia_ban;
        $activeFlashSale = null;

        foreach ($fefoBatches as $batch) {
            foreach ($batch->chiTietFlashSales as $detail) {
                $program = $detail->flashSale;
                if (
                    ! $program
                    || $program->Trang_thai !== 'Dang_dien_ra'
                    || (string) $program->Thoi_gian_bat_dau > now()->toDateTimeString()
                    || (string) $program->Thoi_gian_ket_thuc < now()->toDateTimeString()
                ) {
                    continue;
                }

                $remainingQuota = round((float) $detail->So_luong_gioi_han - (float) $detail->So_luong_da_ban, 2);
                $salePrice = (float) $detail->Gia_giam;

                if ($remainingQuota <= 0 || $salePrice <= 0 || $salePrice >= $regularPrice) {
                    continue;
                }

                if ($activeFlashSale === null || $salePrice < $activeFlashSale['sale_price']) {
                    $activeFlashSale = [
                        'flash_sale_detail_id' => (int) $detail->Ma_ct_flash_sale,
                        'flash_sale_id'        => (int) $program->Ma_flash_sale,
                        'program_name'         => $program->Ten_chuong_trinh,
                        'batch_id'             => (int) $batch->Ma_lo_hang,
                        'sale_price'           => $salePrice,
                        'quota_limit'          => (float) $detail->So_luong_gioi_han,
                        'sold_quantity'        => (float) $detail->So_luong_da_ban,
                        'remaining_quota'      => $remainingQuota,
                        'ends_at'              => $program->Thoi_gian_ket_thuc,
                    ];
                }
            }
        }

        $effectivePrice = $activeFlashSale ? $activeFlashSale['sale_price'] : $regularPrice;
        $discountPercent = ($activeFlashSale && $regularPrice > 0)
            ? (int) round((($regularPrice - $effectivePrice) / $regularPrice) * 100)
            : 0;

        // Tổng hợp chứng nhận gắn trực tiếp vào sản phẩm hoặc gắn vào lô hàng
        $batchCerts = $allBatches->flatMap(fn($batch) => $batch->chungNhans);
        $mergedCerts = $product->chungNhans
            ->merge($batchCerts)
            ->unique('Ma_chung_nhan')
            ->values();

        $certifications = $mergedCerts->map(function (ChungNhan $cert) use ($includeDetail): array {
            $data = [
                'id'           => (int) $cert->Ma_chung_nhan,
                'name'         => $cert->Ten_chung_nhan,
                'standard'     => $this->classifyCertificationStandard($cert->Ten_chung_nhan),
                'issuer'       => $cert->To_chuc_cap,
                'issued_at'    => $cert->Ngay_cap,
                'expires_at'   => $cert->Ngay_het_han,
                'batch_id'     => $cert->Ma_lo_hang ? (int) $cert->Ma_lo_hang : null,
            ];

            if ($includeDetail) {
                $data['file_url'] = $this->resolveImageUrl($cert->Duong_dan_tep);
            }

            return $data;
        })->values()->all();

        $certificationStandards = collect($certifications)
            ->pluck('standard')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $galleryUrls = collect([$this->resolveImageUrl($product->Hinh_anh_dai_dien)]);
        if ($includeDetail && Schema::hasTable('hinh_anh_san_pham')) {
            $query = DB::table('hinh_anh_san_pham')
                ->where('Ma_san_pham', $product->Ma_san_pham);

            if (Schema::hasColumn('hinh_anh_san_pham', 'La_anh_chinh')) {
                $query->orderByDesc('La_anh_chinh');
            }

            $extraPaths = $query
                ->orderBy('Thu_tu')
                ->orderBy('Ma_hinh_anh')
                ->pluck('Duong_dan');

            foreach ($extraPaths as $path) {
                $galleryUrls->push($this->resolveImageUrl($path));
            }
        }
        $images = $galleryUrls->filter()->unique()->values()->all();

        $data = [
            'id'                      => (int) $product->Ma_san_pham,
            'name'                    => $product->Ten_san_pham,
            'description'             => $product->Mo_ta,
            'unit'                    => $product->Don_vi_tinh,
            'price'                   => $regularPrice,
            'effective_price'         => $effectivePrice,
            'is_flash_sale'           => $activeFlashSale !== null,
            'discount_percent'        => $discountPercent,
            'flash_sale'              => $activeFlashSale,
            'image_url'               => $images[0] ?? null,
            'images'                  => $images,
            'reward_point_rate'       => (float) $product->Ty_le_tich_diem,
            'status'                  => $product->Trang_thai,
            'sold_count'              => round($soldCount, 2),
            'batch_id'                => $nearestBatch ? (int) $nearestBatch->Ma_lo_hang : null,
            'category'                => $product->danhMuc ? [
                'id'          => (int) $product->danhMuc->Ma_danh_muc,
                'name'        => $product->danhMuc->Ten_danh_muc,
                'description' => $product->danhMuc->Mo_ta,
            ] : null,
            'farm'                    => $product->nongTrai ? [
                'id'      => (int) $product->nongTrai->Ma_nong_trai,
                'name'    => $product->nongTrai->Ten_nong_trai,
                'address' => $product->nongTrai->Dia_chi,
            ] : null,
            'available_stock'         => $availableStock,
            'in_stock'                => $availableStock > 0,
            'active_batches_count'    => $fefoBatches->count(),
            'nearest_expiry_date'     => $nearestExpiry,
            'latest_harvest_date'     => $latestHarvest,
            'trace_qr_code'           => $traceQrCode,
            'certifications'          => $certifications,
            'certification_standards' => $certificationStandards,
            'created_at'              => optional($product->created_at)->toISOString(),
        ];

        if ($includeDetail) {
            $data['batches'] = $fefoBatches->map(fn($batch) => [
                'id'           => (int) $batch->Ma_lo_hang,
                'harvest_date' => $batch->Ngay_thu_hoach,
                'expiry_date'  => $batch->Han_su_dung,
                'status'       => $batch->Trang_thai,
                'qr_code'      => $batch->maQrTruyXuat?->Chuoi_ma_qr,
            ])->values()->all();

            $traceUrl = null;
            $traceQrDataUri = null;
            if ($traceQrCode) {
                $qrGenerator = app(QrCodeGeneratorService::class);
                $traceUrl = $qrGenerator->buildTraceUrl($traceQrCode);
                $traceQrDataUri = $qrGenerator->generateDataUri($traceUrl, 220);
            }

            $tracePlot = $traceBatch
                ? $product->loCanhTacs->firstWhere('Ma_lo_canh_tac', $traceBatch->Ma_lo_canh_tac)
                : ($product->loCanhTacs->first(fn($plot) => $plot->nhatKyCanhTacs->isNotEmpty()) ?? $product->loCanhTacs->first());

            $data['trace_url'] = $traceUrl;
            $data['trace_qr_data_uri'] = $traceQrDataUri;
            $data['trace_batch'] = $traceBatch ? [
                'batch_id'      => (int) $traceBatch->Ma_lo_hang,
                'qr_code'       => $traceQrCode,
                'scan_count'    => (int) ($traceBatch->maQrTruyXuat?->So_luot_quet ?? 0),
                'plot_name'     => $tracePlot?->Ten_lo,
                'season_name'   => $tracePlot?->muaVu?->Ten_mua_vu,
                'planting_date' => $tracePlot?->Ngay_gieo_trong,
                'harvest_date'  => $traceBatch->Ngay_thu_hoach,
                'expiry_date'   => $traceBatch->Han_su_dung,
                'status'        => $traceBatch->Trang_thai,
            ] : null;

            $rawLogs = $tracePlot?->nhatKyCanhTacs ?? collect();
            if ($traceBatch?->Ngay_thu_hoach) {
                $harvestDate = substr((string) $traceBatch->Ngay_thu_hoach, 0, 10);
                $rawLogs = $rawLogs->filter(function ($log) use ($harvestDate): bool {
                    if (! $log->Thoi_gian_thuc_hien) {
                        return true;
                    }

                    return $log->Thoi_gian_thuc_hien->toDateString() <= $harvestDate;
                });
            }

            $data['cultivation_logs'] = $rawLogs
                ->sortBy('Thoi_gian_thuc_hien')
                ->values()
                ->map(fn($log) => [
                    'id'             => (int) $log->Ma_nhat_ky,
                    'activity_type'  => $log->Loai_hoat_dong,
                    'activity_label' => $this->activityLabel((string) $log->Loai_hoat_dong),
                    'occurred_at'    => $log->Thoi_gian_thuc_hien?->format('Y-m-d H:i:s'),
                    'content'        => $log->Noi_dung,
                    'media'          => $log->tepNhatKys->map(fn($file) => [
                        'type'        => $file->Loai_tep,
                        'url'         => $this->resolveImageUrl($file->Duong_dan),
                        'description' => $file->Mo_ta,
                    ])->values()->all(),
                ])
                ->all();
        }

        return $data;
    }

    private function activityLabel(string $activityType): string
    {
        return match ($activityType) {
            'Gieo_hat'  => 'Gieo hạt & ươm cây',
            'Bon_phan'  => 'Bón phân',
            'Tuoi_tieu' => 'Tưới tiêu',
            'Thu_hoach' => 'Thu hoạch',
            default     => 'Hoạt động khác',
        };
    }

    private function classifyCertificationStandard(string $certName): string
    {
        $normalized = $this->normalizeText($certName);

        if (str_contains($normalized, 'vietgap')) {
            return 'VietGAP';
        }
        if (str_contains($normalized, 'globalgap')) {
            return 'GlobalGAP';
        }
        if (str_contains($normalized, 'usda')) {
            return 'USDA Organic';
        }
        if (str_contains($normalized, 'huu co') || str_contains($normalized, 'organic') || str_contains($normalized, '11041')) {
            return 'Hữu cơ (TCVN 11041)';
        }
        if (str_contains($normalized, 'ocop')) {
            return 'OCOP 4 sao';
        }

        return trim($certName);
    }

    private function resolveImageUrl(?string $rawPath): ?string
    {
        if (! $rawPath) {
            return null;
        }

        $trimmed = trim($rawPath);
        if ($trimmed === '') {
            return null;
        }

        if (Str::startsWith($trimmed, ['http://', 'https://'])) {
            return $trimmed;
        }

        $relativePath = ltrim($trimmed, '/');

        if (Str::startsWith($relativePath, 'storage/')) {
            $diskPath = Str::after($relativePath, 'storage/');
            if (Storage::disk('public')->exists($diskPath)) {
                return asset($relativePath);
            }
        }

        if (file_exists(public_path($relativePath))) {
            return asset($relativePath);
        }

        return null;
    }

    private function normalizeText(string $text): string
    {
        return strtolower(trim(Str::ascii($text)));
    }

    private function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
    }
}