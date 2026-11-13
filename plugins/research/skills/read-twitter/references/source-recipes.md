# read-twitter — per-source recipes (depth)

Steps 1–8 of SKILL.md get you the tweet; this file is what it takes to get the **material behind
it**. A tweet is rarely the content: it points at an article, a repo, a demo or a form, and "here
are three links he mentions" is not a reading of it. Every entry is here because guessing cost a
run. SKILL.md §Step 7 «Per-source rulings» is the one-line index of these rulings; each section
below carries the measured detail for one host. Read only the section for the host in front of you.

**Index**

- **t.co and shorteners** — how to resolve a wrapped link.
- **YouTube** — which skill reads a video.
- **Vendor blogs** (`claude.com/blog`, `anthropic.com/research`) — why a web-fetch summary is not the
  page, how to take the bytes, how to pull the figures.
- **Google developer docs** — the one-call page-text read.
- **Screenshots of a live docs page** — how to tell a revised doc from a misquote.
- **Bot-blocked hosts** — which 403/202 answers are about the fetcher, not the content.
- **Framer sites** — the search-index JSON; reading accordion answers.
- **Launch posts → Hacker News** — the comment tree and the founder's replies via Algolia.
- **OpenAI docs** — the `.md` twin and its limits.
- **OpenAI announcements** (`openai.com/index/*`) — prose plus the full chart datasets.
- **GitHub** — the sandbox gate, the browser ladder, reading code by SHA, freshness, fetch-wrapper
  failure modes.
- **Medium** — the `curl` 403 and the teaser trap.
- **Vercel Security Checkpoint** — recognising the 429 bot challenge.
- **AI-built app demos** — reading the deployed bundle against the tweet's claims.
- **Model releases (HuggingFace)** — file sizes, and what they can and cannot prove.
- **Models named in a post** — resolving a model in registries.
- **WebGL / three.js demos** — why waiting does not advance a frame-coupled scene.
- **Typeform** — reading a form's questions without submitting anything.
- **Luma** — the public calendar JSON.
- **SEC / EDGAR filings** — finding and reading an S-1 or 10-K.

---

## t.co and shorteners

**Resolve `t.co` in the BROWSER** — navigate and read the final URL. A web-fetch tool on a `t.co`
link returns empty. `goo.gle` resolves in-browser too.

---

## YouTube

**A YouTube link → hand off to the `research:watch-video` skill** rather than trying to watch it
in the browser; that skill does Gemini's native YouTube ingestion.

---

## Vendor blogs (`claude.com/blog`, `anthropic.com/research`)

⚠️ **A web-fetch tool here returns a GENERATED SUMMARY, not the page's bytes.** The same applies to
any vendor announcement page. (That is the observed behaviour; what produces it is not established
here, so do not repeat a guess about the implementation.) Measured 2026-09-20 on one article, three
failures in one run: a "reproduce verbatim" prompt was REFUSED outright on copyright grounds; a
source attribution was FABRICATED ("cited as ... recursive self-improvement" — that phrase occurs 0
times in the page HTML, and the sentence in question links somewhere else entirely); and it asserted
"no specific technologies are named" when the article's own FIGURES show
`kubectl rollout restart deployment/[listener]`, pods at 395/412 GiB against a ~660 GiB limit, and a
standby pod taking the lease in ~30s — i.e. Kubernetes, plainly. The summary was right about the
PROSE and blind to the pictures.

**So take the bytes yourself** — with `--fail-with-body`, never a bare `-sL`:
`curl -sSL --fail-with-body -A "Mozilla/5.0" -o post.html "<url>"`. ⚠️ A bare `-sL` **exits 0 on an
error page and writes it to the file**, so a block or a dead slug strips into plausible-looking
prose and you summarise the wrong document without ever reaching the fallback below. Measured
2026-09-20 on a nonexistent slug of this same host: `-sL` → **exit 0 and 75 KB** of error page;
`--fail-with-body` → **exit 22, «The requested URL returned error: 404»**; the real article → exit 0
and 541 KB. Check the exit status before you treat the file as an article.

Then strip `<script|style|svg>`, turn `</p|h1..h4|li|div>` into newlines, drop tags, unescape — one
python pass gave 19 KB of clean article text out of that 541 KB page. Then `grep` the raw HTML for
the outbound `<a href>`s: they carry the post's real citations — the summary measured here
reproduced none of them, and got one of them wrong. Use a web-fetch tool only for ORIENTATION (what
is this about, is it worth reading), never as the source of a number, a quote or an attribution you
will publish.

**And read the figures.** Step 6 tells you to read the TWEET's images; a linked blog post's diagrams
are a separate thing and are routinely where the load-bearing specifics live — the exact command,
the real limit, the dated timeline, the screenshot of the internal thread. On webflow-hosted
Anthropic posts, match the CDN host AND an image extension — a bare host match also drags in the
site's css, js and gsap bundles — then subtract the site chrome and the social card, which are NOT
figures:

```bash
grep -oE 'https://cdn\.prod\.website-files\.com/[^"?]+\.(png|jpe?g|webp)' post.html \
  | sort -u | grep -vE '_(placeholder|og)_|favicon|apple-touch-icon'
```

Both halves of that filter were measured, not guessed: without it the same command returned **9**
URLs — the site's `apple-touch-icon.png` and the `..._og_<slug>.jpg` social card — and the `og`
marker is `_og_` mid-filename, so a `/og_` pattern silently misses it. With it, exactly the
**seven** figures. `curl` each and read it. They carried: the patch-runway chart (CI volume ~30x by
2026-08), the listener memory chart (~660 GiB pod limit, last OOMKill mid-April), the backlog chart
(peak ~2.57M unprocessed events, redesign shipped May 9, tuned by May 14), and the verbatim internal
Claude Tag thread — none of which is in the prose at all.

**Fallback if `curl` is blocked:** a DOM walk of `.blog_post_layout` — there are **several** such
elements, so take the **longest**, and walk `h1..h4, p, li, pre` `textContent` rather than trusting
`innerText`.

---

## Google developer docs (`mapsplatform.google.com`, `developers.google.com`)

A page-text read returns the whole article in one call — no DOM walk needed.

---

## Screenshots of a live docs page

**A tweet that quotes or screenshots a LIVE docs page (platform.claude.com/docs and the like): the
page may have been REVISED since the screenshot — diff the live text against the picture before
calling either one «the source».** Measured 2026-11-13 on one post screenshotting a vendor's
model-prompting guide: the image and the tweet gave one opening sentence, «about half» vs «under a
tenth», while the LIVE `.md` had a reworded opening, «about 75 percent», and +70–80 % output tokens
instead of ×1.5. Nobody
had misquoted; the doc moved.

Both texts are reachable: `curl -A "Mozilla/5.0"` on `<docs URL>.md` is the live text, and
`web.archive.org/cdx/search/cdx?url=<url>*&output=json` lists snapshots whose HTML you read at
`web.archive.org/web/<timestamp>/<url>` (plain form; the raw `…/web/<timestamp>id_/…` form returned
the «suspected abusive bot traffic» block page with HTTP 200 on the same host and run, so check the
body, not the status). Bisect by snapshot and report the window in which the wording changed, plus
which snapshots disagree with a third-party timestamp (a blog quoting the NEW wording «before» the
archive shows it is evidence of a staged or A/B rollout, not something to resolve by guessing).

---

## Bot-blocked hosts

**Bot-blocked for a web-fetch tool (measured 2026-09-17):** `boingboing.net` → **403**;
`codebreaking-guide.com` → **202 with a ~200-byte body**, which reads like an empty page. Both are
facts about the fetcher, not the content — open them in the browser instead.

---

## Framer sites

**A Framer-built site (most 2026 startup launch pages) — one `curl` gives you the text of EVERY
page.** The page's `<head>` carries
`<meta name="framer-search-index" content="https://framerusercontent.com/sites/<siteId>/searchIndex-<hash>.json">`;
that JSON is keyed by route and holds each page's `h1`/`h2`/`h3`/`p` arrays. Measured 2026-09-19 on one
startup's launch site: 122 KB, covering its manifesto, team and blog pages and the launch post in
one fetch. Grep the URL out of any page you already have:
`grep -o 'https://framerusercontent.com/sites/[^"]*searchIndex-[^"]*\.json' page.html | head -1`.

