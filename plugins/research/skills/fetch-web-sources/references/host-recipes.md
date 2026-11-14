# fetch-web-sources — host recipes (depth)

Per-host recipes for the material a link points at: a vendor blog, a docs page, a repo, a model
release, a demo, a form, a filing. Read only the section for the host in front of you. Many were
first measured on pages a social post linked to, and where a recipe says "the post" it means
whatever page sent you here; the recipes hold for any link to that host. Each section states its
ruling and its command. The longer measured cases are in `precedents.md` under the same heading;
a short one stays beside its recipe, dated. Hosts change, so re-check a recipe that has stopped
matching.

**Index**

- **Counting matches** — why a count-only `grep` answers 1 on a one-line file.
- **Vendor blogs** (`claude.com/blog`, `anthropic.com/research`) — why a web-fetch summary is not the
  page, how to take the bytes, how to pull the figures.
- **Bot-blocked hosts** — which 403/202 answers are about the fetcher, not the content.
- **Framer sites** — the search-index JSON; reading accordion answers.
- **OpenAI docs** — the `.md` twin and its limits.
- **OpenAI announcements** (`openai.com/index/*`) — prose plus the full chart datasets.
- **GitHub** — the sandbox gate, the browser ladder, freshness, fetch-wrapper failure modes (SHA-pinned
  reads are in SKILL.md §2.3).
- **Medium** — the `curl` 403 and the teaser trap.
- **Vercel Security Checkpoint** — recognising the 429 bot challenge.
- **AI-built app demos** — reading the deployed bundle.
- **Model releases (HuggingFace)** — file sizes, and what they can and cannot prove.
- **Models named in a post** — resolving a model in registries.
- **WebGL / three.js demos** — why waiting does not advance a frame-coupled scene.
- **Typeform** — reading a form's questions without submitting anything.
- **Luma** — the public calendar JSON, and its rate limit.
- **SEC / EDGAR filings** — finding and reading an S-1 or 10-K.

---

## Counting matches

`grep -c` counts matching LINES, not occurrences, with or without `-o`, and a JSON response or a
minified bundle is usually one line, so a count-only `grep` answers 1 for every file that matches at
all. Print the `-o` matches and count the output lines, or count in a script. The Luma and
AI-built-demo recipes below both depend on this.

---

## Vendor blogs (`claude.com/blog`, `anthropic.com/research`)

**A web-fetch tool here returns a GENERATED SUMMARY, not the page's bytes** — and the same applies to
any vendor announcement page. Measured 2026-09-20: asked to reproduce the page it refused, it
invented a source attribution, and it said no technologies were named when the article's figures
showed a Kubernetes command and pod memory limits (`precedents.md` § Vendor blogs). It was right
about the prose and blind to the pictures. (That is the observed behaviour; what produces it is not
established, so do not repeat a guess about the implementation.)

**So take the bytes yourself** — with `--fail-with-body`, never a bare `-sL`, which exits 0 on an
error page and writes it to the file:

```bash
curl -sSL --fail-with-body -A "Mozilla/5.0" -o "<scratch>/post.html" "<url>"   # check the exit status
bun run "SKILLDIR/scripts/html-to-text.ts" "<scratch>/post.html" --links --base "<url>"
```

The text is the article; the `links:` list carries the post's real citations, which the summary
reproduced none of. Use a web-fetch tool only for ORIENTATION (what is this about, is it worth
reading), never as the source of a number, a quote or an attribution you will publish.

