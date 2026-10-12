import { CopyButton } from "@/components/CopyButton";
import { buttonStyles } from "@/components/ui/Button";
import { extractAccountNumber } from "@/lib/format";

export type TransferInfo = {
  accountInfo: string | null;
  kakaopayUrl: string | null;
  tossUrl: string | null;
};

/** 카카오페이·토스 송금 링크 + 계좌 복사. 후원 플로우와 내 후원(차액 송금)에서 공용. */
export function TransferMethods({ transfer }: { transfer: TransferInfo }) {
  if (!transfer.kakaopayUrl && !transfer.tossUrl && !transfer.accountInfo) {
    return (
      <p className="border-2 border-ink bg-white p-3 text-sm">
        송금 방법이 아직 등록되지 않았어요. 주인공에게 직접 물어봐주세요!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {transfer.kakaopayUrl && (
        <a
          href={transfer.kakaopayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ variant: "butter", block: true })}
        >
          카카오페이로 보내기 ↗
        </a>
      )}
      {transfer.tossUrl && (
        <a
          href={transfer.tossUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ variant: "periwinkle", block: true })}
        >
          토스로 보내기 ↗
        </a>
      )}
      {transfer.accountInfo && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white p-3">
          <p className="text-sm break-all">{transfer.accountInfo}</p>
          <CopyButton text={extractAccountNumber(transfer.accountInfo)} variant="white" size="sm">
            계좌번호 복사
          </CopyButton>
        </div>
      )}
    </div>
  );
}
