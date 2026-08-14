# Color Gather — Development Notes / Roadmap

> **Purpose:** Keep this file with the project. It is the persistent memory for future ChatGPT/Claude/code-review sessions. It records what is implemented, current design decisions, and future ideas. Do not delete it during refactors unless the information is moved somewhere equivalent.

## Core game fantasy

Color Gather is an incremental art-studio game.

**Core loop:** gather paint → fill Tubes → sell/buy equipment → mix colors → fill Mixer Vials → fulfill Orders → gain Studio XP + Color XP → master colors → establish direct production buckets → eventually use paint to **create paintings**.

The long-term answer to “why am I collecting all this paint?” is the Painting / Studio system.

## Important design rules

- Reveal complexity gradually. **Once a UI section is unlocked, do not hide it again.**
- Store structure is **Equipment | Tools | Upgrades**.
- Equipment appears first.
- On a fresh Store unlock, **Tools and Upgrades must be hidden immediately**; do not show empty tabs even briefly.
- Tools appears when the first Tool becomes relevant, then stays permanently visible.
- Upgrades appears when the first relevant Upgrade becomes available, then stays permanently visible.
- Purchased one-time Tools stay listed and show **SOLD OUT** instead of disappearing.
- Avoid constantly changing Store inventory. Locked/unavailable/owned/sold-out states are preferable to items vanishing.
- Journal = tutorial/directed progression.
- Studio XP = overall studio advancement.
- Color XP = mastery of individual colors.
- Tracking an Order is informational only. The player can fulfill **any ready Order**.
- Major unlock notifications persist until **OK** is clicked. Routine feedback fades.
- Keep development progression fast while mechanics are still being built. Final economy balancing is intentionally later.
- Flat project structure: JS files in root, only `images/` and `sounds/` subfolders.
- Ordinary updates can be changed-files-only. Periodically make a full backup.

## Audio conventions

- Normal UI: `sounds/click.wav`
- Gather paint: existing splat/gather sound
- Mixing: `sounds/fart.wav`
- Selling: `sounds/ching.wav`

Do not stack generic click audio over distinctive gameplay sounds unless intentionally desired.

## Current implemented systems

### Field / paint
- Red starting bucket.
- Purchased Primary Buckets.
- Yellow and Blue primary progression.
- White exists in current code.
- Dolly mode for moving buckets.
- Paint splat effects.
- Paint Case with Tubes.
- Mixer Vials.
- Empty Tube should display `0/current capacity`.
- Empty Mixer Vial should display `0/current capacity`.

### Mixing
- Mixer Tool.
- Drag one bucket onto another to mix.
- Dragged bucket snaps back after mixing.

Current base recipes:
- Red + Blue = Purple
- Red + Yellow = Orange
- Blue + Yellow = Green

Current White/light recipes:
- Red + White = Pink
- Blue + White = Sky Blue
- Yellow + White = Cream

### Orders
Current intended job types:

**Quick**
- One full single-color Tube.

**Standard**
- One full Mixer Vial.

**Big Job**
- Two **different** full Mixer Vials.

Order behavior:
- Open Orders to see all three.
- Track one Order for main-HUD visibility.
- Fulfill any ready Order, tracked or not.
- Completing a job generates a replacement in that slot.
- Main Orders Tool highlights when any Order is ready.

### Store

**Equipment**
- Tubes
- Mixer Vials
- Primary Buckets
- Flexible Mixing Buckets
- future physical studio equipment

**Tools**
- Mixer
- Orders
- Dolly
- Minion
- future permanent systems

**Upgrades**
- Tube capacity/value
- Mixer Vial capacity/value
- Minion upgrades
- future Mixer/Dolly/Order upgrades

**Rule:** Minion upgrades do not appear before owning a Minion.

### Notifications
Major persistent notification types:
- Unlock = pale gold/yellow
- Studio Level = pale blue
- Discovery = purple/paint tint
- Reward = pale green
- Warning = pale red/pink

Potential persistent-notification moments:
- Store unlocked
- Tools tab first revealed
- Upgrades tab first revealed
- Mixer unlocked
- Orders unlocked
- Dolly unlocked
- Color Guide unlocked
- White unlocked
- Black unlocked
- Studio milestones
- Color proficiency/mastery

