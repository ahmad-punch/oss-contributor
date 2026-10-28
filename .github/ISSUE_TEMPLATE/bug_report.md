---
name: Bug report
about: A hook, skill or command did something wrong
labels: bug
---

**What happened**

**What you expected**

**How to reproduce**
For a hook, paste the JSON it received (redact anything private) and the command you ran, for example:

```bash
echo '<payload>' | node hooks/block-ai-trailers.mjs; echo "exit $?"
```

**Versions**
- Claude Code (`claude --version`):
- Node (`node --version`):
- OS:
- oss-contributor version (from `/plugin`):
