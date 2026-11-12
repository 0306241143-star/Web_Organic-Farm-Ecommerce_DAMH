<?php

/*
 * Validation yêu cầu đăng ký gói định kỳ của khách hàng.
 */

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return false;
    }

    public function rules(): array
    {
        return [];
    }
}
