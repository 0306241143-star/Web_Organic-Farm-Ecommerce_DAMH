<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class CustomerCartTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_customer_can_add_update_and_remove_cart_items(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);

        // Kiểm tra API yêu cầu đăng nhập trước khi kiểm tra toàn bộ vòng đời mặt hàng.
        $this->getJson('/api/customer/cart')
            ->assertUnauthorized();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/cart')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/cart/items', [
                'product_id' => 1,
                'quantity' => 2,
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        // Hai lần thêm cùng sản phẩm phải cộng dồn vào một dòng, không tạo dòng trùng.
        $added = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/cart/items', [
                'product_id' => 1,
                'quantity' => 1,
            ])
            ->assertOk();

        $this->assertSame(
            3.0,
            (float) collect($added->json('data.items'))->firstWhere('id', 1)['quantity']
        );

        $updated = $this->actingAs($customer, 'sanctum')
            ->putJson('/api/customer/cart/items/1', ['quantity' => 2.5])
            ->assertOk();

        $this->assertSame(
            2.5,
            (float) collect($updated->json('data.items'))->firstWhere('id', 1)['quantity']
        );

        $removed = $this->actingAs($customer, 'sanctum')
            ->deleteJson('/api/customer/cart/items/1')
            ->assertOk();

        $this->assertNull(collect($removed->json('data.items'))->firstWhere('id', 1));
    }

    public function test_cart_rejects_unavailable_quantities_and_non_customer_roles(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        // Tồn kho khả dụng là giới hạn server-side, không dựa vào số lượng client gửi tùy ý.
        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/cart/items', [
                'product_id' => 1,
                'quantity' => 999999,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity']);

        // Middleware ngăn vai trò nội bộ truy cập API giỏ hàng của khách.
        $farmStaff = NguoiDung::query()->findOrFail(3);
        $this->actingAs($farmStaff, 'sanctum')
            ->getJson('/api/customer/cart')
            ->assertForbidden();
    }
}