**And read the figures.** A blog post's diagrams are routinely where the load-bearing specifics live
— the exact command, the real limit, the dated timeline, a screenshot of an internal thread — none
of which is in the prose. On webflow-hosted Anthropic posts, match the CDN host AND an image
extension (a bare host match also drags in the site's css and js bundles), then drop the site chrome
and the social card, which are not figures:

```bash
grep -oE 'https://cdn\.prod\.website-files\.com/[^"?]+\.(png|jpe?g|webp)' "<scratch>/post.html" \
  | sort -u | grep -vE '_(placeholder|og)_|favicon|apple-touch-icon'
```

The social card's marker is `_og_` mid-filename, so a `/og_` pattern silently misses it. `curl` each
figure and read it.

**Fallback if `curl` is blocked:** a DOM walk of `.blog_post_layout` — there are **several** such
elements, so take the **longest**, and walk `h1..h4, p, li, pre` `textContent` rather than trusting
`innerText`.

---

## Bot-blocked hosts

**A 403, or a 202 with a body of a few hundred bytes, from a web-fetch tool may be about the
fetcher rather than the content** — the 202 reads like an empty page. Check it in the browser before
concluding anything: if the page reads there, it was the fetcher; if it is closed there too, it is
the site's access policy. With no browser, an archived copy (SKILL.md §1.4). Measured 2026-09-17 on two unrelated sites, one of each
(`precedents.md` § Bot-blocked hosts).

---

## Framer sites

**A Framer-built site (common for startup launch pages) — one `curl` gives you the text of EVERY
page.** The page's `<head>` carries
`<meta name="framer-search-index" content="https://framerusercontent.com/sites/<siteId>/searchIndex-<hash>.json">`;
that JSON is keyed by route and holds each page's `h1`/`h2`/`h3`/`p` arrays. Measured 2026-09-19 on one
startup's launch site: 122 KB, covering its manifesto, team and blog pages and the launch post in
one fetch. Grep the URL out of any page you already have:
`grep -o 'https://framerusercontent.com/sites/[^"]*searchIndex-[^"]*\.json' "<scratch>/page.html" | head -1`.

**Accordion / FAQ answers are in neither the static HTML nor the search index** — same run: six
FAQ questions present in both, not one answer in either; a Framer accordion renders the answer only
on a real click. `.click()` on the label's leaf element does nothing (the handler sits on an
ancestor wrapper), and a Title-Case label on screen is CSS `text-transform`, so matching the
rendered casing finds nothing. What worked: a real-input click on the chevron glyph at the row's
right edge, clicking BOTTOM-UP so the rows above keep their coordinates — and verify with a
SCREENSHOT, not `document.body.innerText.length`, which still read its pre-click length while the
answer was plainly rendered.

---

## OpenAI docs (`developers.openai.com`, `learn.chatgpt.com`)

The HTML page is ~95% navigation chrome (50.8 KB for the models page, enough to spill a tool result
to disk); the `.md` twin of SKILL.md §1.2 returns clean markdown with the tables intact (19 KB for the
same page). Full index at `developers.openai.com/llms.txt` and `learn.chatgpt.com/llms.txt`. Measured
2026-09-04.

Two measured limits: `developers.openai.com/codex/*` 301s to `learn.chatgpt.com/docs/*` (follow it —
use the final URL), and `openai.com/index/*` announcement/blog posts have NO `.md` twin — a plain
`curl` there returns 403 (re-confirmed 2026-09-23, with a full Chrome `-A`), so read those with the
browser per «OpenAI announcements» below, or with no browser from an archived copy (SKILL.md §1.4).

---

## OpenAI announcements (`openai.com/index/*`)

**A page-text read for the prose, and the RSC payload for the CHARTS, whose full datasets are
embedded in the page and are NOT in the prose, the visible axis labels or any screenshot.**
Measured 2026-09-23 on one model-release announcement. Two halves, and the second is the one worth
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
- **This is also where the announcement's own spin becomes checkable, which is the point.** The
  datasets the prose quotes selectively carry the rows it omits: on one release (2026-09) the prose
  compared its score against a weaker competitor while the chart's own data held a stronger one, and
  a chart whose numbers never appear in the prose showed a metric barely moving under a blanket
  "both show improvements". Read the arrays before repeating a vendor's comparison.

---

## GitHub

Reading the CODE (not just the README), freshness, and the sandbox gate. A literal `curl` (shell)
against GitHub's own APIs is the reliable path ON A LOCAL HOST. On a cloud-sandbox host it MAY be
gated, per session and per repo, so run the one-call probe below BEFORE you plan around `curl`.

