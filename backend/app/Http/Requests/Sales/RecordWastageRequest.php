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
        // Từ chối mọi request qua FormRequest này, bất kể người gửi hay nội dung.
        return false;
    }

    public function rules(): array
    {
        // Chưa khai báo trường dữ liệu nào được chấp nhận ở FormRequest này.
        return [];
    }
}
