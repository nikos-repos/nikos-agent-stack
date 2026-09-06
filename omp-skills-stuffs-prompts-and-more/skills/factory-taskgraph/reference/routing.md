# subagent routing rubric

deterministic agent, model, and thinking assignment per task.

routing is two-dimensional and the dimensions are independent:

- **shape** decides *which kind* of agent. it comes from what the task does
- **score** decides *how strong* that agent runs. it comes from what the task risks

the rubric exists so routing is auditable and repeatable, not so it is clever. a route a reviewer cannot check is a route nobody checks.

---

## dimension 1 — shape

read it off the task. no scoring.

| shape | the task | agent | effort | isolated |
|---|---|---|---|---|
| `research` | read-only investigation, prior art, "where is x" | `factory-scout` | `hi` | no |
| `library` | "does this dependency actually do x", read its source | `librarian` | `med` | no |
| `build` | writes product code | see dimension 2 | see dimension 2 | yes |
| `ui` | rendered appearance is contractual | `designer` | `med` | yes |
| `review` | audit finished code at wave end | `reviewer` | `hi` | no |
| `security` | trust boundary audit. **mandatory on any wave containing a `t4`, and on any wave where a task declares a `trust_boundary`** | `security-reviewer` | `hi` | no |

only `build` continues to dimension 2.

---

## dimension 2 — score

three axes. score each build task independently. the scores go in the emitted route block.

### ambiguity — how much must be invented

| score | meaning |
|---|---|
| 0 | the contract fixes the signature and the behaviour. the agent transcribes a decision already made |
| 1 | the contract fixes the behaviour; the internal shape is open |
| 2 | the agent must decide the contract, the seam, or the algorithm |

### blast — how much breaks if this is wrong

| score | meaning |
|---|---|
| 0 | private to one module. no other task consumes it |
| 1 | exactly one consumer module |
| 2 | a frozen contract, three or more consumers, persisted data, or an external api |

### reversibility — what it costs to undo

| score | meaning |
|---|---|
| 0 | pure code. `git revert` and it is gone |
| 1 | touches an on-disk format, a wire protocol, a migration, a published interface, or an external mutation |

---

## tier resolution

evaluate top to bottom. the first matching row wins.

| # | condition | tier |
|---|---|---|
| 1 | `reversibility == 1` | `t4` |
| 2 | `blast == 2` and `ambiguity == 2` | `t4` |
| 3 | `blast == 2` or `ambiguity == 2` | `t3` |
| 4 | `ambiguity == 1` | `t2` |
| 5 | otherwise | `t1` |

**rule 1 is absolute.** anything expensive to undo gets the strongest model regardless of how simple it looks, because the cost of that mistake is not paid in tokens.

---

## tier binding

bound to this machine's agents in `~/.omp/agent/agents/` and its models in `~/.omp/agent/models.yml`.

| tier | agent | model behind it | effort | typical work |
|---|---|---|---|---|
| `t1` | `factory-fast` | `zhipu-coding-plan/glm-5.3` | `lo` | transcribing a fixed signature, wiring, adapters, anything the contract fully determines |
| `t2` | `factory-fast` | `zhipu-coding-plan/glm-5.3` | `hi` | ordinary module work: behaviour fixed, internal shape open |
| `t3` | `factory-deep` | `openai-codex/gpt-5.6-terra` | `hi` | contract design, cross-module seams, algorithms, anything three modules consume |
| `t4` | `factory-deep` | `openai-codex/gpt-5.6-terra` | `hi` | data formats, public apis, migrations, auth, money paths, security boundaries |

### fallback chain

a machine without these agents still routes. every route block carries `fallback_agent`.

| tier | fallback | then |
|---|---|---|
| `t1`, `t2` | `glm-high` | stop and report if the fallback is unavailable |
| `t3`, `t4` | `luna-max` | stop and tell the user which primary agent is missing |

fallback agents are file-backed profiles. `doctor.sh` verifies them with the same file-presence rule as every primary route.

