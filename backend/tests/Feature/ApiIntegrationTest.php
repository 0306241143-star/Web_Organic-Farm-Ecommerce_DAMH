<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use App\Models\VaiTro;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_response_contract_and_http_error_statuses(): void
    {
        $this->getJson('/api/ping')
            ->assertOk()
            ->assertJsonStructure(['success', 'message', 'error_code', 'data', 'meta', 'errors'])
            ->assertJsonPath('success', true)
            ->assertJsonPath('error_code', null);

        $this->getJson('/api/customer/ping-role')
            ->assertUnauthorized()
            ->assertJsonPath('error_code', 'UNAUTHENTICATED');

        $this->getJson('/api/not-found')
            ->assertNotFound()
            ->assertJsonPath('error_code', 'NOT_FOUND');

        $this->getJson('/api/auth/login')
            ->assertStatus(405)
            ->assertJsonPath('error_code', 'METHOD_NOT_ALLOWED');

        $this->postJson('/api/test/json', [])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['errors' => ['ten_san_pham', 'so_luong']]);

        config(['app.debug' => false]);
        $this->getJson('/api/test/error-500')
            ->assertServerError()
            ->assertJsonPath('error_code', 'SERVER_ERROR');
    }

    public function test_json_and_multipart_requests_are_accepted(): void
    {
        $this->postJson('/api/test/json', [
            'ten_san_pham' => 'Rau cải',
            'so_luong' => 3,
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.so_luong', 3);

        $this->post('/api/test/upload', [
            'mo_ta' => 'Ảnh kiểm thử',
            'file' => UploadedFile::fake()->create('quality.jpg', 10, 'image/jpeg'),
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.original_name', 'quality.jpg');
    }

    public function test_login_me_logout_and_expired_tokens(): void
    {
        $user = $this->createUser('customer', 'customer@example.test');

        $login = $this->postJson('/api/auth/login', [
            'email' => $user->Email,
            'password' => 'correct-password',
        ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $token = $login->json('data.access_token');
        $this->assertNotEmpty($token);

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.role', 'customer');

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->assertNull(PersonalAccessToken::findToken($token));
        Auth::forgetGuards();
        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error_code', 'UNAUTHENTICATED');

        $expiredLogin = $this->postJson('/api/auth/login', [
            'email' => $user->Email,
            'password' => 'correct-password',
        ])->assertOk();
        $expiredToken = $expiredLogin->json('data.access_token');
        $storedToken = PersonalAccessToken::findToken($expiredToken);
        $this->assertNotNull($storedToken);
        $storedToken->forceFill([
            'expires_at' => now()->subMinute(),
        ])->save();

        Auth::forgetGuards();
        $this->withToken($expiredToken)
            ->getJson('/api/auth/me')
            ->assertUnauthorized()
            ->assertJsonPath('error_code', 'UNAUTHENTICATED');
    }

    public function test_failed_login_attempts_are_rate_limited(): void
    {
        RateLimiter::clear('unknown@example.test|127.0.0.1');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/login', [
                'email' => 'unknown@example.test',
                'password' => 'wrong-password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', [
            'email' => 'unknown@example.test',
            'password' => 'wrong-password',
        ])
            ->assertStatus(429)
            ->assertJsonPath('error_code', 'TOO_MANY_REQUESTS');
    }

    public function test_role_endpoints_allow_each_matching_role_and_reject_wrong_roles(): void
    {
        $roleEndpoints = [
            'customer' => '/api/customer/ping-role',
            'farm_staff' => '/api/farm/ping-role',
            'sales' => '/api/sales/ping-role',
            'admin' => '/api/admin/ping-role',
        ];

        foreach ($roleEndpoints as $role => $endpoint) {
            Sanctum::actingAs($this->createUser($role, "{$role}@example.test"));

            $this->getJson($endpoint)
                ->assertOk()
                ->assertJsonStructure(['success', 'message', 'error_code', 'data', 'meta', 'errors'])
                ->assertJsonPath('success', true)
                ->assertJsonPath('error_code', null)
                ->assertJsonPath('data.role', $role);
        }

        Sanctum::actingAs($this->createUser('customer', 'wrong-role@example.test'));
        $this->getJson('/api/sales/ping-role')
            ->assertForbidden()
            ->assertJsonStructure(['success', 'message', 'error_code', 'data', 'meta', 'errors'])
            ->assertJsonPath('error_code', 'FORBIDDEN');
    }

    private function createUser(string $roleName, string $email): NguoiDung
    {
        $role = VaiTro::query()->firstOrCreate(['Ten_vai_tro' => $roleName]);

        return NguoiDung::query()->create([
            'Ma_vai_tro' => $role->Ma_vai_tro,
            'Ho_ten' => $roleName,
            'Email' => $email,
            'Mat_khau_ma_hoa' => Hash::make('correct-password'),
            'Trang_thai' => 'Hoat_dong',
        ]);
    }
}
