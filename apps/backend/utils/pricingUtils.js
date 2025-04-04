/**
 * Categorize a price into a pricing range.
 * @param {number} price - The price to categorize.
 * @returns {string} - The corresponding pricing range.
 */
export const calculatePricingRange = (price) => {
  if (typeof price !== 'number' || isNaN(price) || price < 0) {
    console.error('❌ Invalid price input:', price);
    return 'Invalid Price';
  }

  const pricingRanges = [
    { min: 20, max: 50, range: '20-50' },
    { min: 51, max: 100, range: '51-100' },
    { min: 101, max: 150, range: '101-150' },
    { min: 151, max: 200, range: '151-200' },
  ];

  const foundRange = pricingRanges.find(
    ({ min, max }) => price >= min && price <= max,
  );
  return foundRange ? foundRange.range : 'Unknown';
};
