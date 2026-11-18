<?php

/*
 * Validation yêu cầu tạo lô thu hoạch (UC16 / CV04.18).
 */

namespace App\Http\Requests\FarmStaff;

use Illuminate\Foundation\Http\FormRequest;

class StoreBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $mergeData = [];

        if ($this->has('plot_id') && ! $this->has('Ma_lo_canh_tac')) {
            $mergeData['Ma_lo_canh_tac'] = $this->input('plot_id');
        }

        if ($this->has('harvest_date') && ! $this->has('Ngay_thu_hoach')) {
            $mergeData['Ngay_thu_hoach'] = $this->input('harvest_date');
        }

        if ($this->has('expiry_date') && ! $this->has('Han_su_dung')) {
            $mergeData['Han_su_dung'] = $this->input('expiry_date');
        }

        if ($this->has('harvest_quantity') && ! $this->has('So_luong_thu_hoach')) {
            $mergeData['So_luong_thu_hoach'] = $this->input('harvest_quantity');
        }

        if ($this->has('notes') && ! $this->has('Ghi_chu')) {
            $mergeData['Ghi_chu'] = $this->input('notes');
        }

        if (! empty($mergeData)) {
            $this->merge($mergeData);
        }
    }

    public function rules(): array
    {
        return [
            'Ma_lo_canh_tac'     => ['required', 'integer', 'exists:lo_canh_tac,Ma_lo_canh_tac'],
            'Ngay_thu_hoach'     => ['required', 'date', 'before_or_equal:today'],
            'Han_su_dung'        => ['required', 'date', 'after_or_equal:Ngay_thu_hoach'],
            'So_luong_thu_hoach' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'Ghi_chu'            => ['nullable', 'string', 'max:1000'],
            'auto_generate_qr'   => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'Ma_lo_canh_tac.required'              => 'Vui lòng chọn lô canh tác cần thu hoạch.',
            'Ma_lo_canh_tac.exists'                => 'Lô canh tác không tồn tại trên hệ thống.',
            'Ngay_thu_hoach.required'              => 'Vui lòng nhập ngày thu hoạch thực tế.',
            'Ngay_thu_hoach.date'                  => 'Ngày thu hoạch không đúng định dạng ngày tháng.',
            'Ngay_thu_hoach.before_or_equal'       => 'Ngày thu hoạch không được lớn hơn ngày hiện tại.',
            'Han_su_dung.required'                 => 'Vui lòng thiết lập hạn sử dụng cho lô hàng.',
            'Han_su_dung.date'                     => 'Hạn sử dụng không đúng định dạng ngày tháng.',
            'Han_su_dung.after_or_equal'           => 'Hạn sử dụng phải bằng hoặc sau ngày thu hoạch.',
            'So_luong_thu_hoach.required'          => 'Vui lòng nhập sản lượng thu hoạch thực tế.',
            'So_luong_thu_hoach.numeric'           => 'Sản lượng thu hoạch phải là chữ số.',
            'So_luong_thu_hoach.min'               => 'Sản lượng thu hoạch tối thiểu phải từ 0.01 kg/đơn vị.',
            'So_luong_thu_hoach.max'               => 'Sản lượng thu hoạch vượt quá giới hạn cho phép.',
            'Ghi_chu.max'                          => 'Ghi chú không được dài quá 1000 ký tự.',
        ];
    }
}
