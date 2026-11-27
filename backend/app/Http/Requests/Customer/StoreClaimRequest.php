<?php

/*
 * Validation yêu cầu gửi khiếu nại của khách hàng.
 */

namespace App\Http\Requests\Customer;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class StoreClaimRequest extends FormRequest
{
    // Giới hạn tổng dung lượng minh chứng và dung lượng riêng của từng ảnh.
    private const MAX_TOTAL_EVIDENCE_BYTES = 35 * 1024 * 1024;

    private const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

    public function authorize(): bool
    {
        // FormRequest này không tự áp dụng kiểm tra quyền; tuyến có thể kiểm soát quyền riêng.
        return true;
    }

    public function withValidator(Validator $validator): void
    {
        // Sau các quy tắc cơ bản, cộng dung lượng các tệp hợp lệ để giới hạn tổng tải lên.
        $validator->after(function (Validator $validator): void {
            $files = $this->file('evidence', []);
            // Không tính tổng nếu dữ liệu minh chứng không có dạng danh sách tệp.
            if (! is_array($files)) {
                return;
            }

            $totalBytes = array_sum(array_map(
                static fn (UploadedFile $file): int => $file->getSize(),
                array_filter($files, static fn ($file): bool => $file instanceof UploadedFile)
            ));

            if ($totalBytes > self::MAX_TOTAL_EVIDENCE_BYTES) {
                $validator->errors()->add('evidence', 'Tổng dung lượng ảnh và video không được vượt quá 35 MB.');
            }
        });
    }

    public function rules(): array
    {
        // Kiểm tra nội dung khiếu nại và số lượng minh chứng được gửi.
        return [
            'order_id' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
            'evidence' => ['nullable', 'array', 'max:5'],
            'evidence.*' => [
                // Chỉ nhận tệp thuộc nhóm định dạng cho phép và giới hạn dung lượng từng tệp.
                'required',
                'file',
                'mimetypes:image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-m4v',
                'max:20480',
                function (string $attribute, mixed $file, \Closure $fail): void {
                    // Giới hạn ảnh riêng; video vẫn theo giới hạn chung của tệp minh chứng.
                    if (! $file instanceof UploadedFile) {
                        return;
                    }

                    if (str_starts_with((string) $file->getMimeType(), 'image/') && $file->getSize() > self::MAX_IMAGE_BYTES) {
                        $fail('Mỗi ảnh minh chứng không được vượt quá 10 MB.');
                    }
                },
            ],
        ];
    }
}
