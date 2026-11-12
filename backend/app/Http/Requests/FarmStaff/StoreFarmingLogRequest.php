<?php

/*
 * Validation yêu cầu ghi nhật ký canh tác.
 */

namespace App\Http\Requests\FarmStaff;

use Illuminate\Foundation\Http\FormRequest;

class StoreFarmingLogRequest extends FormRequest
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
