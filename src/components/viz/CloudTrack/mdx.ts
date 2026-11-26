import { CapstoneView, BillView, PlanView } from './Cost';
import { ApiView, ManagedView } from './Managed';
import { ComputeView, GpuFitView, SpotView } from './Compute';
import { AvailabilityView, IamView, NetworkView } from './Foundations';
import { LoadView, TransferView } from './Storage';

/** Registers the Cloud for ML track visualizations for lessons (picked up by src/mdx-components.tsx). */
export default {
  AvailabilityView,
  IamView,
  NetworkView,
  LoadView,
  TransferView,
  ComputeView,
  GpuFitView,
  SpotView,
  ManagedView,
  ApiView,
  BillView,
  PlanView,
  CapstoneView,
};
