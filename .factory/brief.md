# brief: native babysitter orchestration

## thesis

for any omp user who installs nikos-agent-stack, a native orchestration unit changes babysitter from a separate prompt-driven extension into a run that the user starts once and the stack advances at deterministic turn boundaries, so that an active run reaches a completed or blocked terminal state with no further babysitter command, unlike the current separate babysitter extension and skill invocation path.

## core loop

1. the user selects a supported orchestration mode and starts one run.
2. the unit creates or resumes the active run state.
3. the agent performs the next assigned action in the normal omp turn.
4. a deterministic lifecycle hook checks the active run at the turn boundary and advances it or blocks the turn with an actionable error.
5. steps 3 and 4 repeat without another babysitter command until the run completes, stops, or requires user input.

## decided

- the first public release supports any omp plugin user, not only niko's local environment — source: user, round 1, question id `primary_user`.
- the user starts a run once; deterministic lifecycle hooks then continue it automatically — source: user, round 1, question id `core_loop`.
- the design must examine the babysitter sdk as a base for a better implementation, with a preference for no external dependencies — source: user, round 1, question id `scope_floor`.
- an orchestration failure blocks an active run, but it does not affect ordinary turns when no run is active — source: user, round 1, question id `failure_tolerance`.
- public research may cover github repositories, official babysitter and omp documentation, public package sources, product pages, and technical writing; no credentials, clones, or external mutations are approved — source: user, round 1, question id `public_research`.
- the target is the existing public `nikos-agent-stack` omp plugin repository — source: user initial idea; `/home/niko/nikos-agent-stack/package.json:2-3,19-29`.
- the repository already exposes deterministic post-turn gates and separate questionnaire behavior as omp extensions — source: `/home/niko/nikos-agent-stack/readme.md:3-11`; `/home/niko/nikos-agent-stack/package.json:34-38`.

## assumed

- “no external dependencies” means no required babysitter runtime package after installation; omp and bun remain platform requirements — default chosen because the existing plugin already requires omp and bun, while the user's preference specifically answered the babysitter ownership question; overturn if research shows a small published sdk dependency gives a materially safer result.
- existing gate checker, questionnaire, and advisor behavior must remain compatible — default chosen because the request adds orchestration to a public plugin and does not authorize breaking its current features; overturn only if an unavoidable lifecycle conflict appears.
- the first release preserves the user-facing babysitter modes that have distinct behavior, but it need not preserve the separate extension's prompt-wrapper implementation — default chosen because the user asked to fold functionality into the stack and objected to invocation; overturn if research identifies modes that are obsolete or inseparable from an external service.
- the orchestration unit should be a separate extension that reuses the gate checker's lifecycle pattern, rather than adding orchestration state to gate-checker itself — default chosen because gate enforcement and process execution have different failure domains; overturn if the omp extension api requires one shared registration point.

## open for research

- which behaviors belong to the babysitter sdk, cli, extension, skills, hooks, and persistence layer, and which are only prompt wrappers?
- can the useful sdk behavior be adapted or incorporated without a runtime dependency, while preserving its license and attribution requirements?
- which omp lifecycle events can advance an active run without recursion, duplicate execution, or loss of user control?
- how do adjacent local agent orchestrators implement durable state, pause and resume, cancellation, crash recovery, and deterministic turn-boundary enforcement?
- which babysitter modes represent distinct runtime behavior that the public integration must preserve?
- what public failure evidence exists for hook-driven orchestration, agent loops, and embedded workflow engines?
- does the existing gate-checker lifecycle model provide a stable integration seam, or would shared state create unsafe coupling?

## weakness hypothesis

omp's lifecycle hooks may observe and gate a turn but may not provide a safe, supported way to start the next orchestration step. if continuation requires recursive prompt injection or private harness behavior, the proposed deterministic integration would reproduce the invocation problem inside a more tightly coupled module.

## constraints

- the result must live in `/home/niko/nikos-agent-stack` and follow its public plugin conventions — source: user initial idea; `/home/niko/nikos-agent-stack/package.json:2-3,19-29`.
- the user must start an orchestration mode explicitly once — source: user, round 1, question id `core_loop`.
- only active orchestration runs may block turn completion — source: user, round 1, question id `failure_tolerance`.
- the design must prefer no babysitter runtime dependency and must first inspect the sdk as a possible base — source: user, round 1, question id `scope_floor`.
- research is read-only and public; it may not use credentials, clone repositories, or perform external mutations — source: user, round 1, question id `public_research`.
- this is a feature in an existing repository, so specification and execution use `to-spec` and `engineering-workflow`; standalone `factory-recon` supplies approved research evidence before the spec and does not invoke repository creation — source: `skill://new-project:18,186-189`; `skill://factory-recon:3`.

## non-goals

- automatically classifying requests and starting orchestration without a user command.
- forcing ordinary turns through orchestration when no run is active.
- creating a new remote repository or changing the existing repository's visibility.
- preserving prompt wrappers or implementation details that do not represent observable babysitter behavior.
- selecting the final module boundary, state format, or dependency strategy before research.

## research approved

yes — github repositories, official babysitter and omp documentation, public package sources, product pages, and technical writing; the thesis and minimum integration search terms may leave the machine. no credentials, cloning, or external mutation.
