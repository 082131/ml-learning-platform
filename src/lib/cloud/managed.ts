// A managed training job (SageMaker training job, Vertex AI custom job) against a VM you run yourself, phase by
// phase. SageMaker bills from TrainingStartTime to TrainingEndTime: data download, training and model upload, but
// not instance provisioning (DescribeTrainingJob docs). A self-managed VM bills from boot until someone stops it.
// Phase lengths come from the visible inputs; the provisioning and setup times are typical values, not measurements.

export type InputMode = 'File' | 'FastFile';

export interface ManagedInput {
  datasetGb: number;
  /** File copies the whole dataset to the instance before training; FastFile streams it from S3 on demand. */
  inputMode: InputMode;
  /** Download rate from S3 to the instance, MB/s. */
  downloadMbps: number;
  trainHours: number;
  modelGb: number;
  pricePerHour: number;
  instances: number;
  /** Hours a self-managed VM keeps running after training before anyone stops it. */
  forgottenHours: number;
  /** Minutes to set up a self-managed VM by hand (drivers, environment, copying code). */
  setupMin: number;
}

export interface Phase {
  name: string;
  minutes: number;
  billed: boolean;
}

export interface Side {
  phases: Phase[];
  billedHours: number;
  cost: number;
}

export interface ManagedResult {
  managed: Side;
  vm: Side;
}

/** Typical minutes for SageMaker to provision instances and pull the training image (not billed). */
export const PROVISION_MIN = 4;

const mins = (gb: number, mbps: number) => (gb * 1000) / mbps / 60;
const billedHours = (ps: Phase[]) => ps.filter((p) => p.billed).reduce((a, p) => a + p.minutes, 0) / 60;

export function managedVsVm(x: ManagedInput): ManagedResult {
  const download = x.inputMode === 'File' ? mins(x.datasetGb, x.downloadMbps) : 0;
  const upload = mins(x.modelGb, x.downloadMbps);
  const train = x.trainHours * 60;
  const managed: Phase[] = [
    { name: 'Starting (provision, pull image)', minutes: PROVISION_MIN, billed: false },
    { name: x.inputMode === 'File' ? 'Downloading dataset' : 'Mounting dataset (streams during training)', minutes: download, billed: true },
    { name: 'Training', minutes: train, billed: true },
    { name: 'Uploading model.tar.gz', minutes: upload, billed: true },
  ];
  const vm: Phase[] = [
    { name: 'Setup by hand', minutes: x.setupMin, billed: true },
    { name: 'Copying dataset', minutes: mins(x.datasetGb, x.downloadMbps), billed: true },
    { name: 'Training', minutes: train, billed: true },
    { name: 'Uploading model', minutes: upload, billed: true },
    { name: 'Idle until someone stops it', minutes: x.forgottenHours * 60, billed: true },
  ];
  const mh = billedHours(managed) * x.instances;
  const vh = billedHours(vm) * x.instances;
  return {
    managed: { phases: managed, billedHours: mh, cost: mh * x.pricePerHour },
    vm: { phases: vm, billedHours: vh, cost: vh * x.pricePerHour },
  };
}
