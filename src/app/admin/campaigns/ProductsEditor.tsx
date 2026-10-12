"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, inputStyles } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { GOAL_AMOUNT_MAX, PRODUCTS_MAX, type ProductInput } from "@/lib/validation";
import { fetchProductOg } from "../actions";

/** 폼에서 편집 중인 상품 한 줄. 가격은 입력 중인 숫자 문자열(콤마 없이), 비우면 "" */
export type ProductDraft = {
  key: string; // React key 전용 (DB id와 무관 — 저장할 때 상품은 통째로 교체됨)
  title: string;
  url: string;
  thumbnailUrl: string;
  price: string;
};

let draftSeq = 0;
const nextKey = () => `p${++draftSeq}`;

export function emptyProduct(): ProductDraft {
  return { key: nextKey(), title: "", url: "", thumbnailUrl: "", price: "" };
}

export function toProductDraft(p: {
  title: string;
  url: string | null;
  thumbnailUrl: string | null;
  price: number | null;
}): ProductDraft {
  return {
    key: nextKey(),
    title: p.title,
    url: p.url ?? "",
    thumbnailUrl: p.thumbnailUrl ?? "",
    price: p.price === null ? "" : String(p.price),
  };
}

/** 서버로 보낼 형태 (hidden input에 JSON으로). 빈 문자열→null 변환과 최종 검증은 서버의 productInputSchema */
export function toProductInput(d: ProductDraft) {
  return { title: d.title, url: d.url, thumbnailUrl: d.thumbnailUrl, price: d.price === "" ? null : Number(d.price) };
}

const MAX_PRICE_DIGITS = String(GOAL_AMOUNT_MAX).length;

export function ProductsEditor({
  products,
  onChange,
  fieldError,
}: {
  products: ProductDraft[];
  onChange: (next: ProductDraft[]) => void;
  fieldError: (key: string) => string | undefined;
}) {
  const update = (key: string, patch: Partial<ProductDraft>) =>
    onChange(products.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const remove = (key: string) => onChange(products.filter((p) => p.key !== key));
  const move = (index: number, delta: -1 | 1) => {
    const next = [...products];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-pixel text-sm">
          갖고 싶은 것 <span className="text-ink/50">({products.length}/{PRODUCTS_MAX})</span>
        </p>
        <p className="text-xs text-ink/60">
          후원은 상품별이 아니라 캠페인 전체에 모여요. 첫 번째 상품 사진이 카톡 공유 썸네일이 돼요.
        </p>
      </div>

      {products.map((product, index) => (
        <ProductRow
          key={product.key}
          index={index}
          product={product}
          isFirst={index === 0}
          isLast={index === products.length - 1}
          onUpdate={(patch) => update(product.key, patch)}
          onRemove={() => remove(product.key)}
          onMove={(delta) => move(index, delta)}
          fieldError={(field) => fieldError(`products.${index}.${field}`)}
        />
      ))}

      {fieldError("products") && (
        <p role="alert" className="text-xs text-red">
          ✕ {fieldError("products")}
        </p>
      )}

      {products.length < PRODUCTS_MAX && (
        <Button type="button" variant="white" onClick={() => onChange([...products, emptyProduct()])}>
          + 상품 추가
        </Button>
      )}
    </div>
  );
}

function ProductRow({
  index,
  product,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
  fieldError,
}: {
  index: number;
  product: ProductDraft;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<ProductDraft>) => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
  fieldError: (field: keyof ProductInput) => string | undefined;
}) {
  const id = useId();
  const [ogError, setOgError] = useState<string | null>(null);
  const [ogPending, startOg] = useTransition();

  function autofill() {
    setOgError(null);
    startOg(async () => {
      const og = await fetchProductOg(product.url);
      if (og.error) return setOgError(og.error);
      onUpdate({
        ...(og.title && { title: og.title }),
        ...(og.thumbnailUrl && { thumbnailUrl: og.thumbnailUrl }),
      });
    });
  }

  return (
    <fieldset className="flex flex-col gap-4 border-2 border-ink bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <legend className="font-pixel text-sm">
          상품 {index + 1}
          {isFirst && <span className="text-ink/50"> · 대표</span>}
        </legend>
        <div className="flex gap-1">
          <Button type="button" variant="white" size="sm" onClick={() => onMove(-1)} disabled={isFirst} aria-label={`상품 ${index + 1} 위로`}>
            ↑
          </Button>
          <Button type="button" variant="white" size="sm" onClick={() => onMove(1)} disabled={isLast} aria-label={`상품 ${index + 1} 아래로`}>
            ↓
          </Button>
          <Button type="button" variant="white" size="sm" onClick={onRemove} aria-label={`상품 ${index + 1} 삭제`}>
            ✕
          </Button>
        </div>
      </div>

      <Field
        label="상품 URL (선택)"
        htmlFor={`${id}-url`}
        hint="입력 후 자동 채우기를 누르면 이름·사진을 긁어와요"
        error={fieldError("url") ?? ogError ?? undefined}
      >
        <div className="flex gap-2">
          <input
            id={`${id}-url`}
            type="url"
            value={product.url}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="https://..."
            aria-invalid={!!fieldError("url")}
            className={inputStyles}
          />
          <Button
            type="button"
            variant="white"
            size="sm"
            onClick={autofill}
            disabled={ogPending || !product.url.trim()}
            className="shrink-0"
          >
            {ogPending ? "가져오는 중..." : "자동 채우기"}
          </Button>
        </div>
      </Field>

      <Field label="상품 이름" htmlFor={`${id}-title`} error={fieldError("title")}>
        <input
          id={`${id}-title`}
          value={product.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="에어팟 프로 3"
          aria-invalid={!!fieldError("title")}
          className={inputStyles}
        />
      </Field>

      <Field label="사진 URL (선택)" htmlFor={`${id}-thumbnailUrl`} error={fieldError("thumbnailUrl")}>
        <div className="flex items-center gap-3">
          <input
            id={`${id}-thumbnailUrl`}
            type="url"
            value={product.thumbnailUrl}
            onChange={(e) => onUpdate({ thumbnailUrl: e.target.value })}
            placeholder="https://..."
            aria-invalid={!!fieldError("thumbnailUrl")}
            className={inputStyles}
          />
          {product.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- 미리보기, 도메인 목록을 미리 알 수 없음
            <img
              src={product.thumbnailUrl}
              alt=""
              className="size-12 shrink-0 border-2 border-ink object-cover"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              onLoad={(e) => (e.currentTarget.style.visibility = "visible")}
            />
          )}
        </div>
      </Field>

      <Field
        label="가격 (선택)"
        htmlFor={`${id}-price`}
        hint="참고용이에요. 합계를 목표 금액으로 쓸 수 있어요"
        error={fieldError("price")}
      >
        <div className="relative">
          <input
            id={`${id}-price`}
            inputMode="numeric"
            autoComplete="off"
            value={product.price === "" ? "" : Number(product.price).toLocaleString("ko-KR")}
            onChange={(e) => onUpdate({ price: e.target.value.replace(/\D/g, "").slice(0, MAX_PRICE_DIGITS) })}
            placeholder="0"
            aria-invalid={!!fieldError("price")}
            className={cn(inputStyles, "pr-10 text-right")}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">원</span>
        </div>
      </Field>
    </fieldset>
  );
}
