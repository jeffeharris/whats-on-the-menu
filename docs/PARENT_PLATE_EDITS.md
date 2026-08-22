# Parent plate edits after submission

**Status:** implemented (phases 1 and 2); phase 3 outstanding
**Branch:** `claude/parent-edit-menu-post-submit-4na9vq`
**Tracking:** [#28](https://github.com/jeffeharris/whats-on-the-menu/issues/28)

## Problem

Once a kid submits their picks, the parent has no way to change one item on one
plate. The only levers are household-wide:

- **Approve & lock / Unlock** — `households.selection_status`, toggled from
  `src/views/parent/ChoiceReview.tsx:172`.
- **Clear all** — `clearSelections` (`server/db/queries/menus.ts:499`) deletes
  every kid's row and bumps `selection_revision`.

So "Ada wants green beans instead of peas" costs: unlock (which reopens the
round for *every* kid), switch to kid mode, tap Ada, walk the whole carousel
again, re-approve. Three real situations hit this:

1. Kid submits, then asks for a change before the meal.
2. Change is needed after the plates are locked.
3. Food comes out and the kid wants something else.

## Scope

**In:** parent-authored edits to a submitted plate — substituting an item, and
adding an item that isn't part of the kid's original picks (including items not
on the menu at all).

**Out (deliberate):**

- **Removing an item.** Already expressible at the right moment: `MealReview`
  marks every food All / Some / Tried / None (`src/utils/completionUtils.ts:30`).
  "Didn't want the peas" is *None*, and the record stays honest — peas were
  offered, peas weren't eaten. Deleting them from the plate loses that.
- **Quantity** ("more nuggets"). `GroupSelections` is `{ [groupId]: foodId[] }`
  with duplicates rejected; there is no count anywhere in the model.
- **Kid-initiated change requests.** Worth building later; not this.

## The three operations, worked

Ada's plate:

```jsonc
{ "main":  ["nuggets"],        // pick-1 → exactly 1
  "sides": ["peas", "corn"] }  // pick-2 → exactly 2
```

**Substitute** — green beans for peas:

```jsonc
{ "main": ["nuggets"], "sides": ["green-beans", "corn"] }
```

`sides` still holds 2. **This already passes `validateSelections` unchanged.**
There is no substitution mechanism to design — it needs only a parent UI and
permission to write while the round is approved.

**Add** — a yogurt on the side:

```jsonc
{ "main": ["nuggets"], "sides": ["peas","corn"], "add-ons": ["yogurt"] }
```

A new key. No existing group's constraints are touched.

**Remove** — drop the peas:

```jsonc
{ "main": ["nuggets"], "sides": ["corn"] }   // 1 item, pick-2 wants 2 → 409
```

The failure is *inside* the `sides` array, so no amount of new-group machinery
helps. This is why removal is out of scope rather than merely deferred.

## Mechanism: a synthesized add-ons group

Every selection preset has `min >= 1` (`server/db/queries/menus.ts:75`), and
`validateSelections` walks **every** group in the menu, so a real add-ons group
with any existing preset would force every kid to have at least one add-on.
Two things follow: a min-0 preset, and a place for the group to live.

**The add-ons group is never persisted.** `getActiveMenu` appends it to the
returned `groups` array, and `addSelection` validates against the same appended
list. Its `foodIds` are materialized from the household's food library at read
time, so membership checks pass for anything a parent can reach.

As built, `getActiveMenu` appends the group as soon as **any plate has been
submitted**, not only once the round is approved — a kid often asks for a change
before anything is locked. Validation appends it unconditionally: with `min 0`
an absent key costs nothing, and doing it on every path means a stored add-on
can never turn into a 409 later (on approval, or on a kid's next write after the
round is reopened). That collapses S10 rather than handling it.

Consequences, all good:

- Both plate views iterate `currentMenu.groups`
  (`ChoiceReview.tsx:108`, `PlateConfirmation.tsx:50`), so the group renders
  with its label and ordering for free.
- `menus.groups` is untouched, so none of the eight `DELETE FROM kid_selections`
  reset paths can fire (see S3).
- `kid_selections.selections` is `JSONB` — an `add-ons` key needs no migration.
- `meal_selections` copies `selections` verbatim (`meals.ts:199`), so add-ons
  land in history automatically.

### Rejected: persisting the group on the active menu

`loadPresetAsActive` points `active_menu_id` **at the preset's own `menus` row**
(`MenuContext.tsx:474` → `setActiveMenu`). Writing an add-ons group into the
active menu therefore edits the saved Breakfast/Dinner preset, and the group
comes back on every future launch. Worse, the only write path — `updateMenu`
(`menus.ts:263`) — deletes every kid selection when the active menu's groups
change, destroying exactly the plates being edited.

### Rejected: a reserved group id outside `menu.groups`

Renders as nothing. Both plate views iterate menu groups, not selection keys.

## Seams

### Server — data layer

| # | Seam | Today | Change | Risk |
|---|---|---|---|---|
| **S1** | `menus.ts:75` `SELECTION_LIMITS` | 4 presets, all `min >= 1` | add `'any': { min: 0, max: n }` | low |
| **S2** | `menus.ts:82` `validateSelections` | takes `groups` from the stored menu | must receive the **augmented** list on every path that validates a round | **high** — miss a caller and add-ons 409s |
| **S3** | `menus.ts:345` `getActiveMenu` | returns stored groups | append synthesized add-ons group | medium |
| **S4** | `menus.ts:428` `addSelection` | 3 gates: menu-id match, revision CAS, `status==='approved'` → 409 | bypass **only** the approved gate for parent writes; **keep the CAS** (it correctly rejects a write into a round that was reset mid-edit) | **high** |
| **S5** | `menus.ts:523` `setSelectionStatus` | on approve, re-validates every stored selection | must use the augmented list, or approving a round that already has add-ons fails | **high** |
| **S6** | `menus.ts:499` `clearSelections` | wipes + bumps revision | unchanged; add-ons die with the round | none |
| **S7** | `meals.ts:230` `addMeal` | snapshots `selections` verbatim, then nulls the menu and wipes | unchanged — add-ons ride along | none |
| **S8** | 8 × `DELETE FROM kid_selections` in `menus.ts` (193, 273, 325, 412, 511, 681, 741, 902) + `meals.ts:240` | every menu-shape change resets the round | **do not add a ninth**; the synthesized group exists precisely to avoid this | **high** |
| **S9** | `menus.ts:617` `updatePreset` | same wipe when the preset is active | unchanged, but confirms why add-ons must not touch `menus.groups` | — |
| **S10** | Unlock with add-ons present | `setSelectionStatus('open')` | a stored `add-ons` key must still validate after unlock, or the kid's next write 409s → synthesize the group whenever **any** selection has add-ons, not only while approved | **high** |

### Server — API layer

| # | Seam | Today | Change | Risk |
|---|---|---|---|---|
| **S11** | `schemas.ts:64` `selectionPresetSchema` | `z.enum([...4])` | add `'any'` **only if** the preset can round-trip from a client; with synthesis it cannot, so leaving it out is a safety net that rejects an accidental write | low |
| **S12** | `schemas.ts:123` `addSelectionSchema` | `{ kidId, selections, menuId, selectionRevision }` | needs to carry parent intent — new field, or a distinct route | medium |
| **S13** | `routes/menus.ts:90` `POST /selections` | already accepts an arbitrary `kidId` under the parent's session; household-scoped, not kid-scoped | the capability exists; decide flag-vs-route | low |
| **S14** | Authorization | any authed household member can write any kid | unchanged, but note it: this feature makes it a *product* behavior, not an incidental one | medium |
| **S15** | `realtime/menuEvents.ts:1` `MenuEventReason` | 5 reasons | a parent edit publishes `selection-updated`; consider a distinct reason so kid devices can animate the change | low |
| **S16** | `api/client.ts:120` `addSelection` | 4 positional args | extend or add a sibling method | low |

### Client — state

| # | Seam | Today | Change | Risk |
|---|---|---|---|---|
| **S17** | `types/index.ts:2` `SelectionPreset` + `SELECTION_PRESET_CONFIG` | 4 presets | add `'any'`; **must** stay in sync with S1 | medium |
| **S18** | `MenuContext.tsx:128` `applyActiveMenuData` | `setCurrentMenu(nextActiveMenu)` on first load | the synthesized add-ons group would leak into the MenuBuilder editor and be saved back as a real group | **high** — strip it when seeding `currentMenu` |
| **S19** | `MenuContext.tsx:295` `addSelection` | passes `roundRevision` | reused by the parent editor; keep passing the live revision | low |
| **S20** | `MenuContext.tsx:94` `selectionsLocked` | `status === 'approved'` | still gates the kid UI; the parent editor must **not** read it as read-only | medium |

### Client — views

| # | Seam | Today | Change | Risk |
|---|---|---|---|---|
| **S21** | `ChoiceReview.tsx:108` | iterates `currentMenu.groups`, read-only cards | the editor lives here; add-ons render for free | — |
| **S22** | `ChoiceReview.tsx:171` | Approve / Unlock footer | editing while approved must not imply unlocking | medium |
| **S23** | `PlateConfirmation.tsx:50` | iterates `currentMenu.groups` | kid sees add-ons for free; needs provenance copy ("a grown-up added this") | low |
| **S24** | `MenuSelection.tsx` (9 × `SELECTION_PRESET_CONFIG`) | drives the kid picking carousel and step progress | **must exclude the add-ons group** — otherwise an unlocked round shows kids a min-0 group of the entire food library | **high** |
| **S25** | `MenuBuilder.tsx:66,79` | seeds editor state from `currentMenu.groups` | paired with S18; `'any'` is absent from the hardcoded dropdown (`MenuBuilderGroup.tsx:176`), so a leaked group is uneditable but still savable | **high** |
| **S26** | `SharedMenuBuilder.tsx:207` | `Object.entries(SELECTION_PRESET_CONFIG)` builds the dropdown | adding `'any'` to the config makes it appear in the **shared-menu** builder, a different feature domain | medium — filter explicitly |
| **S27** | `SharedMenuView.tsx:37,64,134` | indexes `SELECTION_PRESET_CONFIG` by a preset typed `z.string()` server-side (`schemas.ts:101`) | if S26 leaks, the public view does min/max math on `'any'` | medium |
| **S28** | `MealReview.tsx:24` | `getAllFoodIds(selection)` — flat | add-ons get completion rows automatically | — |
| **S29** | `MealReview.tsx:59` `cleared` | star = every food marked `all` | an add-on now counts toward the star; decide whether that's intended | medium |
| **S30** | `MealHistoryDetail.tsx:114` | `getAllFoodIds`, flat, no group labels | add-ons appear, unlabelled as add-ons | low |
| **S31** | `KidModeHome.tsx:282-355` | locked-state copy | should say a grown-up changed a plate | low |
| **S32** | `MealResponseNotice.tsx` | "Orders are in!" | may need an edited state | low |
| **S33** | Food deleted from library mid-round | `ChoiceReview.tsx:161` renders a warning row | unchanged; add-ons inherit it | none |

### Tests

| # | Seam | Change |
|---|---|---|
| **S34** | `server/__tests__/menu-selection-flow.test.ts` | the round lifecycle suite. New cases: parent write while approved succeeds; kid write while approved still 409s; parent write with a stale revision 409s; approve with add-ons present succeeds (S5); unlock→kid-write with add-ons present succeeds (S10) |
| **S35** | No new suite needed for the wipe paths — assert instead that a parent edit leaves `selection_revision` unchanged and other kids' rows intact |

## Data & migrations

**None required.** The add-ons group is synthesized; `kid_selections.selections`
and `meal_selections.selections` are `JSONB`; `'any'` lives only in TypeScript
constants. `docs/schema.sql` is unchanged.

Provenance is the one thing that might want a column. If parent edits should be
visibly attributed, add `edited_by_user_id UUID` / `edited_at TIMESTAMPTZ` to
`kid_selections` — otherwise the only signal is `updated_at`
(`20260814_1000_add_selection_approval_state.ts`), which kid writes also bump.

## Open decisions

1. **Does the kid see that a grown-up changed it?** Recommend yes, gently.
   Silently rewriting a plate and having the kid open the app to something
   different undercuts the ownership the app is selling. Costs S23 + provenance.
2. **Does an add-on count toward the star?** (S29) Recommend yes — the star is
   about eating, not about who chose.
3. **Flag or separate route** for parent writes? (S12/S13) Recommend a separate
   route: it keeps the kid path's constraints unambiguous and makes S14 explicit.
4. **Add-ons scope** — whole food library, or only items already on the active
   menu? Recommend whole library; the "kid wants something else entirely" case
   is a third of the motivation.
5. **Does editing while approved keep the round approved?** (S22) Recommend yes
   — decoupling edit from unlock is the point of the feature.

## Phasing

**Phase 1 — substitute.** Parent editor on `ChoiceReview`, parent-authored write
allowed while approved. Touches S4, S12–S14, S16, S19–S22, S34. No new preset,
no synthesis, no add-ons group. Ships the most common case on its own.

**Phase 2 — add-ons.** S1–S3, S5, S10, S17, S18, S24–S27. The synthesis work and
the leak-prevention work land together, because S18/S24/S25 are only reachable
once the group exists.

**Phase 3 — polish.** Provenance and kid-facing copy (S23, S31, S32),
star semantics (S29), history labelling (S30).

## Highest-risk seams, ranked

1. **S24** — add-ons group leaking into the kid picking carousel on unlock.
2. **S18 / S25** — synthesized group leaking into MenuBuilder and being saved as
   real, which then trips the S8 wipe on the next save.
3. **S5 / S10** — validation paths that see stored add-ons but an un-augmented
   group list; both fail *after* the feature appears to work.
4. **S4** — relaxing the wrong gate. Bypass `approved`; keep the revision CAS.
