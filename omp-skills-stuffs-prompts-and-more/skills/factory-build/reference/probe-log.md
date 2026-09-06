# probe log grammar

this file is the sole grammar for `<worktree>/.factory/probes/<task-id>.log`. it is a machine-readable transcript format, not a markdown suggestion. the task agent writes it and the acceptance gate parses it with these rules.

## required order

- the file starts with the first acceptance-criterion entry. there is no preamble.
- write one entry for each acceptance criterion, in the exact order used by the task record. number them `1` through `n` with no gaps, duplicates, or reordering.
- write one final entry for the falsifier. its heading is `## falsifier: <name>`, where `<name>` is the task record's falsifier name, written verbatim. the falsifier is not optional and uses the same entry grammar.
- write the freeze line after the falsifier entry. it is the last line in the file.
- put exactly one blank line between entries and exactly one blank line between the falsifier result and the freeze line. do not put blank lines inside an entry.

criterion names are matched as exact text, including case and punctuation. a parser compares them with the task record; it does not infer or rename criteria.

## entry grammar

use concrete values and keep every structural line exactly as shown:

````text
## criterion <number>: <criterion name>
command: <one-line command>
output-bytes: <decimal byte count>
<fence>raw
<exactly byte count raw output bytes>
<fence>
result: <result token>
````

use the same shape for the falsifier, replacing the heading with `## falsifier: <name>`. each entry has exactly one heading, one command line, one fenced raw-output block, and one result line.

### structural lines

- `number` is an ascii decimal integer with no leading zero, starting at `1` and increasing by one.
- each name is non-empty, has no carriage return or line feed, and has no leading or trailing spaces. the name is not escaped; backslashes stay backslashes.
- `command:` is followed by one non-empty physical line. the remainder is the command exactly as run, with no leading or trailing spaces and no escaping or newline folding. represent a multi-step probe in a script or a one-line shell command.
- `output-bytes:` is followed by an ascii decimal integer with no leading zero except `0`. it counts payload bytes, not characters, and excludes the line ending after `<fence>raw` and the closing fence line ending.
- the result line is exactly `result: <result token>` with no suffix or trailing spaces.

### raw-output fence

- `<fence>` is one uninterrupted run of at least three ascii backticks. the opening line is `<fence>raw`; the closing line is the identical run with no info string or suffix.
- the opening and closing fence lines each end in one `\n`. the payload starts immediately after the opening line ending and is exactly the declared byte count. the closing fence starts immediately after the payload, so output with no final newline is preserved without adding one.
- the payload is literal captured output. do not trim, indent, escape, decode, redact, translate, or add annotations. preserve blank lines, `\r`, `\n`, backslashes, backticks, and bytes in their original order. a `result:` line or heading-looking text inside the payload is data, not structure.
- choose a fence longer than every uninterrupted run of backticks in the payload. payload backticks are never escaped; a shorter fence is rejected.
- structural lines use `\n` only. a `\r` or `\r\n` in the payload is allowed because the byte count makes its boundary unambiguous.

## result tokens

the closed result set is exactly:

- `pass` — an acceptance criterion probe met its expected result.
- `fail` — an acceptance criterion probe did not meet its expected result.
- `not-falsified` — the falsifier did not find the named failure.
- `falsified` — the falsifier found the named failure.

criterion entries may use only `pass` or `fail`. the falsifier entry may use only `not-falsified` or `falsified`. do not use spaces, underscores, synonyms, or explanatory text in a result token.

## freeze line

an accepted log ends with exactly this line shape, followed by one `\n` and end-of-file:

```text
frozen at <utc timestamp>, <n>/<n> criteria observed, falsifier not-falsified
```

`<utc timestamp>` is a valid utc timestamp in the exact form `yyyy-mm-ddThh:mm:ssZ`, with two digits for every component. both counts are the number of acceptance-criterion entries, and both must equal the heading count. the freeze line is valid only when every criterion result is `pass` and the falsifier result is `not-falsified`. there is no text or blank line after it.

## rejection conditions

reject the log when any of these conditions holds:

- a criterion is missing, duplicated, out of order, renamed, or has a number outside `1..n`;
- the falsifier entry is missing, duplicated, placed before a criterion, or named differently from the task record;
- an entry has a missing, duplicate, empty, folded, or extra command line, output block, or result line;
- a command line has leading or trailing spaces, a newline, or an unrecognised continuation;
- `output-bytes` is malformed, does not equal the payload byte count, or the payload was changed in any way;
- the fence is shorter than three backticks, the opening and closing fences differ, the opening has an info string other than `raw`, the closing has a suffix, or a payload backtick run is at least as long as the fence;
- a structural line uses `\r`, a required separator is absent, an extra blank line appears, or any preamble/postamble exists;
- a result token is outside the closed set or is not valid for its heading type;
- the freeze line is absent, is not the final line, has an invalid timestamp or count, or conflicts with the entry results.

## valid compact example

````text
## criterion 1: returns token
command: printf 'xyz\n'
output-bytes: 4
```raw
xyz
```
result: pass

## falsifier: malformed key never panics
command: probe --malformed-key
output-bytes: 15
```raw
error: missing
```
result: not-falsified

frozen at 2026-08-22T12:00:00Z, 1/1 criteria observed, falsifier not-falsified
````
