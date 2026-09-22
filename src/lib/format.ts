const wonFormatter = new Intl.NumberFormat("ko-KR");

export function formatWon(amount: number) {
  return `${wonFormatter.format(amount)}원`;
}

/** "카카오뱅크 3333-01-1234567 홍길동" → "3333-01-1234567". 못 찾으면 원문 그대로. */
export function extractAccountNumber(accountInfo: string) {
  return accountInfo.match(/\d[\d-]{6,}\d/)?.[0] ?? accountInfo;
}
