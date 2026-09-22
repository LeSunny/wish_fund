import { randomInt } from "node:crypto";

// 후원 코드: "귤-47-딸기" = 한글 명사 + 10~99 + 한글 명사
// 60 × 59 × 90 ≈ 31만 가지. 중복 검사는 lib/pledge.ts 에서 DB unique 제약과 함께 처리.
export const CODE_NOUNS = [
  "귤", "딸기", "사과", "포도", "수박", "참외", "자두", "체리", "망고", "키위",
  "레몬", "라임", "멜론", "앵두", "감", "배", "밤", "대추", "호두", "땅콩",
  "쿠키", "푸딩", "젤리", "사탕", "초코", "도넛", "와플", "케이크", "머핀", "크림",
  "우유", "녹차", "홍차", "라떼", "모카", "식빵", "베이글", "떡", "약과", "호떡",
  "토끼", "고양이", "강아지", "다람쥐", "펭귄", "오리", "곰", "여우", "판다", "햄스터",
  "별", "달", "구름", "무지개", "하트", "풍선", "리본", "선물", "편지", "양말",
] as const;

function pick<T>(list: readonly T[]) {
  return list[randomInt(list.length)];
}

export function generatePledgeCode() {
  const first = pick(CODE_NOUNS);
  let last = pick(CODE_NOUNS);
  while (last === first) last = pick(CODE_NOUNS);
  const number = randomInt(10, 100);
  return `${first}-${number}-${last}`;
}

const CODE_PATTERN = /^([가-힣]+)[\s\-_.·]*(\d{2})[\s\-_.·]*([가-힣]+)$/;

/**
 * 사용자가 입력한 코드를 저장 형식으로 정규화한다.
 * "귤 47 딸기", "귤_47_딸기", "귤47딸기", " 귤--47-딸기 " → "귤-47-딸기"
 * 형식이 아니면 null.
 */
export function normalizePledgeCode(input: string) {
  const match = input.trim().match(CODE_PATTERN);
  if (!match) return null;
  const [, first, number, last] = match;
  return `${first}-${number}-${last}`;
}
