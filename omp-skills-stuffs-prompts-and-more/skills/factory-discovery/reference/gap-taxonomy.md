# discovery gap taxonomy

this file is the authoritative contract for discovery's product gaps. the ids in this file are stable lowercase question ids. do not create aliases or substitute a synonym.

## status rules

apply the tests in this order for each gap:

1. mark `known` only when the user's words or a supplied file states the answer directly. an inference is not known.
2. when `known` is false, mark `must-ask` when its test below is true. a conflict, a material product choice, or an unsafe default is must-ask.
3. when neither `known` nor `must-ask` applies, mark `assumable` and copy that row's exact default sentence verbatim into the brief's `assumed` section.

an assumable default must be narrow, reversible, and consistent with the evidence already read. do not spend a question on an assumable gap. do not record a default sentence for a known or must-ask gap.

## product gaps

### `primary_user`

- known test: the user names one specific actor, context, and job for the product.
- assumable test: exactly one plausible actor and job remain after reading the idea and supplied files, with no competing audience.
- must-ask test: two or more plausible actors remain, the actor label is vague, or choosing among actors changes the job or outcome.
- exact default sentence: "the primary user is the only specific actor named by the user."

### `buyer_versus_user`

- known test: the user states who pays or approves access and whether that party is the same as the user, including any different incentive.
- assumable test: no payer, purchaser, approver, procurement path, or commercial audience is named, and the idea is a personal or free product.
- must-ask test: a payer, purchaser, approver, or sponsoring organisation differs from the user, or that party's incentive could change the product.
- exact default sentence: "the primary user is also the buyer, and no separate buyer requirements apply."

### `core_loop`

- known test: the user states a repeatable trigger-to-action-to-outcome sequence, including where the loop starts and ends.
- assumable test: one repeated sequence is directly implied by the thesis and no feature or audience creates a competing sequence.
- must-ask test: the idea is only a feature list, has no repeated action, or leaves two or more materially different loops plausible.
- exact default sentence: "the core loop is the shortest repeated action from the named trigger to the named outcome."

### `success_signal`

- known test: the user names an observable event or measurement and its pass condition for knowing the product worked.
- assumable test: the named outcome is observable and has one direct signal whose threshold does not change the product.
- must-ask test: the outcome is vague or unobservable, several competing signals exist, or the threshold changes scope, safety, or product choice.
- exact default sentence: "success is recorded when the primary user completes the core loop and observes its named outcome."

### `scope_floor`

- known test: the user explicitly names the smallest shippable end-to-end capability and its required exclusions.
- assumable test: one core loop can run as one bounded end-to-end path without an unspecified role, integration, or capability.
- must-ask test: the minimum needs multiple capabilities or integrations, or the start and end of the smallest shippable product are unclear.
- exact default sentence: "the scope floor is one end-to-end core loop for the primary user on the chosen interaction surface."

### `scope_ceiling`

- known test: the user states explicit non-goals or a boundary that limits adjacent capabilities, audiences, or surfaces.
- assumable test: no adjacent capability is needed to complete the core loop and the idea makes no unbounded promise.
- must-ask test: the idea implies an open-ended feature set, audience, or surface, or the non-goal boundary changes the product's identity.
- exact default sentence: "the scope ceiling excludes every capability that is not required to complete the core loop."

### `data_ownership`

- known test: the user identifies the owner, storage location, lifetime, and exposure for every data class the product handles.
- assumable test: the product handles no durable, shared, sensitive, or third-party data and only uses session input and output owned by the user.
- must-ask test: any durable, shared, sensitive, or third-party data is involved and its owner, location, lifetime, or exposure is unstated or disputed.
- exact default sentence: "the user owns the input and output, and the product stores neither beyond the active session."

### `trust_boundary`

- known test: the user names each untrusted input, external system, or other-user data boundary and the expected validation and failure handling.
- assumable test: all input is local and user-controlled, with no external system, account, or other user's data crossing into the product.
- must-ask test: an untrusted input, external system, account, or other user's data crosses the boundary and its validation, permission, or failure behavior is unclear.
- exact default sentence: "the product accepts only validated input from the primary user and has no external trust boundary."

