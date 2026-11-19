<?php

/*
 * Validation yêu cầu đăng ký gói định kỳ của khách hàng.
 */

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('customer') ?? false;
    }

    public function rules(): array
    {
        return [
            'package_id' => [
                'required',
                'integer',
                'min:1',
                Rule::exists('goi_dinh_ky', 'Ma_goi')->where('Trang_thai', 'Dang_mo'),
            ],
            'address_id' => ['required', 'integer', 'min:1'],
            'start_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'delivery_days' => ['required', 'array', 'min:1', 'max:7'],
            'delivery_days.*' => ['required', 'array:weekday,delivery_window'],
            'delivery_days.*.weekday' => [
                'required',
                'integer',
                Rule::in(range(1, 7)),
                'distinct',
            ],
            'delivery_days.*.delivery_window' => ['nullable', 'string', 'max:50'],
            'idempotency_key' => ['required', 'uuid'],
        ];
    }
}
