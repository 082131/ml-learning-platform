// Short names for tracks, shown on the Tracks button while a track is open. A track without an entry shows its id.
// Each track thread adds one line here.
const TRACK_CHIP: Record<string, string> = {
  ml: 'ML',
  data: 'Data',
  ai: 'AI',
  inference: 'Inference',
  python: 'Python',
  dataops: 'DataOps',
  deploy: 'Deploy',
  git: 'Git',
  automation: 'Automation',
};

export const trackChip = (id: string) => TRACK_CHIP[id] ?? id;
