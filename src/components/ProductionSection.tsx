import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import { GOODS, producedGood, type GoodId } from '../calculations/goods';
import {
  BALANCE_EPSILON,
  DISPLAY_EPSILON,
  type IslandBalances,
  type TransferNeed,
} from '../calculations/island-balance';
import type { ProductionOperatingImpacts } from '../calculations/operating-impact';
import type { OperatingImpact } from '../calculations/building-data';
import type { Faction } from '../calculations/population';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES, type ProductionNode } from '../calculations/production-data';
import { buildProductionTrees, type ProductionTreeRow } from '../calculations/production-tree';
import type { IslandState } from '../island';
import { FACTIONS, FACTION_CONFIGS, type CalculatorState, type EditableNumber } from '../model';
import { NumericInput } from './NumericInput';
import { OperatingImpactValues } from './OperatingImpactValues';

type ProductionSectionProps = {
  state: CalculatorState;
  results: Record<string, number | null>;
  operatingImpacts: ProductionOperatingImpacts;
  islands: readonly IslandState[];
  empireBalances: IslandBalances;
  needs: readonly TransferNeed[];
  ownedImpact: OperatingImpact | null;
  onProductivityChange: (id: string, value: EditableNumber) => void;
  onFactionProductivityChange: (faction: Faction, delta: number) => void;
  onRecyclingChange: (checked: boolean) => void;
  onWholeBuildingsChange: (checked: boolean) => void;
};

const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

// Owned building counts summed over settled islands, per canonical building.
function ownedByBuilding(islands: readonly IslandState[]): Map<BuildingId, number | null> {
  const totals = new Map<BuildingId, number | null>();
  for (const island of islands) {
    if (!island.settled) continue;
    for (const [buildingId, entry] of Object.entries(island.owned) as [BuildingId, EditableNumber][]) {
      const current = totals.get(buildingId);
      totals.set(buildingId, current === null || entry.value === null ? null : (current ?? 0) + entry.value);
    }
  }
  return totals;
}

// Full-demand requirement per good: canonical rows only, summed across chains.
function demandRequirementByGood(results: Record<string, number | null>): Map<GoodId, number | null> {
  const required = new Map<GoodId, number | null>();
  for (const node of PRODUCTION_NODES) {
    if (producedGood(node.buildingId) !== node.buildingId) continue;
    const goodId = node.buildingId;
    const current = required.get(goodId);
    const result = results[node.id];
    required.set(goodId, current === null || result === null ? null : (current ?? 0) + (result ?? 0));
  }
  return required;
}

function rootNode(node: ProductionNode): ProductionNode {
  let current = node;
  while (current.calculation.kind === 'material') {
    current = nodeById.get(current.calculation.parentId)!;
  }
  return current;
}

function context(node: ProductionNode): string {
  const factionLabel = FACTION_CONFIGS[node.faction].label;
  const duplicates = PRODUCTION_NODES.filter(
    (candidate) => candidate.faction === node.faction && candidate.buildingId === node.buildingId,
  );
  return duplicates.length === 1
    ? factionLabel
    : `${factionLabel}, ${BUILDINGS[rootNode(node).buildingId].label}`;
}

function connector(row: ProductionTreeRow): string {
  if (row.depth === 0) return '';
  const ancestors = row.ancestorContinues
    .map((continues) => continues ? '│   ' : '    ')
    .join('');
  return `${ancestors}${row.isLastSibling ? '└── ' : '├── '}`;
}

