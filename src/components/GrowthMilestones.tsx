import type { BuildingId } from '../calculations/building-data';
import type { IgnoredDemandSource } from '../calculations/demand-policy';
import {
  growthGapIntroducedAmount,
  growthGapIntroducedHere,
  type GrowthGap,
  type GrowthMilestone,
  type GrowthPlanningResult,
} from '../calculations/planning';
import { formatRequirement } from '../calculations/production';
import { sumIslandPopulations, type IslandState } from '../island';
import { FACTIONS, FACTION_CONFIGS } from '../model';
import { GrowthGapCard } from './GrowthGapCard';
import {
  growthMilestonePopulationSummary,
  growthMilestoneTitle,
} from './growth-milestone-labels';
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
  const changed = props.gaps.filter(growthGapIntroducedHere);
  const carried = props.gaps.filter((gap) => !growthGapIntroducedHere(gap));
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
              `New demand sources add +${formatRequirement(growthGapIntroducedAmount(gap))} required capacity`,
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

function milestoneSummary(milestone: GrowthMilestone): string {
  const changed = milestone.gaps.filter(growthGapIntroducedHere).length;
  const carried = milestone.gaps.length - changed;
  const coverage = milestone.complete
    ? 'covered'
    : `${milestone.gaps.length} gaps · ${changed} changed here · ${carried} carried`;
  return `${growthMilestonePopulationSummary(milestone)} · ${coverage}`;
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
  const actualPopulations = sumIslandPopulations(islands);
  const baselineFactions = FACTIONS.flatMap((faction) => {
    const population = actualPopulations[faction];
    if (population === null) return [];
    const tier = population.reduce((highest, value, index) => value > 0 ? index + 1 : highest, 0);
    if (tier === 0) return [];
    return [{
      faction,
      tier,
      gaps: planning.baseline.gaps.filter((gap) => gap.chains.some(
        (chain) => chain.faction === faction,
      )),
    }];
  });
  if (planning.baseline.complete && !hasMilestones) {
    return <section className="growth-milestones"><h3>Full-supply milestones</h3><p>No population growth steps remain for these targets.</p></section>;
  }

  return <section className="growth-milestones">
    <header>
      <h3>Full-supply milestones</h3>
      <p>Current supply comes first; faction plans progress independently.</p>
    </header>
    {baselineFactions.map(({ faction, tier, gaps }) => <MilestoneDetails
      key={faction}
      testId={`growth-baseline-${faction}`}
      title={`Complete current ${FACTION_CONFIGS[faction].label} ${FACTION_CONFIGS[faction].tierLabels[tier - 1]}`}
      summary={gaps.length === 0 ? 'covered' : `${gaps.length} capacity gaps`}
      gaps={gaps}
      carriedSubtitle={`Required by current ${FACTION_CONFIGS[faction].label} population`}
      baseline
      open={gaps.length > 0}
      state={gaps.length === 0 ? 'complete' : 'current'}
      islands={islands}
      onApplyBuilding={onApplyBuilding}
      onIgnoreDemand={onIgnoreDemand}
    />)}
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
          title={growthMilestoneTitle(milestone)}
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