### Tester button
The subtle Journal `✦` button gives +100 test coins.
Do **not** visibly label it `100` or `+100`.

## Studio XP

Studio XP exists with a visible Studio Level/XP bar.

Current XP sources include:
- manual gathering
- full Tube sales
- full Mixer Vial sales
- mixing
- new color discovery
- completing Processes
- completing Orders

**Current issue:** XP works, but Studio Levels still need meaningful gameplay rewards.

### Level 1–10 reward direction — not final balancing

Preferred direction discussed:

- **Lv1:** starting level
- **Lv2:** +1 Mixer Vial capacity
- **Lv3:** Tubes sell for +1 coin
- **Lv4:** Orders pay more
- **Lv5:** major milestone — **White**
- **Lv6:** Mixer Vials sell for +1 coin
- **Lv7:** Tube capacity +1
- **Lv8:** another Order/reputation payout improvement
- **Lv9:** Minion improvement
- **Lv10:** major milestone — **Black**

Important:
- Players may not have Orders at Lv4 or Mixer Vials at early levels. Rewards should be able to become **pending bonuses** that apply when the system is unlocked.
- Strong upgrades like **gather 2 paint at once** belong farther down the progression, not in the first 10 levels.
- Exact numbers are test values, not final balance.

## Color XP / mastery

Color XP/proficiency exists in an early version.

Current concept:
- Making a mixed color gives that color XP.
- At a test threshold (currently around 25 XP), the color becomes **Proficient**.
- Color Guide can show Color XP/mastery/stats.
- Proficient mixed colors become eligible for Flexible Mixing Buckets.

The proficiency threshold is **testing only** and should be rebalanced later.

### Color Guide long-term stats
Potential stats per color:
- times made
- times gathered/collected
- times sold
- times used
- Orders fulfilled with it
- paintings using it
- current Color XP
- mastery level
- recipe
- value

Possible later mastery rewards:
- increased sell value
- cheaper production
- better Order value
- flexible bucket eligibility
- special versions/finishes

## Flexible / Mixing Buckets — needs a major UX rework

The Flexible Mixing Bucket feature is currently a prototype and needs substantial polish.

Current browser `prompt()` / `confirm()` behavior is placeholder-quality.

Preferred final flow:

1. Become proficient with a mixed color via Color XP.
2. That color becomes **eligible** for direct bucket production.
3. Buy a Flexible Mixing Bucket from **Equipment**.
4. An empty physical bucket appears on the canvas.
5. Tap it to open an **in-game color selector** showing only proficient colors.
6. Assigning a color should likely have a setup cost.

Current favorite setup-cost idea:
- sacrifice **one full Mixer Vial** of that color.

Example:
- Master Orange
- buy Flexible Bucket
- spend one full Orange Mixer Vial
- bucket becomes an Orange production source

This prevents mastery from instantly granting free infinite paint.

Additional Flexible Bucket requirements:
- filled bucket gathers like a normal source
- Dolly moves it exactly like other buckets
- clean **Empty / Reassign** UI
- no browser prompt/confirm
- assignment and position persist
- eventually show color name/mastery marker/stats

## White / Black progression

### White
White is intended to become a major Studio-Level milestone, likely **Lv5**.

White introduces **tints / light colors**.

Journal should teach what to do with White rather than being the only thing that unlocks it.

### Black
Black has **not** been built yet.

Preferred major milestone: **Studio Lv10**.

Black introduces **shades / dark colors**, e.g.:
- Red + Black = Maroon / Dark Red
- Blue + Black = Navy
- Purple + Black = Deep Purple
- more later

Black should feel like a major expansion, not just another ordinary paint color.

## More colors

Future families:

### Secondary
- Orange
- Purple
- Green

### Tints / light colors
- Pink
- Sky Blue
- Cream
- Lavender
- Mint
- Peach
- more later

### Shades
- Maroon
- Navy
- Forest
- Deep Purple
- more later

### Tertiary / complex mixes
Colors requiring 3+ source colors.

Earlier inventory concept:
- secondary colors may consume 2 vial “parts”
- tertiary colors may consume 3 vial “parts”
- more complex paints may consume more

This makes Vial capacity strategically meaningful.

## Painting system — major future feature

