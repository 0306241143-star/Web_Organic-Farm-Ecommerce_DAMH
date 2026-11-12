<?php

/*
 * Validation yêu cầu tạo lô thu hoạch.
 */

namespace App\Http\Requests\FarmStaff;

use Illuminate\Foundation\Http\FormRequest;

class StoreBatchRequest extends FormRequest
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
