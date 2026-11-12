<?php

/*
 * Validation yêu cầu ghi nhận hao hụt hàng tồn.
 */

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class RecordWastageRequest extends FormRequest
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
