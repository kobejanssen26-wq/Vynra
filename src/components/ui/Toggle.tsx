type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
};

export default function Toggle({ checked, onChange, disabled }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? 'bg-[color:var(--color-neon)]' : 'bg-[color:var(--color-track)]'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