### `interaction_surface`

- known test: the user explicitly names one interaction surface and the trigger and core loop fit it.
- assumable test: one surface is implied by the trigger and core loop, with no competing runtime, platform, or access constraint.
- must-ask test: cli, tui, desktop, web, or service surfaces remain plausible, or choosing among them changes reach, latency, packaging, or accessibility.
- exact default sentence: "the product uses the surface implied by the trigger and core loop; if neither implies one, the default is a cli."

### `failure_tolerance`

- known test: the user states the consequence of a wrong result and the permitted recovery or retry behavior.
- assumable test: a wrong result is reversible and cannot affect safety, money, privacy, reputation, or durable data.
- must-ask test: a wrong result could cause damage, or the acceptable error rate, recovery, or retry behavior is unclear.
- exact default sentence: "a wrong result is annoying but reversible, and the user can retry without data loss."

### `distribution`

- known test: the user names how the product reaches users and the related install, account, connectivity, update, or support constraints.
- assumable test: the product is a local, single-user tool and no store, managed service, internal deployment, package manager, or signed-release requirement is named.
- must-ask test: the route to users changes runtime, packaging, account, connectivity, update, or support requirements, or more than one route remains plausible.
- exact default sentence: "the product is distributed directly to the primary user as a local artifact."

### `existing_assets`

- known test: the user identifies existing code, data, design, integration, or repository paths and states their ownership and intended role.
- assumable test: the idea is explicitly greenfield or names no existing code, data, design, integration, or repository that could constrain the build.
- must-ask test: an existing asset may be reused, migrated, or preserved and its ownership, compatibility, or role is unclear.
- exact default sentence: "no existing code, data, design, or integration constrains the first version."

### `irreversible_preference`

- known test: the user states a non-negotiable platform, language, privacy, offline, budget, deadline, or other preference, including who can change it and why it is binding.
- assumable test: the user states no preference that would constrain a later phase or make reversal costly.
- must-ask test: a preference is hinted at, conflicts with another constraint, or has an unclear binding status or reversal cost.
- exact default sentence: "no irreversible preference is assumed; phase 2 may choose any option that satisfies the brief."

## deterministic question priority

sort unresolved product gaps by this one order, without reordering by intuition:

1. `primary_user`
2. `buyer_versus_user`
3. `core_loop`
4. `success_signal`
5. `scope_floor`
6. `scope_ceiling`
7. `data_ownership`
8. `trust_boundary`
9. `interaction_surface`
10. `failure_tolerance`
11. `distribution`
12. `existing_assets`
13. `irreversible_preference`

for the first round, take the first four unresolved `must-ask` product gaps in that order, or fewer when fewer than four remain. reserve the fifth slot for the separate `public_research` question. never promote a fifth product gap into that reserved slot. when all thirteen product gaps are must-ask, `scope_floor`, `scope_ceiling`, `data_ownership`, `trust_boundary`, `interaction_surface`, `failure_tolerance`, `distribution`, `existing_assets`, and `irreversible_preference` may defer to round two. in any actual run, every unresolved gap not selected by the first-round scan may defer, including a higher-listed gap that became known or assumable only after another answer.

if round two is needed, take the next three unresolved product gaps using the same order and stop after those three. do not invent a new id or change the order. record any deferred gap as unresolved rather than silently treating it as known.

## separate research-permission question

`public_research` is a stable question id and is not one of the thirteen product gaps. it is never assumable.

- known test: the current user input or an already approved run records an explicit `yes` or `no` for public research.
- must-ask test: no explicit `yes` or `no` is recorded and network research could inspect the idea or its sources.

when asked, state the scope exactly: github repositories, public product pages, and public technical writing. record an explicit `yes` or `no`. when the answer is `no`, capture the user repositories and supplied files that offline recon may inspect in the same ask call, or record `none` when no local source is available. keep this offline evidence scope separate from the public permission answer.
