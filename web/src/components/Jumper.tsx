const MAX_VISIBLE = 20;

export type JumperItemState = "correct" | "wrong" | "answered" | undefined;

interface JumperProps {
  total: number;
  current: number;
  onJump: (index: number) => void;
  getState?: (index: number) => JumperItemState;
}

export default function Jumper({ total, current, onJump, getState }: JumperProps) {
  if (total <= 0) return null;

  let start: number;
  if (total <= MAX_VISIBLE) {
    start = 0;
  } else {
    start = Math.min(
      Math.max(0, current - Math.floor(MAX_VISIBLE / 2)),
      total - MAX_VISIBLE
    );
  }
  const end = Math.min(start + MAX_VISIBLE, total);

  return (
    <p className="jumper-wrap">
      {start > 0 && <span className="jumper-ellipsis">…</span>}
      {Array.from({ length: end - start }, (_, i) => {
        const idx = start + i;
        const state = getState?.(idx);
        return (
          <button
            key={idx}
            type="button"
            className={current === idx ? "current" : ""}
            data-state={state}
            onClick={() => onJump(idx)}
          >
            {idx + 1}
          </button>
        );
      })}
      {end < total && <span className="jumper-ellipsis">…</span>}
    </p>
  );
}
