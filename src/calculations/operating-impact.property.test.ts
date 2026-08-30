import { fc, test } from '@fast-check/vitest';
import { expect } from 'vitest';

import { BUILDINGS } from './building-data';
import { PRODUCTION_NODES } from './production-data';
import { buildProductionTrees } from './production-tree';
import {
  addOperatingImpacts,
  calculateOperatingImpacts,
  scaleOperatingImpact,
  ZERO_OPERATING_IMPACT,
} from './operating-impact';

const counts = fc.array(fc.integer({ min: 0, max: 10_000 }), {
  minLength: PRODUCTION_NODES.length,
  maxLength: PRODUCTION_NODES.length,
}).map((values) => Object.fromEntries(
  PRODUCTION_NODES.map((node, index) => [node.id, values[index]]),
));

test.prop({ count: fc.integer({ min: 0, max: 10_000 }) })(
  'direct impacts scale linearly',
  ({ count }) => {
    const base = BUILDINGS.chipFactory.operatingImpact;
    expect(scaleOperatingImpact(base, count * 2)).toEqual(
      scaleOperatingImpact(scaleOperatingImpact(base, count), 2),
    );
  },
);

test.prop({ counts })(
  'each variant equals the sum of exactly its occurrence node IDs',
  ({ counts: generatedCounts }) => {
    const result = calculateOperatingImpacts(generatedCounts);
    for (const faction of ['eco', 'tycoon', 'tech'] as const) {
      for (const tree of buildProductionTrees(faction)) {
        for (const variant of tree.variants) {
          const expected = variant.nodeIds.reduce((total, nodeId) => {
            const node = PRODUCTION_NODES.find(({ id }) => id === nodeId)!;
            return addOperatingImpacts(
              total,
              scaleOperatingImpact(BUILDINGS[node.buildingId].operatingImpact, generatedCounts[nodeId]),
            );
          }, ZERO_OPERATING_IMPACT);
          expect(result.byRoot[tree.rootId].find(({ id }) => id === variant.id)?.impact)
            .toEqual(expected);
        }
      }
    }
  },
);
