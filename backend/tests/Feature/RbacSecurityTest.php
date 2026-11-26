<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RbacSecurityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_farm_staff_cannot_access_admin_revenue_reports(): void
    {
        $farmStaff = DB::table('nguoi_dung')
            ->where('Email', 'farm.kythuat@nongsansach.vn')
            ->first();
        $this->assertNotNull($farmStaff);
        $token = NguoiDung::query()
            ->findOrFail($farmStaff->Ma_nguoi_dung)
            ->createToken('rbac-report-test')
            ->plainTextToken;

        $this->getJson('/api/admin/reports/dashboard', [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();
    }

    public function test_admin_locking_an_account_revokes_its_existing_sanctum_token(): void
    {
        $admin = NguoiDung::query()
            ->where('Email', 'admin@nongsansach.vn')
            ->firstOrFail();
        $farmStaff = NguoiDung::query()
            ->where('Email', 'farm.kythuat@nongsansach.vn')
            ->firstOrFail();
        $token = $farmStaff->createToken('account-lock-test')->plainTextToken;
        $headers = ['Authorization' => 'Bearer '.$admin->createToken('lock-account-admin')->plainTextToken];

        $this->putJson("/api/admin/users/{$farmStaff->Ma_nguoi_dung}/status", [
            'status' => 'Khoa',
        ], $headers)->assertOk();

        $this->assertDatabaseHas('nguoi_dung', [
            'Ma_nguoi_dung' => $farmStaff->Ma_nguoi_dung,
            'Trang_thai' => 'Khoa',
        ]);

        $this->getJson('/api/test/rbac/farm', [
            'Authorization' => 'Bearer '.$token,
        ])->assertForbidden();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'token' => hash('sha256', $token),
        ]);

        $this->getJson('/api/test/rbac/farm', [
            'Authorization' => 'Bearer '.$token,
        ])->assertUnauthorized();
    }

    public function test_a_locked_account_token_is_revoked_on_its_next_protected_request(): void
    {
        $farmStaff = NguoiDung::query()
            ->where('Email', 'farm.kythuat@nongsansach.vn')
            ->firstOrFail();
        $token = $farmStaff->createToken('locked-account-token-test')->plainTextToken;
        $farmStaff->update(['Trang_thai' => 'Khoa']);
        $headers = ['Authorization' => 'Bearer '.$token];

        $this->getJson('/api/test/rbac/farm', $headers)
            ->assertForbidden();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'token' => hash('sha256', $token),
        ]);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/test/rbac/farm', $headers)
            ->assertUnauthorized();
    }
}
