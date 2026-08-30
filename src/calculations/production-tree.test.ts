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

  test('pins the selected option roots in every alternative combination', () => {
    const trees = (['eco', 'tycoon', 'tech'] as const)
      .flatMap(buildProductionTrees);
    const optionRoots = [
      'ecoMicrochipsCommunicators', 'ecoElectronicsRecyclerCommunicators',
      'ecoMicrochipsServiceBots', 'ecoElectronicsRecyclerServiceBots',
      'tycoonCrudeOil', 'tycoonOilDriller', 'tycoonGoldNuggets',
      'tycoonGoldConverter', 'tycoonCoal', 'tycoonRotaryExcavator',
      'techMicrochips', 'techElectronicsRecycler', 'techIronOre',
      'techIronConverter', 'techCoal', 'techRotaryExcavator',
    ];
    const selected = (rootId: string) => trees.find((tree) => tree.rootId === rootId)!.variants
      .map((variant) => optionRoots.filter((optionRoot) => variant.nodeIds.includes(optionRoot)));

    expect(selected('ecoCommunicators')).toEqual([
      ['ecoMicrochipsCommunicators'],
      ['ecoElectronicsRecyclerCommunicators'],
    ]);
    expect(selected('ecoServiceBots')).toEqual([
      ['ecoMicrochipsServiceBots'],
      ['ecoElectronicsRecyclerServiceBots'],
    ]);
    expect(selected('tycoonPlastics')).toEqual([['tycoonCrudeOil'], ['tycoonOilDriller']]);
    expect(selected('tycoonJewelry')).toEqual([
      ['tycoonGoldNuggets', 'tycoonCoal'],
      ['tycoonGoldNuggets', 'tycoonRotaryExcavator'],
      ['tycoonGoldConverter', 'tycoonCoal'],
      ['tycoonGoldConverter', 'tycoonRotaryExcavator'],
    ]);
    expect(selected('techNeuroimplants')).toEqual([
      ['techMicrochips'],
      ['techElectronicsRecycler'],
    ]);
    expect(selected('techLaboratoryInstruments')).toEqual([
      ['techIronOre', 'techCoal'],
      ['techIronOre', 'techRotaryExcavator'],
      ['techIronConverter', 'techCoal'],
      ['techIronConverter', 'techRotaryExcavator'],
    ]);
  });

  test('covers every production occurrence exactly once in source order', () => {
    for (const faction of ['eco', 'tycoon', 'tech'] as const) {
      const expected = PRODUCTION_NODES.filter((node) => node.faction === faction).map(({ id }) => id);
      const actual = buildProductionTrees(faction).flatMap((tree) => tree.rows.map(({ nodeId }) => nodeId));
      expect(actual).toEqual(expected);
    }
  });
});
