import { formatUnits, parseEther, parseUnits } from 'ethers';

export function formatTokenBalance(value?: bigint | null, decimals = 6, precision = 4) {
  if (value === undefined || value === null) {
    return '0';
  }

  const formatted = formatUnits(value, decimals);
  const [whole, fraction = ''] = formatted.split('.');
  if (!fraction) {
    return whole;
  }

  const trimmedFraction = fraction.slice(0, precision).replace(/0+$/, '');
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

export function parseCusdt(value: string, decimals = 6) {
  return parseUnits(value || '0', decimals);
}

export function parseEth(value: string) {
  return parseEther(value || '0');
}
