import { useEffect, useState } from "react";
import { MapPin, Sprout } from "lucide-react";
import { publicApi } from "../../services/publicApi";

export default function BrandStoryPage() {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    publicApi.getBrandStory()
      .then((response) => {
        if (active) setStory(response?.data || null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold text-[#00450d]">Câu chuyện thương hiệu</h1>
        <p className="mt-3 text-[#5a6357]">Thông tin câu chuyện đang được cập nhật.</p>
      </div>
    );
  }

  const heroImage = story.images?.[0]?.url;

  return (
    <div className="bg-[#f8faf8]">
      <section className="border-b border-[#c0c9bb]/40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid lg:grid-cols-[1fr_0.85fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#e7f7e5] px-3 py-1.5 text-sm font-bold text-[#00450d]">
                <Sprout className="w-4 h-4" />
                Câu chuyện thương hiệu
              </div>
              <h1
                className="mt-5 text-4xl sm:text-5xl font-extrabold text-[#00450d] leading-tight"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                {story.name}
              </h1>
              {story.address && (
                <p className="mt-5 flex items-start gap-2 text-[#41493e]">
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-[#00450d]" />
                  {story.address}
                </p>
              )}
              {story.brand_story && (
                <p className="mt-6 text-lg leading-8 text-[#41493e]">
                  {story.brand_story}
                </p>
              )}
            </div>
            {heroImage && (
              <img
                src={heroImage}
                alt={story.images[0].description || story.name}
                className="w-full h-[320px] sm:h-[420px] object-cover rounded-3xl shadow-sm"
              />
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {story.cultivation_philosophy && (
            <article className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-7 sm:p-9">
              <p className="text-sm font-bold uppercase tracking-wider text-[#187c22]">
                Triết lý canh tác
              </p>
              <p className="mt-4 text-[#41493e] text-lg leading-8 whitespace-pre-line">
                {story.cultivation_philosophy}
              </p>
            </article>
          )}
          {story.capability_profile && (
            <article className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-7 sm:p-9">
              <p className="text-sm font-bold uppercase tracking-wider text-[#187c22]">
                Hồ sơ năng lực
              </p>
              <p className="mt-4 text-[#41493e] text-lg leading-8 whitespace-pre-line">
                {story.capability_profile}
              </p>
            </article>
          )}
        </div>

        {story.images?.length > 1 && (
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {story.images.slice(1).map((image) => (
              <figure key={image.id} className="overflow-hidden rounded-2xl bg-white border border-[#c0c9bb]/50">
                <img
                  src={image.url}
                  alt={image.description || story.name}
                  className="w-full h-64 object-cover"
                />
                {image.description && (
                  <figcaption className="px-4 py-3 text-sm text-[#41493e]">
                    {image.description}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
