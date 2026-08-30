import type { OperatingImpact } from '../calculations/building-data';

const metrics = [
  { key: 'maintenanceCredits', className: 'maintenance', label: 'maintenance credits per minute' },
  { key: 'power', className: 'power', label: 'power' },
  { key: 'ecoBalance', className: 'eco-balance', label: 'ecobalance' },
] as const;

export function formatOperatingImpact(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

export function OperatingImpactValues({ impact }: { impact: OperatingImpact }) {
  return (
    <span className="operating-impact-values">
      {metrics.map(({ key, className, label }) => {
        const value = formatOperatingImpact(impact[key]);
        return (
          <span
            key={key}
            className={`operating-impact-values__metric operating-impact-values__metric--${className}`}
            aria-label={`${value} ${label}`}
          >{value}</span>
        );
      })}
    </span>
  );
}
