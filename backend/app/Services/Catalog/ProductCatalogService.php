<?php

/*
 * Truy vấn và chuẩn hóa danh mục sản phẩm công khai.
 */

namespace App\Services\Catalog;

use App\Models\ChungNhan;
use App\Models\SanPham;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductCatalogService
{
    /**
     * @return array{data: Collection, meta: array}
     */
    public function getFilteredProducts(array $query): array
    {
        $allProducts = Cache::remember('public_catalog_products_v1', 120, function (): Collection {
            return $this->loadActiveProducts()
                ->map(fn (SanPham $product) => $this->formatProduct($product))
                ->values();
        });

        $facets = $this->buildCatalogFacets($allProducts);
        $filtered = $this->applyFilters($allProducts, $query);
        $sorted = $this->applySort($filtered, (string) $this->queryValue($query, 'sort', 'featured'));

        $perPage = max(1, min(48, (int) $this->queryValue($query, 'per_page', 12)));
        $total = $sorted->count();
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = max(1, min($lastPage, (int) $this->queryValue($query, 'page', 1)));

        return [
            'data' => $sorted->forPage($page, $perPage)->values(),
            'meta' => [
                'current_page' => $page,
                'per_page'     => $perPage,
                'total'        => $total,
                'last_page'    => $lastPage,
                'facets'       => $facets,
            ],
        ];
    }

    public function getProductDetail(int $idOrSlug): ?array
    {
        $product = $this->baseProductQuery()
            ->where('Ma_san_pham', $idOrSlug)
            ->first();

        if (! $product) {
            return null;
        }

        $related = $this->baseProductQuery()
            ->where('Ma_danh_muc', $product->Ma_danh_muc)
            ->where('Ma_san_pham', '!=', $product->Ma_san_pham)
            ->limit(4)
            ->get()
            ->map(fn (SanPham $item) => $this->formatProduct($item))
            ->values();

        $payload = $this->formatProduct($product, true);
        $payload['related_products'] = $related;

        return $payload;
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
                    $plotQuery->select(['Ma_lo_canh_tac', 'Ma_san_pham', 'Ten_lo', 'Ngay_gieo_trong', 'Trang_thai'])
                        ->with([
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

    private function applyFilters(Collection $products, array $query): Collection
    {
        $filtered = $products;

        // 1. Lọc theo danh mục (hỗ trợ 1 mã hoặc nhiều mã phân cách dấu phẩy)
        $rawCategory = $this->queryValue($query, 'category_id', $this->queryValue($query, 'category'));
        if ($rawCategory !== null && trim((string) $rawCategory) !== '' && strtoupper((string) $rawCategory) !== 'ALL') {
            $categoryIds = collect(explode(',', (string) $rawCategory))
                ->map(fn ($id) => (int) trim($id))
                ->filter(fn ($id) => $id > 0)
                ->values();

            if ($categoryIds->isNotEmpty()) {
                $filtered = $filtered->filter(
                    fn (array $item): bool => isset($item['category']['id']) && $categoryIds->contains($item['category']['id'])
                );
            }
        }

        // 2. Tìm kiếm theo từ khóa (hỗ trợ có dấu & không dấu tiếng Việt)
        $rawSearch = trim((string) $this->queryValue($query, 'search', $this->queryValue($query, 'q', '')));
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
                    implode(' ', array_map(fn ($cert) => ($cert['name'] ?? '').' '.($cert['issuer'] ?? ''), $item['certifications'] ?? [])),
                ];

                $haystack = implode(' ', array_filter($haystackParts));

                return str_contains(mb_strtolower($haystack), $needleLower)
                    || ($needleAscii !== '' && str_contains($this->normalizeText($haystack), $needleAscii));
            });
        }

        // 3. Lọc theo khoảng giá thực tế (ưu tiên giá Flash Sale nếu đang giảm giá)
        $minPrice = $this->queryValue($query, 'min_price');
        if ($minPrice !== null && $minPrice !== '' && is_numeric($minPrice)) {
            $minVal = max(0, (float) $minPrice);
            $filtered = $filtered->filter(fn (array $item): bool => (float) $item['effective_price'] >= $minVal);
        }

        $maxPrice = $this->queryValue($query, 'max_price');
        if ($maxPrice !== null && $maxPrice !== '' && is_numeric($maxPrice)) {
            $maxVal = max(0, (float) $maxPrice);
            $filtered = $filtered->filter(fn (array $item): bool => (float) $item['effective_price'] <= $maxVal);
        }

        // 4. Lọc theo chứng nhận chất lượng (VietGAP, Hữu cơ, GlobalGAP, ...)
        $rawCert = $this->queryValue($query, 'certification', $this->queryValue($query, 'cert'));
        if ($rawCert !== null && trim((string) $rawCert) !== '') {
            $selectedCerts = collect(explode(',', (string) $rawCert))
                ->map(fn ($value) => $this->normalizeText($value))
                ->filter()
                ->values();

            if ($selectedCerts->isNotEmpty()) {
                $filtered = $filtered->filter(function (array $item) use ($selectedCerts): bool {
                    $standards = collect($item['certification_standards'] ?? [])
                        ->map(fn ($label) => $this->normalizeText($label));
                    $certNames = collect($item['certifications'] ?? [])
                        ->map(fn ($cert) => $this->normalizeText(($cert['name'] ?? '').' '.($cert['issuer'] ?? '')));

                    $combined = $standards->merge($certNames);

                    return $selectedCerts->contains(function (string $wanted) use ($combined): bool {
                        return $combined->contains(fn (string $text): bool => str_contains($text, $wanted));
                    });
                });
            }
        }

        // 5. Lọc theo trạng thái còn hàng FEFO
        if ($this->toBool($this->queryValue($query, 'in_stock'))) {
            $filtered = $filtered->filter(fn (array $item): bool => $item['in_stock'] === true);
        }

        // 6. Lọc sản phẩm đang chạy Flash Sale
        if ($this->toBool($this->queryValue($query, 'flash_sale'))) {
            $filtered = $filtered->filter(fn (array $item): bool => $item['is_flash_sale'] === true);
        }

        return $filtered->values();
    }

    private function applySort(Collection $products, string $sort): Collection
    {
        return match ($sort) {
            'price_asc'  => $products->sortBy([['effective_price', 'asc'], ['id', 'desc']])->values(),
            'price_desc' => $products->sortBy([['effective_price', 'desc'], ['id', 'desc']])->values(),
            'name_asc'   => $products->sortBy(fn (array $item) => $this->normalizeText($item['name'] ?? ''))->values(),
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

        $prices = $products->pluck('effective_price')->map(fn ($price) => (float) $price);

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

    private function formatProduct(SanPham $product, bool $includeDetail = false): array
    {
        $allBatches = $product->loCanhTacs
            ->flatMap(fn ($plot) => $plot->loHangs)
            ->values();
        $today = now()->toDateString();

        // Áp dụng quy tắc FEFO: chỉ tính lô còn hàng / sắp hết hạn, số lượng > 0 và chưa quá hạn
        $fefoBatches = $allBatches
            ->filter(fn ($batch): bool =>
                in_array($batch->Trang_thai, ['Con_hang', 'Sap_het_han'], true)
                && (float) $batch->So_luong_con_lai > 0
                && (string) $batch->Han_su_dung >= $today
            )
            ->sortBy('Han_su_dung')
            ->values();

        $availableStock = round((float) $fefoBatches->sum(fn ($batch) => (float) $batch->So_luong_con_lai), 2);
        $nearestExpiry = $fefoBatches->first()?->Han_su_dung;
        $latestHarvest = $fefoBatches->sortByDesc('Ngay_thu_hoach')->first()?->Ngay_thu_hoach;

        $traceBatch = $fefoBatches->first(fn ($batch) => $batch->maQrTruyXuat !== null)
            ?? $allBatches->first(fn ($batch) => $batch->maQrTruyXuat !== null);
        $traceQrCode = $traceBatch?->maQrTruyXuat?->Chuoi_ma_qr;

        // Xác định Flash Sale đang hoạt động gắn vào lô còn hàng
        $regularPrice = (float) $product->Gia_ban;
        $activeFlashSale = null;

        foreach ($fefoBatches as $batch) {
            foreach ($batch->chiTietFlashSales as $detail) {
                $program = $detail->flashSale;
                if (! $program || $program->Trang_thai !== 'Dang_dien_ra') {
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

        // Tổng hợp chứng nhận gắn trực tiếp vào sản phẩm hoặc gắn vào lô hàng của sản phẩm
        $batchCerts = $allBatches->flatMap(fn ($batch) => $batch->chungNhans);
        $mergedCerts = $product->chungNhans
            ->merge($batchCerts)
            ->unique('Ma_chung_nhan')
            ->values();

        $certifications = $mergedCerts->map(function (ChungNhan $cert) use ($includeDetail): array {
            $data = [
                'id'         => (int) $cert->Ma_chung_nhan,
                'name'       => $cert->Ten_chung_nhan,
                'standard'   => $this->classifyCertificationStandard($cert->Ten_chung_nhan),
                'issuer'     => $cert->To_chuc_cap,
                'issued_at'  => $cert->Ngay_cap,
                'expires_at' => $cert->Ngay_het_han,
                'batch_id'   => $cert->Ma_lo_hang ? (int) $cert->Ma_lo_hang : null,
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
            'image_url'               => $this->resolveImageUrl($product->Hinh_anh_dai_dien),
            'reward_point_rate'       => (float) $product->Ty_le_tich_diem,
            'status'                  => $product->Trang_thai,
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
            $data['batches'] = $fefoBatches->map(fn ($batch) => [
                'id'           => (int) $batch->Ma_lo_hang,
                'harvest_date' => $batch->Ngay_thu_hoach,
                'expiry_date'  => $batch->Han_su_dung,
                'status'       => $batch->Trang_thai,
                'qr_code'      => $batch->maQrTruyXuat?->Chuoi_ma_qr,
            ])->values()->all();
        }

        return $data;
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

    private function queryValue(array $query, string $key, mixed $default = null): mixed
    {
        return array_key_exists($key, $query) ? $query[$key] : $default;
    }
}
