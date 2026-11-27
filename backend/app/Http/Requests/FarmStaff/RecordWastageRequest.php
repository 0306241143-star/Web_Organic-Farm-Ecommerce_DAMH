<?php

namespace App\Http\Requests\FarmStaff;

use Illuminate\Foundation\Http\FormRequest;

class RecordWastageRequest extends FormRequest
{
    public function authorize(): bool
    {
        // FormRequest này không tự áp dụng kiểm tra quyền; tuyến có thể kiểm soát quyền riêng.
        return true;
    }

    public function rules(): array
    {
        // Chỉ cho phép loại phiếu được hỗ trợ, số lượng dương và lý do có giới hạn độ dài.
        return [
            'loai_bien_dong' => ['required', 'in:Xuat_huy,Dieu_chinh'],
            'so_luong'       => ['required', 'numeric', 'gt:0'],
            'ly_do'          => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        // Trả thông báo tiếng Việt gắn với các trường hợp nhập liệu thường gặp.
        return [
            'loai_bien_dong.required' => 'Vui lòng chọn loại phiếu kiểm kho.',
            'loai_bien_dong.in'       => 'Loại biến động kho không hợp lệ.',
            'so_luong.required'       => 'Vui lòng nhập số lượng hao hụt / điều chỉnh.',
            'so_luong.gt'             => 'Số lượng phải lớn hơn 0.',
            'ly_do.required'          => 'Vui lòng chọn hoặc nhập lý do ghi nhận.',
        ];
    }
}