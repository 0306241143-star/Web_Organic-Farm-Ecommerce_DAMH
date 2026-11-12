<?php

/*
 * Validation yêu cầu tải lên chứng nhận chất lượng.
 */

namespace App\Http\Requests\FarmStaff;

use Illuminate\Foundation\Http\FormRequest;

class UploadCertificateRequest extends FormRequest
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
