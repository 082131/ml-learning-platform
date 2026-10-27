import type { FlowEdge, FlowNode } from '../viz/flow';
import { formatNumber } from '../trace/values';
import { nodesOf, type TreeNode } from './trees';

export const TREE_NODE_W = 204;
export const TREE_NODE_H = 56;
const GAP_X = 16;
const GAP_Y = 44;

/**
 * Places a tree for FlowDiagram: leaves side by side from left to right, each split centered over
 * its two children, one row per depth. Split nodes read "feature ≤ t"; every node shows its Gini
 * and class counts. The edge to the left child is labeled "yes" (the test is true), the other "no".
 */
export function treeLayout(
  tree: TreeNode,
  features: readonly string[],
  classes: readonly string[],
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const xOf = new Map<string, number>();
  let nextLeaf = 0;
  const place = (n: TreeNode): number => {
    const x = n.split ? (place(n.left!) + place(n.right!)) / 2 : nextLeaf++ * (TREE_NODE_W + GAP_X);
    xOf.set(n.id, x);
    return x;
  };
  place(tree);
  const all = nodesOf(tree);
  const nodes: FlowNode[] = all.map((n) => ({
    id: n.id || 'root',
    label: n.split
      ? `${features[n.split.feature]} ≤ ${formatNumber(n.split.threshold)}`
      : `leaf: ${classes[n.prediction]}`,
    detail: `gini ${formatNumber(Math.round(n.gini * 1000) / 1000)} · [${n.counts.join(', ')}]`,
    x: xOf.get(n.id)!,
    y: n.depth * (TREE_NODE_H + GAP_Y),
    w: TREE_NODE_W,
    h: TREE_NODE_H,
  }));
  const edges: FlowEdge[] = all.flatMap((n) =>
    n.split
      ? [
          {
            from: n.id || 'root',
            to: n.left!.id,
            label: 'yes',
            fromSide: 'bottom' as const,
            toSide: 'top' as const,
          },
          {
            from: n.id || 'root',
            to: n.right!.id,
            label: 'no',
            fromSide: 'bottom' as const,
            toSide: 'top' as const,
          },
        ]
      : [],
  );
  return { nodes, edges };
}
