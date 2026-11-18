<?php

/*
 * Dịch vụ lưu trữ tệp đa phương tiện trên Cloudflare R2 kèm tự động nén/resize (CV03.4).
 */

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\ImageManager;
use RuntimeException;
use Throwable;

class R2StorageService
{
    public const FOLDER_FARMING_LOGS = 'farming-logs'; // CV04.18: Ảnh/video nhật ký canh tác
    public const FOLDER_CERTIFICATES = 'certificates'; // CV04.20: Chứng nhận & kiểm định đất/nước
    public const FOLDER_COMPLAINTS   = 'complaints';   // CV04.17: Ảnh/video bằng chứng khiếu nại
    public const FOLDER_PRODUCTS     = 'products';     // Ảnh thực tế sản phẩm

    private const MAX_IMAGE_WIDTH = 1280;
    private const IMAGE_QUALITY   = 80;

    private string $disk;

    public function __construct(?string $disk = null)
    {
        $this->disk = $disk ?? config('filesystems.default_cloud', 'r2');
    }

    /**
     * Tải 1 tệp lên Cloudflare R2 (tự động nén/resize nếu là ảnh hoặc video hỗ trợ).
     */
    public function upload(UploadedFile $file, string $folder = self::FOLDER_FARMING_LOGS): array
    {
        $this->ensureConfigured();

        $mediaType = $this->detectMediaType($file);
        $datePrefix = now()->format('Y/m');
        $cleanFolder = trim($folder, '/');

        // 1. Tự động nén & resize nếu là Hình ảnh
        if ($mediaType === 'Hinh_anh') {
            $optimized = $this->optimizeImage($file);
            if ($optimized !== null) {
                $path = "{$cleanFolder}/{$datePrefix}/" . Str::uuid()->toString() . '.webp';

                $stored = Storage::disk($this->disk)->put($path, $optimized['binary'], [
                    'visibility'  => 'public',
                    'ContentType' => 'image/webp',
                ]);

                if (! $stored) {
                    throw new RuntimeException('Không thể tải ảnh đã nén lên Cloudflare R2.');
                }

                return [
                    'path'          => $path,
                    'url'           => $this->url($path),
                    'media_type'    => 'Hinh_anh',
                    'mime_type'     => 'image/webp',
                    'original_name' => $file->getClientOriginalName(),
                    'size_bytes'    => $optimized['size_bytes'],
                ];
            }
        }

        // 2. Tự động nén Video nếu máy chủ có cấu hình FFmpeg
        if ($mediaType === 'Video') {
            $compressedVideoPath = $this->compressVideoIfAvailable($file);
            if ($compressedVideoPath !== null) {
                try {
                    $fileName = Str::uuid()->toString() . '.mp4';
                    $path = "{$cleanFolder}/{$datePrefix}/{$fileName}";

                    $stream = fopen($compressedVideoPath, 'rb');
                    $stored = Storage::disk($this->disk)->put($path, $stream, [
                        'visibility'  => 'public',
                        'ContentType' => 'video/mp4',
                    ]);
                    if (is_resource($stream)) {
                        fclose($stream);
                    }

                    if (! $stored) {
                        throw new RuntimeException('Không thể tải video đã nén lên Cloudflare R2.');
                    }

                    return [
                        'path'          => $path,
                        'url'           => $this->url($path),
                        'media_type'    => 'Video',
                        'mime_type'     => 'video/mp4',
                        'original_name' => $file->getClientOriginalName(),
                        'size_bytes'    => filesize($compressedVideoPath) ?: $file->getSize(),
                    ];
                } finally {
                    @unlink($compressedVideoPath);
                }
            }
        }

        // 3. Fallback: Tải trực tiếp file gốc (PDF kiểm định, hoặc ảnh/video không qua nén)
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin');
        $fileName = Str::uuid()->toString() . '.' . $extension;
        $path = "{$cleanFolder}/{$datePrefix}/{$fileName}";

        $stored = Storage::disk($this->disk)->putFileAs(
            dirname($path),
            $file,
            basename($path),
            ['visibility' => 'public']
        );

        if (! $stored) {
            throw new RuntimeException('Không thể tải tệp lên Cloudflare R2.');
        }

        return [
            'path'          => $path,
            'url'           => $this->url($path),
            'media_type'    => $mediaType,
            'mime_type'     => $file->getClientMimeType(),
            'original_name' => $file->getClientOriginalName(),
            'size_bytes'    => $file->getSize(),
        ];
    }

