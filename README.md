# 紅包 · The Red Envelope

A Taiwanese folk-horror visual novel that runs in the browser.

It is the first day of Ghost Month. On a mountain road outside Tainan, you find a red envelope lying dry in the pouring rain. Inside are banknotes, a lock of wet hair, and a dead girl's name. Three smiling men step out of the grass to congratulate you. You're getting married in seven days.

Every time you refuse the marriage, someone in your family disappears. Nobody else notices they're gone.

**▶ Play it: https://blinky1994.github.io/red-envelope/**

> **Status:** complete. Seven days, three endings. Some of them need you to remember.

📖 The full design (story, systems, horror toolkit, art and audio direction) is in the [Game Design Document](docs/GAME_DESIGN.md).

## Play

The game is plain HTML, CSS and JavaScript, with no build step and no dependencies. Serve the folder and open it in a browser:

```bash
python -m http.server 8347
```

Then open <http://localhost:8347>. It's best with **headphones, lights off**.

**Controls:** click, Space or Enter to advance · 1–9 to pick a choice · **F** fast-forward read text · **Q** quick save · **R** quick load · **P** phone · **I** pocket · **L** log · **M** mute · **Esc** menu (text speed, game speed, skip read/all text). Save and Load in the sidebar hold ten slots plus the quick save.

## What's in it

- **Ghost marriage (冥婚):** a branching story built on Taiwanese Ghost Month custom and the minghun tradition. It has timed choices, hesitation that chooses for you, and a buried mystery at the reservoir.
- **Silent erasure:** refusals remove relatives from your life. The game never tells you. Keepsakes remain, and their descriptions quietly change.
- **Paper-effigy art (紙紮):** everyone is drawn as a paper figure. The living are paper cut-outs with gentle painted faces. The dead are funeral effigies, with chalk faces, rouge cheeks, a painted smile that never moves, and bamboo showing through torn, rain-soaked paper.
- **Light and dark:** a real-time lighting pass where things exist only where a candle, lantern, headlight or the moon reaches them. Scenes also have parallax depth, drifting fog, film grain and scratches.
- **Synthesized sound:** all audio is made live with the Web Audio API, with no audio files. It includes rain, paddy-field frogs that go quiet when something is near, a wall clock, a distant suona, sub-bass dread, and reverb.
- **Browser tricks:** the tab title changes when you look away, the game remembers past playthroughs, and something comes closer if you sit idle too long.

## Project layout

```
index.html        page shell and UI
css/style.css     UI, effects, animation
js/story.js       the script: every scene, line and choice (start here to write)
js/art.js         layered SVG scenes, paper-effigy characters, items
js/engine.js      story runner, lighting/fog/parallax renderer, UI panels
js/audio.js       synthesized ambience and sound effects
docs/GAME_DESIGN.md  the game design document
```

The script format is documented at the top of `js/story.js`. To add a chapter, write new scene nodes there; no engine changes are needed.

## Art direction

The game takes its cues from Red Candle Games' *Detention*: muted colors like a faded photograph, with red as the only saturated color. Darkness is the default, and figures are half-seen. The paper-effigy style draws on 紙紮, the paper figures and houses burned at Taiwanese funerals so the dead have servants and belongings in the afterlife.
