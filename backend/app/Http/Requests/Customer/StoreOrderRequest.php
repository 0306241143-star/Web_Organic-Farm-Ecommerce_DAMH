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
        return $this->user()?->hasRole('customer') ?? false;
    }

    public function rules(): array
    {
        return [
            'address_id' => ['required', 'integer', 'min:1'],
            'points_to_use' => ['sometimes', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:2000'],
            'payment_method' => ['sometimes', 'string', Rule::in(['ApiPay', 'COD'])],
        ];
    }
}
