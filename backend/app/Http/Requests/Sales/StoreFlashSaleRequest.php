<?php

/*
 * Validation yêu cầu tạo chương trình Flash Sale.
 */

namespace App\Http\Requests\Sales;

use Illuminate\Foundation\Http\FormRequest;

class StoreFlashSaleRequest extends FormRequest
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