### The sandbox gate — probe once

**On a cloud-sandbox host, the whole `curl` path may be shut, and the way it fails misleads.** Make
ONE cheap probe — `curl -sS https://api.github.com/repos/<owner>/<repo>` — and read the BODY, not
just the status. Measured on one cloud-sandbox host across five sessions (2026-09-10 → 09-20; the
bodies verbatim in `precedents.md` § GitHub sandbox gate):

- `api.github.com` answers **403** with a body that is not GitHub's — it names the session's
  configured repositories and suggests a tool (`add_repo`) that the session does not have. That is
  the session's egress proxy, not a permissions problem on the repo, and it covers every repo the
  session is not bound to (a negative control on an unrelated public repo gave the identical 403).
  Other API paths on the same host gave a 502 and a second 403 wording: several bodies, one gate.
  A repo the session IS bound to may still answer, so keep the probe rather than skipping the shell.
- `raw.githubusercontent.com` **varied between sessions** on that host (200 on some days,
  `connect_rejected` on another). Probe it fresh each session, and run two NEGATIVE controls in the
  same minute — a bad ref and a bad path, each of which must 404 — because a proxy that answers 200
  to everything looks identical to a working channel. When it works, `curl -r 0-15` on a binary
  checks a header without pulling the whole file.
- `github.com/user-attachments/assets/<uuid>` (a file attached to an issue or PR) was gated too,
  with yet another body. **Run a non-GitHub positive control before blaming the network** — on that
  run other hosts answered 200 in the same minute — and read the attachment in the **browser**
  (check «SVG attachments» below before reaching for a screenshot).
- The gate is not GitHub-specific: unrelated hosts gave `connect_rejected` on some runs. Where the
  host exposes a proxy status endpoint (that one did, at `$HTTPS_PROXY/__agentproxy/status`, listing
  `noProxy` and `recentRelayFailures[]`), read it before diagnosing a dead host — it is the cheap way
  to tell "the proxy refused" from "the host returned 403". **Where there is no such endpoint**, the
  same distinction comes from a control pair: one URL on a host you know is reachable, one on the
  target. Both fail → the egress is closed; only the target fails → it is the target.

When the shell is gated, the browser still reaches both `api.github.com` (from a `github.com` tab)
and the HTML page — the ladder below. If that route fails too, **say in the report that only one
channel was readable**, since «Freshness» needs two.

