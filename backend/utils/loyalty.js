// Loyalty-points economics, centralized so earn/redeem stay in sync.
// 1 point == 1 EGP of redeem value; buyers earn 5% of an order's item total
// back as points once the order is delivered.
export const POINT_VALUE_EGP = 1;
export const EARN_RATE = 0.05;

/** Points earned for a given spend amount (item total), floored. */
export const earnedPointsFor = (amount) =>
  Math.max(0, Math.floor((Number(amount) || 0) * EARN_RATE));

/** EGP value of a points balance. */
export const pointsToEgp = (points) =>
  Math.max(0, Math.floor(Number(points) || 0)) * POINT_VALUE_EGP;

// Referral bonuses (in points), paid once when a referred user's first order is
// delivered: the referrer and the new customer each get a reward.
export const REFERRER_REWARD = 50;
export const REFEREE_REWARD = 30;
