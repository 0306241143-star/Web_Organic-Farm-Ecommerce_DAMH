<?php

/*
 * Validation yêu cầu đăng ký gói định kỳ của khách hàng.
 */

namespace App\Http\Requests\Customer;

use Illuminate\Contracts\Validation\Validator;
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
            'address_id' => ['required_without:shipping_address', 'nullable', 'integer', 'min:1'],
            'shipping_address' => ['required_without:address_id', 'nullable', 'array:recipient_name,phone,street,ward,district,province'],
            'shipping_address.recipient_name' => ['required_with:shipping_address', 'string', 'max:150'],
            'shipping_address.phone' => ['required_with:shipping_address', 'string', 'regex:/^(?:\+84|0)\d{9,10}$/'],
            'shipping_address.street' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.ward' => ['required_with:shipping_address', 'string', 'max:100'],
            'shipping_address.district' => ['required_with:shipping_address', 'string', 'max:100'],
            'shipping_address.province' => ['required_with:shipping_address', 'string', 'max:100'],
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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->filled('address_id') && $this->filled('shipping_address')) {
                $validator->errors()->add('address_id', 'Chỉ được chọn địa chỉ đã lưu hoặc nhập địa chỉ mới.');
            }
        });
    }
}
