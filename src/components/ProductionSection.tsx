import type { Faction } from '../calculations/population';
import { formatRequirement } from '../calculations/production';
import { PRODUCTION_NODES, type ProductionNode } from '../calculations/production-data';
import { FACTIONS, FACTION_CONFIGS, type CalculatorState, type EditableNumber } from '../model';
import { NumericInput } from './NumericInput';

type ProductionSectionProps = {
  state: CalculatorState;
  results: Record<string, number | null>;
  onProductivityChange: (id: string, value: EditableNumber) => void;
  onFactionProductivityChange: (faction: Faction, delta: number) => void;
  onRecyclingChange: (checked: boolean) => void;
  onWholeBuildingsChange: (checked: boolean) => void;
};

function rootNode(node: ProductionNode): ProductionNode {
  let current = node;
  while (current.calculation.kind === 'material') {
    const parentId = current.calculation.parentId;
    current = PRODUCTION_NODES.find(({ id }) => id === parentId)!;
  }
  return current;
}

function context(node: ProductionNode): string {
  const factionLabel = FACTION_CONFIGS[node.faction].label;
  const duplicates = PRODUCTION_NODES.filter(
    (candidate) => candidate.faction === node.faction && candidate.label === node.label,
  );
  return duplicates.length === 1
    ? factionLabel
    : `${factionLabel}, ${rootNode(node).label}`;
}

function ProductionFaction({
  faction,
  state,
  results,
  onProductivityChange,
  onFactionProductivityChange,
}: Pick<ProductionSectionProps, 'state' | 'results' | 'onProductivityChange' | 'onFactionProductivityChange'> & {
  faction: Faction;
}) {
  const factionLabel = FACTION_CONFIGS[faction].label;
  const nodes = PRODUCTION_NODES.filter((node) => node.faction === faction);

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
        {nodes.map((node) => {
          const labelContext = context(node);
          const productivity = state.productivity[node.id];
          const result = results[node.id];
          return (
            <div
              key={node.id}
              className={`production-node production-node--depth-${node.depth}${node.alternate ? ' production-node--alternate' : ''}`}
              data-testid={`production-node-${node.id}`}
            >
              <img className="production-node__arrow" src="/assets/Speed_Qoor.png" alt="" />
              <img className="production-node__image" src={`/assets/${node.image}`} alt="" />
              <span className="production-node__label">{node.label}</span>
              <output aria-label={`${node.label} required buildings (${labelContext})`}>
                {result === null ? '—' : formatRequirement(result)}
              </output>
              <NumericInput
                id={`${node.id}-productivity`}
                label={`${node.label} productivity (${labelContext})`}
                raw={productivity.raw}
                valid={productivity.value !== null}
                inputMode="decimal"
                onChange={(raw) => onProductivityChange(node.id, {
                  raw,
                  value: raw.trim() === '' ? null : Number(raw),
                })}
              />
            </div>
          );
        })}
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
