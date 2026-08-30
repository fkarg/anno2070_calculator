import { describe, expect, test } from 'vitest';

import { PRODUCTION_NODES } from './production-data';
import { buildProductionTrees } from './production-tree';

describe('buildProductionTrees', () => {
  test('derives connector ancestry and sibling endings from calculation parents', () => {
    const communicators = buildProductionTrees('eco')
      .find(({ rootId }) => rootId === 'ecoCommunicators')!;

    expect(communicators.rows.map(({
      nodeId,
      depth,
      ancestorContinues,
      isLastSibling,
    }) => ({ nodeId, depth, ancestorContinues, isLastSibling }))).toEqual([
      { nodeId: 'ecoCommunicators', depth: 0, ancestorContinues: [], isLastSibling: true },
      { nodeId: 'ecoMicrochipsCommunicators', depth: 1, ancestorContinues: [], isLastSibling: false },
      { nodeId: 'ecoCopperCommunicators', depth: 2, ancestorContinues: [true], isLastSibling: false },
      { nodeId: 'ecoSandCommunicators', depth: 2, ancestorContinues: [true], isLastSibling: true },
      { nodeId: 'ecoElectronicsRecyclerCommunicators', depth: 1, ancestorContinues: [], isLastSibling: true },
    ]);
  });

  test('keeps every option visible while variants select one chip source', () => {
    const serviceBots = buildProductionTrees('eco')
      .find(({ rootId }) => rootId === 'ecoServiceBots')!;
    const visible = serviceBots.rows.map(({ nodeId }) => nodeId);

    expect(visible).toContain('ecoMicrochipsServiceBots');
    expect(visible).toContain('ecoElectronicsRecyclerServiceBots');
    expect(serviceBots.variants).toHaveLength(2);
    for (const variant of serviceBots.variants) {
      expect(variant.nodeIds).toEqual(expect.arrayContaining([
        'ecoServiceBots',
        'ecoBiopolymers',
        'ecoAlgae',
        'ecoCorn',
      ]));
      expect([
        variant.nodeIds.includes('ecoMicrochipsServiceBots'),
        variant.nodeIds.includes('ecoElectronicsRecyclerServiceBots'),
      ].filter(Boolean)).toHaveLength(1);
    }
  });

  test.each([
    ['tycoon', 'tycoonJewelry'],
    ['tech', 'techLaboratoryInstruments'],
  ] as const)('%s %s produces four independent source combinations', (faction, rootId) => {
    const tree = buildProductionTrees(faction).find((candidate) => candidate.rootId === rootId)!;

    expect(tree.variants).toHaveLength(4);
    expect(new Set(tree.variants.map(({ id }) => id).values()).size).toBe(4);
  });

  test('covers every production occurrence exactly once in source order', () => {
    for (const faction of ['eco', 'tycoon', 'tech'] as const) {
      const expected = PRODUCTION_NODES.filter((node) => node.faction === faction).map(({ id }) => id);
      const actual = buildProductionTrees(faction).flatMap((tree) => tree.rows.map(({ nodeId }) => nodeId));
      expect(actual).toEqual(expected);
    }
  });
});
