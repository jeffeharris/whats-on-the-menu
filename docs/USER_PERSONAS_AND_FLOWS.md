# User Personas and Flows

## Purpose

This is the product reference for the people What's On The Menu supports and
the paths they take through the app. It describes current behaviour, not a
future roadmap.

## Product model

An authenticated adult belongs to a household. The household owns its food
library, kid profiles, saved menus, active menu, and meal history. Adults
prepare and review meals; kids make their own choices from an adult-prepared
menu. The app is designed to pass naturally between parent mode and kid mode
on the same or different devices.

## Personas

| Persona | What they do in the product | Job to be done |
| --- | --- | --- |
| Household owner / parent | Creates the household, manages its content and members, launches menus, and records outcomes. | **When I am planning a family meal, I want to offer my kids a bounded set of familiar choices and capture what happened, so mealtimes involve less negotiation and future planning gets easier.** |
| Child | Chooses foods from the live menu and sees progress from previous meals. | **When it is time to eat, I want to choose my own plate from options a grown-up has approved, so I have agency at mealtime and feel encouraged to try food.** |
| Household member / co-parent | Joins an existing household by invitation and participates in the same planning and review work. | **When I share responsibility for meals, I want access to our household's current menus and history, so I can continue the routine without recreating or guessing at our family's setup.** |
| Public shared-menu respondent | Opens a shared link and submits choices without creating an account. | **When someone sends me a menu to answer, I want to make and submit my selections quickly, so the organizer can collect my response without onboarding me.** |

## Supported flows

### 1. Household owner: first-use setup

1. From the landing page, the parent creates an account with an email address
   and optional household name.
2. The app creates a household, makes the parent its owner, seeds a starter
   food library and starter menu presets, and emails a magic link.
3. The parent opens the magic link to begin an authenticated session.
4. On the dashboard, the parent can use the guided tour, tailor the food
   library, and add a profile for each child who will choose meals.
5. The parent can edit a starter preset or build a menu from scratch. A menu
   contains one or more groups, each with its own allowed number of choices.

**Successful outcome:** the household is ready for a child to make choices
from an intentional menu.

### 2. Family meal-planning loop (core recurring loop)

This is the primary product loop after initial setup:

1. **Prepare.** A parent updates foods or kid profiles as needed, then creates,
   edits, or reuses a saved breakfast, snack, dinner, or custom menu.
2. **Launch.** The parent starts the menu. It becomes the household's one live
   menu and appears on kid-mode screens, including other open devices.
3. **Choose.** Each child selects their profile and picks the required number
   of foods in every menu group. They see and confirm their plate. A child can
   revise their choices while selections remain open.
4. **Approve.** The parent returns to parent mode, reviews all submitted
   plates, and approves them. Approval locks the choices across the household;
   the parent may unlock them if a change is needed.
5. **Reflect.** After the meal, the parent records how much of each selected
   food was eaten and may award a Happy Plate star.
6. **Learn and repeat.** Completing the review saves the meal to history and
   pauses the active menu. Kids can see accumulated stars and food-adventure
   progress; parents can use the meal history and their saved menus to plan
   the next meal.

### 3. Household member / co-parent: join and collaborate

1. The household owner enters the co-parent's email address in Settings and
   sends an invitation.
2. The co-parent opens the email link. If needed, the app creates their user
   account; it then creates a session for the invited household.
3. The co-parent can use the same parent-mode flows: manage the shared food
   library and kid profiles, launch or edit menus, approve choices, and record
   meals.
4. The owner can revoke pending invitations or remove another member. A
   non-owner can leave a household.

**Successful outcome:** both adults work from the same household data rather
than maintaining separate meal-planning systems.

### 4. Public shared-menu respondent: respond to a link

> This flow is available only to households whose owner is on the server-side
> `SHARED_MENUS_ENABLED_OWNER_EMAILS` allowlist. It currently includes Jeff's
> household.

1. A parent creates a shared menu with labelled option groups and copies its
   public link.
2. The respondent opens the link without signing in, enters a name, and makes
   the required selections in every group.
3. The respondent submits the response and receives confirmation.
4. The parent opens the shared menu's responses view to review submitted
   selections.

**Successful outcome:** a parent collects structured choices from people who
do not need a household account.

## Golden path: first family meal

The golden path is the shortest complete journey from a new parent's first
visit to a recorded meal and the start of the next planning cycle.

| Step | Actor | Action | Result |
| --- | --- | --- | --- |
| 1 | Parent | Opens the landing page and creates an account with email and, optionally, a household name. | A household, owner account, starter food library, and starter menu presets are created. |
| 2 | Parent | Opens the magic link delivered by email. | The parent is signed in and arrives at the dashboard. |
| 3 | Parent | Uses the dashboard to add each child as a kid profile. | Each child has a distinct kid-mode entry point. |
| 4 | Parent | Launches a starter saved menu from Quick Launch; alternatively, they tailor one in Menu Builder first. | One menu is live on all kid-mode screens. |
| 5 | Parent | Switches the app to kid mode and hands over the device, or lets a child use another device in the household session. | The child sees the live-menu home screen. |
| 6 | Child | Chooses their profile, selects the required foods in each group, and confirms their plate. | The child's completed choices appear for the parent. |
| 7 | Parent | Returns to parent mode, reviews every child's plate, and approves the choices. | Plates are locked, giving the meal a clear agreed plan. |
| 8 | Parent and child | Have the meal. | The planned choices can now be assessed rather than re-selected. |
| 9 | Parent | Records each child's completion for the selected foods and optionally awards a Happy Plate star, then completes the meal. | The app saves a historical meal record and pauses the live menu. |
| 10 | Family | Kids view their stars and food adventures; the parent later launches or adjusts the next menu. | The family re-enters the meal-planning loop with a record of what happened. |

### Golden-path guardrails

- Only an authenticated household adult can access parent mode. From kid mode,
  the optional grown-up check is a child-facing deterrent before switching back
  to the parent workspace.
- Children only choose from a currently live menu. If there is no live menu,
  they can view stars and food adventures but cannot start a selection.
- Approval locks every child's choices. The parent can explicitly unlock them
  before meal review if changes are necessary.
- Completing meal review is the end of a menu round: it atomically preserves
  the selections and review in history, then pauses the live menu for all
  devices.

## Related product surfaces

- **Food Library:** parent-maintained household foods, including the seeded
  starter library.
- **Kid Profiles:** the children who can make selections.
- **Menu Builder and Quick Launch:** creation, editing, saving, and activation
  of menus.
- **Choice Review and Meal Review:** the parent approval and outcome-capture
  stages of the core loop.
- **Meal History, Family Stars, and Food Wall:** the product's retained record
  and child-facing progress views.
- **Settings:** adult access, optional grown-up check, and household
  membership.
