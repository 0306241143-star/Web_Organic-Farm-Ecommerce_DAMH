<?php

/*
 * Xác thực dữ liệu khách gửi khi tạo đơn mua lẻ từ giỏ hàng.
 */

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Chỉ khách hàng đã đăng nhập mới được tạo đơn mua lẻ.
        return $this->user()?->hasRole('customer') ?? false;
    }

    public function rules(): array
    {
        // Kiểm tra địa chỉ, điểm dùng, ghi chú và phương thức thanh toán gửi kèm đơn.
        return [
            'address_id' => ['required', 'integer', 'min:1'],
            'points_to_use' => ['sometimes', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:2000'],
            'payment_method' => ['sometimes', 'string', Rule::in(['ApiPay', 'COD'])],
        ];
    }
}
