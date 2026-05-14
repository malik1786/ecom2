/**
 * Currency Formatter utility for Sufi Perfumes.
 * Fixed to display prices in Indian Rupees (Rs.) as requested.
 */

const EXCHANGE_RATE_INR = 83.5; // Fixed rate for USD to INR conversion

export function formatPrice(priceCents) {
  const priceInr = priceCents / 100;
  
  // Format as "Rs. 25,000"
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(priceInr);

  return `Rs. ${formattedNumber}`;
}

