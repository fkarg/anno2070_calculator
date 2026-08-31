import type { Faction } from '../calculations/population';
import type { ResolvedPopulationTarget } from '../calculations/population-target';
import { FACTION_CONFIGS, parseNonNegativeInteger, type PlanFactionState } from '../model';
import { NumericInput } from './NumericInput';

type Props = { faction: Faction; state: PlanFactionState; resolved: ResolvedPopulationTarget | null; onChange: (state: PlanFactionState) => void; onBonusChange: (bonus: 'livingSpace' | 'senate', checked: boolean) => void };
const entry = (raw: string) => ({ raw, value: parseNonNegativeInteger(raw) });

export function GrowthTargetFaction({ faction, state, resolved, onChange, onBonusChange }: Props) {
  const config = FACTION_CONFIGS[faction];
  const tier = state.intent.kind === 'population' ? state.intent.tier : state.intent.kind === 'residences' ? state.intent.maxTier : config.tierLabels.length;
  const residenceIntent = state.intent.kind === 'residences' ? state.intent : null;
  const populationIntent = state.intent.kind === 'population' ? state.intent : null;
  const selectTier = (nextTier: number) => {
    if (populationIntent !== null) onChange({ ...state, intent: { ...populationIntent, tier: nextTier } });
    else if (residenceIntent !== null) onChange({ ...state, intent: { ...residenceIntent, maxTier: nextTier } });
  };
  const setMode = (kind: 'follow' | 'residences' | 'population') => onChange({ ...state, intent: kind === 'follow' ? { kind } : kind === 'residences' ? { kind, houses: entry(String(resolved?.houses ?? 0)), maxTier: tier } : { kind, tier, count: entry('0') } });
  const stepResidences = (delta: number) => {
    const intent = residenceIntent;
    if (intent === null || intent.houses.value === null) return;
    const value = Math.max(0, intent.houses.value + delta);
    onChange({ ...state, intent: { ...intent, houses: entry(String(value)) } });
  };
  return <details className={`growth-target growth-target--${faction}`} open>
    <summary>{config.label} · {state.intent.kind === 'follow' ? 'Follow islands' : state.intent.kind === 'residences' ? 'By residences' : 'By population'}</summary>
    <div className="growth-target__modes">
      <button type="button" aria-pressed={state.intent.kind === 'follow'} aria-label={`Target ${config.label} by following islands`} onClick={() => setMode('follow')}>Follow islands</button>
      <button type="button" aria-pressed={state.intent.kind === 'residences'} aria-label={`Target ${config.label} by residences`} onClick={() => setMode('residences')}>By residences</button>
      <button type="button" aria-pressed={state.intent.kind === 'population'} aria-label={`Target ${config.label} by population`} onClick={() => setMode('population')}>By population</button>
    </div>
    {residenceIntent !== null && <div className="growth-target__residences"><NumericInput id={`growth-${faction}-houses`} label={`${config.label} target residences`} raw={residenceIntent.houses.raw} valid={residenceIntent.houses.value !== null} onChange={(raw) => onChange({ ...state, intent: { ...residenceIntent, houses: entry(raw) } })} /><div className="growth-target__stepper"><button type="button" aria-label={`Decrease ${config.label} target residences by 10`} disabled={residenceIntent.houses.value === null} onClick={() => stepResidences(-10)}>−10</button><button type="button" aria-label={`Increase ${config.label} target residences by 10`} disabled={residenceIntent.houses.value === null} onClick={() => stepResidences(10)}>+10</button></div></div>}
    {state.intent.kind !== 'follow' && <fieldset className="tier-cap"><legend>{state.intent.kind === 'population' ? 'Target tier' : 'Highest population tier'}</legend><div className="tier-cap__options">{config.tierLabels.map((label, index) => <button key={label} type="button" aria-label={`${config.label} ${label}${state.intent.kind === 'population' ? ' target tier' : ''}`} aria-pressed={tier === index + 1} onClick={() => selectTier(index + 1)}><img src={config.tierImages[index]} alt="" width="30" height="30" /></button>)}</div></fieldset>}
    {populationIntent !== null && <NumericInput id={`growth-${faction}-population-target`} label={`${config.label} minimum ${config.tierLabels[populationIntent.tier - 1]}`} raw={populationIntent.count.raw} valid={populationIntent.count.value !== null} onChange={(raw) => onChange({ ...state, intent: { ...populationIntent, count: entry(raw) } })} />}
    <div className="population-options population-options--compact"><small className="growth-target__bonus-note">Global bonuses · affect Actual and Target</small><label><input type="checkbox" checked={state.livingSpace} onChange={(event) => onBonusChange('livingSpace', event.target.checked)} />{config.livingSpaceLabel}</label><label><input type="checkbox" checked={state.senate} onChange={(event) => onBonusChange('senate', event.target.checked)} />{config.senateLabel}</label></div>
    {state.intent.kind !== 'follow' && <details className="growth-target__advanced"><summary>Advanced population overrides</summary>{config.tierLabels.map((label, index) => {
      const override = state.overrides[index];
      return <div key={label} data-testid={`growth-${faction}-override-${index}`}><NumericInput id={`growth-${faction}-population-${index}`} label={`${config.label} ${label} override`} raw={override?.raw ?? ''} valid={override === null || override.value !== null} placeholder="Auto" onChange={(raw) => onChange({ ...state, overrides: state.overrides.map((current, tierIndex) => tierIndex === index ? entry(raw) : current) })} />{override !== null && <button type="button" aria-label={`Use automatic ${config.label} ${label} population`} onClick={() => onChange({ ...state, overrides: state.overrides.map((current, tierIndex) => tierIndex === index ? null : current) })}>Auto</button>}</div>;
    })}</details>}
    <div className="growth-target__derived" data-testid={`growth-${faction}-derived`}>
      {resolved === null ? <p>Target unavailable</p> : <>
        <p>{resolved.houses} residences · {resolved.effectivePopulations.map((value, index) => `${value} ${config.tierLabels[index]}`).join(' · ')}</p>
        {resolved.requested !== null && <p>Requested {resolved.requested} {config.tierLabels[resolved.maxTier - 1]} · Achieved {resolved.achieved} · Overshoot {resolved.overshoot}</p>}
        {!resolved.targetMetAfterOverrides && <p className="growth-target__warning" role="status">Target not met after overrides</p>}
      </>}
    </div>
  </details>;
}
