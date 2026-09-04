export default function ProgressCircle({ completed, total }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center"
      role="progressbar"
      aria-label={`${completed} de ${total} tareas completadas`}
      aria-valuemin={0}
      aria-valuemax={total || 1}
      aria-valuenow={completed}
    >
      <svg className="h-[88px] w-[88px] -rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r={radius} fill="none" className="stroke-muted" strokeWidth="7" />
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset] duration-200 motion-reduce:transition-none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none text-foreground">{completed}</span>
        <span className="mt-1 text-xs leading-none text-muted-foreground">de {total}</span>
      </div>
    </div>
  );
}
