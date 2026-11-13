# Manifest templates — the depth behind plugin-dev §2–§3

Read this when you create a marketplace or a plugin from scratch, or when a host rejects a manifest.
Field sets verified as of 2026-11 against Claude Code and Codex; hosts add fields over time, so when a
host's validator complains about something not shown here, trust the validator and update this file.

## Claude marketplace — `.claude-plugin/marketplace.json`

```json
{
  "name": "<marketplace-name>",
  "owner": { "name": "Your Name", "email": "you@example.com" },
  "metadata": {
    "description": "One line on what this marketplace is.",
    "version": "0.1.0"
  },
  "plugins": [
    {
      "name": "<plugin-name>",
      "source": "./plugins/<plugin-name>",
      "description": "One sentence: what it does + when to install it."
    }
  ]
}
```

## Codex marketplace — `.agents/plugins/marketplace.json`

```json
{
  "name": "<marketplace-name>",
  "interface": { "displayName": "<Marketplace Name>" },
  "plugins": [
    {
      "name": "<plugin-name>",
      "source": { "source": "local", "path": "./plugins/<plugin-name>" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Productivity",
      "description": "One sentence for the Codex Directory."
    }
  ]
}
```

## Plugin — `.claude-plugin/plugin.json`

```json
{ "name": "<plugin-name>", "version": "0.1.0", "description": "…", "author": { "name": "…", "email": "…" } }
```

## Plugin — `.codex-plugin/plugin.json` (a superset)

```json
{
  "name": "<plugin-name>", "version": "0.1.0", "description": "…",
  "author": { "name": "…", "email": "…" }, "license": "MIT",
  "keywords": ["…"], "skills": "./skills/",
  "interface": {
    "displayName": "<Plugin Name>", "shortDescription": "…", "longDescription": "…",
    "developerName": "…", "category": "Productivity",
    "capabilities": ["Read", "Write"],
    "defaultPrompt": ["A prompt that shows off the plugin"]
  }
}
```

`interface` drives the Codex Directory card; `capabilities` and `defaultPrompt` are what that card
shows. `policy.installation` / `policy.authentication` take host-defined enum values — `AVAILABLE` /
`ON_INSTALL` are the common defaults; check the host's docs for the others before using them.
