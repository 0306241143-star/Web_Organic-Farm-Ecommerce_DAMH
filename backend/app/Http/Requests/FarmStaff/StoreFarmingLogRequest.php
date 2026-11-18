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

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // UC14.1 Alternative Flow 2a: Chặn mốc thời gian trong tương lai
            // So sánh theo giờ Việt Nam và cho phép dung sai 30 phút để chống lệch đồng hồ hoặc lệch giây giữa client và server
            if ($this->filled('Thoi_gian_thuc_hien')) {
                try {
                    $logTime = \Carbon\Carbon::parse($this->input('Thoi_gian_thuc_hien'), 'Asia/Ho_Chi_Minh');
                    $maxAllowed = \Carbon\Carbon::now('Asia/Ho_Chi_Minh')->addMinutes(30);
                    if ($logTime->greaterThan($maxAllowed)) {
                        $validator->errors()->add('Thoi_gian_thuc_hien', 'Mốc thời gian thực hiện không được lớn hơn thời điểm hiện tại.');
                    }
                } catch (\Throwable $e) {
                    $validator->errors()->add('Thoi_gian_thuc_hien', 'Thời gian thực hiện không đúng định dạng ngày giờ.');
                }
            }

            // UC14.1 Alternative Flow 5a: Thiếu thông tin bắt buộc khi bón phân (loại phân bón, liều lượng)
            if ($this->input('Loai_hoat_dong') === 'Bon_phan') {
                $noiDung = trim($this->input('Noi_dung') ?? '');
                if (mb_strlen($noiDung) < 10) {
                    $validator->errors()->add('Noi_dung', 'Hoạt động bón phân bắt buộc ghi rõ thông tin loại phân bón hữu cơ và liều lượng sử dụng.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'Ma_lo_canh_tac.required'              => 'Vui lòng chọn lô canh tác.',
            'Ma_lo_canh_tac.exists'                => 'Lô canh tác không tồn tại trên hệ thống.',
            'Loai_hoat_dong.required'              => 'Vui lòng chọn loại hoạt động nhật ký.',
            'Loai_hoat_dong.in'                    => 'Loại hoạt động không hợp lệ (chỉ chấp nhận: Gieo hạt, Bón phân, Tưới tiêu, Thu hoạch, Khác).',
            'Thoi_gian_thuc_hien.required'         => 'Vui lòng nhập thời gian thực hiện.',
            'Thoi_gian_thuc_hien.date'             => 'Thời gian thực hiện không đúng định dạng ngày giờ.',
            'Thoi_gian_thuc_hien.before_or_equal'  => 'Mốc thời gian thực hiện không được lớn hơn thời điểm hiện tại.',
            'Noi_dung.required'                    => 'Vui lòng nhập nội dung chi tiết công việc.',
            'media.*.mimes'                        => 'Tệp đính kèm phải là hình ảnh (jpg, png, webp) hoặc video (mp4, mov, avi).',
            'media.*.max'                          => 'Dung lượng mỗi tệp tối đa không vượt quá 20MB.',
        ];
    }
}

