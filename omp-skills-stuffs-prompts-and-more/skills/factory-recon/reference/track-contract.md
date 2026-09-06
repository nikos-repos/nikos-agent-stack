# online recon track contract

the caller uses this file as the sole online recon contract. it supplies the shared context, every track row, and the strict output schema unchanged.

## shared context

```text
# goal
find prior art for <thesis line from the brief>, and find where it fails.
# constraints
every claim carries a resolvable url. no url, no claim.
a search snippet is a lead. open the source before you keep a claim.
read-only. no edits, no clones, no writes outside your returned report.
return exactly the object defined below.
# contract
the `track_id`, `claims`, `sources`, and `unknowns` fields are the only root fields. every claim lists one or more `source_ids`; each id must match a `sources[].id` entry.
```

## online tracks

add one row for each online track; keep its full assignment in the assignment cell.

| name | agent | effort | assignment |
| --- | --- | --- | --- |
| `repo-recon` | `factory-scout` | `hi` | 2 to 3 `github` searches using **different vocabulary for the same idea**. open at least 5 repositories with activity inside the last 12 months. for each: read the overview, the top-level module layout, and the open issue list. the issue list is the weakness evidence — a long-lived issue with sustained activity is a hole nobody has filled |
| `product-recon` | `factory-scout` | `hi` | products, services, and writeups outside github. include commercial products, dead products, and postmortems. a shutdown notice or a "why we stopped using x" post is stronger evidence than a landing page |
| `library-recon` | `librarian` | `hi` | for the two or three hardest capabilities in the brief, find the libraries that already solve them and **read their source** to confirm. report capability, library, language, and what it does not cover |
| `failure-recon` | `factory-scout` | `hi` | search for how projects in this space fail: abandoned repositories, unresolved issue clusters, migration-away posts, negative reviews. report the **failure mode**, not the project |

## output schema

set the following as the sole network-scout `outputSchema` and invoke it with `schemaMode: strict`:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["track_id", "claims", "sources", "unknowns"],
  "properties": {
    "track_id": { "type": "string" },
    "claims": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name",
          "url",
          "evidence_url",
          "last_commit_or_publish_date",
          "what_it_does",
          "specific_weakness",
          "source_ids"
        ],
        "properties": {
          "name": { "type": "string" },
          "url": { "type": "string", "format": "uri" },
          "evidence_url": { "type": "string", "format": "uri" },
          "last_commit_or_publish_date": { "type": "string" },
          "what_it_does": { "type": "string" },
          "specific_weakness": { "type": "string" },
          "source_ids": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string" }
          }
        }
      }
    },
    "sources": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "url", "what_it_establishes"],
        "properties": {
          "id": { "type": "string" },
          "url": { "type": "string", "format": "uri" },
          "what_it_establishes": { "type": "string" }
        }
      }
    },
    "unknowns": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

every `source_ids` entry must resolve to a `sources[].id` in the same response. each source id carries a real url and what it establishes. read-only agents return no changed files.
