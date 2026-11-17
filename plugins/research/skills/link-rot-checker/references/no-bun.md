# The fetch pass without Bun

> Reference for the `link-rot-checker` skill. Read it when the script cannot run: Bun is missing and
> cannot be installed (`install-bun`), or there is no shell and only a web-fetch tool (then apply the
> rules below to what that tool returns). It does by hand what `scripts/check-links.ts` does.
> A web-fetch tool that returns summarised text with no status code or final URL cannot apply
> rules 1–6: an article or doc link it reads is `ALIVE` only when its own headline is visible, a
> listing only when the skill's full alive marker is (its title plus a price or seller block, with no
> removal text); anything else is `UNKNOWN (no status)`. Never infer a 404 from summarised text.

Per link, save the page and print its status and final URL (`<n>` = the link's number, one file per
link). Save into a fresh temporary directory you create for this batch (`mktemp -d`), never the
current directory: that is often the user's project, and the pages are scratch. Write its literal
path into each later command, since a shell variable may not survive to the next call, and delete
the directory once the report is out.

```sh
curl -sL -m 20 -A '<a browser user-agent>' -o '<tmpdir>/page-<n>.html' -w '%{http_code} %{url_effective}\n' '<url>'
```

Then fetch each site's homepage once the same way, as the control. The homepage is **refused** when
`curl` fails, its status is 400 or above, or it is a rule-5 page (a bot check or under ~100
characters of visible text): a 200 challenge is a refusal too, exactly as in the script. Then apply
the script's states **in this order** — the first rule that matches decides:

1. **`curl` exit 6 (host does not resolve)** → `DEAD` only if a known domain still resolves from the
   same shell; otherwise `UNKNOWN`. Any other `curl` failure (timeout, reset) → `UNKNOWN`.
2. **Final URL on another site** → `REDIRECTED`, whatever its status: a 404 there is that site's, not
   this link's.
3. **404/410** → `DEAD` while the homepage answers; `BLOCKED` while the homepage is refused too.
4. **401/403/429/451/503** → `BLOCKED`. **Any other 4xx/5xx** → `UNKNOWN`.
5. **A bot-check page, or under ~100 characters of visible text** once scripts and tags are stripped
   → `NEEDS-BROWSER`. The script counts as a bot check any page whose title or text says "just a
   moment", "captcha", "robot check", "are you a robot", "verify you are human", "enable javascript
   to continue" or "access denied", or carries `cf-chl`.
6. **Final URL on a shallower page of the same site** (fewer path segments) → `REDIRECTED`.
7. **Anything else** → `CHECK`. Once § 2 of the skill gives you the markers, grep each saved page for
   them in place of the script's `--dead`/`--alive` re-run: the dead marker in the title or visible
   text, the alive marker in the `<title>` only, and neither on a page from rule 5.
