import { Image, Sprout } from "lucide-react";

function formatDateTime(value) {
  if (!value) return "Chưa cập nhật thời gian";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật thời gian";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function QrTraceTimeline({ entries = [] }) {
  if (!entries.length) {
    return (
      <p className="rounded-2xl bg-[#f8faf8] p-4 text-sm text-[#5a6357]">
        Chưa có nhật ký canh tác được cập nhật cho lô hàng này.
      </p>
    );
  }

  return (
    <ol aria-label="Nhật ký truy xuất nguồn gốc" className="space-y-5">
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 sm:gap-4">
          {index < entries.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-[15px] top-9 w-px bg-emerald-200"
            />
          )}
          <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[#006e1c]">
            <Sprout className="h-4 w-4" />
          </span>
          <article className="min-w-0 flex-1 rounded-2xl bg-[#f8faf8] p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <h3 className="break-words font-bold text-[#191c1b]">
                {entry.activity_label || "Hoạt động canh tác"}
              </h3>
              <time className="shrink-0 text-xs text-[#5a6357]">
                {formatDateTime(entry.occurred_at)}
              </time>
            </div>
            {entry.content && (
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-[#41493e]">
                {entry.content}
              </p>
            )}
            {entry.media?.length > 0 && (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {entry.media.map((media, mediaIndex) => (
                  <li
                    key={`${entry.id}-${mediaIndex}`}
                    className="min-w-0 overflow-hidden rounded-xl border border-[#c0c9bb]/35 bg-white"
                  >
                    {media.type === "Video" ? (
                      <video
                        src={media.url}
                        controls
                        playsInline
                        className="aspect-video w-full bg-black object-cover"
                      >
                        Trình duyệt không hỗ trợ phát video.
                      </video>
                    ) : (
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        <img
                          src={media.url}
                          alt={media.description || "Ảnh nhật ký canh tác"}
                          loading="lazy"
                          className="aspect-video w-full object-cover"
                        />
                      </a>
                    )}
                    {media.description && (
                      <p className="flex items-start gap-1.5 p-2 text-xs text-[#5a6357]">
                        <Image className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{media.description}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </li>
      ))}
    </ol>
  );
}
