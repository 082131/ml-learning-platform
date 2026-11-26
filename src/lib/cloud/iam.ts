// A small model of AWS IAM policy evaluation inside one account: explicit Deny wins, then the organization
// guardrail (an SCP) must allow, then any Allow from an identity or resource policy allows, otherwise the request is
// implicitly denied. Follows "Policy evaluation logic" in the IAM User Guide; conditions are limited to the one
// the lessons use (aws:PrincipalArn), and permissions boundaries and session policies are left out.

export type Effect = 'Allow' | 'Deny';
export type PolicySource = 'identity' | 'resource' | 'guardrail';

export interface Statement {
  sid: string;
  effect: Effect;
  actions: string[];
  resources: string[];
  /** Resource policies name who they apply to ("*" = anyone). Identity policies apply to their own principal. */
  principals?: string[];
  /** Condition ArnNotEquals aws:PrincipalArn: the statement does not apply to this principal. */
  unlessPrincipal?: string;
}

export interface Policy {
  name: string;
  source: PolicySource;
  /** For identity policies: the principal (role ARN) the policy is attached to. */
  attachedTo?: string;
  statements: Statement[];
}

export interface Request {
  principal: string;
  action: string;
  resource: string;
}

export interface StatementHit {
  policy: string;
  source: PolicySource;
  sid: string;
  effect: Effect;
}

export type Decision = 'allow' | 'explicit-deny' | 'implicit-deny' | 'guardrail-deny';

export interface Evaluation {
  decision: Decision;
  allowed: boolean;
  /** Every statement that matched the request, in policy order. */
  hits: StatementHit[];
  /** The evaluation steps in order, each with what it found. */
  steps: { step: string; result: string }[];
}

/** IAM-style wildcard match: `*` is any run of characters, `?` exactly one. */
export function wildcard(pattern: string, value: string, ignoreCase = false): boolean {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${esc}$`, ignoreCase ? 'i' : '').test(value);
}

function applies(p: Policy, st: Statement, r: Request): boolean {
  if (p.source === 'identity' && p.attachedTo !== r.principal) return false;
  if (p.source === 'resource' && !(st.principals ?? []).some((x) => wildcard(x, r.principal))) return false;
  if (st.unlessPrincipal && st.unlessPrincipal === r.principal) return false;
  // Action names are case-insensitive in IAM; resource ARNs are case-sensitive.
  return st.actions.some((a) => wildcard(a, r.action, true)) && st.resources.some((x) => wildcard(x, r.resource));
}

export function evaluate(policies: Policy[], r: Request): Evaluation {
  const hits: StatementHit[] = [];
  for (const p of policies)
    for (const st of p.statements)
      if (applies(p, st, r)) hits.push({ policy: p.name, source: p.source, sid: st.sid, effect: st.effect });
  const steps: Evaluation['steps'] = [];
  const denies = hits.filter((h) => h.effect === 'Deny');
  steps.push({ step: '1. Any explicit Deny?', result: denies.length ? `yes: ${denies.map((d) => d.sid).join(', ')}` : 'no' });
  if (denies.length) return { decision: 'explicit-deny', allowed: false, hits, steps };
  const guardrails = policies.filter((p) => p.source === 'guardrail');
  if (guardrails.length) {
    const ok = hits.some((h) => h.source === 'guardrail' && h.effect === 'Allow');
    steps.push({ step: '2. Does the organization guardrail allow it?', result: ok ? 'yes' : 'no: outside what the account may ever do' });
    if (!ok) return { decision: 'guardrail-deny', allowed: false, hits, steps };
  } else steps.push({ step: '2. Does the organization guardrail allow it?', result: 'no guardrail set' });
  const allows = hits.filter((h) => h.effect === 'Allow' && h.source !== 'guardrail');
  steps.push({ step: '3. Any Allow in an identity or resource policy?', result: allows.length ? `yes: ${allows.map((a) => a.sid).join(', ')}` : 'no' });
  if (allows.length) return { decision: 'allow', allowed: true, hits, steps };
  steps.push({ step: '4. Nothing allowed it', result: 'implicit deny (the default)' });
  return { decision: 'implicit-deny', allowed: false, hits, steps };
}

/** The policy as AWS JSON, for the code view. Keys follow the IAM policy grammar. */
export function policyJson(p: Policy): string {
  const one = (xs: string[]) => (xs.length === 1 ? xs[0] : xs);
  const statements = p.statements.map((st) => ({
    Sid: st.sid,
    Effect: st.effect,
    ...(p.source === 'resource' ? { Principal: st.principals?.includes('*') ? '*' : { AWS: one(st.principals ?? []) } } : {}),
    Action: one(st.actions),
    Resource: one(st.resources),
    ...(st.unlessPrincipal ? { Condition: { ArnNotEquals: { 'aws:PrincipalArn': st.unlessPrincipal } } } : {}),
  }));
  return JSON.stringify({ Version: '2012-10-17', Statement: statements }, null, 2);
}