    /**
     * Tải nhiều tệp cùng lúc.
     */
    public function uploadMany(array $files, string $folder = self::FOLDER_FARMING_LOGS): array
    {
        $results = [];
        foreach ($files as $file) {
            if ($file instanceof UploadedFile && $file->isValid()) {
                $results[] = $this->upload($file, $folder);
            }
        }

        return $results;
    }

    /**
     * Xóa tệp trên R2 theo relative path hoặc URL công khai.
     */
    public function delete(?string $pathOrUrl): bool
    {
        if (! is_string($pathOrUrl) || trim($pathOrUrl) === '') {
            return false;
        }

        $path = $this->extractPath($pathOrUrl);
        if ($path === '') {
            return false;
        }

        return Storage::disk($this->disk)->delete($path);
    }

    public function url(string $path): string
    {
        $baseUrl = rtrim((string) config("filesystems.disks.{$this->disk}.url"), '/');
        $cleanPath = ltrim($path, '/');

        if ($baseUrl !== '') {
            return "{$baseUrl}/{$cleanPath}";
        }

        return Storage::disk($this->disk)->url($cleanPath);
    }

    /**
     * Resize chiều ngang tối đa 1280px và nén sang WebP chất lượng 80%.
     */
    private function optimizeImage(UploadedFile $file): ?array
    {
        if (! class_exists(ImageManager::class) || ! extension_loaded('gd')) {
            return null;
        }

        try {
            $manager = new ImageManager(new GdDriver());
            $image = $manager->read($file->getRealPath());

            if ($image->width() > self::MAX_IMAGE_WIDTH) {
                $image->scaleDown(width: self::MAX_IMAGE_WIDTH);
            }

            $encoded = $image->toWebp(self::IMAGE_QUALITY);
            $binary = (string) $encoded;

            return [
                'binary'     => $binary,
                'size_bytes' => strlen($binary),
            ];
        } catch (Throwable $e) {
            Log::warning('Image optimization skipped, falling back to original file.', [
                'file'  => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Nén video về 720p H.264 nếu server có cài FFmpeg (khai báo FFMPEG_BINARY trong .env).
     */
    private function compressVideoIfAvailable(UploadedFile $file): ?string
    {
        $ffmpeg = env('FFMPEG_BINARY');
        if (! is_string($ffmpeg) || trim($ffmpeg) === '' || ! function_exists('exec')) {
            return null;
        }

        $inputPath = $file->getRealPath();
        $outputPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'r2_opt_' . Str::uuid()->toString() . '.mp4';

        $cmd = sprintf(
            '%s -y -i %s -vf "scale=\'min(1280,iw)\':-2" -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 128k %s 2>&1',
            escapeshellcmd($ffmpeg),
            escapeshellarg($inputPath),
            escapeshellarg($outputPath)
        );

        exec($cmd, $output, $exitCode);

        if ($exitCode === 0 && file_exists($outputPath) && filesize($outputPath) > 0) {
            return $outputPath;
        }

        @unlink($outputPath);
        return null;
    }

    private function detectMediaType(UploadedFile $file): string
    {
        $mime = (string) $file->getClientMimeType();
        if (str_starts_with($mime, 'video/')) {
            return 'Video';
        }
        if (str_starts_with($mime, 'image/')) {
            return 'Hinh_anh';
        }

        return 'Tai_lieu';
    }

    private function extractPath(string $pathOrUrl): string
    {
        if (! str_starts_with($pathOrUrl, 'http://') && ! str_starts_with($pathOrUrl, 'https://')) {
            return ltrim($pathOrUrl, '/');
        }

        $baseUrl = rtrim((string) config("filesystems.disks.{$this->disk}.url"), '/');
        if ($baseUrl !== '' && str_starts_with($pathOrUrl, $baseUrl . '/')) {
            return substr($pathOrUrl, strlen($baseUrl) + 1);
        }

        $parsedPath = parse_url($pathOrUrl, PHP_URL_PATH);
        return is_string($parsedPath) ? ltrim($parsedPath, '/') : '';
    }

    private function ensureConfigured(): void
    {
        if ($this->disk !== 'r2') {
            return;
        }

        $diskConfig = config('filesystems.disks.r2', []);
        if (
            empty($diskConfig['key'])
            || empty($diskConfig['secret'])
            || empty($diskConfig['bucket'])
            || empty($diskConfig['endpoint'])
        ) {
            throw new RuntimeException('Chưa cấu hình đầy đủ thông số kết nối Cloudflare R2 trong tệp .env.');
        }
    }
}