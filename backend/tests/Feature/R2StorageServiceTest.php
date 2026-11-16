<?php

namespace Tests\Feature;

use App\Services\R2StorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
}