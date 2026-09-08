# Coin Pouch Game

## 🎮 [Jouer au prototype / Play now](https://jutrasimon.github.io/pirate-chip/)

**Sur téléphone ou ordinateur, directement dans le navigateur. Rien à installer.**

Version du code : **v0.2.1**. Le lien GitHub Pages sera disponible après l’activation initiale ci-dessous.

Mobile-first browser pirate combat prototype. English UI, Flibuste Pop art direction.

## GitHub Pages

One-time setup: in **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. Then open **Actions → Publish game to GitHub Pages → Run workflow** on `main`.

The workflow validates the game and publishes only `dist`. Future changes to the game on `main` deploy automatically. A successful workflow's `github-pages` deployment contains the live URL. Private repositories require a GitHub plan that supports Pages.

## Run locally

No dependencies or build step. Serve `dist` over HTTP:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. The interface studies are at `/design.html` and share the actual inventory, rewards and forge components. They use isolated demonstration state and do not affect a normal run.

## Tests

```sh
node --test tests/*.test.mjs
```

## Source map

- `dist/combat.mjs`: data, rules, seven coin instances, enemy patterns, upgrades.
- `dist/game.js`: UI, animation, tooltips, inventory and forge flow.
- `dist/audio.mjs`: original synthesized 8-bar jig, sound effects and independent saved audio toggles.
- `dist/style.css`: mobile layout and shared inventory/forge styling.
- `dist/assets`: four additional enemies with three transparent poses and one background each. Captain assets live directly in `dist`.
- `.openai/hosting.json`: existing Sites deployment identity; preserve for this site's updates.

## Current prototype rules

Draw 4 unique instances from the seven-coin pool every turn. Randomize their active faces. Play 2 coins per turn unless an effect adds actions. This fresh-draw cycle remains provisional.

Five enemies are shuffled without repeats. HP persists between fights. Temporary combat state clears. Defeating the fifth enemy wins the run.

After each non-final victory, choose 1 of 3 distinct randomly offered upgrades, then attach it to either face of any owned coin with an empty slot. One upgrade per face. The forge is mandatory before the next encounter; the final victory ends the run.

### Upgrade semantics used for this pass

- Boarding Kit: +1 damage and +1 block on use.
- Keen Edge: +2 damage on use.
- Iron Plating: +2 block on use.
- Loaded Luck: reroll other unused coins after the base face resolves; either side can land up.
- Second Wind: +1 action immediately after the base face resolves.

An attack bonus on an attack face is one combined hit, so a killing blow prevents riposte. A damage upgrade on a non-attack face also triggers riposte once. These are prototype interpretations to tune, not an expanded progression system.

Inventory rotation is informational and never alters an active combat coin. Music starts after the first user interaction to comply with browser audio rules. Sounds and music can be toggled independently in Settings.

## Repository

GitHub: https://github.com/jutrasimon/pirate-chip

The repository contains the complete current prototype, art assets, interface studies and tests. The existing Sites publishing identity remains in `.openai/hosting.json` so future updates can target the same playable site.
