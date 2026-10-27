import type { ScatterGroup } from '../ScatterPlot/ScatterPlot';

/** Marker shape and tone per species, shared by the trees and clustering visuals. */
export const SPECIES_GROUPS: ScatterGroup[] = [
  { id: 'Adelie', label: 'Adelie', tone: 'accent', shape: 'circle' },
  { id: 'Chinstrap', label: 'Chinstrap', tone: 'err', shape: 'triangle' },
  { id: 'Gentoo', label: 'Gentoo', tone: 'ok', shape: 'square' },
];