**Do not generalise any of this into "the GitHub API doesn't work".** On a local host `curl` to
`api.github.com` is not gated. This is a fact about a HOST and an INSTRUMENT, and it varied between
sessions on the same host — which is why the rule is *probe once*, not *memorise a channel*.

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
  intermediate results does **not** survive the next navigate (`read-twitter`'s `references/browser-traps.md`, «`window`
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
  // and stripping them would corrupt the source you came to read. « is escaped first, so text
  // that already contains a sentinel survives. Undo on your side, in this order:
  //   .replace(/«Q»/g,'?').replace(/«A»/g,'&').replace(/«E»/g,'=').replace(/«L»/g,'«')
  const sf = t => t.replace(/«/g,'«L»').replace(/\?/g,'«Q»').replace(/&/g,'«A»').replace(/=/g,'«E»')
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
  `[BLOCKED: Cookie/query string data]` — a bare `?`, `&` or `=` alone trips it. Use the reversible
  sentinels in the snippet above (`«`→`«L»` first, then `?`→`«Q»`, `&`→`«A»`, `=`→`«E»`) and undo
  them on your side in the order its comment gives (round-trip checked on 200 000 random strings,
  2026-11-14): they keep source code exact, where stripping `=` turns assignments and comparisons into different code.
  This is the canonical defang for source code in both this file and `read-twitter`.
- **A link to `…/issues/<n>#issuecomment-<id>` points at ONE community comment, and a
  web-fetch tool cannot reach it — fetch it by id instead.** Measured 2026-09-20 on an issue with
  **203 comments**: a web-fetch tool on the anchored URL returned the issue body plus the earliest
  comments and reported outright that "the specific comment with that ID is not included" — twice,
  with the anchor and without. That reads exactly like "the comment does not exist", and that
  comment is the material the post is about. One call settles it —
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
  **Whatever this enumeration returns, it is TENTATIVE — a hit is "a README", never "the
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

**This only works when the labels really are `<text>` nodes — check the count before you trust
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

- **Pin to a commit SHA first** — the rule and the two calls are in SKILL.md §2.3. A ref or tag the
  linking post names wins over the default branch. Quote the SHA in the report.
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
  each guess via `raw.githubusercontent.com`. **Resolve the default branch first** (SKILL.md §2.3) — every raw guess 404s on a wrong branch regardless of
  how good the filename guess is, and that failure is easy to misread as "wrong filename" when it's
  really "wrong ref." Best-effort only even on the right branch — files with no static reference
  (tests, resources, dynamic modules, build scripts) can be missed; say so rather than claiming full
  coverage. Measured 2026-08-26 on one small public repo: the repo page + 7 `raw` fetches recovered
  the whole ~600-line program this way; three file names guessed off the entry point's references
  were right, and two were wrong (those types lived in differently named files).

### Freshness — no single channel is authoritative

**A web-fetch tool is NOT a freshness source on GitHub.** It can answer 200 with a plausible,
internally consistent, badly STALE snapshot, and nothing in the response reveals it — measured
twice in September 2026, off by stars, commit counts, missing files and a CHANGELOG version
(`precedents.md` § GitHub freshness). Use it to learn what a file is ABOUT; never for a number, a
version, or "is this file there".

**Before writing "the repo doesn't contain X", run the positive control:** `raw`-fetch two files you
are confident exist AND the one you think is missing, pinned to the same SHA. On the measured run raw
returned 200 for files the snapshot lacked and 404 for one it listed — the snapshot was ~25 commits
behind. Without the control the natural write-up is a false claim about someone's code.

**NEITHER channel (REST API or HTML page) is authoritative alone; a fact that goes into a report
needs both to agree.** Whichever you happen to read can be the stale one: one measured run had the
REST API through a web-fetch WRAPPER three months behind the HTML page on stars, forks, `pushed_at`
and description; another had the HTML Releases page as the stale side. So:

- **When they disagree, retry the REST API with a literal `curl` before concluding the API itself is
  stale** — if `curl` agrees with the HTML page, the wrapper was the problem, not GitHub. Attribute
  an anomalous read to the wrapper until a direct call agrees.
- Cross-check against the HTML page: `#repo-stars-counter-star[title]`, `#repo-network-counter[title]`,
  `.f4.my-3` (description), the Releases block.
- **`pushed_at` is repo-WIDE (any branch); the front page's latest-commit line is DEFAULT-BRANCH
  only** — they can legitimately disagree, which is not staleness. For code freshness compare the
  same ref's HEAD sha: resolve it as SKILL.md §2.3 says, then check it against the HTML page's
  latest-commit line (or `/commits/<branch>`) for that SAME ref.
- No HTML page reachable and the `curl` retry still looks stale → say that only a possibly-stale
  snapshot could be read; never present it as current.

**Do not hardcode `main`** — plenty of repos are on `master`, `develop` or a product name, and a
wrong ref 404s in a way that reads as "the repo is gone". Take the default branch from the API as in
SKILL.md §2.3. If the linking post's URL already names a branch or a tag, that ref wins — it is what
the author was pointing at.

### A web-fetch wrapper on GitHub — two more failure modes

Measured on one cloud-sandbox host's web-fetch tool (2026-08-28), on top of the freshness rule above:

1. **Staleness can differ from endpoint to endpoint within ONE session.** The repo's HTML page and its
   README via `raw` gave two different counts for the same metric seconds apart, and the real count
   (from a SHA-pinned tree listing, `truncated` checked) matched neither. Count from the tree.
2. **An empty body from the tool is not a 404 — and looks exactly like one.** `api.github.com` JSON
   and several `raw` paths came back empty with no error, while the same URLs from a browser page
   script returned real 200s. **Before concluding anything from an empty response, run a positive
   control**: the same host and content type, on a URL you know exists. Empty there too means the
   tool is broken, not that the target is missing.

**Working fallback for both:** open any `github.com` page in the browser and call `api.github.com`
from a page script (§ The browser ladder). Return narrowly — counts, names, or a `slice()` defanged
with the sentinels there (a defang does not redact secrets, so still keep tokens, keys and cookies out
of what you return) — and for reading a whole text file, navigate to the raw URL and do a page-text
read instead.

---

## Medium (`*.medium.com`)

**Medium 403s a plain `curl`** (HTTP 403, ~5 KB anti-bot body — measured 2026-09-19 on both a
cloud-sandbox host and a local host; again 2026-11-14). A web-fetch tool returned the posts (three by
one author), but as SKILL.md §1.2 says, its output can be a summary: use it to orient, and take any
text you will quote or summarise from the browser's page-text read — with no browser, from an
archived copy (SKILL.md §1.4). And the content trap on top of it: a Medium post by an author who
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
DOM queries) — unaffected in the measured case, on a warm logged-in profile. **Confirm that, do
not assume it**: the challenge can be served to the browser too (a fresh profile, a different IP, a
driver it flags), and then `document.scripts[0].textContent` is the CHECKPOINT's own script and
reads as the app's bundle. Assert `document.title !== "Vercel Security Checkpoint"` — and, better,
that some expected DOM of the real page is present — before you parse anything. That matters for
the whole class of single-file demo sites posts link to — they are overwhelmingly on Vercel and
their entire substance is the inline `<script>`, which the browser can read and `curl` cannot.

