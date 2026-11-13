import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SEOHead } from '../components/SEOHead';
import type { JournalArticle } from '../types';

export function JournalPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [articles, setArticles] = useState<JournalArticle[]>([]);
  const [article, setArticle] = useState<JournalArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (slug) {
      fetch(`/api/journal/${encodeURIComponent(slug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setArticle(d?.article || null))
        .finally(() => setLoading(false));
    } else {
      setArticle(null);
      fetch('/api/journal')
        .then((r) => r.json())
        .then((d) => setArticles(d.articles || []))
        .finally(() => setLoading(false));
    }
  }, [slug]);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-sm text-[#302018]/70">Loading journal...</div>;
  }

  if (slug && article) {
    return (
      <article className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <SEOHead
          title={`${article.title} | Al Fajr Scents Journal`}
          description={article.excerpt}
          canonicalPath={`/journal/${article.slug}`}
          ogImage={article.cover_image}
        />

        <Link
          to="/journal"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#302018] hover:text-[#10100E]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Journal
        </Link>

        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[#C6A46A]">
          {article.category} · {article.read_time}
        </p>
        <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-[#10100E] sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-4 text-lg text-[#302018]/80">{article.excerpt}</p>

        <div className="mt-8 aspect-[16/9] overflow-hidden bg-[#E9DFD3]">
          <img
            src={article.cover_image}
            alt={article.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="mt-10 space-y-5 text-base leading-relaxed text-[#302018]">
          {article.content.split('\n\n').map((para, i) => (
            <p key={i} className="whitespace-pre-line">{para}</p>
          ))}
        </div>

        {article.related_product_slug && (
          <div className="mt-12 flex items-center justify-between border border-[#10100E]/15 bg-[#FAF8F5] p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#302018]/70">Featured Creation</p>
              <p className="mt-1 font-display text-2xl text-[#10100E]">Explore This Fragrance</p>
            </div>
            <Link
              to={`/products/${article.related_product_slug}`}
              className="inline-flex items-center gap-2 bg-[#10100E] px-5 py-3 text-xs uppercase tracking-[0.16em] text-[#FAF8F5]"
            >
              View Bottle <ArrowRight className="h-4 w-4 text-[#C6A46A]" />
            </Link>
          </div>
        )}
      </article>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SEOHead
        title="The Fragrance Journal — Perfume Guides & Education | Al Fajr Scents"
        description="Read perfume guides on signature scent selection, top/heart/base notes, layering combinations, and fragrance longevity."
        canonicalPath="/journal"
      />

      <div className="border-b border-[#10100E]/10 pb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#302018]/70">Editorial Education</p>
        <h1 className="mt-2 font-display text-4xl font-normal text-[#10100E] sm:text-5xl">
          The Fragrance Journal
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#302018]/80">
          Practical olfactory essays on choosing, layering, and preserving fine Eau de Parfum.
        </p>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((art) => (
          <article key={art.id} className="group flex flex-col border border-[#10100E]/10 bg-[#FAF8F5]">
            <Link to={`/journal/${art.slug}`} className="aspect-[4/3] overflow-hidden bg-[#E9DFD3]">
              <img
                src={art.cover_image}
                alt={art.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </Link>
            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <p className="text-xs text-[#302018]/70">
                  {art.category} · {art.read_time}
                </p>
                <Link to={`/journal/${art.slug}`} className="mt-2 block">
                  <h2 className="font-display text-2xl font-normal text-[#10100E] group-hover:underline">
                    {art.title}
                  </h2>
                </Link>
                <p className="mt-2.5 text-sm text-[#302018]/80">{art.excerpt}</p>
              </div>
              <Link
                to={`/journal/${art.slug}`}
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#10100E]"
              >
                Read Essay <ArrowRight className="h-3.5 w-3.5 text-[#C6A46A]" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
