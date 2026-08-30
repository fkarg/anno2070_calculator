import type { OperatingImpact } from '../calculations/building-data';

const metrics = [
  { key: 'maintenanceCredits', className: 'maintenance', label: 'maintenance credits per minute' },
  { key: 'power', className: 'power', label: 'power' },
  { key: 'ecoBalance', className: 'eco-balance', label: 'ecobalance' },
] as const;

function formatOperatingImpact(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

export function OperatingImpactValues({ impact, ecoUnavailable = false, highlightDeficits = false }: {
  impact: OperatingImpact;
  // Underwater islands have no ecobalance: render a dash instead of 0.
  ecoUnavailable?: boolean;
  // Island balances: negative power/eco is an actionable problem there,
  // unlike in per-building cost rows where negatives are the norm.
  highlightDeficits?: boolean;
}) {
  return (
    <span className="operating-impact-values">
      {metrics.map(({ key, className, label }) => {
        const unavailable = key === 'ecoBalance' && ecoUnavailable;
        const short = highlightDeficits && !unavailable
          && (key === 'power' || key === 'ecoBalance') && impact[key] < 0;
        return (
          <span
            key={key}
            className={`operating-impact-values__metric operating-impact-values__metric--${className}${short ? ' operating-impact-values__metric--short' : ''}`}
          >
            <span className="visually-hidden">{label}:</span>
            {unavailable ? '—' : formatOperatingImpact(impact[key])}
          </span>
        );
      })}
    </span>
  );
}
