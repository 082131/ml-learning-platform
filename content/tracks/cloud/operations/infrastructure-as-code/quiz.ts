import type { Exercise, QuizQuestion } from '@/lib/types';

export const questions: QuizQuestion[] = [
  {
    id: 'ami',
    type: 'choice',
    prompt: 'You change one line, the notebook instance’s ami, to pick up a newer machine image. The plan says “Plan: 1 to add, 0 to change, 1 to destroy.” What will apply do to the notebook?',
    options: [
      { text: 'Destroy it and create a new instance, so anything on its local disk is gone', correct: true, explain: 'An instance cannot switch image in place, so the argument forces replacement (-/+). Data that matters belongs in a bucket or a separate volume.' },
      { text: 'Stop it, swap the image and start it again, keeping the disk', correct: false, explain: 'That is what an in-place update of instance_type looks like (~). A new ami is a new instance.' },
      { text: 'Nothing yet: the “1 to add” is a temporary copy that apply removes again', correct: false, explain: 'The add and the destroy are one replacement. After apply, the old instance no longer exists.' },
    ],
  },
  {
    id: 'drift',
    type: 'choice',
    prompt: 'During an incident, someone suspends versioning on the data bucket in the console. A week later a colleague runs terraform apply for an unrelated change. What happens to versioning?',
    options: [
      { text: 'Terraform sees the difference when it refreshes and turns versioning back on, as the code says', correct: true, explain: 'The code is the source of truth. Drift is undone at the next apply, which is good if the console change was a mistake and a surprise if it was a fix.' },
      { text: 'It stays suspended, because Terraform only touches the resources in the change being applied', correct: false, explain: 'Every plan compares all resources in the configuration with reality, not only the edited ones.' },
      { text: 'The apply fails until someone resolves the conflict by hand', correct: false, explain: 'Drift is not an error. Terraform simply plans to make reality match the code again.' },
    ],
  },
  {
    id: 'remove-block',
    type: 'choice',
    prompt: 'A teammate deletes the resource block for an old training bucket from the code, intending that “Terraform stops managing it” while the data stays. What does the next plan show?',
    options: [
      { text: 'A destroy for the bucket: a resource in state but not in the code is planned for deletion', correct: true, explain: 'To stop managing without destroying, use a removed block with destroy = false (or terraform state rm). Deleting the block means deleting the resource.' },
      { text: 'No changes: removing code never removes real resources', correct: false, explain: 'Terraform makes reality match the code. A resource that disappears from the code disappears from reality.' },
      { text: 'A warning that the bucket is now unmanaged, with no action', correct: false, explain: 'There is no such warning. The plan lists the bucket with a minus sign.' },
    ],
  },
  {
    id: 'count',
    type: 'numeric',
    prompt: 'In the lesson’s configuration, the versioning resource refers to aws_s3_bucket.data.id. In one change you rename the bucket (its bucket argument) and change the notebook’s instance_type. With no prevent_destroy, how many resources does the plan destroy?',
    answer: 2,
    tolerance: 0,
    hint: 'A new bucket name forces replacement. What happens to a resource whose bucket argument points at the replaced bucket?',
    explain: 'The bucket is replaced, and the versioning resource’s bucket argument (which also forces replacement) becomes “known after apply”, so it is replaced too. The instance type is an in-place update. Plan: 2 to add, 1 to change, 2 to destroy.',
  },
  {
    id: 'state-backend',
    type: 'choice',
    prompt: 'Two engineers keep terraform.tfstate on their own laptops and both run apply on the same project. Which problem does a shared backend with locking solve?',
    options: [
      { text: 'Each laptop’s state is a different record of what exists, so applies duplicate, overwrite or delete each other’s resources', correct: true, explain: 'One shared state is one record, and the lock makes plans and applies take turns. The state can also contain secrets, so the bucket needs tight access and versioning.' },
      { text: 'Local state makes plans slow, because Terraform must download the provider each time', correct: false, explain: 'Provider downloads are cached by init. The problem is two conflicting records of reality.' },
      { text: 'Local state cannot store more than a few hundred resources', correct: false, explain: 'Size is not the issue. Consistency between people is.' },
    ],
  },
  {
    id: 'rename-label',
    type: 'choice',
    prompt: 'You want to rename the block aws_s3_bucket.data to aws_s3_bucket.training_data for clarity, without touching the real bucket. The bucket has prevent_destroy. What happens if you only edit the label, and what is the right way?',
    options: [
      { text: 'The plan tries to destroy .data and create .training_data, and prevent_destroy stops it; add a moved block from the old address to the new one', correct: true, explain: 'Terraform tracks resources by address. A moved block tells it the two addresses are the same resource, so the plan shows no destroy at all.' },
      { text: 'Nothing: Terraform matches resources by the bucket name, so the label does not matter', correct: false, explain: 'State maps addresses (type.label) to real IDs. A new label looks like a new resource.' },
      { text: 'The plan renames the real bucket to training_data', correct: false, explain: 'The label is only a name in the code. The real bucket’s name is its bucket argument, which did not change.' },
    ],
  },
];

