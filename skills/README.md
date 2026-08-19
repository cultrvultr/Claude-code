# Skills

Agent Skills built in this repo, in the standard `SKILL.md` layout.

| Skill | What it does |
|---|---|
| [`legal-templates`](legal-templates/) | Drafts NDAs, MSAs, DPAs, privacy policies, offer letters, and other business legal documents from the attorney-drafted [General Legal](https://github.com/General-Legal/legal-templates) template library (CC0 1.0), and renders them to `.docx`. |

## Installing

### On your Claude account (claude.ai, Claude Desktop, Cowork)

Skills are uploaded as a zip whose **root contains `SKILL.md`** — zip the skill
directory's *contents*, not the directory itself.

```bash
cd skills/legal-templates && zip -r ../legal-templates.zip . -x '.*' -x '__MACOSX/*'
```

Then in Claude: **Settings → Capabilities → Skills → Upload skill**, and pick the
zip. Once uploaded it is available across claude.ai, the desktop app, and Cowork,
and it syncs down to Claude Code sessions signed in to the same account.

### In Claude Code

Copy or symlink the directory into a skills path:

```bash
# available in every project
ln -s "$PWD/skills/legal-templates" ~/.claude/skills/legal-templates

# or just this project
mkdir -p .claude/skills && ln -s "$PWD/skills/legal-templates" .claude/skills/legal-templates
```

Restart Claude Code, then confirm with `/skills`.

## Layout

```
skills/legal-templates/
  SKILL.md                 # frontmatter + instructions (what Claude reads first)
  references/catalog.md    # per-template guidance, loaded on demand
  templates/*.md           # the 12 source templates, verbatim
  scripts/list_fields.py   # extract fill-in fields; --check gates delivery
  scripts/build_docx.py    # render a filled draft to .docx
  LICENSE                  # CC0 1.0 Universal
```

`scripts/build_docx.py` needs `python-docx` (`pip install python-docx`).
