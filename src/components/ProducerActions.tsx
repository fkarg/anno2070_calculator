import { BUILDINGS, type BuildingId } from '../calculations/building-data';
import { GOODS, type GoodId } from '../calculations/goods';
import { formatRequirement } from '../calculations/production';
import { canBuildOn, islandProductivity, type IslandState } from '../island';
import { OperatingImpactValues } from './OperatingImpactValues';

type Props = {
  goodId: GoodId;
  islands: readonly IslandState[];
  variant: 'compact' | 'detailed';
  onApplyBuilding: (islandId: string, buildingId: BuildingId) => void;
};

export function ProducerActions({ goodId, islands, variant, onApplyBuilding }: Props) {
  return <div className={`producer-actions producer-actions--${variant}`}>
    {GOODS.get(goodId)!.producers.flatMap((producer) => islands
      .filter((island) => island.settled && canBuildOn(island, producer.buildingId))
      .flatMap((island) => {
        const productivity = islandProductivity(island, producer.buildingId);
        if (productivity === null) return [];
        const building = BUILDINGS[producer.buildingId];
        const contribution = producer.rate * productivity / 100;
        return [<button
          key={`${producer.buildingId}-${island.id}`}
          type="button"
          className={`producer-action producer-action--${variant}`}
          aria-label={`Build one ${building.label} on ${island.name}`}
          onClick={() => onApplyBuilding(island.id, producer.buildingId)}
        >
          <img
            src={`/assets/${building.image}`}
            alt=""
            width={variant === 'detailed' ? 28 : 20}
            height={variant === 'detailed' ? 28 : 20}
          />
          <span>+1 {building.label} · {island.name}</span>
          <small>+{formatRequirement(contribution)} nominal output</small>
          {variant === 'detailed' && <OperatingImpactValues
            impact={building.operatingImpact}
            ecoUnavailable={island.underwater}
          />}
        </button>];
      }))}
  </div>;
}
