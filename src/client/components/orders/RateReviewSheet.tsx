import { useState } from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export interface RateReviewSheetProps {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  vendorName: string;
  publicNo?: string;
  onSubmitted?: (orderId: string, rating: number) => void;
}

export function RateReviewSheet({
  open,
  onClose,
  orderId,
  vendorName,
  publicNo,
  onSubmitted,
}: RateReviewSheetProps) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!orderId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) {
        showToast(data.error?.message || 'Could not save rating.', 'error');
        return;
      }
      showToast('Thank you for rating your campus delivery!', 'success');
      onSubmitted?.(orderId, rating);
      setComment('');
      onClose();
    } catch {
      showToast('Network error submitting review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Rate ${vendorName}`}
      description={
        publicNo
          ? `Share quick feedback on Order #${publicNo} to help NIT Patna students.`
          : 'Share quick feedback on your campus order.'
      }
    >
      <div className="space-y-4 pt-2">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">
            Overall Experience
          </span>
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                onClick={() => setRating(star)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-sunken)] transition-colors hover:border-[#FFB400] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= rating
                      ? 'fill-[#FFB400] text-[#FFB400]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="review-comment-input"
            className="text-xs font-semibold text-[var(--color-text)]"
          >
            Short review (optional)
          </label>
          <textarea
            id="review-comment-input"
            rows={3}
            maxLength={400}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Hot food, crisp packaging, prompt at Main Gate..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="min-h-[44px]">
            Later
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={handleSubmit}
            className="min-h-[44px]"
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            <span>Submit Review</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