export const planExercise: Exercise = {
  id: 'cloud-plan-actions',
  prompt:
    'Write `plan_actions(config, state, forces_new)`: config and state map addresses like "aws_instance.notebook" to dicts of arguments; forces_new maps a resource type (the part before the dot) to a set of argument names. Return a dict from address to "create", "update", "replace" or "delete", leaving out resources with no changes. Then write `summary(actions)` returning Terraform’s line, such as "Plan: 1 to add, 0 to change, 1 to destroy.", or "No changes. Your infrastructure matches the configuration." when there are none.',
  starter: `def plan_actions(config, state, forces_new):
    return {}

def summary(actions):
    return ""`,
  hints: [
    'Loop over config.keys() | state.keys(). Missing from state → create; missing from config → delete; otherwise compare the arguments.',
    'A replace counts once as an add and once as a destroy.',
  ],
  solution: `def plan_actions(config, state, forces_new):
    actions = {}
    for addr in config.keys() | state.keys():
        want, have = config.get(addr), state.get(addr)
        if have is None:
            actions[addr] = "create"
        elif want is None:
            actions[addr] = "delete"
        else:
            changed = {k for k, v in want.items() if have.get(k) != v}
            if changed:
                forced = changed & forces_new.get(addr.split(".")[0], set())
                actions[addr] = "replace" if forced else "update"
    return actions

def summary(actions):
    if not actions:
        return "No changes. Your infrastructure matches the configuration."
    a = list(actions.values())
    add = a.count("create") + a.count("replace")
    destroy = a.count("delete") + a.count("replace")
    return f"Plan: {add} to add, {a.count('update')} to change, {destroy} to destroy."`,
  explanation:
    'Every plan is this difference: what the code wants minus what the state records, with one twist from the provider (arguments that force replacement). Reading a plan well means asking, for each line, which of the four actions it is and why.',
  tests: `F = {"aws_s3_bucket": {"bucket"}, "aws_instance": {"ami"}}
S = {"aws_s3_bucket.data": {"bucket": "acme-ml-data"},
     "aws_instance.notebook": {"ami": "ami-1", "instance_type": "g5.xlarge"}}
assert plan_actions(S, {}, F) == {"aws_s3_bucket.data": "create", "aws_instance.notebook": "create"}
assert plan_actions(S, S, F) == {}
assert plan_actions({**S, "aws_instance.notebook": {"ami": "ami-1", "instance_type": "g6.xlarge"}}, S, F) == {"aws_instance.notebook": "update"}
assert plan_actions({**S, "aws_instance.notebook": {"ami": "ami-2", "instance_type": "g5.xlarge"}}, S, F) == {"aws_instance.notebook": "replace"}
assert plan_actions({"aws_s3_bucket.data": {"bucket": "acme-ml-data"}}, S, F) == {"aws_instance.notebook": "delete"}
assert summary({"a": "create", "b": "replace", "c": "update", "d": "delete"}) == "Plan: 2 to add, 1 to change, 2 to destroy."
assert summary({}) == "No changes. Your infrastructure matches the configuration."`,
};