function ProductionFaction({
  faction,
  state,
  results,
  operatingImpacts,
  owned,
  demandByGood,
  empireBalances,
  onProductivityChange,
  onFactionProductivityChange,
}: Pick<
  ProductionSectionProps,
  'state' | 'results' | 'operatingImpacts' | 'empireBalances' | 'onProductivityChange' | 'onFactionProductivityChange'
> & {
  faction: Faction;
  owned: Map<BuildingId, number | null>;
  demandByGood: Map<GoodId, number | null>;
}) {
  const factionLabel = FACTION_CONFIGS[faction].label;

  return (
    <section className={`production-faction production-faction--${faction}`}>
      <header className="production-faction__heading">
        <h3>{factionLabel}</h3>
        <div className="productivity-adjustment">
          <button
            type="button"
            aria-label={`Decrease all ${factionLabel} productivity by 1%`}
            onClick={() => onFactionProductivityChange(faction, -1)}
          >−1%</button>
          <button
            type="button"
            aria-label={`Increase all ${factionLabel} productivity by 1%`}
            onClick={() => onFactionProductivityChange(faction, 1)}
          >+1%</button>
        </div>
      </header>

      <div className="production-faction__nodes">
        <div className="production-node production-node--header" aria-hidden="true">
          <span>building · per-building costs</span>
          <span>req</span>
          <span>prod %</span>
          <span>costs · rounded / fractional / owned</span>
        </div>
        {buildProductionTrees(faction).map((tree) => {
          const rootNode = nodeById.get(tree.rootId)!;
          const root = BUILDINGS[rootNode.buildingId];
          // A chain dims when nothing demands it — works for island-driven
          // populations and manual tier caps alike (requirement is exactly 0).
          const inactive = results[tree.rootId] === 0;
          return (
          <section className={`production-tree${inactive ? ' production-tree--inactive' : ''}`} key={tree.rootId}>
            {inactive && <p className="visually-hidden">Unavailable at the selected highest population tier.</p>}
            <ol className="production-tree__rows" aria-label={`${root.label} production tree`}>
            {tree.rows.map((row) => {
              const node = nodeById.get(row.nodeId)!;
              const building = BUILDINGS[node.buildingId];
              const productivity = state.productivity[node.id];
              const result = results[node.id];
              const fractionalImpact = operatingImpacts.direct[node.id];
              const roundedImpact = operatingImpacts.roundedDirect[node.id];
              const labelContext = context(node);
              const relationship = node.calculation.kind === 'primary'
                ? 'Primary product.'
                : `Level ${row.depth + 1} dependency of ${BUILDINGS[nodeById.get(node.calculation.parentId)!.buildingId].label}.${row.alternativeRoot ? ' Alternative source.' : ''}`;

              // Owned counts and capacity render once per good, on its
              // canonical producer's row (owned recyclers count as chips).
              const canonical = producedGood(node.buildingId) === node.buildingId;
              let ownedTotal: number | null = 0;
              let capacity: number | null = 0;
              let buildGap: number | null = null;
              if (canonical) {
                const goodId = node.buildingId as GoodId;
                for (const producer of GOODS.get(goodId)?.producers ?? []) {
                  const count = owned.get(producer.buildingId);
                  if (count === undefined) continue;
                  if (count === null || ownedTotal === null) {
                    ownedTotal = null;
                    continue;
                  }
                  ownedTotal += count;
                }
                // undefined means untouched (0); null is invalid and must survive.
                const empireEntry = empireBalances[goodId];
                capacity = empireEntry === undefined ? 0 : empireEntry.capacity;
                const required = demandByGood.has(goodId) ? demandByGood.get(goodId)! : 0;
                // Full-demand capacity gap. Local shortages live in island
                // balances and transfer needs.
                buildGap = capacity === null || required === null ? null : required - capacity;
              }
              return (
                <li
                  key={node.id}
                  className={`production-node${row.alternativeRoot ? ' production-node--alternate' : ''}`}
                  data-testid={`production-node-${node.id}`}
                >
                  <div className="production-node__identity">
                    <span className="visually-hidden">{relationship}</span>
                    <span
                      className="production-node__connector"
                      data-testid="tree-connector"
                      aria-hidden="true"
                    >{connector(row)}</span>
                    <img className="production-node__image" src={`/assets/${building.image}`} alt="" />
                    <span className="production-node__label">
                      {building.label}
                      <small className="production-node__perbuilding" data-testid="per-building-operating-impact">
                        <span className="visually-hidden">per building </span>
                        <OperatingImpactValues impact={building.operatingImpact} />
                      </small>
                    </span>
                  </div>
                  <output aria-label={`${building.label} required buildings (${labelContext})`}>
                    {result === null ? '—' : formatRequirement(result)}
                  </output>
                  <NumericInput
                    id={`${node.id}-productivity`}
                    label={`${building.label} productivity (${labelContext})`}
                    raw={productivity.raw}
                    valid={productivity.value !== null}
                    inputMode="decimal"
                    disabled={inactive}
                    onChange={(raw) => onProductivityChange(node.id, {
                      raw,
                      value: raw.trim() === '' ? null : Number(raw),
                    })}
                  />
                  <div className="production-node__impact">
                    <div className="production-node__impact-lines">
                      <div className="production-node__impact-line production-node__impact-line--rounded">
                        <span className="visually-hidden">{building.label} rounded required buildings: </span>
                        {roundedImpact === null
                          ? <span>—</span>
                          : <OperatingImpactValues impact={roundedImpact} />}
                      </div>
                      <div
                        className="production-node__impact-line production-node__impact-line--fractional"
                        data-testid="direct-operating-impact"
                      >
                        <span className="visually-hidden">{building.label} fractional requirement: </span>
                        {fractionalImpact === null
                          ? <span>—</span>
                          : <OperatingImpactValues impact={fractionalImpact} />}
                      </div>
                    </div>
                    {canonical && (
                      <div className="production-node__extras" data-testid={`extras-${node.id}`}>
                        <span
                          className="production-node__mini"
                          aria-label={`${building.label} owned across all islands and their capacity`}
                          title="owned buildings → capacity in canonical units"
                        >
                          own {ownedTotal === null ? '—' : ownedTotal}
                          {capacity !== null && ownedTotal !== null && Math.abs(capacity - ownedTotal) > BALANCE_EPSILON
                            ? `→${formatRequirement(capacity)}`
                            : capacity === null ? '→—' : ''}
                        </span>
                        {buildGap === null
                          ? <span className="production-node__mini">build —</span>
                          : buildGap > BALANCE_EPSILON
                            ? (
                              <span
                                className="production-node__mini balance--shortfall"
                                aria-label={`${building.label} capacity still to build for full demand`}
                              >
                                build {formatRequirement(buildGap)}
                              </span>
                            )
                            : (
                              <span
                                className="production-node__mini balance--surplus"
                                aria-label={`${building.label} full demand covered`}
                              >
                                {buildGap < -BALANCE_EPSILON ? `over ${formatRequirement(-buildGap)}` : '✓'}
                              </span>
                            )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            </ol>
            <footer className="production-tree__variants">
              {operatingImpacts.byRoot[tree.rootId].map((variant) => (
                <div key={variant.id} data-testid={`variant-${tree.rootId}-${variant.id}`}>
                  <span className="production-tree__variant-label">
                    <strong>{variant.label} (rounded buildings)</strong>
                    {variant.roundedBuildings?.map(({ nodeId, count }) => (
                      <span key={nodeId}>
                        {BUILDINGS[nodeById.get(nodeId)!.buildingId].label} ×{count}
                      </span>
                    ))}
                  </span>
                  {variant.impact === null
                    ? <span><span className="visually-hidden">{variant.label} operating impact unavailable:</span>—</span>
                    : <OperatingImpactValues impact={variant.impact} />}
                </div>
              ))}
            </footer>
          </section>
          );
        })}
      </div>
    </section>
  );
}

export function ProductionSection(props: ProductionSectionProps) {
  const owned = ownedByBuilding(props.islands);
  const demandByGood = demandRequirementByGood(props.results);
  const islandNames = new Map(props.islands.map((island) => [island.id, island.name]));

  return (
    <section className="calculator-section production-section">
      <div className="calculator-section__heading">
        <div>
          <img src="/assets/calculations_Qoor.png" alt="" />
          <h2>Production chains</h2>
        </div>
        <p>Every requirement updates as you type</p>
        <div className="production-section__owned-impact" data-testid="owned-operating-impact">
          <span>Actual operating impact (owned buildings): </span>
          {props.ownedImpact === null
            ? <span><span className="visually-hidden">unavailable:</span>—</span>
            : <OperatingImpactValues impact={props.ownedImpact} />}
        </div>
      </div>

      <div className="production-options">
        <label>
          <input
            type="checkbox"
            checked={props.state.wholeBuildings}
            onChange={(event) => props.onWholeBuildingsChange(event.target.checked)}
          />
          <span>Round up to whole buildings</span>
        </label>
        <label>
          <img src="/assets/channel_eco_3_Qoor.png" alt="" />
          <input
            type="checkbox"
            checked={props.state.recycling}
            onChange={(event) => props.onRecyclingChange(event.target.checked)}
          />
          <span>Out of the old comes the new: reduce recyclable goods consumption by 15%</span>
        </label>
      </div>

      <div className="production-section__factions">
        {FACTIONS.map((faction) => (
          <ProductionFaction
            key={faction}
            faction={faction}
            owned={owned}
            demandByGood={demandByGood}
            {...props}
          />
        ))}
      </div>

      <section className="transfer-needs" aria-label="Transfer needs">
        <h3>Transfer needs</h3>
        {props.needs.length === 0
          ? <p>No cross-island imbalances.</p>
          : (
            <ul>
              {props.needs.map((need) => {
                const empireShortfall = need.empireNet === null || need.empireNet < -DISPLAY_EPSILON;
                const describe = (entries: readonly { islandId: string; amount: number }[], sign: string) =>
                  entries.map((entry) =>
                    `${islandNames.get(entry.islandId) ?? 'Unknown island'} (${sign}${formatRequirement(entry.amount)})`).join(', ');
                return (
                  <li
                    key={need.goodId}
                    data-testid={`transfer-${need.goodId}`}
                    className={`transfer-need${empireShortfall ? ' transfer-need--empire-shortfall' : ''}`}
                  >
                    <img src={`/assets/${BUILDINGS[need.goodId].image}`} alt="" width="24" height="24" />
                    <span className="transfer-need__label">{BUILDINGS[need.goodId].label}:</span>
                    <span>
                      {need.surpluses.length > 0 ? `surplus ${describe(need.surpluses, '+')}` : 'no surplus anywhere'}
                      {' → '}
                      deficit {describe(need.deficits, '−')}
                    </span>
                    {empireShortfall && (
                      <strong className="transfer-need__net">
                        empire-wide shortfall{need.empireNet === null ? '' : ` (${formatRequirement(need.empireNet)})`}
                      </strong>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
      </section>
    </section>
  );
}
