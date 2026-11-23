import { MatrixView, OwnersView, ProtectionView } from './Collab';
import { DiataxisSorter, DocstringView, ReadmeBuilder } from './Docs';
import { GitAreas } from './GitAreas';
import { GitGraph } from './GitGraph';
import { GitObjects } from './GitObjects';
import { GitSandbox } from './GitSandbox';
import { MergeLab } from './Merge';
import { RangeView, SemverView, StorageView } from './Releases';

/** Registers the Git track visualizations for lessons (picked up by src/mdx-components.tsx). */
export default {
  GitSandbox,
  GitGraph,
  GitAreas,
  GitObjects,
  MergeLab,
  ProtectionView,
  OwnersView,
  MatrixView,
  SemverView,
  RangeView,
  StorageView,
  DocstringView,
  DiataxisSorter,
  ReadmeBuilder,
};
