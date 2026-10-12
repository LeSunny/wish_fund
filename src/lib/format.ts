const wonFormatter = new Intl.NumberFormat("ko-KR");

export function formatWon(amount: number) {
  return `${wonFormatter.format(amount)}원`;
}

/** "카카오뱅크 3333-01-1234567 홍길동" → "3333-01-1234567". 못 찾으면 원문 그대로. */
export function extractAccountNumber(accountInfo: string) {
  return accountInfo.match(/\d[\d-]{6,}\d/)?.[0] ?? accountInfo;
}

// 마감일은 한국 시간 기준. 서버(Vercel)는 UTC라 시간대 없는 값을 그대로 Date로 만들면 9시간 밀린다.
// 한국은 서머타임이 없어 고정 오프셋으로 충분하다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Date → `<input type="datetime-local">` 값 (한국 시간, "2026-12-31T23:59"). 실행 환경 시간대와 무관. */
export function toKstDatetimeLocal(date: Date) {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16);
}

/** `datetime-local` 값("2026-12-31T23:59", 초 선택)을 한국 시간으로 해석. 형식이 틀리면 null. */
export function parseKstDatetimeLocal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const date = new Date(`${value.length === 16 ? `${value}:00` : value}+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
