import { Star } from "lucide-react";

/**
 * Read-only star display that fills proportionally for fractional values.
 * e.g. 4.3 = 4 full stars + 1 partial at 30%.
 */
export const StarsDisplay = ({
  value,
  size = 16,
  showNumber = false,
  className = "",
}: {
  value: number | null | undefined;
  size?: number;
  showNumber?: boolean;
  className?: string;
}) => {
  const v = Math.max(0, Math.min(5, Number(value ?? 0)));
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <div className="inline-flex">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, v - i));
          return (
            <div
              key={i}
              className="relative"
              style={{ width: size, height: size }}
              aria-hidden
            >
              <Star
                className="absolute inset-0 text-muted-foreground/40"
                style={{ width: size, height: size }}
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className="fill-yellow-400 text-yellow-400"
                  style={{ width: size, height: size }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {showNumber && (
        <span className="text-sm font-medium tabular-nums">
          {value != null ? Number(value).toFixed(1) : "—"}
        </span>
      )}
    </div>
  );
};

/**
 * Interactive whole-star rating (0..5). Click a star to select it,
 * click the same star again to clear back to 0.
 */
export const StarsInput = ({
  value,
  onChange,
  size = 24,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) => {
  return (
    <div className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            className="cursor-pointer p-0.5 -m-0.5 rounded hover:scale-110 transition-transform"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
          >
            <Star
              style={{ width: size, height: size }}
              className={
                active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/50"
              }
            />
          </button>
        );
      })}
    </div>
  );
};
