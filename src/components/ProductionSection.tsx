import { BUILDINGS } from '../calculations/building-data';
import type { ProductionOperatingImpacts } from '../calculations/operating-impact';
import type { Faction } from '../calculations/population';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES, type ProductionNode } from '../calculations/production-data';
import { buildProductionTrees, type ProductionTreeRow } from '../calculations/production-tree';
import { FACTIONS, FACTION_CONFIGS, type CalculatorState, type EditableNumber } from '../model';
import { NumericInput } from './NumericInput';
import { OperatingImpactValues } from './OperatingImpactValues';

type ProductionSectionProps = {
  state: CalculatorState;
  results: Record<string, number | null>;
  operatingImpacts: ProductionOperatingImpacts;
  onProductivityChange: (id: string, value: EditableNumber) => void;
  onFactionProductivityChange: (faction: Faction, delta: number) => void;
  onRecyclingChange: (checked: boolean) => void;
  onWholeBuildingsChange: (checked: boolean) => void;
};

const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));

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
  onProductivityChange,
  onFactionProductivityChange,
}: Pick<
  ProductionSectionProps,
  'state' | 'results' | 'operatingImpacts' | 'onProductivityChange' | 'onFactionProductivityChange'
> & { faction: Faction }) {
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
        {buildProductionTrees(faction).map((tree) => (
          <section className="production-tree" key={tree.rootId}>
            {tree.rows.map((row) => {
              const node = nodeById.get(row.nodeId)!;
              const building = BUILDINGS[node.buildingId];
              const productivity = state.productivity[node.id];
              const result = results[node.id];
              const direct = operatingImpacts.direct[node.id];
              const labelContext = context(node);
              return (
                <div
                  key={node.id}
                  className={`production-node${row.alternativeRoot ? ' production-node--alternate' : ''}`}
                  data-testid={`production-node-${node.id}`}
                >
                  <div className="production-node__identity">
                    <span
                      className="production-node__connector"
                      data-testid="tree-connector"
                      aria-hidden="true"
                    >{connector(row)}</span>
                    <img className="production-node__image" src={`/assets/${building.image}`} alt="" />
                    <span className="production-node__label">{building.label}</span>
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
                    onChange={(raw) => onProductivityChange(node.id, {
                      raw,
                      value: raw.trim() === '' ? null : Number(raw),
                    })}
                  />
                  <div className="production-node__impact">
                    <div data-testid="direct-operating-impact">
                      {direct === null
                        ? <span aria-label={`${building.label} direct operating impact unavailable`}>—</span>
                        : <OperatingImpactValues impact={direct} />}
                    </div>
                    <small>
                      <span>per building </span>
                      <OperatingImpactValues impact={building.operatingImpact} />
                    </small>
                  </div>
                </div>
              );
            })}
            <footer className="production-tree__variants">
              {operatingImpacts.byRoot[tree.rootId].map((variant) => (
                <div key={variant.id} data-testid={`variant-${tree.rootId}-${variant.id}`}>
                  <span>{variant.label}</span>
                  {variant.impact === null
                    ? <span aria-label={`${variant.label} operating impact unavailable`}>—</span>
                    : <OperatingImpactValues impact={variant.impact} />}
                </div>
              ))}
            </footer>
          </section>
        ))}
      </div>
    </section>
  );
}

export function ProductionSection(props: ProductionSectionProps) {
  return (
    <section className="calculator-section production-section">
      <div className="calculator-section__heading">
        <div>
          <img src="/assets/calculations_Qoor.png" alt="" />
          <h2>Production chains</h2>
        </div>
        <p>Every requirement updates as you type</p>
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
          <ProductionFaction key={faction} faction={faction} {...props} />
        ))}
      </div>
    </section>
  );
}