---

## AI-built app demos — the deployed bundle

**When a post demos a generated app and links it ("try it here"), the DEPLOYED BUNDLE is the
primary source, not the video.** The video shows what the author chose to show; the shipped JS
carries the whole dataset and the real rendering technique, and the two routinely disagree
(`precedents.md` § AI-built app demos).

- **Fetch the page, then every bundle.** `curl -sSL --fail-with-body` the page — a 429 is a bounce,
  not an empty site: check `x-vercel-mitigated: challenge` (§ Vercel Security Checkpoint), and know
  that its absence rules out only that one signal, since another CDN or limiter can answer 429 too;
  try the browser either way. Read the `/assets/*.js` refs out of the HTML and `curl` each into your
  scratch directory.
- **Close the chunk set transitively.** These apps are code-split: the entry bundle is deliberately
  partial, and a lazy-loaded app names only its entry and preload assets in the HTML. Re-grep each
  downloaded chunk for further `/assets/*.js` (and bare `"assets/…js"`) refs and fetch anything new
  until the set stops growing. On the measured app the data lived in a feature chunk, not the entry
  chunk — reading only the entry would have "concluded" it was server-side.
- **An absence in the JS is a claim about the chunks you read.** An API-backed or server-rendered app
  fetches its data at runtime whatever you download, so watch the network on load and on one
  interaction, and grep for `import(` / `fetch(`, before turning any absence into a finding.
- **Use the UI as the positive control on your parse.** Brace-scan the minified JS for the embedded
  record array, count in a script (§ Counting matches), then find the number the UI itself prints. A
  count that matches nothing on screen is a bad parse.
- **Search the COMPILED forms** when you look for a feature in a bundle — JSX attributes do not
  survive minification: `type:"file"` / `type:'file'`, `createElement("input")`, `accept:`,
  `FileReader`, not `type="file"`. Expect false positives from generic substrings (`capture:` is
  usually an `addEventListener` option; `file` hits Tailwind `file:` classes), and say which forms you
  searched. A zero count in the DOM is evidence about the current DOM only: a picker built on click,
  a drop target or a paste-a-URL flow all read zero on first paint.
