<?php

/*
 * Validation yêu cầu tải lên chứng nhận chất lượng & kết quả kiểm định gắn vào lô hàng.
 */

namespace App\Http\Requests\FarmStaff;

use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UploadCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        // FormRequest này không tự áp dụng kiểm tra quyền; tuyến có thể kiểm soát quyền riêng.
        return true;
    }

    public function rules(): array
    {
        // Dùng ngày địa phương làm mốc để không chấp nhận ngày cấp trong tương lai.
        $today = Carbon::now('Asia/Ho_Chi_Minh')->toDateString();

        // Kiểm tra thông tin chứng nhận, đối tượng liên kết và định dạng tệp tải lên.
        return [
            'Ma_lo_hang'     => ['nullable', 'integer', 'exists:lo_hang,Ma_lo_hang'],
            'Ma_san_pham'    => ['nullable', 'integer', 'exists:san_pham,Ma_san_pham'],
            'Ten_chung_nhan' => ['required', 'string', 'min:3', 'max:150'],
            'To_chuc_cap'    => ['required', 'string', 'min:2', 'max:150'],
            'Ngay_cap'       => ['required', 'date', 'before_or_equal:' . $today],
            'Ngay_het_han'   => ['nullable', 'date', 'after_or_equal:Ngay_cap'],
            'file'           => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        // Chỉ cần một trong hai đối tượng (lô hàng hoặc sản phẩm) để gắn chứng nhận.
        $validator->after(function (Validator $v) {
            if (! $this->filled('Ma_lo_hang') && ! $this->filled('Ma_san_pham')) {
                $v->errors()->add(
                    'Ma_lo_hang',
                    'Vui lòng chọn Lô hàng thu hoạch hoặc Sản phẩm để gắn chứng nhận.'
                );
            }
        });
    }

    public function messages(): array
    {
        // Nêu rõ lý do không hợp lệ cho từng trường chứng nhận và tệp đính kèm.
        return [
            'Ma_lo_hang.integer'          => 'Mã lô hàng không hợp lệ.',
            'Ma_lo_hang.exists'           => 'Lô hàng thu hoạch đã chọn không tồn tại trong hệ thống.',
            'Ma_san_pham.integer'         => 'Mã sản phẩm không hợp lệ.',
            'Ma_san_pham.exists'          => 'Sản phẩm đã chọn không tồn tại trong hệ thống.',
            'Ten_chung_nhan.required'     => 'Vui lòng nhập tên chứng nhận hoặc phiếu kiểm định.',
            'Ten_chung_nhan.min'          => 'Tên chứng nhận phải có ít nhất 3 ký tự.',
            'Ten_chung_nhan.max'          => 'Tên chứng nhận tối đa 150 ký tự.',
            'To_chuc_cap.required'        => 'Vui lòng nhập tên tổ chức cấp hoặc đơn vị kiểm định.',
            'To_chuc_cap.min'             => 'Tên tổ chức cấp phải có ít nhất 2 ký tự.',
            'To_chuc_cap.max'             => 'Tên tổ chức cấp tối đa 150 ký tự.',
            'Ngay_cap.required'           => 'Vui lòng chọn ngày cấp chứng nhận.',
            'Ngay_cap.date'               => 'Ngày cấp không đúng định dạng ngày hợp lệ.',
            'Ngay_cap.before_or_equal'    => 'Ngày cấp chứng nhận không được lớn hơn ngày hôm nay.',
            'Ngay_het_han.date'           => 'Ngày hết hạn không đúng định dạng ngày hợp lệ.',
            'Ngay_het_han.after_or_equal' => 'Ngày hết hạn phải sau hoặc bằng ngày cấp.',
            'file.required'               => 'Vui lòng tải lên tệp bản scan chứng nhận hoặc kết quả kiểm định.',
            'file.file'                   => 'Tệp tải lên không hợp lệ.',
            'file.mimes'                  => 'Chỉ chấp nhận tệp định dạng PDF, JPG, JPEG, PNG hoặc WEBP.',
            'file.max'                    => 'Dung lượng tệp tối đa là 10MB.',
        ];
    }
}
