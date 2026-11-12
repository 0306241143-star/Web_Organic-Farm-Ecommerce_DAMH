<?php

/*
 * Validation yêu cầu gửi khiếu nại của khách hàng.
 */

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class StoreClaimRequest extends FormRequest
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