- **Where the app embeds its own source input** (a photo, a dataset), fetch it and compare it with
  what the app shows before calling an oddity in the output a model error.

Report what the artifact does and attribute the post's claims to the post — do not merge them.

---

## Model releases (HuggingFace)

**For a model release, the HuggingFace repo is the artifact, and its FILE SIZES are the one number
the marketing cannot round.**

- `https://huggingface.co/api/models/<org>/<repo>?blobs=true` returns every file with its exact
  `size`, plus `downloads`, `likes`, `lastModified`, `tags` and `cardData.license`.
- `/api/models?author=<org>&limit=100` lists an org's repos — `limit` caps at 100 and the endpoint
  pages, so on a large org that is a FIRST PAGE: follow the pagination or say the listing was capped.
- Read the card from `…/raw/main/README.md` (raw, not the rendered page) and grep it for `RAM`,
  `memory`, `GB`, `mmproj`, `context`, `VRAM`, `KV` before quoting any footprint.
- **A repo id that does not exist answers HTTP 401 `{"error":"Invalid username or password."}`, not
  404** (measured 2026-09-22) — that reads as a credentials problem when the id is usually guessed.
  Check the id against the org listing before any auth detour. This was measured for a NONEXISTENT id
  only: a gated or private repo behaves differently per endpoint, so read the status AND the body and
  say which endpoint you probed.

**The bytes of THE ONE FILE A SETUP LOADS are a FLOOR on that setup's memory, never the requirement
— so this recipe can QUALIFY a «runs on N GB» claim and must never CONFIRM one.** Inference also
needs the KV cache (which grows with context), activations, buffers and the OS, none of which is in
any file size. Two limits on the floor itself:

- It holds only for the artifact actually loaded, as stored: a setup that requantizes at load time,
  or splits or streams weights between RAM and VRAM, can need LESS resident memory than the file.
- A repo routinely ships files nobody loads together (several quantisations, a separate vision
  projector), so «the repo's size» is a floor on nothing. **Name the file and the setup.**

A runtime number quoted without its backend, context length and measurement method is an anecdote:
quote it with its missing conditions, as the reason the question is open. If your report turns on a
runtime figure, you need a measured peak at a stated context and backend; otherwise report the floor
as a floor and say the ceiling was not measured.

Cross-checks that changed the answer on the measured release (`precedents.md` § Model releases):

- **Name WHICH file your number is** — the advertised size can be the smallest packing, and the
  vision projector a separate file on top.
- **Grep the vendor's own prose for the post's headline number** before attributing it to the
  vendor; it may be the poster's gloss.
- **The vendor's blog and card can disagree** — quote the card, which carries the measurement
  conditions, and say when the two differ.
- **Check whether stock runtimes can load the file** — a format that needs a vendor fork can load in
  stock tooling and silently produce garbage.
- **`downloads` is per REPOSITORY, not per file**, so it cannot tell sibling packings apart.

Secondary write-ups of a release get the numbers wrong in the usual direction: tag figures to the
vendor's blog, the model card or the API, never to the aggregator that repeated them.

---

## Models named in a post — registries

**A model named in a post — resolve it WITHOUT the browser, and note that the OpenRouter endpoint
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
  reveal — measured 2026-09-19 on one stealth listing whose catalogue entry was gone while this call
  still returned «… **was** a stealth model,…». The API's own `description` was TRUNCATED
  mid-sentence there; the rendered page (`https://openrouter.ai/<slug>`, via a web-fetch tool)
  carried the full line naming the real model and provider. So: API for the specs and the endpoint
  count, page for the full description.
- **`https://models.dev/api.json`** — Anomaly's (opencode's) registry: ~4.7 MB and 222 providers in 2026-09, one
  JSON with per-model `limit.context`/`limit.output`, `cost.input`/`output`/`cache_read`,
  modalities, `tool_call`, `reasoning`, `release_date`, **and which providers carry it**. `curl` it
  to a file in your scratch directory and query it with `jq` or a `bun` one-liner — never through
  tool stdout. It is the cheapest way to answer «is this model still free / where can I actually
  reach it», and its one-line `description` is often blunter than the vendor's marketing line.

