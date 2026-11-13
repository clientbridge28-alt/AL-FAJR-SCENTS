import { useState, useMemo } from 'react';
import { Star, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import type { Review } from '../types';

interface ProductReviewsProps {
  productId: number;
  productName: string;
  reviews: Review[];
  onReviewAdded: (review: Review) => void;
}

const RATING_LABELS: Record<number, string> = {
  5: 'Exceptional',
  4: 'Very Good',
  3: 'Good',
  2: 'Fair',
  1: 'Needs Refinement',
};

export function ProductReviews({
  productId,
  productName,
  reviews,
  onReviewAdded,
}: ProductReviewsProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCity, setReviewerCity] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        average: 0,
        total: 0,
        counts: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, percent: 0 })),
      };
    }
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const counts = [5, 4, 3, 2, 1].map((stars) => {
      const count = reviews.filter((r) => r.rating === stars).length;
      return {
        stars,
        count,
        percent: Math.round((count / total) * 100),
      };
    });
    return {
      average: Number((sum / total).toFixed(1)),
      total,
      counts,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (filterRating === 'all') return reviews;
    return reviews.filter((r) => r.rating === filterRating);
  }, [reviews, filterRating]);

  const activeStars = hoverRating || rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !comment.trim()) {
      setStatusMessage({ ok: false, text: 'Please enter your name and written feedback.' });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          orderNumber: orderNumber.trim() || undefined,
          reviewerName: reviewerName.trim(),
          reviewerCity: reviewerCity.trim(),
          rating,
          title: title.trim(),
          comment: comment.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.review) {
          onReviewAdded(data.review);
        }
        setStatusMessage({
          ok: true,
          text: data.message || 'Thank you. Your review has been published.',
        });
        setOrderNumber('');
        setReviewerName('');
        setReviewerCity('');
        setTitle('');
        setComment('');
        setRating(5);
        setFilterRating('all');
      } else {
        setStatusMessage({ ok: false, text: data.error || 'Unable to submit review.' });
      }
    } catch {
      setStatusMessage({
        ok: false,
        text: 'Network error while submitting your review. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="mt-20 border-t border-[#10100E]/10 pt-14"
    >
      <div className="grid gap-12 lg:grid-cols-12">
        {/* Left Column: Summary + Review List */}
        <div className="lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#10100E]/10 pb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#302018]/70">
                Client Impressions
              </p>
              <h2 id="reviews-heading" className="mt-1 font-display text-3xl text-[#10100E]">
                Customer Reviews
              </h2>
            </div>

            {stats.total > 0 && (
              <div className="flex items-center gap-3">
                <span className="tabular-nums font-display text-3xl text-[#10100E]">
                  {stats.average.toFixed(1)}
                </span>
                <div>
                  <div className="flex items-center gap-0.5" aria-label={`Average rating ${stats.average} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(stats.average)
                            ? 'fill-[#C6A46A] text-[#C6A46A]'
                            : 'text-[#10100E]/20'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="tabular-nums text-xs text-[#302018]/75">
                    Based on {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Rating Breakdown & Filter Tabs */}
          {stats.total > 0 && (
            <div className="mt-6 space-y-5 border-b border-[#10100E]/10 pb-6">
              <div className="grid gap-2 sm:max-w-md">
                {stats.counts.map((row) => (
                  <div key={row.stars} className="flex items-center gap-3 text-xs text-[#302018]">
                    <span className="w-10 tabular-nums font-medium">{row.stars} ★</span>
                    <div className="h-1.5 flex-1 overflow-hidden bg-[#10100E]/10">
                      <div
                        className="h-full bg-[#C6A46A] transition-all duration-300"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-[#302018]/70">{row.count}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1" role="group" aria-label="Filter reviews by rating">
                <button
                  type="button"
                  onClick={() => setFilterRating('all')}
                  className={`px-3 py-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    filterRating === 'all'
                      ? 'bg-[#10100E] text-[#FAF8F5]'
                      : 'border border-[#10100E]/15 bg-[#FAF8F5] text-[#302018] hover:border-[#10100E]/40'
                  }`}
                >
                  All ({stats.total})
                </button>
                {[5, 4, 3, 2, 1].map((s) => {
                  const count = stats.counts.find((c) => c.stars === s)?.count || 0;
                  if (count === 0) return null;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterRating(s)}
                      className={`px-3 py-1.5 text-xs tabular-nums transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        filterRating === s
                          ? 'bg-[#10100E] text-[#FAF8F5]'
                          : 'border border-[#10100E]/15 bg-[#FAF8F5] text-[#302018] hover:border-[#10100E]/40'
                      }`}
                    >
                      {s} ★ ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Review Cards */}
          {reviews.length === 0 ? (
            <div className="mt-6 border border-[#10100E]/10 bg-[#FAF8F5] p-6 text-sm leading-relaxed text-[#302018]/80">
              No reviews have been shared for {productName} yet. Be the first to rate its scent profile, projection, and longevity using the form alongside.
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="mt-6 border border-[#10100E]/10 bg-[#FAF8F5] p-6 text-sm text-[#302018]/80">
              No {filterRating}-star reviews yet.{' '}
              <button
                type="button"
                onClick={() => setFilterRating('all')}
                className="underline hover:text-[#10100E] cursor-pointer"
              >
                Show all reviews
              </button>
              .
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredReviews.map((rev) => (
                <article key={rev.id} className="border border-[#10100E]/10 bg-[#FAF8F5] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#302018]/75">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-0.5" aria-label={`${rev.rating} out of 5 stars`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= rev.rating
                                ? 'fill-[#C6A46A] text-[#C6A46A]'
                                : 'text-[#10100E]/20'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.is_verified_purchase === 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-[#153F35]">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verified Purchase
                          </span>
                        </>
                      )}
                    </div>
                    <time dateTime={rev.created_at} className="tabular-nums">
                      {new Date(rev.created_at).toLocaleDateString('en-PK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  </div>

                  {rev.title && (
                    <h3 className="mt-2.5 font-display text-xl text-[#10100E]">{rev.title}</h3>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-[#302018]">{rev.comment}</p>
                  <p className="mt-3 text-xs font-medium text-[#10100E]">
                    {rev.reviewer_name}
                    {rev.reviewer_city ? ` — ${rev.reviewer_city}` : ''}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Star Rating & Feedback Form */}
        <div className="lg:col-span-5">
          <div className="border border-[#10100E]/10 bg-[#FAF8F5] p-6 sm:p-8 lg:sticky lg:top-28">
            <h3 className="font-display text-2xl text-[#10100E]">Share Your Experience</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#302018]/75">
              Rate {productName} and share how its notes wear across the day.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Interactive Star Selector */}
              <div>
                <span id="star-rating-label" className="block text-xs uppercase tracking-[0.14em] text-[#302018]">
                  Your Rating *
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="star-rating-label"
                  className="mt-2 flex items-center gap-1.5"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const filled = starValue <= activeStars;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        role="radio"
                        aria-checked={rating === starValue}
                        aria-label={`Rate ${starValue} out of 5 stars (${RATING_LABELS[starValue]})`}
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        className="flex h-10 w-10 items-center justify-center border border-[#10100E]/15 bg-white transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#10100E] cursor-pointer"
                      >
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            filled ? 'fill-[#C6A46A] text-[#C6A46A]' : 'text-[#10100E]/25'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-xs font-medium text-[#302018]">
                    {activeStars}/5 · {RATING_LABELS[activeStars]}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="review-name" className="sr-only">
                    Your Name
                  </label>
                  <input
                    id="review-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Your Name *"
                    className="w-full border border-[#10100E]/20 bg-white px-3.5 py-2.5 text-sm text-[#10100E] placeholder:text-[#302018]/45 focus:border-[#10100E] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="review-city" className="sr-only">
                    City
                  </label>
                  <input
                    id="review-city"
                    type="text"
                    maxLength={60}
                    value={reviewerCity}
                    onChange={(e) => setReviewerCity(e.target.value)}
                    placeholder="City (optional, e.g., Lahore)"
                    className="w-full border border-[#10100E]/20 bg-white px-3.5 py-2.5 text-sm text-[#10100E] placeholder:text-[#302018]/45 focus:border-[#10100E] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="review-title" className="sr-only">
                  Review Headline
                </label>
                <input
                  id="review-title"
                  type="text"
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Review headline (optional)"
                  className="w-full border border-[#10100E]/20 bg-white px-3.5 py-2.5 text-sm text-[#10100E] placeholder:text-[#302018]/45 focus:border-[#10100E] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="review-comment" className="sr-only">
                  Written Feedback
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  required
                  minLength={5}
                  maxLength={800}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your impression of the opening notes, dry-down, and longevity... *"
                  className="w-full border border-[#10100E]/20 bg-white px-3.5 py-2.5 text-sm text-[#10100E] placeholder:text-[#302018]/45 focus:border-[#10100E] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="review-order-number" className="sr-only">
                  Order Number (optional)
                </label>
                <input
                  id="review-order-number"
                  type="text"
                  maxLength={40}
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Order # (optional — adds Verified Purchase badge)"
                  className="w-full border border-[#10100E]/20 bg-white px-3.5 py-2.5 text-xs text-[#10100E] placeholder:text-[#302018]/45 focus:border-[#10100E] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#10100E] py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] transition-colors hover:bg-[#302018] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting Review...' : 'Submit Review'}
              </button>

              {statusMessage && (
                <div
                  role={statusMessage.ok ? 'status' : 'alert'}
                  className={`flex items-start gap-2 border p-3 text-xs ${
                    statusMessage.ok
                      ? 'border-[#153F35]/25 bg-[#153F35]/10 text-[#153F35]'
                      : 'border-red-700/25 bg-red-50 text-red-800'
                  }`}
                >
                  {statusMessage.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
