import type { BuildingId } from '../calculations/building-data';
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import type { GrowthGap, GrowthMilestone, GrowthPlanningResult } from '../calculations/planning';
import { formatRequirement } from '../calculations/production';
import type { IslandState } from '../island';
import { FACTIONS, FACTION_CONFIGS } from '../model';
import { GrowthGapCard } from './GrowthGapCard';
import './growth-milestones.css';

const EPSILON = 1e-9;

type Props = {
  planning: GrowthPlanningResult | null;
  islands: readonly IslandState[];
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
  onIgnoreDemand: (source: IgnoredDemandSource) => void;
};

type MilestoneDetailsProps = {
  testId: string;
  title: string;
  summary: string;
  gaps: readonly GrowthGap[];
  carriedSubtitle: string;
  baseline?: boolean;
  open: boolean;
  state: 'current' | 'future' | 'complete';
  islands: readonly IslandState[];
  onApplyBuilding: Props['onApplyBuilding'];
  onIgnoreDemand: Props['onIgnoreDemand'];
};

function MilestoneDetails(props: MilestoneDetailsProps) {
  const changed = props.gaps.filter((gap) => gap.addedHere > EPSILON);
  const carried = props.gaps.filter((gap) => gap.addedHere <= EPSILON);
  const card = (gap: GrowthGap, subtitle: string) => <GrowthGapCard
    key={gap.goodId}
    gap={gap}
    subtitle={subtitle}
    testId={`growth-gap-${props.testId.replace('growth-milestone-', '')}-${gap.goodId}`}
    islands={props.islands}
    onApplyBuilding={props.onApplyBuilding}
    onIgnoreDemand={props.onIgnoreDemand}
  />;

  return <details
    className={`growth-milestone growth-milestone--${props.state}`}
    data-testid={props.testId}
    open={props.open}
  >
    <summary><span>{props.title}</span><small>{props.summary}</small></summary>
    {props.gaps.length > 0 && <div className="growth-milestone__gaps">
      {props.baseline
        ? props.gaps.map((gap) => card(gap, props.carriedSubtitle))
        : <>
          {changed.length > 0 && <section>
            <h5 className="growth-milestone__group-title">Changed in this step</h5>
            {changed.map((gap) => card(
              gap,
              `This step adds +${formatRequirement(gap.addedHere)} required capacity`,
            ))}
          </section>}
          {carried.length > 0 && <details className="growth-milestone__carried">
            <summary>Carried gaps ({carried.length})</summary>
            {carried.map((gap) => card(
              gap,
              Math.abs(gap.required - gap.baselineRequired) <= EPSILON
                ? 'Already required by current population'
                : props.carriedSubtitle,
            ))}
          </details>}
        </>}
    </div>}
  </details>;
}

function milestoneTitle(milestone: GrowthMilestone): string {
  const config = FACTION_CONFIGS[milestone.faction];
  const targetTier = config.tierLabels[milestone.tier - 1];
  return milestone.kind === 'expand'
    ? `Expand ${config.label} at ${targetTier}`
    : `${config.tierLabels[milestone.tier - 2]} to ${targetTier}`;
}

function milestoneSummary(milestone: GrowthMilestone): string {
  const config = FACTION_CONFIGS[milestone.faction];
  const targetTier = config.tierLabels[milestone.tier - 1];
  const delta = milestone.populationAfter[milestone.faction][milestone.tier - 1]
    - milestone.populationBefore[milestone.faction][milestone.tier - 1];
  const changed = milestone.gaps.filter((gap) => gap.addedHere > EPSILON).length;
  const carried = milestone.gaps.length - changed;
  const coverage = milestone.complete
    ? 'covered'
    : `${milestone.gaps.length} gaps · ${changed} changed here · ${carried} carried`;
  return `${delta >= 0 ? '+' : ''}${delta} ${targetTier} · ${coverage}`;
}

function milestoneState(milestone: GrowthMilestone): 'current' | 'future' | 'complete' {
  if (milestone.complete) return 'complete';
  return milestone.current ? 'current' : 'future';
}

export function GrowthMilestones({ planning, islands, onApplyBuilding, onIgnoreDemand }: Props) {
  if (planning === null) {
    return <section className="growth-milestones"><h3>Full-supply milestones</h3><p>Planning unavailable while a target or actual value is invalid.</p></section>;
  }
  const hasMilestones = FACTIONS.some((faction) => planning.sequences[faction].length > 0);
  if (planning.baseline.complete && !hasMilestones) {
    return <section className="growth-milestones"><h3>Full-supply milestones</h3><p>No population growth steps remain for these targets.</p></section>;
  }

  return <section className="growth-milestones">
    <header>
      <h3>Full-supply milestones</h3>
      <p>Current supply comes first; faction plans progress independently.</p>
    </header>
    {(!planning.baseline.complete || hasMilestones) && <MilestoneDetails
      testId="growth-baseline"
      title="Supply current population"
      summary={planning.baseline.complete ? 'covered' : `${planning.baseline.gaps.length} capacity gaps`}
      gaps={planning.baseline.gaps}
      carriedSubtitle="Required by current population"
      baseline
      open={!planning.baseline.complete}
      state={planning.baseline.complete ? 'complete' : 'current'}
      islands={islands}
      onApplyBuilding={onApplyBuilding}
      onIgnoreDemand={onIgnoreDemand}
    />}
    {hasMilestones && <div className="growth-milestones__branches">
      {FACTIONS.map((faction) => <section
        key={faction}
        className={`growth-sequence growth-sequence--${faction}`}
        data-testid={`growth-sequence-${faction}`}
      >
        <h4>{FACTION_CONFIGS[faction].label}</h4>
        {planning.sequences[faction].map((milestone, index) => <MilestoneDetails
          key={milestone.id}
          testId={`growth-milestone-${milestone.id}`}
          title={milestoneTitle(milestone)}
          summary={milestoneSummary(milestone)}
          gaps={milestone.gaps}
          carriedSubtitle={index === 0
            ? 'Already required by current population'
            : `Still required from the previous ${FACTION_CONFIGS[faction].label} step`}
          open={milestone.current}
          state={milestoneState(milestone)}
          islands={islands}
          onApplyBuilding={onApplyBuilding}
          onIgnoreDemand={onIgnoreDemand}
        />)}
      </section>)}
    </div>}
  </section>;
}
