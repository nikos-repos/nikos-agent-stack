---
description: unfinished-code tokens may not be written
condition:
  - "\\bunimplemented!\\s*\\("
  - "\\btodo!\\s*\\("
  - "(?i)\\b(todo|fixme)\\b\\s*[:(]\\s*impl"
scope:
  - tool:write(*.{ts,tsx,js,jsx,py,rs,go,sh})
  - tool:edit(*.{ts,tsx,js,jsx,py,rs,go,sh})
interruptMode: always
---
implement it or leave it out. — code delivery contract