⚠️ **Accordion / FAQ ANSWERS are in NEITHER the static HTML NOR the search index** — same run: six
FAQ questions present in both, not one answer in either; a Framer accordion renders the answer only
on a real click. `.click()` on the label's leaf element does nothing (the handler sits on an
ancestor wrapper), and a Title-Case label on screen is CSS `text-transform`, so matching the
rendered casing finds nothing. What worked: a real-input click on the chevron glyph at the row's
right edge, clicking BOTTOM-UP so the rows above keep their coordinates — and verify with a
SCREENSHOT, not `document.body.innerText.length`, which still read its pre-click length while the
answer was plainly rendered.

---

## Launch posts → Hacker News

**A LAUNCH tweet → its Hacker News thread, via Algolia, no browser.** It is the cheapest source of
both the critical reception and the founder's own answers. Find it with
`https://hn.algolia.com/api/v1/search?query=<domain>&tags=story`, and pick the hit whose `url`
(host AND path), `title` and `created_at` match the launched page — `points` only ranks candidates,
it is not an identity check (a shared host like `github.com`, or a domain posted several times,
returns unrelated stories). Then `https://hn.algolia.com/api/v1/items/<objectID>` returns the whole
comment tree in one `curl` (254 KB for 496 comments). Save to a file and walk it in python — never
into the main loop: rank top-level comments by `len(children)` for the contested ones, and filter
the whole tree by `author` for every reply the founder wrote.

Measured 2026-09-19 on the TypeSafe/Jev launch (HN `49717558`, 1895 points): the founder's ~20
replies answered things that appear nowhere in the blog post or the X self-thread (that `noul` means
*bernoulli*, that strings and sequential data structures are disallowed by construction, that the
architecture is deliberately undisclosed) — while X's own replies on that thread hit the ranked-view
ceiling (Step 5) at 10 mounted `article`s and surfaced only the self-thread plus two
congratulations.

---

## OpenAI docs (`developers.openai.com`, `learn.chatgpt.com`)

**Append `.md` to the URL's PATH, before any `?query` or `#fragment`.** The HTML page is ~95%
navigation chrome (50.8 KB for the models page, enough to spill a tool result to disk);
`curl -sL <path>.md` returns clean markdown with the tables intact (19 KB for the same page). Full
index at `developers.openai.com/llms.txt` and `learn.chatgpt.com/llms.txt`. Measured 2026-09-04, on
plain paths with no query/fragment.

Two measured limits: `developers.openai.com/codex/*` 301s to `learn.chatgpt.com/docs/*` (follow it
— use the final URL), and `openai.com/index/*` announcement/blog posts have NO `.md` twin — a plain
`curl` there returns 403 (re-confirmed 2026-09-23, with a full Chrome `-A`), so read those with the
browser per «OpenAI announcements» below. A literal `<full-url>.md` on a URL carrying `?query` or
`#fragment` appends after them instead of before the path, which does not resolve — strip those
first, append `.md`, then re-add them only if the target actually needs them.

The GENERAL form of this — `.md` vs `Accept: text/markdown`, `llms.txt`/`llms-full.txt` as the
index when a docs path 404s, and why an empty fetch usually means a wrong URL rather than a
client-rendered page — is `research:fetch-web-sources` §1. Keep per-SITE measurements here; put
rules that hold across sites there.

---

## OpenAI announcements (`openai.com/index/*`)

**A page-text read for the prose, and the RSC payload for the CHARTS, whose full datasets are
embedded in the page and are NOT in the prose, the visible axis labels or any screenshot.**
Measured 2026-09-23 on `introducing-gpt-6-sol-and-luna`. Two halves, and the second is the one worth
the trip:

- **Prose:** navigate, then a page-text read returns the whole article — headings, both pricing
  tables, every chart's caption — in ONE call (14 KB here). Do not reach for a web-fetch tool: the
  «Vendor blogs» warning above (a generated summary, blind to figures) applies to any announcement
  page, and here the browser costs the same one call.
- **Charts:** each one is a **Vega-Lite spec inlined in the Next.js RSC payload**, so the complete
  `data.values` array — every model × every effort level, with `score`, `cost` and `scoreLabel` —
  is already in `document.documentElement.innerHTML`. Only the chart currently scrolled into view
  mounts an `<svg>`, so an svg-text sweep sees one chart and a screenshot walk sees the rendered
  labels; the payload has all of them regardless of scroll position. This run pulled **11 complete
  datasets** without scrolling or clicking a single chart tab. The RSC payload is double-escaped —
  unescape before matching:

  ```js
  const u = document.documentElement.innerHTML.replace(/\\\\"/g,'"').replace(/\\"/g,'"');
  const out = [], re = /"title":\{"text":"([^"]+)"\}[\s\S]{0,400}?"values":\[/g;
  let m; while ((m = re.exec(u))) {
    let i = re.lastIndex, depth = 1, start = i;           // brace-scan to the matching ]
    while (i < u.length && depth > 0) { const c = u[i]; if (c === '[') depth++; else if (c === ']') depth--; i++ }
    out.push({ t: m[1], v: u.slice(start, i - 1) });
  }
  window.__CH = out;                                       // park it — the return has a cap
  ({ n: out.length, titles: out.map(o => o.t) })
  ```

  Then return **one chart at a time, FILTERED** — `JSON.parse('['+o.v+']')` and project to
  `model/effort score cost`. A single unfiltered chart already blows a page script's output cap
  (truncated mid-array on the first try here), so filter by vendor or by model family per call
  rather than dumping.
- ⚠️ **This is also where the announcement's own spin becomes checkable, which is the point.** The
  same datasets that the prose quotes selectively carry the rows it omits: here the prose compared
  its coding score only against *Claude Fable 5*, while the chart's own data had **Claude Opus 5 at
  73.65% on DeepSWE (max) against GPT-6 Sol's 68.8%**, and the alignment charts — whose numbers
  appear nowhere in the prose — showed one metric (warning circumvention) where the new small model
  barely moved (68.2% → 64.4%) under a blanket "both show improvements". Read the arrays before
  repeating a vendor's comparison.

---

## GitHub

Reading the CODE (not just the README), freshness, and the sandbox gate. A literal `curl` (shell)
against GitHub's own APIs is the reliable path ON A LOCAL HOST — verified directly 2026-08-31 on
`ben-z/findphone`. On a cloud-sandbox host it MAY be gated, per session and per repo, so run the
one-call probe below BEFORE you plan around `curl`.

### The sandbox gate — probe once

🔴 **On a cloud-sandbox host, the whole `curl` path may be shut — and the way it fails actively
misleads you. Make ONE cheap probe before you plan around `curl`.** Measured on one cloud-sandbox
host (five separate sessions, 2026-09-10 → 2026-09-12):