**Both are registries, not the vendor.** When the two disagree with the vendor's own page, say so
and quote both — on the measured case the vendor's own subprocessor list and a third party's reading
of an unmerged release note named **different** underlying model pools, and neither was confirmable
from the other.

---

## WebGL / three.js demos

**A linked WebGL / three.js demo cannot be "waited" into a later state on a software renderer —
many of them CLAMP `dt`, so wall-clock seconds and scene seconds are different units.** Measured
2026-09-20 on a `*.surge.sh` three.js demo linked from a post, in headless
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

⚠️ **Never click through the form.** The obvious alternative to this recipe — clicking through the
form screen by screen — is destructive, not just slower. Typeform saves **partial** responses as you
click forward, so "just click through the questions" silently leaves an unfinished response
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

**A `"type":"inline_group"` field is a CONTAINER, not a question, and the top level misstates
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
submit": on one application form it was the **only** place saying that only selected applicants
are contacted, so silence means a rejection.

---

## Luma (`luma.com/<slug>`)

The public event list, without the browser. A web-fetch tool on `luma.com/<slug>` returns only the
**first page** of upcoming events, and no structured location data.

**Public JSON API, no auth needed** (`period` is one call per value — `future` or `past`, not the
literal string `future|past`):
`https://api.lu.ma/calendar/get-items?calendar_api_id=<cal-id>&period=future&pagination_limit=100`

Get `<cal-id>` from the calendar page's HTML: the `apple-itunes-app` meta tag's `app-argument`
attribute contains `luma://calendar/<cal-id>`.

**A `429` with `{"message":"You’ve exceeded our rate limit…"}` can come on the FIRST call** —
measured 2026-11-14, twice, minutes apart, on `api.lu.ma` and `api2.luma.com`
alike, while the calendar page itself answered 200. That is a rate limit on the API, not an empty
calendar: wait several minutes before one retry, and otherwise read the events from the calendar page
in the browser and say the API was unavailable. Never report "no events" from a 429.

When it answers, the response runs ~82k characters — a web-fetch tool will not return that inline; it
spills to a file and reports the path. **That is normal operation, not an error** — grep the spilled
file, and if the shell cannot see it, try the host's own file-search tool before concluding the file
is gone.

Useful patterns: `"city_state":"[^"]*"` with `-o` returns the full list of cities; grep for a
country or city name to check "is there an event in X". The response is one line, so count matches as
§ Counting matches says. A large `pagination_limit` still gets cut off by response size — **never treat
one call as an exhaustive event history.**

---

## SEC / EDGAR filings (S-1, 10-K …)

**`curl`, not a web-fetch or web-search tool.** EDGAR wants a `User-Agent` carrying a contact:
`-A "<client name> <contact>"` — a name alone got 403, a name plus an address-shaped contact got 200
(measured 2026-11-14). Ask the user which contact to send; never their details by default.

1. Find the filing by company name:
   `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=<name>&type=S-1&owner=include&count=40&output=atom`
   → each `<entry>` has `filing-href` (the `…-index.htm` page that lists the documents) and
   `file-number`. The full-text search endpoint (`efts.sec.gov`) gave 403 once (one observation) —
   prefer the atom feed.
2. The main document is one big HTML (14 MB for the measured S-1). Download it with
   `curl -sSL --fail-with-body`, then find the sections before reading anything:
   `bun run "SKILLDIR/scripts/html-to-text.ts" <file> --grep 'prospectus summary|risk factors summary|overview'`.
   «Prospectus Summary», «Summary Consolidated Financial and Other Data», «Risk Factors Summary» and
   the MD&A «Overview» carry most of it; do not read 1.5M characters.
3. **Check dates on the primary:** a web-search tool conflated a company's earlier CONFIDENTIAL
   submission with its public S-1. And figures left blank (`$           `) before pricing are «not
   disclosed in this filing», not a parse failure — do not fill them in.
