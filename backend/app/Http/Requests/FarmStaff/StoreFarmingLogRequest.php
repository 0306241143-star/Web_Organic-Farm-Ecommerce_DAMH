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
        return true;
    }

    public function rules(): array
    {
        return [
            'Ma_lo_canh_tac'      => ['required', 'integer', 'exists:lo_canh_tac,Ma_lo_canh_tac'],
            'Loai_hoat_dong'      => ['required', 'string', 'in:Gieo_hat,Bon_phan,Tuoi_tieu,Thu_hoach,Khac'],
            'Thoi_gian_thuc_hien' => ['required', 'date'],
            'Noi_dung'            => ['required', 'string', 'max:2000'],
            'media'               => ['nullable', 'array'],
            'media.*'             => ['file', 'mimes:jpg,jpeg,png,webp,mp4,mov,avi', 'max:20480'],
        ];
    }

    public function messages(): array
    {
        return [
            'Ma_lo_canh_tac.required'      => 'Vui lòng chọn lô canh tác.',
            'Ma_lo_canh_tac.exists'        => 'Lô canh tác không tồn tại trên hệ thống.',
            'Loai_hoat_dong.required'      => 'Vui lòng chọn loại hoạt động nhật ký.',
            'Loai_hoat_dong.in'            => 'Loại hoạt động không hợp lệ (chỉ chấp nhận: Gieo hạt, Bón phân, Tưới tiêu, Thu hoạch, Khác).',
            'Thoi_gian_thuc_hien.required' => 'Vui lòng nhập thời gian thực hiện.',
            'Thoi_gian_thuc_hien.date'     => 'Thời gian thực hiện không đúng định dạng ngày giờ.',
            'Noi_dung.required'            => 'Vui lòng nhập nội dung chi tiết công việc.',
            'media.*.mimes'                => 'Tệp đính kèm phải là hình ảnh (jpg, png, webp) hoặc video (mp4, mov, avi).',
            'media.*.max'                  => 'Dung lượng mỗi tệp tối đa không vượt quá 20MB.',
        ];
    }
}