**Do not lose sight of this.** It is the major long-term retention loop.

Planned concept:
- Add a Paint / Studio button.
- Opens a separate painting screen.
- Early painting grid maybe 3×3.
- Each square requires a specific paint type/color.
- Player applies paint to complete artwork.
- Later grids grow larger/more complex.
- Paintings consume paint.
- Completing paintings gives meaningful progression/rewards.

Potential content progression:
raw colors → secondary → tertiary → tints → shades → special finishes → patterns → animated paints.

## Late/endgame paint ideas

### Special finishes
- shimmer
- metallic
- sparkle

### Patterns
- stars
- polka dots
- stripes
- waves
- zig zag

### Animated / legendary paints
- Twilight
- Lava
- other animated effects

These should be true late-game content.

## Minions

Existing concept needs deeper integration.

Ideas previously discussed:
- auto-gathering
- speed
- carry amount
- customization
- sleeping minion
- stronger visual personality

Possible later progression:
- Studio Level unlocks higher Minion upgrade tiers.

## Economy / scaling — deliberately postponed

Do **not** heavily stretch prices/timing yet.

Reason: during development, the latest content needs to be reachable quickly for testing.

Final economy can eventually reach:
hundreds → thousands → tens of thousands → hundreds of thousands → millions+.

Player power must scale too:
- larger containers
- better production
- automation
- faster selling
- stronger Orders
- mastery bonuses

Avoid requiring thousands of manual taps late game.

Earlier idea still worth revisiting:
- full-container bonuses may eventually become **percentage-based** instead of flat values so they scale better.

Not finalized yet.

## Current near-term workflow

As of the Store-tab work:

1. **Playtest Store organization**
   - Equipment / Tools / Upgrades reveal correctly.
   - Once Tools/Upgrades appear, they stay forever.
   - Purchased Tools stay listed as SOLD OUT.

2. **Flexible Mixing Bucket UX overhaul**
   - replace prompt/confirm
   - proper assignment UI
   - likely require a full Vial to establish a proficient color
   - Dolly support
   - reliable save/position behavior

3. **Finish meaningful Studio Level 1–10 rewards**

4. **Move White into Studio-Level progression** (likely Lv5)

5. **Implement Black + shade recipes** (likely Lv10)

6. **Deepen Color XP / mastery**

7. **Expand Color Guide stats**

8. **Add more recipes / tertiary colors**

9. **Build Painting / Studio grid system**

10. **Only after major systems exist:** long-term economy/timing balance

## Development / refactor reminders

- Keep JS files flat in project root.
- `images/` and `sounds/` stay as folders.
- Syntax-check changed JS individually and in `index.html` load order.
- Fix known regressions before adding new systems.
- Avoid leaving obsolete UI systems alongside replacements.
- Be especially careful with:
  - Store rendering
  - bucket state and positions
  - save/load
  - Sell / Mixer / Dolly mutual exclusion
  - mobile pointer/touch behavior

---

**Update this file whenever a meaningful design decision changes.**


### Store layout/order decisions (v0.55)
- Store window stays a consistent fixed size; cards scroll internally.
- Newly revealed items append at the bottom of their section and keep that reveal order.
- Primary Buckets are **Equipment**.
- Paint colors are also **Equipment** because they are production setup, not permanent Tools.
- Keep bucket/color progression adjacent where practical: bucket first, then paint/color.


### Paint splat visual direction (v0.56)
- Keep individual splat/drop sizes roughly the same.
- Keep random angle/distance/count behavior.
- Let droplets spread noticeably farther from the main splat/bucket so the effect reads as a real splatter rather than a tight blob.


### Dynamic paint splatter direction (v0.57)

- Paint gathering splats should react to tapping speed.
- Rapid repeated taps build a temporary **mess level**:
  - more droplets
  - somewhat wider spray
  - higher chance of far-away droplets
- Slower tapping lets the mess level decay.
- Individual splat/drop sizes should remain roughly the same; the increased mess comes from quantity and distribution, not giant blobs.
- Distance is intentionally probability-weighted:
  - most paint lands near the bucket
  - less paint lands at medium distance
  - only a small percentage reaches far away
- Faster clicking shifts some probability from near splashes toward medium/far splashes.
