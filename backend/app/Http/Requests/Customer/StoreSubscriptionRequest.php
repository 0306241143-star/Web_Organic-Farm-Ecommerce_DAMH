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
        // Chỉ khách hàng đã đăng nhập mới được đăng ký gói định kỳ.
        return $this->user()?->hasRole('customer') ?? false;
    }

    public function rules(): array
    {
        // Chỉ nhận gói đang mở và một trong hai cách cung cấp địa chỉ giao hàng.
        return [
            'package_id' => [
                'required',
                'integer',
                'min:1',
                Rule::exists('goi_dinh_ky', 'Ma_goi')->where('Trang_thai', 'Dang_mo'),
            ],
            'address_id' => ['required_without:shipping_address', 'nullable', 'integer', 'min:1'],
            // Khi nhập địa chỉ mới, yêu cầu đủ thông tin liên hệ và địa chỉ theo đơn vị hiện hành.
            'shipping_address' => ['required_without:address_id', 'nullable', 'array:recipient_name,phone,street,ward,district,province'],
            'shipping_address.recipient_name' => ['required_with:shipping_address', 'string', 'max:150'],
            'shipping_address.phone' => ['required_with:shipping_address', 'string', 'regex:/^(?:\+84|0)\d{9,10}$/'],
            'shipping_address.street' => ['required_with:shipping_address', 'string', 'max:255'],
            'shipping_address.ward' => ['required_with:shipping_address', 'string', 'max:100'],
            'shipping_address.district' => ['prohibited'],
            'shipping_address.province' => ['required_with:shipping_address', 'string', 'max:100'],
            // Ngày bắt đầu không ở quá khứ; lịch giao phải có ít nhất một ngày khác nhau.
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
            // Khóa UUID giúp nhận diện và chống tạo trùng yêu cầu đăng ký.
            'idempotency_key' => ['required', 'uuid'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        // Bắt buộc chọn đúng một nguồn địa chỉ, không gửi địa chỉ lưu và địa chỉ mới cùng lúc.
        $validator->after(function (Validator $validator): void {
            if ($this->filled('address_id') && $this->filled('shipping_address')) {
                $validator->errors()->add('address_id', 'Chỉ được chọn địa chỉ đã lưu hoặc nhập địa chỉ mới.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'shipping_address.district.prohibited' => 'Địa chỉ theo đơn vị mới không sử dụng quận/huyện.',
        ];
    }
}
