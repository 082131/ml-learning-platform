// Serverless functions against always-on virtual machines for the same traffic. AWS Lambda prices (x86, US East):
// $0.0000166667 per GB-second of duration and $0.20 per million requests, free tier ignored. The VM price and its
// capacity are inputs. A month is 730 hours, the convention cloud price pages use.

export const LAMBDA_GB_SECOND = 0.0000166667;
export const LAMBDA_PER_MILLION = 0.2;
export const HOURS_PER_MONTH = 730;
export const SECONDS_PER_MONTH = HOURS_PER_MONTH * 3600;

export interface ComputeInput {
  requestsPerMonth: number;
  /** Average run time of one request, ms. */
  durationMs: number;
  /** Memory given to the function, GB. */
  memoryGb: number;
  vmPricePerHour: number;
  /** Requests per second one VM can serve. */
  vmCapacityRps: number;
  /** Busiest hour ÷ average hour. */
  peakFactor: number;
  /** VMs kept running at all times (2 for redundancy across zones). */
  minVms: number;
}

export interface ComputeResult {
  serverless: { duration: number; requests: number; total: number };
  vm: { instances: number; total: number; peakRps: number; utilization: number };
  cheaper: 'serverless' | 'vm';
  /** Requests per month at which both cost the same, holding everything else fixed (null if none in range). */
  breakEven: number | null;
}

export function serverlessCost(x: ComputeInput, requests = x.requestsPerMonth) {
  const duration = requests * (x.durationMs / 1000) * x.memoryGb * LAMBDA_GB_SECOND;
  const req = (requests / 1e6) * LAMBDA_PER_MILLION;
  return { duration, requests: req, total: duration + req };
}

export function vmCost(x: ComputeInput, requests = x.requestsPerMonth) {
  const avgRps = requests / SECONDS_PER_MONTH;
  const peakRps = avgRps * x.peakFactor;
  const instances = Math.max(x.minVms, Math.ceil(peakRps / x.vmCapacityRps));
  return { instances, total: instances * HOURS_PER_MONTH * x.vmPricePerHour, peakRps, utilization: avgRps / (instances * x.vmCapacityRps) };
}

export function compareCompute(x: ComputeInput): ComputeResult {
  const serverless = serverlessCost(x);
  const vm = vmCost(x);
  let breakEven: number | null = null;
  // Serverless cost grows linearly while the VM cost is a step function, so search on a log grid.
  for (let e = 3; e <= 11; e += 0.01) {
    const r = 10 ** e;
    if (serverlessCost(x, r).total >= vmCost(x, r).total) {
      breakEven = Math.round(r);
      break;
    }
  }
  return { serverless, vm, cheaper: serverless.total <= vm.total ? 'serverless' : 'vm', breakEven };
}
