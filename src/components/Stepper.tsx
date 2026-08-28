interface Props {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
  max?: number;
  ariaLabel: string;
}

/** 「−」「+」タップで一定刻みずつ増減できる数値入力。直接入力もできる。 */
export default function Stepper({ value, onChange, step, min = 0, max, ariaLabel }: Props) {
  function clamp(n: number): number {
    let v = n;
    if (Number.isNaN(v)) v = min;
    if (v < min) v = min;
    if (max !== undefined && v > max) v = max;
    return v;
  }

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        aria-label={`${ariaLabel}を${step}減らす`}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <input
        type="number"
        className="stepper-input"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
      />
      <button
        type="button"
        className="stepper-btn"
        aria-label={`${ariaLabel}を${step}増やす`}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}
