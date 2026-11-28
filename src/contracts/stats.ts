/**
 * Computes a Wilson score confidence interval for a binomial proportion.
 * Preferred over Wald intervals for small sample sizes (n <= 20).
 */
export function wilsonInterval(
  successes: number,
  total: number,
  z = 1.96,
): { center: number; lower: number; upper: number } {
  if (total <= 0) return { center: 0, lower: 0, upper: 1 };
  const p = Math.min(1, Math.max(0, successes / total));
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / denom;
  return {
    center,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

/**
 * Summarizes a Beta(alpha, beta) posterior distribution with its mean and
 * approximate 90% credible interval (z = 1.645).
 */
export function betaCredibleInterval(
  alpha: number,
  beta: number,
  z = 1.645,
): { mean: number; lower: number; upper: number } {
  const sum = alpha + beta;
  if (sum <= 0) return { mean: 0.5, lower: 0, upper: 1 };
  const mean = alpha / sum;
  const sd = Math.sqrt((alpha * beta) / (sum * sum * (sum + 1)));
  return {
    mean,
    lower: Math.max(0, mean - z * sd),
    upper: Math.min(1, mean + z * sd),
  };
}
