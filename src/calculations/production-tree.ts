import type { Faction } from './population';
import {
  ALTERNATIVE_GROUPS,
  PRODUCTION_NODES,
  type AlternativeGroup,
} from './production-data';

export type ProductionTreeRow = Readonly<{
  nodeId: string;
  depth: number;
  ancestorContinues: readonly boolean[];
  isLastSibling: boolean;
  alternativeRoot: boolean;
}>;

export type ProductionVariant = Readonly<{
  id: string;
  label: string;
  nodeIds: readonly string[];
}>;

export type ProductionTree = Readonly<{
  rootId: string;
  rows: readonly ProductionTreeRow[];
  variants: readonly ProductionVariant[];
}>;

const nodeById = new Map(PRODUCTION_NODES.map((node) => [node.id, node]));
const childrenById = new Map(PRODUCTION_NODES.map((node) => [
  node.id,
  PRODUCTION_NODES.filter((candidate) =>
    candidate.calculation.kind === 'material' && candidate.calculation.parentId === node.id),
]));
const alternativeRoots = new Set(ALTERNATIVE_GROUPS.flatMap((group) =>
  group.options.map((option) => option.rootId)));

function subtreeIds(rootId: string): readonly string[] {
  return [rootId, ...(childrenById.get(rootId) ?? []).flatMap(({ id }) => subtreeIds(id))];
}

function validateAlternativeGroups(): void {
  for (const group of ALTERNATIVE_GROUPS) {
    const root = nodeById.get(group.rootId);
    if (!root || root.calculation.kind !== 'primary') {
      throw new Error(`Alternative group ${group.id} has an invalid primary root`);
    }
    if (group.options.length < 2) {
      throw new Error(`Alternative group ${group.id} needs at least two options`);
    }

    const treeNodes = new Set(subtreeIds(group.rootId));
    const seen = new Set<string>();
    for (const option of group.options) {
      if (!treeNodes.has(option.rootId)) {
        throw new Error(`Alternative option ${option.rootId} is outside ${group.rootId}`);
      }
      for (const nodeId of subtreeIds(option.rootId)) {
        if (seen.has(nodeId)) {
          throw new Error(`Alternative option subtrees overlap at ${nodeId}`);
        }
        seen.add(nodeId);
      }
    }
  }
}

validateAlternativeGroups();

function rowsFor(rootId: string): readonly ProductionTreeRow[] {
  const rows: ProductionTreeRow[] = [];
  const visit = (
    nodeId: string,
    depth: number,
    ancestorContinues: readonly boolean[],
    isLastSibling: boolean,
  ) => {
    rows.push({
      nodeId,
      depth,
      ancestorContinues,
      isLastSibling,
      alternativeRoot: alternativeRoots.has(nodeId),
    });
    const children = childrenById.get(nodeId) ?? [];
    children.forEach((child, index) => visit(
      child.id,
      depth + 1,
      depth === 0 ? [] : [...ancestorContinues, !isLastSibling],
      index === children.length - 1,
    ));
  };
  visit(rootId, 0, [], true);
  return rows;
}

function variantsFor(rootId: string, rows: readonly ProductionTreeRow[]): readonly ProductionVariant[] {
  const groups = ALTERNATIVE_GROUPS.filter((group) => group.rootId === rootId);
  const selections = groups.reduce<readonly (readonly AlternativeGroup['options'][number][])[]>(
    (current, group) => current.flatMap((selection) =>
      group.options.map((option) => [...selection, option])),
    [[]],
  );
  const nodeIds = rows.map((row) => row.nodeId);
  const optionSubtrees = new Map(groups.flatMap((group) => group.options)
    .map((option) => [option.rootId, new Set(subtreeIds(option.rootId))]));

  return selections.map((selection) => {
    const selected = new Set(selection.map((option) => option.rootId));
    const excluded = [...optionSubtrees.entries()]
      .filter(([optionRootId]) => !selected.has(optionRootId))
      .map(([, ids]) => ids);
    return {
      id: selection.length === 0 ? 'full' : selection.map((option) => option.rootId).join('+'),
      label: selection.length === 0
        ? 'Full chain'
        : selection.map((option) => option.label).join(' + '),
      nodeIds: nodeIds.filter((nodeId) => excluded.every((ids) => !ids.has(nodeId))),
    };
  });
}

export function buildProductionTrees(faction: Faction): readonly ProductionTree[] {
  return PRODUCTION_NODES
    .filter((node) => node.faction === faction && node.calculation.kind === 'primary')
    .map((node) => {
      const rows = rowsFor(node.id);
      return { rootId: node.id, rows, variants: variantsFor(node.id, rows) };
    });
}
