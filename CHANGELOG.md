# changelog

## unreleased

### fixed

- ask: long `ask` questions no longer get cut off in short panes. the native dialog shows 4 rows of a question, and `Ctrl+O` could not grow it in a pane of about 20 rows. in interactive tui sessions, `ask-questionnaire` now re-registers `ask` and, when a question would be truncated, first opens a scrollable full-question reader, then hands the call to the native ask unchanged. known cost: the transcript shows omp's generic tool card for `ask` instead of the native card.

## 2.5.1 — 2026-09-25

### fixed

- terra advisor: `/advisor-install` and `nikos-advisor install` with no argument now always leave terra's `model` unset, so omp's `advisor` model role (set with `/model`) takes effect. 2.5.0 carried forward the `openai-codex/gpt-5.6-terra:high` pin that earlier releases wrote into `WATCHDOG.yml`; omp gives a per-advisor `model` precedence over the `advisor` role, so `/advisor status` kept reporting terra.

### upgrade

- after updating, run `/advisor-install` once in an omp session, then start a new session. `/advisor status` reports the model assigned to the `advisor` role.
- a no-argument reinstall now clears any pinned terra model. to keep a pin, pass it explicitly: `/advisor-install <model>`.
