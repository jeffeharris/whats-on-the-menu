# Runware Agent Skills (vendored)

Recipes an AI agent follows to get good results out of the Runware API — which
model to use for a job, how to prompt it, and how to call it correctly.

Source: https://github.com/Runware/runware-skills @ `595afb9`
(the repo carries no LICENSE file; copying the folders is the install method its
own README documents). Re-sync by re-copying the folders from that repo.

## What's here and why

**Foundation** — every recipe below leans on these:

| Skill | Purpose |
|---|---|
| `runware-run` | The execution contract: resolve schema → run → read result. Includes dry-run for cost checks. |
| `runware-models` | Live model lookup, so model choices don't go stale. |
| `runware-prompting` | Per-model-family prompt craft. |

**Asset generation** — picked for this app's branding work:

| Skill | Use it for |
|---|---|
| `logos-and-vectors` | Favicon, app icon, and the logo mark. Emits **real SVG**, which is what `index.html` already expects (`type="image/svg+xml"`). |
| `text-in-image` | The social/OG share card and any graphic where the wording must be exactly right. |
| `game-assets-2d` | Consistent illustration sets with transparent cutouts — home-screen art, food illustrations, kid-mode avatars in one coherent style. |
| `edit-image` | Recolor, remove a background, or extend a generated asset instead of rerolling it. |

The upstream repo has ~26 more (video, audio, 3D, upscaling, character
consistency). Copy any of them in the same way if a need comes up.

## Running them in this project

The skills drive the Runware API through the SDK, MCP, or plain REST. Nothing
extra is installed here, so the simplest surface is REST with the key already in
`.env`:

```bash
RUNWARE_API_KEY=$(grep '^RUNWARE_API_KEY=' .env | cut -d= -f2-)
```

Two things worth keeping straight:

- **Cost.** These skills spend real money per generation. Vector and text models
  cost more than the app's runtime model. `runware-run` documents the
  `X-Runware-Dry-Run: 1` header to price a request before committing.
- **This is not the app's runtime path.** Images the *app* generates for
  families go through `server/routes/image-generation.ts`, which pins one model
  and enforces the per-household and global daily caps. These skills are for
  authoring static brand assets that get checked into `public/` — they bypass
  those caps entirely, so don't wire them into request handling.
