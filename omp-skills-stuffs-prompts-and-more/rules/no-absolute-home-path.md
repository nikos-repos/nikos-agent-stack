---
description: absolute home paths may not be written into source
condition:
  - "/home/(?:[a-z][a-z0-9._-]*)/"
  - "/Users/(?:[A-Za-z][A-Za-z0-9._-]*)/"
  - "[A-Za-z]:[\\\\/]+Users[\\\\/]+[^\\\\/\\s\"']+[\\\\/]"
scope:
  - tool:write(*.{ts,tsx,js,jsx,py,rs,go,sh,toml,yml,yaml,json})
  - tool:edit(*.{ts,tsx,js,jsx,py,rs,go,sh,toml,yml,yaml,json})
interruptMode: always
---
absolute path from the authoring machine. use a relative path, an env var, or a config value.