to move this pack to another machine, update the routing tables and every `model:` line in the agent profiles. the doctor discovers the full profile set; no fixed agent count is assumed.

---

## effort is not thinking level

two different knobs. do not conflate them.

- **thinking level** is the agent file's default, set as `thinking-level:`. values `off` … `max`, or `auto`
- **effort** is the per-spawn override on a `tasks[]` item. values `lo`, `med`, `hi`. it selects the lowest, middle, or highest level the **resolved model** actually supports

route blocks set `effort`, never `thinking`. the agent file owns the default; the route tunes it per task.

`effort` only exists when `task.enableEffort` is true. it is true on this machine.

### the glm ceiling

`glm-5.3` is configured with `efforts: [high, max]` — two levels, not six. so `lo` lands on `high` and `hi` lands on `max`, and `med` has nowhere distinct to go.

that is why `t1` and `t2` are set `lo` and `hi` rather than `lo` and `med`. on this machine that is a real difference. `gpt-5.6-terra` exposes the full ladder, so `t3` effort behaves as written.

---

## escalation ladder

a failed task is re-dispatched exactly one tier higher, with the failure report appended to its instruction.

```
t1 -> t2 -> t3 -> t4 -> human
```

two failures at the raised tier stops the wave and reports. never re-dispatch the same task at the same tier twice: the model was not the variable that changed.

---

## anti-patterns

| pattern | why it is wrong |
|---|---|
| routing everything `t4` | the strongest model on a wiring task buys nothing, and it starves the genuine `t4` task of budget and wall clock |
| routing by file size | a 500-line adapter is `t1`. a 20-line serialisation format is `t4` |
| routing by how hard it feels | feelings are not auditable. the three axes are |
| giving a read-only agent write tools | read-only agents exist so investigation cannot corrupt state |
| letting a task agent spawn subagents | every factory agent sets `spawns: ""`. one task id, one subagent, no fan-out |
| skipping the security route on a `t4` wave | `t4` means irreversible. that is exactly the wave that needs the audit |
| reading the security trigger off the tier histogram | tier scores one task at a time. a boundary is exposed by the merged tree, so a wave of `t2` modules that meet at one can carry no `t4` and still need the audit |

---

## worked examples

| task | shape | amb | blast | rev | tier | why |
|---|---|---|---|---|---|---|
| implement `Config::load` against a given signature | build | 0 | 1 | 0 | `t1` | no rule 1-4 matches, so rule 5 |
| implement the token store behind a fixed trait | build | 1 | 1 | 0 | `t2` | rule 4 |
| design the plugin trait three modules implement | build | 2 | 2 | 0 | `t4` | rule 2 |
| choose the retry algorithm inside one module | build | 2 | 0 | 0 | `t3` | rule 3 on ambiguity |
| define the on-disk session format | build | 1 | 2 | 1 | `t4` | rule 1, before anything else is considered |
| add a cli flag mapping to an existing option | build | 0 | 0 | 0 | `t1` | rule 5 |
| find every call site of a symbol before a rename | research | — | — | — | — | shape only |
| confirm `serde_json` preserves key order | library | — | — | — | — | shape only |
| review wave 1 before wave 2 starts | review | — | — | — | — | shape only |

---

## harness prerequisites

| key | needed | why |
|---|---|---|
| `task.enableEffort` | `true` | doctor reads the live config; without it, `effort` on a task item does nothing |
| `task.maxConcurrency` | at least `4` | doctor reads the live value; it caps how many wave tasks actually run at once |
| `task.batch` | `true` | default. the `{ context, tasks[] }` shape this rubric assumes |
| `task.maxRecursionDepth` | `2` | factory agents declare `spawns: ""`, so depth never exceeds orchestrator to task |
| `async.enabled` | `true` | it makes the wave barrier necessary — see `factory-waves` |

run `doctor.sh` in the pack root; it reads the live config and checks all of these against it.
