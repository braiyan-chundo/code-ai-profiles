export function UsageMeter({ label, value }: { label: string; value: number | null }) {
  const progress = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div className="usage-meter">
      <div className="usage-meter-heading">
        <span>{label}</span>
        <strong>{value == null ? "—" : `${Math.round(value)}%`}</strong>
      </div>
      <div className="progress-track" aria-label={value == null ? `${label} no disponible` : `${label}: ${value}% usado`}>
        <span
          className={progress >= 90 ? "critical" : progress >= 70 ? "high" : ""}
          style={{ width: value == null ? "0%" : `${progress}%` }}
        />
      </div>
      <small>{value == null ? "Sin datos" : "usado"}</small>
    </div>
  );
}
