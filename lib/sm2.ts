export interface CardSchedule {
  ease: number;
  interval: number;
  reps: number;
  due: number;
}

/**
 * Apply SM-2 algorithm to a card based on the rating.
 * @param rating 1=Again, 2=Hard, 3=Good, 4=Easy
 * @param card Current card scheduling state
 * @returns Updated card scheduling state
 */
export function sm2(
  rating: 1 | 2 | 3 | 4,
  card: CardSchedule
): CardSchedule {
  let { ease, interval, reps } = card;

  if (rating < 2) {
    // Again — reset
    reps = 0;
    interval = 1;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    if (reps === 0) {
      interval = 1;
    } else if (reps === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }

    ease = ease + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02));
    ease = Math.max(1.3, ease);
    reps += 1;
  }

  const due = Math.floor(Date.now() / 1000) + interval * 86400;

  return { ease, interval, reps, due };
}

/**
 * XP awarded for a card review based on rating.
 */
export function xpForRating(rating: 1 | 2 | 3 | 4): number {
  if (rating >= 3) return 5; // Good or Easy
  if (rating === 2) return 3; // Hard
  return 1; // Again
}
