import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { BUILDINGS } from './calculations/building-data';
import { PRODUCTION_NODES } from './calculations/production-data';
import { FACTIONS, FACTION_CONFIGS } from './model';

const archivedDirectory = 'Anno 2070 Deep Ocean Supply & demand calculator_files';
const sharedImages = [
  'Speed_Qoor.png',
  'calculations_Qoor.png',
  'channel_eco_3_Qoor.png',
  'Copper_Qoor.png',
  'copper_converter_Qoor.png',
];

const populationImages = FACTIONS.flatMap((faction) => {
  const config = FACTION_CONFIGS[faction];
  return [
    config.houseImage,
    config.livingSpaceImage,
    config.senateImage,
    ...config.tierImages,
  ].map((path) => path.replace('/assets/', ''));
});

describe('original image assets', () => {
  test('ships a byte-identical archived image for every rendered calculator image', () => {
    const filenames = new Set([
      ...PRODUCTION_NODES.map((node) => BUILDINGS[node.buildingId].image),
      ...populationImages,
      ...sharedImages,
    ]);

    for (const filename of filenames) {
      const archived = readFileSync(join(process.cwd(), archivedDirectory, filename));
      const publicAsset = readFileSync(join(process.cwd(), 'public/assets', filename));
      expect(publicAsset, filename).toEqual(archived);
    }
  });

  test.each(['Balance-icon.png', 'Energy-icon.png', 'Ecobal-icon.png'])(
    'ships the original wiki %s symbol locally',
    (filename) => {
      const image = readFileSync(join(process.cwd(), 'public/assets', filename));
      expect(image.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(image.byteLength).toBeGreaterThan(100);
    },
  );
});
