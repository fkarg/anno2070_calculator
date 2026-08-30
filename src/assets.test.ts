import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import { BUILDINGS, ISLAND_REQUIREMENTS } from './calculations/building-data';
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

  test('ships a local PNG for every wiki-sourced building and deposit icon', () => {
    const wikiImages = new Set([
      ...Object.values(BUILDINGS)
        .filter((building) => building.category !== 'production')
        .map((building) => building.image),
      ...ISLAND_REQUIREMENTS
        .filter((requirement) => !requirement.image.endsWith('_Qoor.png'))
        .map((requirement) => requirement.image),
    ]);
    expect(wikiImages.size).toBeGreaterThanOrEqual(32);
    for (const filename of wikiImages) {
      const image = readFileSync(join(process.cwd(), 'public/assets', filename));
      expect(image.subarray(0, 8), filename).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(image.byteLength, filename).toBeGreaterThan(100);
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

  test('pins the researched icon files and their CSS mappings', () => {
    const expectedHashes = {
      'Balance-icon.png': '6702689cd92be488b4726aff64cfb4339b9453e1d70a046b7bc23d38d983621d',
      'Energy-icon.png': 'b48ee1b535c96a0315609a5d02ccbb224717b9b3477d5e30a47db8060a335d8a',
      'Ecobal-icon.png': 'ec0b13bff97cbeb187694f7b9de6c42cc2fc063e17ac07bcf2e01a32638cc95f',
    };
    const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');

    for (const [filename, expectedHash] of Object.entries(expectedHashes)) {
      const image = readFileSync(join(process.cwd(), 'public/assets', filename));
      expect(createHash('sha256').update(image).digest('hex'), filename).toBe(expectedHash);
      expect(css).toContain(`url("/assets/${filename}")`);
    }
  });
});