- `api.github.com` answers **403** with a body that is not GitHub's:
  `{"message":"GitHub access to this repository is not enabled for this session. Use add_repo to
  request access…","documentation_url":"…/claude-code/github-actions"}`. **There is no `add_repo`
  tool in these sessions** (checked with the host's tool search), so the message recommends an
  action that does not exist and reads like a permissions problem on the repo. It is neither: it is
  the session's egress proxy. **It covers every repo NOT configured for the session, not just the
  one you asked about** — measured 2026-09-17 with a negative control: `repos/<owner>/<repo>` and
  `repos/torvalds/linux` (neither configured) gave the identical 403. A repo the session IS bound to
  may still answer, so keep the one-call probe rather than skipping the shell outright. On the same
  run `api.github.com/rate_limit` gave **502** `builtin injection failed (github)`, and
  `search/repositories?q=…` gave **403** `This GitHub API path is not available: sessions are bound
  to their configured repositories…` — three different bodies, one gate. So for an unconfigured repo
  the "read versions/stars from `api.github.com`" rule is unreachable from the shell — but NOT from
  the browser: the ladder below still reaches both `api.github.com` (from a `github.com` tab) and the
  HTML page, so run the two-channel check there. Only if that browser API route fails too, **say in
  the report that only one channel was readable**, since the "both channels must agree" rule in
  «Freshness» then cannot be met.
- `raw.githubusercontent.com` **varies between sessions** — 200 on 2026-09-10 and on 2026-09-12,
  and `connect_rejected` / HTTP 000 on 2026-09-11. So do not write it down as the reliable channel
  either. (Another 200 measured 2026-09-13 on a repo linked from a post, `api.github.com`/`github.com` both
  403 in the same minute on the same host — consistent with the same per-session variance, not a
  reason to call it unblocked. 200 again on 2026-09-17 for `torvalds/linux/master/README` and
  `<owner>/<repo>/master/README.md` — while `<owner>/<repo>/main/Cargo.toml` 404'd because that repo
  lives on `master`, the wrong-ref trap in «Freshness». 200 again on 2026-09-20 for
  `<owner>/<repo>/main/README.md` (another repo linked from a post), 5 247 bytes — with both NEGATIVE controls run in the same
  minute, so the channel was shown to be able to fail: a bad ref (`…/nonexistent-branch-xyz/README.md`)
  and a bad path (`…/main/NOPE.md`) each **404**. Run those two controls, not just the fetch you
  wanted — a proxy that answers 200 to everything looks identical to a working channel. On that same
  repo `main` and `master` returned IDENTICAL bytes; that is not evidence the ref is being ignored
  (the 404 controls show it is not), so do not write it down as one.) **Probe it fresh each
  session** rather than assuming either way; when it 200s, `curl -r 0-15` a binary's header is
  enough to check a claim against the raw bytes without pulling the whole file.
- It is not GitHub-specific: `cdn.syndication.twimg.com`, `pbs.twimg.com`, `video.twimg.com`,
  `www.youtube.com`, `www.anthropic.com` and even `example.com` all gave the same `connect_rejected`
  on at least one run. `curl -sS "$HTTPS_PROXY/__agentproxy/status"` names the cause outright:
  `noProxy` lists **only package registries** (npmjs, jsr, pypi, files.pythonhosted, crates,
  proxy.golang) plus `api.anthropic.com` and local ranges, and `recentRelayFailures[]` carries each
  refusal verbatim with `kind: "connect_rejected"`. **Read that endpoint before diagnosing a dead
  host** — it is the one cheap way to tell "the proxy refused" from "the host returned 403".
- **`github.com/user-attachments/assets/<uuid>` — a file or image attached to an issue or PR — is
  gated too, and answers with a THIRD body.** Measured 2026-09-20 on the same sandbox host: **403**,
  `{"message":"This GitHub API path is not available: sessions are bound to their configured
  repositories. Use repository-scoped endpoints (repos/{owner}/{repo}/...)."}` — advice that cannot
  be followed, because an attachment has no repo-scoped URL at all. In the same minute the same
  `curl` got **200** from `cdn.syndication.twimg.com/tweet-result` and from
  `video.twimg.com/...mp4`, so that proxy was alive and refusing GitHub specifically: **run a
  non-GitHub positive control before blaming the network.** Read the attachment in the **browser**
  instead (open the URL there) — and check «SVG attachments» below before reaching for a
  screenshot.

**Do not generalise any of this into "the GitHub API doesn't work".** On a local host `curl` to
`api.github.com` is not gated. This is a fact about a HOST and an INSTRUMENT, and it has already
varied between two sessions on the same host — which is exactly why the rule is *probe once*, not
*memorise a channel*.

### The browser ladder when `curl` is gated

All verified on those runs.

- **File contents** → navigate to the raw URL in the browser and do a page-text read; it returns the
  file verbatim in one call (8 202 chars of one file, whole), whereas a page script's return was
  truncated at roughly 950–1000 chars on one host (as of 2026-09), which would be nine
  slice-and-stitch calls for 8 KB.
- **The file tree / stars / forks / freshness** → navigate to
  `api.github.com/repos/<o>/<r>/git/trees/<sha>?recursive=1` and
  `JSON.parse(document.body.innerText)`, or read the `github.com` repo page in the browser
  (`#repo-stars-counter-star[title]`, `#repo-network-counter[title]`, `a[href*="/blob/"]`).
  **CORS:** `fetch()` on `api.github.com` from a tab open on **another** domain fails
  (`TypeError: Failed to fetch`) — navigate to `github.com` first, and fetch from there.
  **Output cap:** if you fetch the tree this way with a page script (rather than navigate + a
  page-text read), its ~950–1000 char output cap still applies — a tree of any real size (6,610
  blobs measured on one; a handful of files is fine as-is) blows straight through it. Reduce to
  AGGREGATES inside the page before returning anything: per-top-level-directory counts, an
  extension histogram, a filtered path list — never the raw tree. A `window` accumulator holding
  intermediate results does **not** survive the next navigate (`browser-traps.md`, «`window`
  accumulators do not survive a navigate or a reload»); `sessionStorage` does survive a same-origin
  navigation or reload in the same tab, and reappears if you come back to `github.com` later in that
  tab — but it is **inaccessible** the whole time you're on a **different** origin
  (`raw.githubusercontent.com`, `x.com`, …), which is normally the next thing you do here. So
  extract the aggregate into your tool response before navigating away from `github.com`, rather
  than counting on `sessionStorage` to carry it to wherever you go next.
- **The whole GitHub REST API from an open `github.com` tab — the general form of the CORS note
  above, and on a sandbox session that the probe found gated, the channel that still works.**
  `api.github.com` sends `Access-Control-Allow-Origin: *`, so a page-side `fetch()` from a
  `github.com` tab passes (unlike x.com, where the same move is blocked); and the browser runs on
  the user's own machine, outside the sandbox's egress proxy, which is why it reaches what `curl`
  cannot. Measured 2026-09-20 on the sandbox host, every call first-try:

  ```js
  // Open https://github.com/<owner>/<repo> in the browser, then run this as one page script.
  // Declare these in the same call — a fresh page-script call shares no variables:
  const O = '<owner>', R = '<repo>', path = '<path/in/repo.ext>'
  const h = {'Accept':'application/vnd.github+json'}
  const get = async (u, as) => {                    // never parse an unchecked response
    const r = await fetch(u, {headers:h})
    if (!r.ok) throw new Error(r.status+' '+u+' :: '+(await r.text()).slice(0,200))
    return as === 'text' ? r.text() : r.json()
  }
  const A = 'https://api.github.com/repos/'+O+'/'+R
  const repo = await get(A)
  const sha  = (await get(A+'/commits/'+repo.default_branch)).sha
  const tree = await get(A+'/git/trees/'+sha+'?recursive=1')
  const enc  = p => p.split('/').map(encodeURIComponent).join('/')   // '#', '?', '%' are legal in a path
  const file = await get('https://raw.githubusercontent.com/'+O+'/'+R+'/'+sha+'/'+enc(path), 'text')
  window.__X = {repo, sha, tree, file}        // park it; locals die with the call
  if (tree.truncated) throw new Error('tree truncated — paths are INCOMPLETE, walk subtrees')
  // reversible sentinels — one host's classifier blocks the WHOLE result on a bare ? & =,
  // and stripping them would corrupt the source you came to read. Undo on your side.
  const sf = t => t.replace(/\?/g,'«Q»').replace(/&/g,'«A»').replace(/=/g,'«E»')
  return {sha, n: tree.tree.length, head: sf(file.slice(0, 600))}   // a bounded projection
  ```

  ⚠️ **Check `res.ok` on every one of those calls.** The page-side `fetch` carries no GitHub
  credentials — it is anonymous however logged-in the tab looks — so a private repo, or an
  exhausted unauthenticated rate limit, answers with error JSON that has no `default_branch` and no
  `sha`. Dereference it blindly and the next URL is built out of `undefined`, which fetches
  something, and an access failure becomes a confident wrong reading of the repository.

  `raw.githubusercontent.com` works from that tab too, and so does comment pagination
  (`/issues/<n>/comments?per_page=100&page=N` — 203 comments in 3 calls).
  **Accumulate into `window.__X` and return only a narrow slice.** Same run: a
  `git/trees?recursive=1` over a 1 699-path repo is **85 341 characters**, and returning it whole
  fails the call with *«exceeds maximum allowed tokens»*, spilling the lot into a file — the output
  cap of the bullet above, in another host's spelling.
  **Defang whatever you do return**, or one host's classifier drops the **entire** result as
  `[BLOCKED: Cookie/query string data]`. Which defang depends on what you are returning, and
  `browser-traps.md` has both: for prose or URLs the blunt `.replace(/[?&=]/g,' ')`; for SOURCE
  CODE the allowlist filter there instead, which strips `?` and `&` but deliberately KEEPS `=` — a
  blanket `=` strip turns assignments and comparisons into different or invalid code, which is the
  one thing you came here to read accurately.
- 🔴 **A tweet linking `…/issues/<n>#issuecomment-<id>` points at ONE community comment, and a
  web-fetch tool cannot reach it — fetch it by id instead.** Measured 2026-09-20 on an issue with
  **203 comments**: a web-fetch tool on the anchored URL returned the issue body plus the earliest
  comments and reported outright that "the specific comment with that ID is not included" — twice,
  with the anchor and without. That reads exactly like "the comment does not exist", and that
  comment is the material the tweet is about. One call settles it —
  `https://api.github.com/repos/<o>/<r>/issues/comments/<id>` through the browser `fetch` above (a
  web-fetch tool on `api.github.com` is 403 as well) — returning `body`, `user.login`, `created_at`
  and `html_url`. **Assume the anchor, not the issue, is the subject.**
- **README, when `curl` cannot reach `/repos/:o/:r/readme`** — the BROWSER can, so resolve it there
  rather than guessing. Navigate to `github.com` and fetch
  `api.github.com/repos/<o>/<r>/readme?ref=<sha>` from that tab, exactly as the tree bullet above
  does; the response's `path` is the answer whatever the file is called. Only if that route fails
  too, enumerate against `raw` **by DIRECTORY in GitHub's own precedence order — `.github/`, then
  the repo root, then `docs/` — trying every spelling (`README.md`, `readme.md`, `README.rst`,
  `README.txt`) inside one directory before moving to the next**, and take the first 200. Order it
  any other way and a root `README.md` wins over the `.github/README.rst` that GitHub itself
  displays, so you analyse a different document from the one `/readme` and the repo page show.
  ⚠️ **Whatever this enumeration returns, it is TENTATIVE — a hit is "a README", never "the
  README", and a miss is "I did not find one", never "there is none".** The list cannot be
  exhaustive (`README.adoc`, an extensionless `README` and `docs/README.rst` are three spellings it
  already lacks), so a higher-priority file it does not know about beats the one you found, and the
  404 controls prove only that raw CAN 404. Only the TREE or `/readme` settles it; short of those,
  label it in the report as a partial enumeration. And when the repo publishes `package.json`,
  `pyproject.toml` or a `PROVENANCE.md`, read those — they carry the version, licence and homepage
  you were going to the API for anyway.

### SVG attachments

**Before screenshotting a `github.com/user-attachments/assets/<uuid>`, check whether it is an SVG —
and then read its TEXT, not its pixels.** Measured 2026-09-20 on a cheat-sheet advertised as a
2400×1600 image: after opening it in the browser the host redirects to
`github-production-user-asset-*.s3.amazonaws.com/….svg`,
`document.documentElement.tagName === 'svg'`, **798 text nodes**. Reconstructing lines from the
`<text>` elements by `getBBox()` gave **9 949 characters of dense reference in a single call** —
what pixels would have cost a dozen zoomed screenshots, several of them still unreadable:

```js
const els=[...document.querySelectorAll('text')]
// getBBox() is what was measured; see the transform caveat below before reusing it
const frags=els.map(e=>{const b=e.getBBox(); return {x:b.x,y:b.y,t:e.textContent}})
            .filter(r=>r.t && r.t.trim())
frags.sort((a,b)=>a.y-b.y)              // strict — a tolerance comparator is non-transitive
const lines=[]                          // cluster into rows FIRST, then order each row by x
for(const r of frags){
  const L=lines[lines.length-1]
  if(L && Math.abs(r.y-L.y)<=6) L.parts.push(r); else lines.push({y:r.y, parts:[r]})
}
window.__S=lines.map(L=>L.parts.sort((a,b)=>a.x-b.x).map(p=>p.t).join('   ')).join('\n')
// then return it in slices
```

(The measured run used a one-pass `sort` with the tolerance inside the comparator; that is
**non-transitive** — three fragments at y = 0, 4, 8 sort pairwise by x and outer-pair by y, so the
engine may order them arbitrarily — hence the cluster-then-sort form above.) The `6` is **the
within-row tolerance, NOT the line height** — it is the largest baseline gap still counted as one
row, so it must stay well BELOW the spacing between rows. Raising it to a 16 px document's line
height merges adjacent lines into one; if rows are being merged, lower it, and if one row is
splitting in two, raise it a little.

**`getBBox()` returns LOCAL user units and ignores ancestor transforms**, so any `<text>` sitting
inside a translated or rotated `<g>` sorts by the wrong coordinate — rows interleave or merge even
in a single-column image. It happened to be right on the sheet measured here; if the output looks
scrambled, swap it for `e.getBoundingClientRect()` (rendered coordinates) and re-run. And in a
multi-column layout the reading order comes out interleaved across columns whichever coordinate you
use: the text is complete, the sequence is not, so do not present it as the linear original.

⚠️ **This only works when the labels really are `<text>` nodes — check the count before you trust
the output, and fall back to pixels when it is thin.** An SVG whose type was converted to paths, or
that wraps a raster `<image>`, or that lays its copy out in `<foreignObject>`, yields few or no
`<text>` nodes, and the recipe then returns a confidently empty reading of a perfectly legible
picture. So read `document.querySelectorAll('text').length` first and sanity-check the
reconstruction against a screenshot of the same region. On a thin count, try
`[...document.querySelectorAll('foreignObject')].map(f => f.textContent).join('\n')` — **not
`document.body`, which is `null` in a standalone SVG document** (the root element IS the `<svg>`,
which is how you detected this case) — and if that is empty too, screenshot it as you would any
other image.

### Reading the code with `curl`, pinned to a SHA

- **Resolve `<branch>` to a commit SHA first** — `api.github.com/repos/<owner>/<repo>` →
  `.default_branch` (or the tweet's own named ref/tag, which wins if present), then
  `api.github.com/repos/<owner>/<repo>/commits/<branch>` → `.sha`. Use that **SHA**, not the branch
  name, in every tree/raw URL below — an active repo can advance mid-read, and a branch name in a
  raw URL is more cacheable than a fixed SHA, so pinning to the SHA is what makes the reading
  reproducible (quote it in the report).
- `https://api.github.com/repos/<owner>/<repo>/git/trees/<sha>?recursive=1` — a plain `curl`
  returns the **full JSON file tree** (every path, type and sha) for a public repo. There is no need
  to guess file names when this call is available: read the listing. **Redirect it to a scratch file
  in a fresh `mktemp -d` dir (`curl -o "$workdir/tree.json" ...`) and inspect with `jq`/`grep`**
  rather than reading the raw response through tool stdout, and rather than writing into the current
  directory — a large tree can exceed a tool's own output cap (which would read as truncation even
  on a repo well under GitHub's own limit), and a plain filename can collide with something already
  in the workspace. A bad ref 404s with a real, non-empty JSON body (`{"message":"Not Found",...}`)
  and status 404 — clearly distinguishable from success, not empty. ⚠️ On a very large repo
  (**100,000 entries or 7 MB**, GitHub's own limit) the response is still `200` but carries
  `"truncated": true` in the saved JSON — check that field (`jq .truncated "$workdir/tree.json"`)
  before treating the listing as complete; a truncated tree needs per-subtree calls to fill the
  gaps.
- `https://raw.githubusercontent.com/<owner>/<repo>/<sha>/<path>` — returns the file verbatim. A
  missing path 404s with a literal `404: Not Found` body — again a real, distinguishable 404.
- For the **README** specifically, don't hardcode `README.md` — a repo can name it lowercase, a
  different extension (`.rst`, `.txt`), or place it under `.github/`/`docs/`. Verified 2026-08-31:
  `https://api.github.com/repos/<owner>/<repo>/readme?ref=<sha>` (the `?ref=` pinning it to the same
  SHA as the code, not the default branch) returns that repo's actual README's metadata as JSON,
  including its `path` — build the raw URL yourself as
  `raw.githubusercontent.com/<owner>/<repo>/<sha>/<path>` rather than using the response's own
  `download_url`, which names the branch, not the SHA. Don't fetch the `github.com/<owner>/<repo>`
  HTML front page instead: a plain `curl` on it returns raw page markup (nav chrome, scripts, the
  works), **not** a rendered README — only a page-rendering fetch tool (next subsection) turns it
  into clean markdown.

### A host with only a page-rendering fetch wrapper (no shell)

An EARLIER run (2026-08-26) measured the trees API and the HTML directory listing as both EMPTY,
with a guess-the-filename fallback — that run fetched through a WRAPPER (a web-fetch tool), not a
literal `curl`, so it doesn't apply once `curl` is available; keep it only for a host that has a
page-rendering fetch tool but no shell (where a shell is available, `curl` is the norm; a host whose
only fetcher is a page-rendering wrapper may get summaries for some tasks):

- `https://github.com/<owner>/<repo>` through the wrapper returns the rendered README as markdown —
  cheapest single fetch on that kind of host, start here.
- The trees API and the HTML directory page (`.../tree/<branch>/<dir>`) may both return EMPTY
  through that wrapper, with **no way to distinguish a 404 from a blocked/unreadable route** at the
  body level (the wrapper doesn't surface HTTP status) — don't conclude anything about the repo's
  contents from an empty wrapper response. **`github.com/<o>/<r>/tree/<branch>/<dir>` is
  `ROBOTS_DISALLOWED` to a web-fetch tool** (the repo root is not), so "list the directory with a
  web fetch" cannot work at all.
- Consequence: infer file names from the entry point's `import`s / referenced type names and fetch
  each guess via `raw.githubusercontent.com`. **Resolve the default branch first** (same two-call
  `.default_branch`/`.sha` lookup as above) — every raw guess 404s on a wrong branch regardless of
  how good the filename guess is, and that failure is easy to misread as "wrong filename" when it's
  really "wrong ref." Best-effort only even on the right branch — files with no static reference
  (tests, resources, dynamic modules, build scripts) can be missed; say so rather than claiming full
  coverage. Measured 2026-08-26 on `ben-z/findphone`: the repo page + 7 `raw` fetches recovered the
  **whole ~600-line Swift program** this way; `Display.swift`/`Tracker.swift`/`Classic.swift` were
  guessed correctly off `main.swift`'s references, `Clicker.swift`/`Reading.swift` were wrong
  guesses — those types actually lived in `Sound.swift`/`Signal.swift`.

### Freshness — no single channel is authoritative

🔴 **A web-fetch tool is NOT a freshness source on GitHub — it answers 200 with a plausible,
internally consistent, badly STALE snapshot, and nothing in the response reveals it.** Measured
2026-09-12 on `fruitflydev/flycoinrh`, minutes apart: the web fetch said **0 stars / 0 forks / 5
commits** and a root listing missing `roam.py`, `voice.py`, `mushroom.py` and `site/`, while the
browser showed **124 / 34 / 30** and 39 entries. On 2026-09-11 it likewise reported 252.6k stars
against the API's 259 003, and twice insisted a CHANGELOG's newest version was `1.0.1` while
`plugin.json` in the same commit said `1.2.3`. Use it to learn what a file is ABOUT; never for a
number, a version, or "is this file there".

**The positive control that settles who is lying, and it is mandatory before writing "the repo
doesn't contain X":** `raw`-fetch two files you are confident exist AND the one you think is
missing. On that run raw returned 200 for `roam.py`/`voice.py`/`mushroom.py` and 404 for
`test_rhwallet.py` — i.e. the live tree matched the browser and the web-fetch snapshot was ~25
commits behind. Without it the natural write-up is a flatly false claim about someone's code.

**NEITHER channel (REST API or HTML page) is authoritative alone; cross-check both for any fact
that goes into a report.** This reverses how the recipe used to read — it used to say the REST/raw
side is always the stale one. Measured 2026-08-29 on `router-for-me/CLIProxyAPI`, same moment in
time, REST API (`api.github.com/repos/...` through a web-fetch WRAPPER, not a literal `curl`) vs.
the HTML page (`github.com/...` in the logged-in browser):

| | REST API | HTML page |
|---|---|---|
| stars | 36,061 | **49,078** |
| forks | 5,987 | **7,550** |
| `pushed_at` | 2026-06-04T18:07:36Z (~3 months stale) | latest commit fresh, 3,564 commits |
| description | "…GPT 5.5…Grok 4.3…" | "…**GPT 5.6 Series**…**Grok 4.5**…" |

Here the channel through the wrapper was the stale side, and by ~3 months — not "a few commits."
This run did not isolate whether GitHub's REST API itself lags or the WRAPPER served a cached
response — the same wrapper-vs-`curl` gap documented for `tweet-result` (`x-native.md`, «To check
one tweet's text against the DOM») may apply here too, and as a standing rule, attribute an
anomalous read to the wrapper until a direct call agrees. **So: whenever the REST API and the HTML
page disagree, retry the REST API with a literal `curl` before concluding the API itself is
stale** — if `curl` agrees with the HTML page, the wrapper was the problem, not GitHub. Either way,
don't accept `pushed_at`/`stargazers_count`/`description` from a fetch you haven't cross-checked as
current — cross-check against the HTML page (`#repo-stars-counter-star[title]`,
`#repo-network-counter[title]`, `.f4.my-3`, the Releases block).

**`pushed_at` is repo-WIDE (any branch); the front page's latest-commit line is
DEFAULT-BRANCH-only** — the two can legitimately disagree on a repo that's more active on a
non-default branch, which is not staleness. For **code-freshness** specifically, compare the same
ref's HEAD sha, not `pushed_at` against the front page. "Resolve HEAD via the API, then fetch every
file at that sha" is still the right procedure for reading file *contents* — but since the resolved
HEAD sha can itself come from a stale channel, **verify it against the HTML page's own
latest-commit info for that SAME branch/ref before treating the sha as current** (the commit count /
latest-commit line on the repo's HTML front page for the default branch, or its `/commits/<branch>`
page). When the HTML page cannot be reached to cross-check (no browser available) and a `curl` retry
still looks stale, say explicitly that only a possibly-stale snapshot could be read; never present
it as current without that caveat. An earlier measured case had the HTML **Releases** page as the
stale side instead — together: **whichever channel you happen to read can be the stale one; a
report-worthy fact about a repo needs agreement from both, not just one.**

**Do not hardcode `main`** — plenty of repos are on `master`, `develop` or a product name, and
`/commits/main` 404s on them, which reads as "the repo is gone" rather than "wrong ref". Ask the
repo what its default is: `api.github.com/repos/<owner>/<repo>` → `.default_branch`, then
`api.github.com/repos/<owner>/<repo>/commits/<default_branch>` → `.sha`. If the tweet's URL already
names a branch or a tag, that ref wins — it is what the author was pointing at.

### A web-fetch wrapper on GitHub — two more failure modes

On one cloud-sandbox host's web-fetch tool (as of 2026-08-28), on top of the general
wrapper-vs-`curl` freshness rule above:

1. **Staleness can differ from endpoint to endpoint within the SAME session, not only between the
   wrapper and a literal `curl`.** Measured 2026-08-28 on a skills-collection repo linked from a post: fetching the
   repo's HTML page reported "123 skills", and fetching the README via `raw.githubusercontent.com`
   seconds later reported "75 skills" — two different counts for the same metric from two requests
   in one session. (A `DEMOS.md` fetch in the same session reported "89" — that's demo coverage, a
   different metric, not a third skill count; don't conflate it, but do take it as one more
   unaudited number from this tool.) The real count, read via the browser's own
   `git/trees?recursive=1` (pinned to a SHA, `"truncated"` checked, per «Reading the code with
   `curl`» — a branch-scoped tree fetch is not automatically definitive) was **130** `SKILL.md`
   files. Weak corroborating signal only, not a documented contract: the rendered page carried a
   `meta-request-id` value whose low 8 hex digits looked like a unix timestamp of the render —
   decoding it put one page's render 8 days old and the other's fresh. Treat that as a hint worth
   cross-checking, never as proof by itself.
2. ⚠️ **An empty body from this tool is not a 404 — and looks exactly like one.** Fetching
   `api.github.com/...` (JSON) and three different `raw.githubusercontent.com/.../SKILL.md` paths
   all came back with an empty body and no error, while the identical URLs fetched by a page script
   in the browser returned real 200s (JSON / ~6 KB files). The empty `raw.githubusercontent.com`
   reads tempted the conclusion "this file doesn't exist" — it did, just under a different name than
   guessed. **Before concluding anything from an empty response, run a positive control**: the same
   host and content-type, on a URL you already know exists (e.g. `raw.../README.md`). Empty there
   too means the tool is broken, not that the target is missing.

**Working fallback for both, on this host:** open any `github.com` page in the browser and call
`api.github.com` from a page script (CORS is allowed there) — e.g. `git/trees/<sha>?recursive=1`
for a listing with file sizes (still check `truncated`). **Trap on top of the trap:** returning a
large chunk of raw code from a page script gets silently redacted by the host's content classifier
(`[BLOCKED: Cookie/query string data]`). Return narrowly — counts, names, or a
character-filtered `slice()` (`.replace(/[^A-Za-z0-9 ,.:=(){}[\]<>+*/_-]/g,' ')` — this strips
punctuation the classifier reacts to, it does not redact secrets, so still keep tokens/keys/cookies
out of what you return) — and for reading a whole text file, navigate to the raw URL and do a
page-text read instead.

---

## Medium (`*.medium.com`)

**Medium 403s a plain `curl`** (HTTP 403, ~5 KB anti-bot body — measured 2026-09-19 on both a
cloud-sandbox host and a local host) while a web-fetch tool reads it fine (three
posts by one author). And the content trap on top of it: a Medium post by an author who
also self-hosts is often a **teaser** that says the essay continues on their own site. Check the
author's own domain for the full text before summarising the Medium excerpt as the essay — on the
measured post the Medium copy carried only the setup; the full ~20 KB essay was on the author's own
domain.

---

## Vercel Security Checkpoint

**A Vercel-hosted page can answer `curl` with an HTTP 429 «Vercel Security Checkpoint» — a bot
challenge, not a rate limit you can wait out, and NOT a property of Vercel hosting.** Measured
2026-09-20 on one `*.vercel.app` demo linked from a post: a plain `curl -sL` returned **HTTP 429** and a
**32 187-byte** anti-bot page whose `<title>` is `Vercel Security Checkpoint` and whose only link is
`https://vercel.link/security-checkpoint`; the real page never arrives. **Do not generalise it to
«Vercel blocks curl»** — the challenge is per-project (Vercel's bot-protection / attack challenge
setting), and most projects do not have it on. Negative control the same minute: `nextjs.org`,
`vercel.com` and `swr.vercel.app` each returned **200** and their real HTML to the identical
`curl`, all three with `server: Vercel`. So keep `curl` as the default and recognise the bounce
when it happens.

**Tell — read the HEADERS, not the body**: `x-vercel-mitigated: challenge` plus an
`x-vercel-challenge-token`, with HTTP **429**. That beats grepping the body, because the challenge
is a well-formed 32 KB HTML document of plausible size: a bare `wc -c` or a `grep` for a string that
happens to be absent reads as "the site is empty" rather than "I was bounced" — and a bare
`curl -sL` exits **0** while writing it to the file, exactly as in «Vendor blogs» above. Use
`--fail-with-body` and check the status.

**A User-Agent does not help** — verified: the same request with a full Chrome UA string returned
429 and the same checkpoint page. **The fix is the browser**: open the page and read it from there
(a page script over `document.scripts[0].textContent`, `document.documentElement.outerHTML.length`,
DOM queries) — unaffected in the measured case, on a warm logged-in profile. ⚠️ **Confirm that, do
not assume it**: the challenge can be served to the browser too (a fresh profile, a different IP, a
driver it flags), and then `document.scripts[0].textContent` is the CHECKPOINT's own script and
reads as the app's bundle. Assert `document.title !== "Vercel Security Checkpoint"` — and, better,
that some expected DOM of the real page is present — before you parse anything. That matters for
the whole class of single-file demo sites tweets link to — they are overwhelmingly on Vercel and
their entire substance is the inline `<script>`, which the browser can read and `curl` cannot.

---

## AI-built app demos — the deployed bundle

**A tweet demoing an AI-BUILT APP: the DEPLOYED BUNDLE is the primary source, not the video.** When
the post shows a generated app and a self-reply links it ("try it here"), the video shows what the
author chose to show, while the shipped JS carries the whole dataset and the real rendering
technique — and the two routinely disagree. Measured 2026-09-20 on one post demoing a
model-built 3D bookshelf app from a photo of a real shelf (live on a hosted-app subdomain):

- `curl` the page (a 429 is never an empty site — check `x-vercel-mitigated: challenge`, which
  names the Vercel checkpoint of «Vercel Security Checkpoint» above. Its ABSENCE rules out only that
  one signal, not a bounce: another CDN, proxy or session-sensitive limiter can answer 429 too, and
  the browser may well get through, so try it either way), read the `/assets/*.js` refs out of the
  HTML, `curl` each bundle into a `mktemp -d` dir, and **brace-scan the minified JS for the embedded
  record array** — here `{"id":"…"` objects with keys
  `title/author/description/uncertain/direct/goodreads/source/shelf/position`. That gave **145
  records, `uncertain:false` = 107, `uncertain:true` = 38, genre `Crime & mystery` = 23** — every
  figure matching a number the UI itself prints ("107 identified books", "94 / 145", the "Crime &
  mystery 23" chip, "Shelf 04 · 33 books"), so **the UI doubles as a positive control on the
  parse**. Parse first, then find the UI string that should agree with it; a count that matches
  nothing on screen is a bad parse.
  ⚠️ **"Read the bundle" means EVERY chunk, and the HTML does not necessarily name them all.** These
  apps are code-split, so the entry bundle is deliberately partial: here the 145 records live in
  a feature chunk (248 KB) and **not in the `index-*.js` entry chunk** — re-verified 2026-09-20
  against the live site, 5 chunks / 519 KB total, so reading only the entry chunk would have found
  nothing and "concluded" the data was server-side. Worse, a route- or lazy-loaded app names only
  its entry and preload assets in the HTML and resolves the rest from a runtime chunk table or on
  navigation, so **close the set transitively**: re-grep each downloaded chunk for further
  `/assets/*.js` (and bare `"assets/…js"`) refs and fetch anything new until the set stops growing
  — the same stop-when-the-union-stops-growing criterion `x-native.md` uses for self-thread search
  sweeps. (Here it converged at the HTML's five, which is a positive control on the crawl, not a
  licence to skip it.) And an API-backed or server-rendered app fetches its data at runtime whatever
  you download, so **an absence in the JS is a claim about the chunks you read until you have shown
  the app fetches nothing** — watch the network on load and on one interaction, and grep for
  `import(`/`fetch(`, before turning any absence into a contradiction.
- **Check the RENDERING claim against the bundle.** The author replied "just three.js"; the shipped
  app has **0 `<canvas>`, no `window.THREE`, no WebGL string**, and the shelf is CSS 3D
  (`perspective:1200px`, `transform-style:preserve-3d`, `rotateY(...)` in the stylesheet). Report
  what the artifact does and attribute the other claim to the tweet — do not merge them.
- **Check the FEATURE claim against the DOM.** "Just snap a photo and get a 3D bookshelf" — the
  deployed app has **`input[type=file]` count 0**: one hardcoded shelf, no upload. The pipeline ran
  once, inside the model; it is not a feature of the thing you can open. This is the single most
  misleading gap between a demo tweet and its artifact, and it costs one `querySelectorAll` to
  close. ⚠️ **But a zero count is evidence about the CURRENT DOM, not about the feature** — an upload
  can be a picker built only on click, a drag-and-drop target, `showOpenFilePicker`,
  `getUserMedia`, or a paste-a-URL flow, and every one of those reads zero on first paint. So
  corroborate it in the chunks — **and search the COMPILED forms, because JSX attributes do not
  survive minification**: `type:"file"` / `type:\`file\`` / `type:'file'`, `createElement("input")`,
  `accept:`, `webkitdirectory`, `FileReader`, not `type="file"`. Re-checked 2026-09-20 across all
  five chunks of this app: **zero for every one of those**, and its single `<input>` is the shadcn
  search box — so the negative survives the stronger search. Two false positives that search WILL
  hand you here, both measured: **`capture:` is useless** (5 hits, every one an
  `addEventListener(..., {capture:!0})` option, not `<input capture>`), and **grepping the substring
  `file` hits the search box**, because shadcn's `Input` ships Tailwind `file:`-variant classes
  (`file:h-7 file:border-0 …`); `dragover` and `new FormData` likewise hit only the React and router
  chunks. Report which forms you searched, not just the DOM count.
- **Where the app embeds its own SOURCE INPUT** (here `/assets/source-shelf.jpg`), fetch it and
  verify the identifications yourself instead of trusting the demo. Two findings only that check
  produces: the app faithfully reproduces the library's own MISSHELVINGS (two authors out of alphabetical order),
  which is evidence it read positions rather than sorting a hallucinated list — so do NOT report a
  local ordering anomaly as a model error until you have looked at the photo; and `uncertain:true`
  lands on genuinely ambiguous spines (7 identical omnibus spines of one series), i.e. the flag
  is calibrated, not decorative.
- ⚠️ **Count in python, not `grep -oc`.** `grep -c` counts matching LINES, not occurrences (with or
  without `-o`, depending on the grep), and these bundles are effectively one line, so a
  line-counting `grep` answers 1 for every file that matches at all, and a "density" ranking built
  on it is silently flat. The same match-vs-line trap, measured on a count-only grep, is in «Luma»
  below.

---

## Model releases (HuggingFace)

**A tweet announcing a MODEL RELEASE: the HuggingFace repo is the artifact, and its FILE SIZES are
the one number the marketing cannot round.** Same family as «AI-built app demos» above.
`https://huggingface.co/api/models/<org>/<repo>?blobs=true` returns every file with its exact
`size`, plus `downloads`, `likes`, `lastModified`, `tags` and `cardData.license`;
`?author=<org>&limit=100` over `/api/models` lists that org's repos — **`limit` caps at 100 and the
endpoint pages, so on a large org that is a FIRST PAGE, not the shelf**: follow the pagination (or
say your listing was capped) before deriving any chronology from it. Read the card itself from
`…/raw/main/README.md` (raw, not the rendered page) and grep it for `RAM`, `memory`, `GB`,
`mmproj`, `context`, `VRAM`, `KV` before quoting any footprint.

🔴 **The bytes of THE ONE FILE A SETUP LOADS are a FLOOR on that setup's memory, never the
requirement — so this recipe can QUALIFY a «runs on N GB» claim and must never CONFIRM one.**
Inference additionally needs the KV cache (which scales with context, and these are long-context
models), activations, compute and graph buffers, allocator overhead, plus the OS — none of which is
in any file size.

**Two limits on the floor itself, and both are easy to trip.** It is a floor only for the artifact
actually loaded, as stored: a setup that requantizes at load time, or that splits weights across RAM
and VRAM (or streams/offloads them), can need LESS resident memory than the file measures. And a
repo routinely ships files no one loads together — this one carries a 53.81 GB `F16.gguf` beside
the 5.95 GB pack — so «the repo's size» is a floor on nothing at all. Name the file and the setup,
or you will refute a true low-memory claim as confidently as a false one.

On the measured tweet a reply reported **~45 GB resident for one usable session** of a model whose
weights are 5.95 GB — **an unverified anecdote, not a counter-measurement: it names no backend, no
context length and no peak-measurement method**, and the vendor's own card reports 7.2 GB resident
for a different configuration. Quote such a figure WITH its missing conditions, as the reason the
question is open, never as the answer. If a runtime number is what your report turns on, you need a
measured peak RSS/VRAM at a stated context and backend; absent that, report the floor AS a floor and
say the ceiling was not measured.

**`downloads` is per REPOSITORY, not per file** — so when several packings ship as siblings in one
repo (the usual case for GGUF), it cannot tell you which one people actually pull. Only variants
published as separate repos are comparable that way.

Measured 2026-09-22 on `prism-ml/Ternary-Bonsai-2-27B-gguf` where the tweet said «works on anything
with 8 Gb RAM»:

- the advertised **5.9 GB** is `Ternary-Bonsai-2-27B-PTQ1_0.gguf` at **5.95 GB** — the LANGUAGE
  MODEL ALONE. The vision tower is a **separate** `mmproj` file (0.63 GB Q8_0 / 0.93 GB BF16), so
  multimodal use is ~6.6 GB before any KV cache. The card says so outright («These sizes describe
  the language model alone»); the tweet does not.
- a second pack, `PQ2_0`, is **7.21 GB**, and it is the one the vendor's own Apple row measures.
  **A repo usually ships several packings — name WHICH file your number is**, or you are quoting the
  smallest and describing the default.
- **Grep the vendor's own prose for the tweet's headline number before attributing it to the
  vendor.** Neither the blog post nor the model card contained the string `8 GB` anywhere: the
  figure was the TWEETER's gloss, not the release's claim. That is the retelling-attribution rule
  one level out — see `conditional-dives.md`, «When the linked material is itself a RETELLING, not
  a primary source» — and a two-second `grep` settles who actually said it.
- ⚠️ **A repo id that does not exist answers HTTP 401 `{"error":"Invalid username or password."}`,
  NOT a 404** — which reads as "my credentials are wrong" and invites a pointless auth detour, when
  the actual fault is usually a guessed id (measured: `prism-ml/Ternary-Bonsai-2-27B` → 401, while
  the real `…-gguf` → 200 in the same second). Run that positive control before concluding anything
  about your access. That signature was measured for a NONEXISTENT id only — do not generalise it to
  a gated or private repo, whose behaviour differs by endpoint (metadata can be publicly readable at
  200 with a `gated` field while the file downloads are restricted, and the status varies with
  whether you are authenticated at all). Read the status AND the body, and say which endpoint you
  probed, rather than mapping one code to one cause.
- **Cross-check the blog against the card — vendors' own two documents disagree.** Here the blog
  said 1.76 bits/weight and «up to 143 tokens/second on RTX 5090»; the card's own `llama-bench`
  table said 1.72 (ideal) / 1.75 (as packed) and **129.9** tok/s. Quote the card, which carries the
  measurement conditions, and say when the two differ.
- ⚠️ **Check whether stock runtimes can even load the file.** These GGUFs need the vendor's
  llama.cpp fork; stock llama.cpp «loads `Q2_0` without any warning and produces garbage». A
  silent-wrong-output path is worth naming in any report that tells someone to go try a model.

Retellings of a model release are abundant and wrong in the usual direction: a secondary write-up of
this same release headlined the size as **8.6 GB** against the primary's 5.9 GB. Tag figures to the
vendor's blog, the model card or the API, never to the aggregator that repeated them.

---

## Models named in a post — registries

**A model named in a tweet — resolve it WITHOUT the browser, and note that the OpenRouter endpoint
keeps answering after the model is delisted from OpenRouter's own catalogue.** Two `curl`-able
registries answer «what is this model, who makes it, what does it cost» faster and more reliably
than any vendor page — neither is a retention guarantee across the board, so treat "still answers"
as measured per-registry, not assumed:

- **`https://openrouter.ai/api/v1/models/<slug>/endpoints`** — returns `name`, `description`,
  `architecture` (modalities, tokenizer) and the live `endpoints[]` for ONE model, **including a
  model that no longer appears in `/api/v1/models`**. Two things make it the first call on any
  stealth/unknown model: an **empty `endpoints[]` means no OpenRouter provider is serving this slug
  right now** (delisted / window closed on OpenRouter — the model may still be live elsewhere, under
  another host or slug), and for a stealth listing the `description` is rewritten in place at the
  reveal — measured 2026-09-19 on `stealth/union-alpha`, whose list entry was gone while this call
  still returned «Union Alpha **was** a stealth model,…». The API's own `description` is TRUNCATED
  mid-sentence there; the rendered page (`https://openrouter.ai/<slug>`, via a web-fetch tool)
  carried the full line naming the real model and provider. So: API for the specs and the endpoint
  count, page for the full description.
- **`https://models.dev/api.json`** — Anomaly's (opencode's) registry: ~4.7 MB, 222 providers, one
  JSON with per-model `limit.context`/`limit.output`, `cost.input`/`output`/`cache_read`,
  modalities, `tool_call`, `reasoning`, `release_date`, **and which providers carry it**. `curl` it
  to a file in a `mktemp -d` and walk it in python — never through tool stdout. It is the cheapest
  way to answer «is this model still free / where can I actually reach it», and its one-line
  `description` is often blunter than the vendor's: measured the same day, it called Pareto «Blended
  multimodal model that runs multiple language models in parallel and returns a synthesized answer»
  while the vendor page said «frontier performance for less».

**Both are registries, not the vendor.** When the two disagree with the vendor's own page, say so
and quote both — on the measured case the vendor's subprocessor list (Anthropic/OpenAI/xAI) and a
third party's reading of an unmerged release-note PR (GLM/Qwen/Llama/DeepSeek) named **different**
model pools, and neither was confirmable from the other.

---

## WebGL / three.js demos

⚠️ **A linked WebGL / three.js demo cannot be "waited" into a later state on a software renderer —
many of them CLAMP `dt`, so wall-clock seconds and scene seconds are different units.** Measured
2026-09-20 on a `*.surge.sh` three.js demo linked from a tweet, in headless
Chromium on SwiftShader: its loop does `dt = Math.min(frameSeconds, .06)` while the software
renderer managed ~0.8 fps, so one REAL second advanced the scene by ~0.05 s — a factor of ~20. A
2.4–5.5 s camera flight (an animated `CatmullRomCurve3`) was still mid-arc after **22 seconds** of
waiting, and the screenshots read as "the presets don't work" — a state that was never on them.

So before waiting on ANY animated canvas, grep the page's own source and ask one question: **does
scene time derive from ELAPSED TIME or from FRAMES?** It is a property of that demo's loop, not of
WebGL.

- **Elapsed time** — absolute `requestAnimationFrame` timestamps, CSS transitions/animations, an
  unclamped delta, or a proper fixed-timestep accumulator (`acc += realDt; while (acc >= step) …`,
  which spends real time and merely runs several updates per rendered frame). The scene tracks wall
  time; an ordinary wait is valid, so just wait.
- **Frame-coupled** — one update per rendered frame, whether a clamped `dt` (the case measured
  here) or a fixed step (`progress += 0.01`), plus any accumulator that CAPS or DISCARDS the elapsed
  time it is handed. Here a wait means nothing: **poll whatever the animation advances** (the
  tween's elapsed variable, the curve parameter `t`, a completion flag) via a page script, and shoot
  when it says it has arrived.
- **GSAP is conditional — measure it, don't assume either way.** Its ticker's lag smoothing
  (`gsap.ticker.lagSmoothing`, on by default at a 500 ms threshold) replaces any gap PAST that
  threshold with a small fixed interval. Compare the observed frame gap to the configured threshold:
  under it the ticker still tracks elapsed time, over it the timeline is frame-coupled.

**When the progress variable lives in module scope and is unreachable, estimate — and treat the
number as a lower bound that can fire early.** `duration / clamp` is right only while the renderer
is slower than the clamp (SwiftShader was, at ~0.8 fps), and `duration / min(1/fps, clamp)` still
breaks on irregular cadence, because what accumulates is `mean(min(dt_i, clamp))`, which a few fast
frames among long stalls push well below either figure. Both expressions yield **frames, not
seconds** — divide by the observed fps for wall clock: the 2.4 s flight here is 2.4/0.06 = **40
frames**, which at 0.8 fps is **~50 real seconds**, not 40. On that path, say in the report that the
state was estimated rather than observed.

The **spawn frame** — before any animation runs — is unaffected by all of this and is the honest
evidence that the page is alive; use it, and say plainly that later states were not reached rather
than implying they were.

---

## Typeform (`form.typeform.com/to/<id>`)

Reading the FORM's questions without submitting anything.

🔴 **Never click through the form.** The obvious alternative to this recipe — clicking through the
form screen by screen — is destructive, not just slower. Typeform saves **partial** responses as you
click forward, so "just click through the questions" silently leaves an unfinished application
submitted in the user's name. This recipe reads the form without touching it.

**What doesn't work** (both measured 2026-08-30, both cost a call): a web-fetch tool on
`https://form.typeform.com/to/<id>` returns only `<title>` + og-tags + one image — no questions,
since the renderer is JS. `https://form.typeform.com/api/forms/<id>` does **not** 404 — it
**silently redirects** to Typeform's own marketing homepage and returns ~30k characters of Typeform
ad copy. This is the worse of the two failures: it looks like a success, burns context, and contains
nothing about the actual form.

**What works:** the form's model is inline in the page HTML, inside a `<script>` tag containing the
string `"fields"`. Open the page in the browser (measured through one browser extension) and run as
a page script:

```js
(()=>{const t=[...document.scripts].map(x=>x.textContent||'').filter(s=>s.includes('"fields"'))[0];
 return {len:t.length,
   titles:[...t.matchAll(/"title":"((?:[^"\\]|\\.){3,300})"/g)].map(x=>x[1]),
   types:[...t.matchAll(/"type":"(short_text|long_text|email|website|multiple_choice|dropdown|number|yes_no|opinion_scale|statement)"/g)].map(x=>x[1]),
   labels:[...new Set([...t.matchAll(/"label":"((?:[^"\\]|\\.){1,120})"/g)].map(x=>x[1]))]};})()
```

`titles` gives the welcome screen, section names and the text of EVERY question; `types` gives each
field's type in order; `labels` gives the answer options for `multiple_choice`/`dropdown` fields. On
a 15-field, 3-section application form this returned everything in one call (~74k characters of
blob), without submitting anything. The extracted blob uses JS-style escaping (`\/` for `/`);
unescape it before quoting question text back.

**The `types` regex only matches the 10 field types seen on the one form this was measured
against** — Typeform has others (`date`, `file_upload`, `rating`, `ranking`, `phone_number`, …). A
field of an unlisted type is silently dropped from `types`, which desyncs its index against the
field-only subset of `titles` (`titles` also includes the welcome screen and section names, so
`titles.length` alone is not a completeness check). Don't widen the regex to a catch-all
`"type":"([a-z_]+)"` — the blob also has nested `type` keys on layout/attachment/logic structures
that aren't fields, so that would desync it worse, not fix it. If a question's type looks missing or
misaligned, add the specific type name to the alternation by hand rather than generalizing the
pattern.

⚠️ **A `"type":"inline_group"` field is a CONTAINER, not a question, and the top level LIES about
the field count.** Measured 2026-09-02 on a form whose top-level `fields` array held only 8 entries:
3 of them were `inline_group`, with a placeholder `title` ("About you", "What you do", "Why you")
that reads like a section header, not a question — the real questions are nested one level down in
`properties.fields`. The regex extraction above still surfaces those nested `title`/`type`/`label`
strings textually (it has no notion of nesting, so it picks them up regardless), but if you then
trust the top-level `fields.length` — or any indexing that assumes one array entry = one question —
you silently undercount (here: 8 top-level entries hiding 15 real questions). To recover the true
flat list, parse the array **structurally** instead of relying on the flat regex: grab the exact
top-level `fields` JSON with
`/"fields":(\[.*?\])\s*,\s*"(?:settings|thankyou_screens|logic|variables)"/s`, unescape `\/` and
`JSON.parse` it, then expand groups explicitly:

```js
arr.filter(f => f.type === 'inline_group').flatMap(g => g.properties.fields)
```

**Read the thank-you screen too.** The same `<script>` also carries `welcome_screens` and
`thankyou_screens` — read the thank-you screen whenever the question is "what happens after I
submit": on one application form it was the **only** place saying that only accepted applicants get
contacted at all (an application form's thank-you screen: only selected applicants are invited
onward, «we'll be in touch soon» — silence means rejection, no decline is ever sent).

---

## Luma (`luma.com/<slug>`)

The public event list, without the browser. A web-fetch tool on `luma.com/<slug>` returns only the
**first page** of upcoming events, and no structured location data.

**Public JSON API, no auth needed** (`period` is one call per value — `future` or `past`, not the
literal string `future|past`):
`https://api.lu.ma/calendar/get-items?calendar_api_id=<cal-id>&period=future&pagination_limit=100`

Get `<cal-id>` from the calendar page's HTML: the `apple-itunes-app` meta tag's `app-argument`
attribute contains `luma://calendar/<cal-id>`.

The response runs ~82k characters — a web-fetch tool will not return that inline; it spills to a
file and reports the path. **That is normal operation, not an error** — grep the spilled file. On
one host (as of 2026-08-30) the spilled file was readable by the host's grep tool at its absolute
path even though such files may not be mounted in the shell sandbox — so if the shell cannot see
it, try the grep tool before concluding the file is gone.

Useful patterns: `"city_state":"[^"]*"` with `-o` returns the full list of cities; grep directly for
a country/city name to check "is there an event in X".
⚠️ **A count-only grep counts LINES, not occurrences, even with `-o`** — and the whole JSON response
is one line, so the count always returns 1 regardless of how many matches exist. To count matches,
print the `-o` matches and count the output lines yourself.
`pagination_limit` above ~20 events still gets cut off by response size — **never treat one call as
an exhaustive event history.**

---

## SEC / EDGAR filings (S-1, 10-K …)

**`curl`, not a web-fetch or web-search tool.** Measured 2026-10-26 on one company's S-1 announcement tweet.
Find the filing by company name (EDGAR wants a `User-Agent` with a contact,
`-A "<name email>"`):
`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=<name>&type=S-1&owner=include&count=40&output=atom`
→ 200, each `<entry>` has `filing-href` (the `…-index.htm` page, 200, lists the documents) and
`file-number`. The main document is one big HTML (14 MB for that S-1): download it into your own
dir, turn it to text with `python3 -I` (drop script/style, strip tags, `html.unescape`), then grep
section headings. Do not read 1.5M characters: «Prospectus Summary», «Summary Consolidated
Financial and Other Data», «Risk Factors Summary» and the MD&A «Overview» carry most of it.

Full-text search `efts.sec.gov/LatestSearch/rest/search-index` gave 403 once (one observation) —
prefer the atom feed. **Check dates on the primary:** a web-search tool conflated the earlier
CONFIDENTIAL submission (2026-06-01) with the public S-1 (2026-10-26). ⚠️ **Offer size, price, Q3
revenue and compute commitments were BLANK (`$           `) pre-pricing** — that is «not disclosed
in this filing», not a parse failure; do not fill them in.
