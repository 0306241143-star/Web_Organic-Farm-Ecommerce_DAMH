<?php

namespace Tests\Feature;

use App\Services\R2StorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class R2StorageServiceTest extends TestCase
{
    public function test_it_resizes_compresses_and_deletes_media_files_on_r2_disk(): void
    {
        Storage::fake('r2');
        config(['filesystems.disks.r2.url' => 'https://pub-test.r2.dev']);

        $service = new R2StorageService('r2');
        $file = UploadedFile::fake()->image('nhat-ky-gieo-hat.jpg', 2400, 1600);

        $result = $service->upload($file, R2StorageService::FOLDER_FARMING_LOGS);

        $this->assertSame('Hinh_anh', $result['media_type']);
        $this->assertSame('image/webp', $result['mime_type']);
        $this->assertStringStartsWith('farming-logs/', $result['path']);
        $this->assertStringEndsWith('.webp', $result['path']);
        $this->assertTrue(Storage::disk('r2')->exists($result['path']));

        $this->assertTrue($service->delete($result['url']));
        $this->assertFalse(Storage::disk('r2')->exists($result['path']));
    }

    public function test_it_uploads_small_client_optimized_webp_without_reencoding(): void
    {
        if (! function_exists('imagewebp')) {
            $this->markTestSkipped('GD WebP support is required for this test.');
        }

        Storage::fake('r2');
        config(['filesystems.disks.r2.url' => 'https://pub-test.r2.dev']);

        $image = imagecreatetruecolor(1400, 900);
        $color = imagecolorallocate($image, 20, 120, 60);
        imagefill($image, 0, 0, $color);
        ob_start();
        imagewebp($image, null, 80);
        $contents = ob_get_clean();
        imagedestroy($image);

        $this->assertIsString($contents);
        $this->assertLessThanOrEqual(512 * 1024, strlen($contents));

        $tempPath = tempnam(sys_get_temp_dir(), 'r2-webp-');
        $this->assertNotFalse($tempPath);
        file_put_contents($tempPath, $contents);

        try {
            $file = new UploadedFile($tempPath, 'optimized.webp', 'image/webp', null, true);
            $result = (new R2StorageService('r2'))->upload($file, R2StorageService::FOLDER_FARMING_LOGS);

            $this->assertSame('image/webp', $result['mime_type']);
            $this->assertSame(strlen($contents), $result['size_bytes']);
            $this->assertSame($contents, Storage::disk('r2')->get($result['path']));
        } finally {
            @unlink($tempPath);
        }
    }

    public function test_it_rejects_missing_or_placeholder_r2_configuration_before_uploading(): void
    {
        Storage::fake('r2');
        $file = UploadedFile::fake()->create('document.pdf');
        $validConfig = [
            'key'      => 'real-access-key',
            'secret'   => 'real-secret',
            'bucket'   => 'real-bucket',
            'endpoint' => 'https://account.r2.cloudflarestorage.com',
        ];

        $invalidConfigs = [
            array_merge($validConfig, ['key' => '']),
            array_merge($validConfig, ['key' => 'your_r2_access_key']),
            array_merge($validConfig, ['secret' => '']),
            array_merge($validConfig, ['bucket' => '']),
            array_merge($validConfig, ['endpoint' => '']),
            array_merge($validConfig, ['endpoint' => 'https://your_r2_endpoint']),
        ];

        foreach ($invalidConfigs as $diskConfig) {
            config(['filesystems.disks.r2' => $diskConfig]);

            try {
                (new R2StorageService('r2'))->upload($file);
                $this->fail('Expected incomplete or placeholder R2 configuration to be rejected.');
            } catch (RuntimeException $exception) {
                $this->assertSame(
                    'R2 chưa cấu hình key thực tế, chuyển sang lưu trữ cục bộ.',
                    $exception->getMessage()
                );
            }
        }

        $this->assertSame([], Storage::disk('r2')->allFiles());
    }
}