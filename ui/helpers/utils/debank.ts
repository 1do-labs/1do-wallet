export function getDebankProfileUrl(address?: string) {
  if (!address) {
    return 'https://debank.com';
  }

  return `https://debank.com/profile/${address}`;
}
