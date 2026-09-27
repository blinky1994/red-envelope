// ============================================================================
// THE RED ENVELOPE — story script
//
// A node is a scene:  { bg, rain, chars, item, ambient, lines, choices | go | end, timer }
// A line is a string (narration) or an object:
//   t        text (string or fn(state, mem))
//   who      speaker key (see SPEAKERS)
//   style    'whisper' | 'memory'
//   slow     type the line out slowly — for dread
//   big      huge centered text, with optional `sub`
//   beat     ms of held breath: the text box vanishes, only sound remains
//   if       fn(state, mem) -> bool; line is skipped when false
//   do       fn(state, mem); runs when the line is reached
//   bg/rain/chars/item/ambient/fx/sfx   change the scene mid-node
//   wait     ms pause (keeps the text box up)
// node.timer = { ms, go, do }: choices must be made before the bar drains,
//   otherwise `go` happens. The heartbeat speeds up while it runs.
// Any node field may also be fn(state, mem).
//
// SUSPENSE RULES this script follows:
//   1. Comfort first. Every scare needs something warm in front of it.
//   2. One sense at a time: sound, then smell, then touch, and sight last.
//   3. Silence before reveals. Kill the ambience, then deliver.
//   4. False relief. Let the player exhale, then take it back.
//   5. Show less. The implied thing is always worse.
//   6. Teach a rule, then break it. (Frogs sing = nothing is near.)
//
// state.family holds living relatives. Every refusal quietly removes one.
// Nothing in the game ever announces it.
//
// ---------------------------------------------------------------------------
// THE TRUTH (for the writer; revealed across all seven days, never in Day 1)
// Twenty years ago, on the first day of Ghost Month, six-year-old A-Wei and
// seven-year-old Lin Qiu-Yue sneaked down to the reservoir. They had played
// "wedding" that morning and tied a red thread between their little fingers
// so he wouldn't get lost in the tall grass. A-Wei waded in. Something in the
// water took hold of him: a drowned thing looking for its substitute
// (抓交替). Qiu-Yue pulled him out, then slipped and went under herself.
// She held on to his hand. He let go.
// He was found on the bank with a fever and no memory. Ama knew. Ama paid a
// temple to make him forget, and never told the Lin family he was there.
// Qiu-Yue became the water's substitute. She isn't choosing a husband at
// random. She's collecting what she's owed.
// Day 1 only plants seeds: the reservoir turnoff, the wet hair, the cut
// photo, Ama's reaction to the name, and "you let go."
// ============================================================================

const SPEAKERS = {
  you:      { name: 'You' },
  mom:      { name: 'Mom' },
  ama:      { name: 'Ama' },
  wen:      { name: 'Xiao-Wen' },
  eldest:   { name: 'The Eldest Brother' },
  brothers: { name: 'The Brothers' },
  bride:    { name: s => (s.flags.named ? 'Qiu-Yue' : '???'), cls: 'whisper' },
  girl:     { name: '???', cls: 'memory' },
};

const her = () => window.Her || { unread: () => 0, total: () => 0, attention: () => 0 };
const REMOVAL_ORDER = ['ama', 'wen', 'mom'];
const has = (s, k) => s.family.includes(k);
const got = (s, k) => s.items.includes(k);
const give = k => s => { if (!s.items.includes(k)) s.items.push(k); };
// Everyone keeps their seat. Whoever is gone leaves an empty chair where they sat.
const familyOnScreen = s => ['mom', 'ama', 'wen'].map(k => (has(s, k) ? k : `seat_${k}`));
const first = s => !s.flags.loop;

// A refusal doesn't take anyone straight away. It runs up a debt, and the
// debt is collected later, somewhere you can see it: at the dinner table,
// through the smoke, overnight. Nobody ever reacts.
function refuse(s) {
  s.refusals++;
  s.debt = (s.debt || 0) + 1;
}
function collect(s) {
  while ((s.debt || 0) > 0) {
    s.debt--;
    const gone = REMOVAL_ORDER.find(k => has(s, k));
    if (!gone) continue;
    s.family = s.family.filter(k => k !== gone);
    s.lost.push(gone);
    s.flags.vanished = gone;
  }
}

const STORY = {
  // ---------------------------------------------------------------- prologue
  intro: {
    bg: 'black', rain: false, chars: [], ambient: ['drone'],
    lines: [
      { big: '七月', sub: 'The seventh lunar month. Ghost Month.' },
      'For thirty days the gates of the underworld stand open, and the dead come home to eat.',
      "The living keep the rules. Don't whistle after dark. Don't hang your laundry out at night. Don't swim. Don't answer when a stranger calls your name.",
      "And never pick up money you find on the road.",
      { beat: 1400 },
      "You haven't been home in three years. Not since Grandfather's funeral.",
      "You told everyone it was work. It wasn't work. That house makes you feel like there's a room in it you've forgotten about.",
      'But Ama is eighty-one, and Mom asked twice, and Xiao-Wen sent you forty-one stickers of a crying rabbit.',
      'So you are driving home to eat, too.',
      { if: (s, m) => m.plays > 1, slow: true, t: "You've driven this road before. You're sure of it." },
    ],
    go: 'road',
  },

  // ---------------------------------------------------------------- the road
  road: {
    bg: s => (s.flags.loop ? 'car_env' : 'car'), rain: true, chars: [], item: null,
    ambient: ['rain', 'drone'],
    lines: [
      // second time around, after trying to leave it behind
      { if: s => s.flags.loop, t: 'Rain on a mountain road outside Tainan. You have been driving this road for a long time.' },
      { if: s => s.flags.loop, slow: true, t: 'The envelope sits on the dashboard. Upright. Patient.' },
      { if: s => s.flags.loop, beat: 1800 },
      { if: s => s.flags.loop, t: "You pull over. You don't remember deciding to." },

      // comfort: an ordinary drive, an ordinary family
      { if: first, t: "Rain on a mountain road outside Tainan. The wipers can't keep up. The radio lost its signal twenty minutes ago." },
      { if: first, sfx: 'ring', t: 'Your phone buzzes in the cup holder. Mom.' },
      { if: first, who: 'mom', t: "A-Wei? Where are you? Ama made lotus root soup. She's been standing at the window since five." },
      { if: first, who: 'wen', t: "Ge! You promised you'd be here before dark. It's DARK. Ama's making me fold paper ingots and my fingers are all gold." },
      { if: first, who: 'ama', t: "A-Wei! It's Ama. I made your soup, the lotus root, the way you like it. Come home before the good brothers are out on the roads." },
      { if: first, who: 'mom', t: "Drive slowly. And A-Wei, it's the seventh month. Don't pick anything up off the road. And if someone calls your name, don't—" },
      { if: first, sfx: 'radio', t: 'The line crackles.' },
      { if: first, t: "For a moment there's someone else on the call. Not Mom. Not Xiao-Wen." },
      { if: first, slow: true, t: 'Just breathing. Slow, and wet, and very close to the phone.' },
      { if: first, t: 'Then nothing. No signal.' },
      { if: first, beat: 1800 },

      // wrongness, one detail at a time
      { if: first, t: "You haven't passed another car in a while. You try to remember the last one. You can't." },
      { if: first, t: 'A green sign swims up out of the rain. 水庫 — RESERVOIR, 2 KM.' },
      { if: first, t: "You've always hated that turnoff. As a kid you'd hold your breath until it was behind you. You never knew why." },
      { if: first, slow: true, t: 'You hold your breath now, too.' },
      { if: first, t: "A roadside shrine slides past in the headlights. It's the size of a doghouse, with flaking red paint." },
      { if: first, t: 'Someone has left fresh offerings. Oranges. A bowl of rice. A bowl of soup, still steaming in the rain.' },
      { if: first, t: "You don't check the rearview mirror. You've just realized you don't want to." },
      { if: first, beat: 1400 },
      { if: first, sfx: 'rustle', t: 'Something flat slaps against the windshield.' },
      { if: first, t: 'Joss paper. A square of cheap gold ghost money, plastered to the glass by the rain.' },
      { if: first, sfx: 'rustle', t: 'The wipers push it away. Another one lands. Then another. Then a dozen, all at once.' },
      { if: first, slow: true, t: 'Somewhere up ahead, someone is scattering money for the dead.' },
      { if: first, ambient: ['rain', 'sub'], t: 'You slow down. The road bends.' },
      { if: first, beat: 1600 },
      { if: first, bg: 'road', t: 'The paper stops falling. Your headlights catch something in the gravel by the guardrail.' },
      { if: first, item: 'envelope', t: 'Red. Neat. Sealed.' },
      { if: first, slow: true, t: 'Perfectly dry, in the pouring rain.' },
      { if: first, who: 'mom', style: 'whisper', t: "Don't pick anything up off the road." },
    ],
    choices: s => s.flags.loop
      ? [{ t: 'Pick it up', go: 'envelope' }, { t: 'Pick it up', go: 'envelope' }]
      : [{ t: 'Pick it up', go: 'envelope' }, { t: 'Keep driving', go: 'leave' }],
  },

  leave: {
    bg: 'car', rain: true, chars: [], item: null, ambient: ['rain', 'drone'],
    lines: [
      "You don't stop. Mom said don't.",
      'You watch the red shape slide past in the side mirror and shrink into the dark. Good. Gone.',
      { beat: 1500 },
      "One kilometer. Three. You start to breathe again. You even laugh a little. It's a piece of paper.",
      "Five kilometers. The rain gets heavier. The road doesn't seem to get any shorter.",
      { slow: true, t: '水庫 — RESERVOIR, 2 KM.' },
      "It's the same sign.",
      { beat: 1500 },
      { sfx: 'radio', ambient: ['rain', 'drone', 'suona'], t: 'The radio clicks on by itself. No station. Just a suona, the shrill reed horn they play at weddings.' },
      'And at funerals.',
      { beat: 1200 },
      { sfx: 'rustle', slow: true, t: 'Something taps on the windshield. Gently. From the inside.' },
      { bg: 'car_env', sfx: 'dread', t: 'The red envelope is on the dashboard, standing upright, like someone set it there with great care.' },
      { fx: 'glitch', do: (s, m) => { s.flags.loop = true; m.leftEnvelope = true; }, wait: 700 },
    ],
    go: 'reboot',
  },

  reboot: {
    bg: 'black', rain: false, chars: [], item: null, ambient: [],
    lines: [
      { big: '紅包', fx: 'glitch', sfx: 'glitch' },
      { beat: 1200 },
    ],
    go: 'road',
  },

  // ---------------------------------------------------------------- the envelope
  envelope: {
    bg: 'road', rain: true, chars: [], item: 'envelope', ambient: ['rain', 'drone'],
    lines: [
      { if: s => s.flags.loop, sfx: 'rustle', t: "You take it off the dashboard and get out of the car. You need air. The rain soaks you in seconds. The envelope is warm, as if someone has just been holding it." },
      { if: s => !s.flags.loop, sfx: 'rustle', t: "You step out into the rain. The envelope is warm, as if someone has just been holding it." },
      { if: s => s.flags.loop, slow: true, t: 'Warmer than before.' },
      { if: (s, m) => !s.flags.loop && m.leftEnvelope, t: "It feels familiar in your hand. As if it's been waiting for you to come back." },
      "It isn't glued shut. It's sealed with wax, pressed with a small thumbprint. A child's size.",
      { item: 'contents', t: 'Inside there is a thick fold of banknotes, and a lock of black hair tied with red thread.' },
      { slow: true, t: 'The envelope is dry. The hair is wet.' },
      'It smells of standing water. Of algae and mud and summer.',
      'There is also a slip of paper, written in careful brush strokes.',
      '林秋月. Lin Qiu-Yue. A name. A birth year. A date of death.',
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— hold on, A-Wei, hold on to me —' },
      { beat: 900 },
      "You don't know where that came from. You don't know anyone called Qiu-Yue.",
      'The date of death is the first day of the seventh month.',
      { slow: true, t: 'Today. Twenty years ago today.' },
      { item: null, beat: 1600 },

      // sound first
      { sfx: 'rustle', t: 'Behind you, something in the tall grass shifts.' },
      "It's only the wind.",
      { beat: 900 },
      { slow: true, t: 'There is no wind.' },
      { rain: false, ambient: [], fx: 'dark', t: 'The rain stops.' },
      { beat: 1400 },
      "It doesn't slow down first. It just stops, all at once, like someone turned off a tap.",
      { ambient: ['drip', 'heart', 'sub'], t: 'In the silence you can hear water dripping off the guardrail. You can hear your own pulse.' },
      { slow: true, t: 'And you can hear clapping.' },
      'Slow and wet. Coming from the grass behind you.',
      'Three pairs of hands.',
      { beat: 2200 },
      "You don't turn around.",
      { slow: true, t: 'The clapping stops. Now they are much closer.' },
      { beat: 1500 },
      { chars: ['men'], fx: 'dark-off', sfx: 'dread', t: 'You turn around.' },
      'Three men stand at the edge of the grass. They are dressed for a banquet, in dark suits soaked through, though the rain has stopped.',
      'Their faces are the color of paper left too long in water.',
      { slow: true, t: 'They are all smiling. None of them blink.' },
      { big: '恭喜', sub: '"Congratulations, son-in-law."' },
      { who: 'brothers', t: 'Congratulations.' },
      { who: 'eldest', t: "Our little sister has been alone for twenty years. That's a long time to be cold." },
      { who: 'eldest', slow: true, t: "She remembers you, you know. She's never stopped remembering you." },
      { who: 'eldest', sfx: 'thud', do: s => { s.day = 7; s.flags.envelope = true; },
        t: "The wedding is in seven days. You don't need to bring anything. We'll send someone for you." },
      { who: 'eldest', slow: true, t: 'Well?' },
    ],
    timer: { ms: 9000, go: 'frozen' },
    choices: [
      { t: 'Bow and accept', go: 'accept' },
      { t: 'Throw the envelope back at them', go: 'refuse' },
      { t: 'Run for the car', go: 'run' },
    ],
  },

  frozen: {
    bg: 'road', rain: false, chars: ['men'], item: null, ambient: ['drip', 'heart', 'sub'],
    lines: [
      { do: s => { s.flags.froze = true; }, t: "You don't move. You can't. Your tongue is a stone in your mouth." },
      { who: 'eldest', t: "Shy. That's all right. She's shy too." },
      { slow: true, t: 'He takes your silence as a yes. Maybe it was one.' },
    ],
    go: 'accept',
  },

  accept: {
    bg: 'road', rain: false, chars: ['men'], item: null, ambient: ['drip', 'drone'],
    lines: [
      { if: s => !s.flags.froze, t: "You bow. You don't know why. Your body does it before you decide to." },
      { if: s => !s.flags.froze, who: 'eldest', t: 'Such good manners. She chose well.' },
      { if: s => s.flags.froze, who: 'eldest', t: 'She chose well.' },
      { beat: 1200 },
      { chars: [], rain: true, ambient: ['rain', 'drone'], sfx: 'rustle', t: 'The rain comes back all at once. When you look up, the grass is empty.' },
      { do: s => { s.flags.accepted = true; }, t: "The envelope is in your jacket pocket. You don't remember putting it there." },
    ],
    go: 'home',
  },

  refuse: {
    bg: 'road', rain: false, chars: ['men'], item: null, ambient: ['drip', 'heart', 'sub'],
    lines: [
      { fx: 'shake', t: 'You throw it. It hits the eldest in the chest and falls into a puddle.' },
      { beat: 1400 },
      { slow: true, t: 'None of them look down.' },
      { who: 'eldest', t: 'Of course. Young men are always nervous before the wedding.' },
      { who: 'eldest', t: 'Take your time. Seven days is plenty.' },
      { who: 'eldest', slow: true, t: 'You let go of things so easily, A-Wei. You always did.' },
      { chars: [], t: "They turn and walk back into the grass. The grass doesn't move around them." },
      { rain: true, ambient: ['rain', 'drone'], t: 'The rain comes back.' },
      { do: refuse, slow: true, t: "Back in the car, you feel the weight of something in your jacket pocket. You don't need to look." },
    ],
    go: 'home',
  },

  run: {
    bg: 'road', rain: false, chars: ['men'], item: null, ambient: ['drip', 'heart_fast'],
    lines: [
      { fx: 'shake', sfx: 'steps', t: 'You run. Wet shoes on wet asphalt. Door. Key. Your hands shake so badly the key scrapes around the ignition three times.' },
      { rain: true, ambient: ['rain', 'heart_fast'], t: 'It catches. You floor it.' },
      { bg: 'car', chars: [], t: 'In the rearview mirror, three men stand in the road, waving goodbye.' },
      { beat: 1400 },
      { chars: ['men'], fx: 'flicker', sfx: 'dread', t: 'Through the windshield, three men stand in the road ahead, waving hello.' },
      { chars: [], fx: 'shake', t: "You don't brake. You pass through them like smoke." },
      { slow: true, t: '水庫 — RESERVOIR, 2 KM. You hold your breath until it is behind you.' },
      { do: refuse, ambient: ['rain', 'drone'], t: 'The car smells of incense the rest of the way. The envelope is in your pocket.' },
    ],
    go: 'home',
  },

  // ---------------------------------------------------------------- dinner
  home: {
    bg: 'house', rain: false, chars: familyOnScreen, item: null, ambient: ['room', 'rain_in', 'clock'],
    lines: [
      { do: s => { s.flags.herAwake = true; }, t: "Ama's house, at the end of the village. The only lit window for a kilometer." },
      "Inside it's warm. It smells of incense and lotus root and the mothballs in Ama's cupboards. It smells like being a child.",
      'On the ancestral altar, three extra bowls of rice are set out for the dead. Ghost Month manners.',
      { if: s => has(s, 'ama'), who: 'ama', t: 'A-Wei! Look at you, soaked through. So thin! Taipei doesn’t feed you. Sit, sit. The dead have eaten. Now the living eat.' },
      { if: s => !has(s, 'ama'), t: 'Mom is carrying soup in from the kitchen. Xiao-Wen is setting the table.' },
      { who: 'wen', t: 'Ge! Look, I folded forty gold ingots. Forty! The ghosts are going to be so rich.' },
      { if: s => has(s, 'ama'), who: 'ama', t: 'Hush. Not "ghosts." In the seventh month you say "good brothers." They don’t like the other word, and they are always listening.' },
      { if: s => !has(s, 'ama'), who: 'mom', t: 'Wen. Not that word. Not this month.' },
      { who: 'wen', do: give('ingot'), t: 'Fine. The good brothers. Here, Ge, this one is for you. It’s the best one. If a good brother comes for you, give him this instead.' },
      "She presses a folded gold paper ingot into your hand. The folds are careful and a little crooked. You put it in your pocket, next to the envelope.",
      'For a while it is almost normal. Soup. Rice. Xiao-Wen complaining about school. The rain on the roof. The old clock on the wall.',
      'Mom asks if you have a girlfriend yet. Everyone waits a little too long for your answer.',
      { if: s => (s.debt || 0) > 0, beat: 1400 },
      { if: s => (s.debt || 0) > 0, do: collect, chars: familyOnScreen, cut: true, redraw: true, t: 'You look up to answer.' },
      { if: s => s.flags.vanished && !s.flags.vanishSeen, who: 'mom', t: 'Well? Do you?' },
      { if: s => s.flags.vanished && !s.flags.vanishSeen, t: 'You say no. Mom sighs. Xiao-Wen laughs at you.' },
      { if: s => s.flags.vanished && !s.flags.vanishSeen, do: s => { s.flags.vanishSeen = true; }, slow: true,
        t: 'At the end of the table, a bowl of soup is going cold in front of an empty chair.' },
      { beat: 1400 },
      'The dog will not come inside.',
      'It sits at the edge of the courtyard in the rain, not barking, not moving. It is staring at you.',
      { slow: true, t: 'At your jacket pocket.' },
      { who: 'mom', t: "You're late. You didn't stop anywhere, did you?" },
    ],
    choices: [
      { t: 'Tell them about the envelope', go: 'tell' },
      { t: 'Say nothing', go: 'hide' },
    ],
  },

  tell: {
    bg: 'house', rain: false, chars: familyOnScreen, item: null, ambient: ['room', 'rain_in', 'clock'],
    lines: [
      { item: 'envelope', t: 'You put the envelope on the table.' },
      { item: null, ambient: ['room'], t: "Nobody says anything. Xiao-Wen's chopsticks stop halfway to her mouth. Even the clock seems to stop." },
      { beat: 1500 },

      // --- Ama is still here: she knows, and she's afraid.
      { if: s => has(s, 'ama'), t: 'Ama picks up the slip of paper. She reads the name.' },
      { if: s => has(s, 'ama'), sfx: 'thud', t: 'Her soup spoon falls into her bowl.' },
      { if: s => has(s, 'ama'), who: 'ama', slow: true, t: 'Lin... Qiu-Yue.' },
      { if: s => has(s, 'ama'), who: 'wen', t: 'Who’s Lin Qiu-Yue?' },
      { if: s => has(s, 'ama'), who: 'mom', t: 'Ma. Don’t.' },
      { if: s => has(s, 'ama'), t: 'Something passes between Mom and Ama. Something old, and practiced, like a door they have both kept closed for a very long time.' },
      { if: s => has(s, 'ama'), who: 'ama', t: 'Nobody. A family from up the hill. They moved away. Eat your soup.' },
      { if: s => has(s, 'ama'), who: 'ama', t: 'Who gave you this, A-Wei? Men? How many?' },
      { if: s => has(s, 'ama'), who: 'you', t: '...Three.' },
      { if: s => has(s, 'ama'), who: 'ama', slow: true, t: 'She had three brothers. None of them lived to be married, either.' },
      { if: s => has(s, 'ama'), sfx: 'knock', t: 'Ama gets up and closes the first shutter. She doesn’t hurry.' },
      { if: s => has(s, 'ama'), who: 'ama', t: 'This is a ghost marriage. Minghun.' },
      { if: s => has(s, 'ama'), sfx: 'knock', t: 'The second shutter.' },
      { if: s => has(s, 'ama'), who: 'ama', t: 'When a daughter dies unmarried, no family takes her name. No altar holds her tablet. No one feeds her. She wanders hungry, forever.' },
      { if: s => has(s, 'ama'), sfx: 'knock', t: 'The third. Her hands are shaking now.' },
      { if: s => has(s, 'ama'), who: 'ama', t: 'So her family finds her a husband. He takes her tablet home. Feeds her. Burns paper for her. Sleeps beside her, for the rest of his life.' },
      { if: s => has(s, 'ama'), t: 'She sits down again, heavily.' },
      { if: s => has(s, 'ama'), who: 'ama', t: "In the old days, when a family couldn't find a man, they married the girl to a rooster." },
      { if: s => has(s, 'ama'), beat: 1200 },
      { if: s => has(s, 'ama'), who: 'ama', slow: true, t: 'You are not a rooster, A-Wei. They will not let you go.' },
      { if: s => has(s, 'ama'), beat: 1400 },
      { if: s => has(s, 'ama'), sfx: 'knock', t: 'Behind the last shutter, something taps once against the wood. Nobody looks. Nobody says anything about it.' },
      { if: s => has(s, 'ama'), who: 'ama', do: give('charm'), t: 'Here. From the temple. Hang it on your window tonight, and whatever knocks, you do not open it. You hear me? Not for anyone. Not even if it sounds like me.' },
      { if: s => has(s, 'ama'), item: 'charm', t: 'A yellow paper talisman, folded into a triangle, in a little red pouch. It smells of sandalwood.' },
      { if: s => has(s, 'ama'), item: null, t: "You ask her why the name scared her. She pretends she didn't hear you." },

      // --- Ama is gone. She has been gone for years. Everyone is sure of it.
      { if: s => !has(s, 'ama'), t: 'Mom picks up the slip of paper. She reads the name, and her face does something you have never seen it do.' },
      { if: s => !has(s, 'ama'), who: 'mom', t: 'Where did you— ...No. It doesn’t matter.' },
      { if: s => !has(s, 'ama'), who: 'mom', t: "I don't know about these things. Your Ama [[will|would have]] know[[|n]]. God rest her." },
      { if: s => !has(s, 'ama'), beat: 1200 },
      { if: s => !has(s, 'ama'), fx: 'flicker', slow: true, t: 'Something is wrong with that sentence.' },
      { if: s => !has(s, 'ama'), t: "You try to remember Ama's funeral. You remember the white cloth. You remember the incense. You can't remember being sad." },
      { if: s => !has(s, 'ama'), t: 'You look at the altar. There is a tablet with her name on it. The gold paint is old and faded, as if it has been there for years.' },
      { if: s => !has(s, 'ama'), t: 'You look at the chair by the window. The cushion still holds the shape of someone small.' },
      { if: s => !has(s, 'ama'), who: 'mom', t: 'The old people used to say that when a girl dies unmarried, her family finds her a husband. Any husband.' },
      { if: s => !has(s, 'ama'), who: 'mom', slow: true, t: "Even one who doesn't want her." },

      { who: 'wen', t: "Ge... the hair's wet. Why is the hair wet? It's been in your pocket." },
    ],
    choices: [
      { t: 'Burn it on the altar', go: 'burn' },
      { t: 'Put it back in your pocket', go: 'keep' },
    ],
  },

  keep: {
    bg: 'house', rain: false, chars: familyOnScreen, item: null, ambient: ['room', 'rain_in', 'clock'],
    lines: [
      "You fold it shut and put it back in your pocket. It's warm against your chest.",
      { slow: true, t: 'For a moment you could swear it is beating.' },
      { if: s => has(s, 'mom'), who: 'mom', t: 'Tomorrow we go to the temple. First thing.' },
      'Nobody finishes dinner. Outside, the dog finally starts to bark, and it keeps barking until long after the lights are out.',
    ],
    go: 'room',
  },

  hide: {
    bg: 'house', rain: false, chars: familyOnScreen, item: null, ambient: ['room', 'rain_in', 'clock'],
    lines: [
      'You say the traffic was bad. Mom looks at your wet jacket for a long time, then says nothing.',
      { if: s => has(s, 'ama'), who: 'ama', t: 'Stay away from the water this month, A-Wei. The drowned are always looking for someone to take their place.' },
      { if: s => has(s, 'ama'), who: 'mom', t: 'Ma.' },
      { if: s => has(s, 'ama'), who: 'ama', t: "What? I'm only saying." },
      'Rice. Lotus root soup. Braised pork, the good kind, for the ancestors and the living alike.',
      'You lift the soup to your mouth.',
      { slow: true, t: 'It tastes of nothing.' },
      { beat: 1000 },
      { fx: 'red', ambient: ['room', 'heart'], slow: true, t: 'Then it tastes of ash. And under the ash, pond water.' },
      "You swallow anyway. Nobody else seems to notice. Everyone is eating. Everyone is fine.",
      { if: s => has(s, 'ama'), t: 'Ama is counting the bowls under her breath. She counts again. Her lips keep moving after she stops.' },
      { who: 'wen', t: 'Ge...' },
      { who: 'wen', t: 'Why did you set an extra place?' },
      { beat: 1300 },
      { item: 'bowl', sfx: 'dread', t: "You look down. There's a bowl beside yours. A pair of chopsticks stands straight up in the rice." },
      { slow: true, t: 'That is how you set rice out for the dead.' },
      { if: s => has(s, 'ama'), who: 'ama', t: "Who's sitting there, A-Wei?" },
      { fx: 'red-off', who: 'mom', t: 'Take those out. Now.' },
      { item: null, ambient: ['room', 'rain_in', 'clock'], t: 'You pull them out. The rice underneath is black and wet.' },
      { bg: 'house_watch', t: 'As you carry the bowl to the kitchen, you glance at the window.' },
      { beat: 1600 },
      { bg: 'house', fx: 'flicker', t: "Rain on the glass. Your own reflection. That's all." },
      { slow: true, t: "That's all." },
    ],
    go: 'room',
  },

  burn: {
    bg: 'house', rain: false, chars: familyOnScreen, item: 'envelope', ambient: ['room', 'rain_in'],
    lines: [
      'You hold the corner of the envelope to the altar candle.',
      "It won't catch.",
      { slow: true, t: 'You hold it longer. The flame leans away from the paper, as if a wind is blowing out of it.' },
      { beat: 1200 },
      { sfx: 'flame', fx: ['flash', 'red'], item: null, t: 'Then it catches all at once.' },
      { slow: true, t: "The smell isn't paper. It's hair. It's skin." },
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— it hurts, A-Wei, it’s so cold, don’t let go —' },
      { ambient: ['room', 'suona'], t: 'Somewhere down in the valley, a suona begins to play.' },
      { fx: 'red-off', do: s => { refuse(s); collect(s); }, chars: familyOnScreen, cut: true, redraw: true,
        t: 'When the smoke clears, the envelope is gone. Mom opens a window to let the smoke out.' },
      { beat: 1400 },
      { slow: true, t: 'Across the table, a pair of chopsticks rests on a full bowl of rice. Nobody reaches for it.' },
      'Nobody speaks for the rest of the night.',
      { slow: true, t: "When you undress for bed, the envelope is back in your pocket. You don't need to look." },
    ],
    go: 'room',
  },

  // ---------------------------------------------------------------- your old room
  room: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['night', 'clock'],
    lines: [
      "Your old room. Nothing has moved in three years. Nothing has moved in fifteen, really.",
      'The rain has eased. Out in the paddy fields the frogs have started up, hundreds of them, loud and stupid and alive.',
      "You used to fall asleep to them. Ama said frogs are the best guard dogs there are: when something is near, they go quiet.",
      { if: s => got(s, 'charm'), t: 'You hang Ama’s charm on the window latch, like she told you. The little red pouch turns slowly on its string, then stops.' },
      'You open the desk drawer, looking for a phone charger.',
      { item: 'photo', t: 'Instead there is a photograph. Faded to orange, the way old photos go.' },
      'You, at six, squinting in summer light. Behind you, flat grey water. The reservoir.',
      "You're holding someone's hand.",
      { slow: true, t: 'The rest of them has been cut out of the photo. Carefully, with scissors, right up to the wrist.' },
      'Just the hand is left. Small. A girl’s. Holding yours so tightly her knuckles are white.',
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— tie it tighter, so you won’t get lost in the grass —' },
      { beat: 1000 },
      { t: 'You turn the photo over. In a child’s handwriting: 阿偉 和 ——' },
      { slow: true, t: '"A-Wei and—." The second name has been scribbled out so hard the pen went through the paper.' },
      { item: null, do: give('photo'), t: "You put it back in the drawer. You close the drawer. You wedge the chair under it, which is stupid, and you know it's stupid, and you do it anyway." },
      { if: () => her().unread() >= 3, t: () => `Your phone buzzes on the desk. ${her().unread()} unread. You turn it face down. It keeps buzzing, face down, until it has walked itself to the edge of the desk.` },
      { if: () => her().unread() < 3 && her().total() >= 3, t: 'Your phone lights up on the desk. You have read every one of her messages. You wish you hadn’t.' },
      'You lie down. The frogs sing. The clock ticks. Nothing is near.',
      { slow: true, t: 'Nothing is near.' },
    ],
    go: 'night',
  },

  // ---------------------------------------------------------------- 3:33 AM
  night: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['night', 'clock'],
    lines: [
      { do: s => { s.flags.night = true; }, fx: 'darker', ambient: [], beat: 2800 },
      { big: '3:33' },
      { fx: 'dark', ambient: ['drip'], t: "You're awake. You don't know what woke you." },
      { if: () => { const h = new Date().getHours(); return h >= 0 && h < 5; }, who: 'bride', t: "It's late where you are, too. Isn't it." },
      { beat: 1600 },
      { if: () => her().total() >= 5, t: () => her().unread() ? `Your phone is lit up on the nightstand. ${her().unread()} new messages. You don't look. You've learned not to.` : 'Your phone is lit up on the nightstand. A new message, already marked as read. You never opened it.' },
      'It takes you a long moment to understand what is wrong.',
      { slow: true, t: 'The frogs have stopped.' },
      { beat: 1800 },
      "All of them. Every frog in every paddy field. Even the clock in the hall has stopped ticking, or you can't hear it anymore over the blood in your ears.",
      { beat: 2200 },
      { sfx: 'step', slow: true, t: 'Then, in the courtyard, a footstep.' },
      'Bare. Wet. Unhurried.',
      { beat: 2400 },
      { sfx: 'step', t: 'Another. Closer to your window.' },
      "You wait for the next one. It doesn't come.",
      { beat: 3000 },
      'Minutes pass. Your heart slows down. You start to think you dreamed it. You start to breathe again.',
      { beat: 1800 },
      { sfx: 'knock', slow: true, t: 'Tap.' },
      { beat: 1500 },
      { sfx: 'knock', ambient: ['drip', 'heart'], t: 'Tap. Tap.' },
      { if: s => has(s, 'ama'), who: 'ama', style: 'whisper', t: 'A-Wei? It’s Ama. Open the window, I’m cold.' },
      { if: s => has(s, 'ama'), slow: true, t: 'Not even if it sounds like me, she said.' },
      { if: s => has(s, 'ama'), beat: 1500 },
      { who: 'bride', sfx: 'whisper', slow: true, t: '...husband?' },
      { if: (s, m) => m.tabLeaves > 0, who: 'bride', t: 'You keep looking away from me.' },
    ],
    timer: { ms: 8000, go: 'look', do: s => { s.flags.hesitated = true; } },
    choices: [
      { t: 'Look out the window', go: 'look' },
      { t: 'Pull the blanket over your head', go: 'cover' },
    ],
  },

  look: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['drip', 'heart'],
    lines: [
      { if: s => s.flags.hesitated, slow: true, t: "You didn't choose. Your legs chose. You're already standing at the window." },
      { if: s => !s.flags.hesitated, t: 'You cross the room. Every floorboard you step on is one you remember, and every one of them creaks.' },
      { if: s => got(s, 'charm'), t: 'Ama’s charm hangs from the latch. It is turning slowly on its string, though there is no draft.' },
      'You put your hand on the curtain.',
      { beat: 2000 },
      { bg: 'courtyard', rain: true, chars: ['bride_far'], ambient: ['rain', 'heart'], t: 'You pull it back.' },
      { beat: 1500 },
      'The courtyard is empty.',
      { chars: ['bride_mid'], t: 'Just rain, and the gate, and the dark lanterns nobody has lit since Grandfather died.' },
      'You look for a long time, to be sure. There is nothing there. There is nothing in the courtyard.',
      { beat: 1600 },
      { slow: true, t: 'You let out a breath you have been holding for a very long time.' },
      { beat: 2200 },
      { chars: ['bride_hand'], ambient: ['rain'], t: 'She is standing right in front of the glass.' },
      "A red wedding dress. A veil that hangs to her waist. Rain runs off it without a sound. You can't see her face. You are grateful for that.",
      'She is small. Smaller than you expected. The dress is too big for her, like a child playing at weddings.',
      "She's holding up one hand. Tied around her smallest finger is a red thread.",
      { slow: true, t: 'It runs through the gap under the window frame, and into your room.' },
      { beat: 1200 },
      'You look down at your own hand.',
      { fx: 'red', slow: true, t: 'Red thread. Knotted tight around your little finger. The knot is still wet.' },
      { if: s => got(s, 'charm'), who: 'bride', t: 'Your grandmother always did like to get in the way.' },
      { if: () => her().attention() >= 8, who: 'bride', t: 'You always look when I write to you. You never looked at me like that when we were small.' },
      { if: () => her().attention() < 8 && her().unread() >= 5, who: 'bride', t: "You didn't read my messages." },
      { if: () => her().attention() < 8 && her().unread() >= 5, who: 'bride', slow: true, t: "That's all right. I'll keep writing." },
      { who: 'bride', t: 'Seven days is so long. I waited twenty years. I can wait seven days.' },
      { who: 'bride', sfx: 'whisper', do: s => { s.flags.named = true; }, slow: true, t: "It's me. Qiu-Yue. Don't you remember? You held my hand so tight." },
      { who: 'bride', slow: true, t: 'And then you let go.' },
    ],
    timer: { ms: 7000, go: 'silent' },
    choices: [
      { t: 'Cut the thread', go: 'cut' },
      { t: 'Say nothing', go: 'silent' },
      { t: '"I don\'t remember you."', go: 'deny' },
    ],
  },

  deny: {
    bg: 'courtyard', rain: true, chars: ['bride_hand'], item: null, ambient: ['rain', 'heart'],
    lines: [
      { who: 'you', t: "I don't remember you. I don't know who you are." },
      { beat: 1600 },
      { slow: true, t: 'She is quiet for a long time.' },
      { who: 'bride', t: 'I know. They made you forget.' },
      { who: 'bride', t: "It's all right. I remember enough for both of us." },
      { chars: [], fx: 'flicker', t: 'When you blink, the courtyard is empty. The thread goes slack, and trails away across the wet stones toward the gate.' },
      { do: s => { s.flags.denied = true; }, slow: true, t: 'Toward the road. Toward the reservoir.' },
    ],
    go: 'morning',
  },

  cut: {
    bg: 'courtyard', rain: true, chars: ['bride_hand'], item: null, ambient: ['rain', 'heart_fast'],
    lines: [
      'The scissors are in your desk drawer, where they always were. The thread is thin. It should be easy.',
      { fx: 'memory', who: 'girl', style: 'memory', t: '— careful with the scissors, you’ll cut me out —' },
      { slow: true, t: 'The blades go through it like hair.' },
      { fx: 'flicker', t: 'It is hair.' },
      { beat: 1400 },
      { chars: ['bride'], t: "Outside the glass, she doesn't move." },
      { slow: true, t: 'Then, slowly, her head tilts.' },
      'Further than it should. All the way down to her shoulder. Paper creases softly at her neck.',
      { who: 'bride', t: "That's all right. Someone already cut me out once." },
      { beat: 1000 },
      { who: 'bride', sfx: 'whisper', do: refuse, slow: true, t: "I'll ask your family instead." },
    ],
    go: 'morning',
  },

  silent: {
    bg: 'courtyard', rain: true, chars: ['bride_hand'], item: null, ambient: ['rain', 'heart'],
    lines: [
      "You don't answer. You don't breathe.",
      { beat: 2600 },
      { chars: [], t: 'After a long time she lowers her hand. She turns and walks away across the courtyard and out through the gate.' },
      { fx: 'shake', t: 'The thread pulls tight. Tighter. Your finger goes white, then purple.' },
      { beat: 1400 },
      { slow: true, t: 'Then it goes slack.' },
    ],
    go: 'morning',
  },

  cover: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['drip', 'heart'],
    lines: [
      "You pull the blanket over your head, like you're six again. Like it has ever helped.",
      'The tapping stops.',
      { fx: 'darker', beat: 3000 },
      'Silence. It lasts so long that you almost fall asleep. That is the worst part, later. How close you came to sleeping.',
      { beat: 1800 },
      { if: s => got(s, 'charm'), sfx: 'rustle', t: 'Across the room, paper tears. Softly. Like someone opening a letter.' },
      { sfx: 'step', t: 'A footstep.' },
      { slow: true, t: 'Inside the room.' },
      { beat: 2000 },
      { sfx: 'step', t: 'Another, beside the bed.' },
      'Water drips onto the floor. Onto the blanket. It is soaking through, cold, right above your face. It smells of the reservoir.',
      { beat: 1600 },
      { t: 'The end of the mattress sinks. Someone is sitting at the foot of your bed. Someone light. Someone small.' },
      { slow: true, t: 'Cold, wet fingers slide under the blanket and find your hand.' },
      'They tie something around your little finger. Carefully. Lovingly. The way you tie a thread when you are seven and playing at weddings.',
      { who: 'bride', sfx: 'whisper', slow: true, t: "There. Now you won't get lost." },
      { who: 'bride', slow: true, t: "And you can't let go again." },
    ],
    go: 'morning',
  },

  // ---------------------------------------------------------------- morning
  morning: {
    bg: 'black', rain: false, chars: [], item: null, ambient: [],
    lines: [
      { do: collect, beat: 2000 },
      { ambient: ['room', 'morning'], t: 'You wake up. Birds. Grey light.' },
      { slow: true, t: 'You are not in your bed.' },
      { fx: 'flicker', bg: 'hall', t: "You're standing in the ancestral hall, barefoot, in front of the altar." },
      'Your feet are black with mud. Your little finger is bruised a deep, even purple all the way around, like a ring.',
      'The floor is wet. A trail of small, bare footprints runs between the altar and the stairs to your room.',
      { slow: true, t: "You can't tell which way they're going." },
      { beat: 1500 },
      "On the altar, between your grandfather's tablet and your great-grandmother's, there is a new one.",
      { beat: 1200 },
      { sfx: 'dread', do: s => { s.day = 6; }, slow: true, t: 'Unpainted. Blank. Waiting for a name.' },
      { item: 'photo_red', t: 'The photograph from your drawer is propped against it.' },
      { slow: true, t: 'Where the girl was cut away, someone has pressed a small red handprint into the empty space. It is still wet.' },
      { item: null, beat: 1200 },
      { if: s => got(s, 'charm'), t: 'Ama’s charm lies on the floor at your feet. The yellow paper has gone black and soft, like it has been underwater for a very long time.' },
      { beat: 1500 },

      // Family is never "announced" as missing. It simply isn't mentioned.
      { if: s => has(s, 'mom') && has(s, 'wen') && has(s, 'ama'), who: 'mom',
        t: "A-Wei! Xiao-Wen! Breakfast! Ama's been up since four burning paper money, come eat before it's cold!" },
      { if: s => has(s, 'mom') && has(s, 'wen') && has(s, 'ama'), t: 'You hear Ama laughing at something in the kitchen. You stand there and listen to it for a long time.' },
      { if: s => has(s, 'mom') && has(s, 'wen') && !has(s, 'ama'), who: 'mom', t: 'A-Wei! Xiao-Wen! Breakfast!' },
      { if: s => has(s, 'mom') && has(s, 'wen') && !has(s, 'ama'), t: 'She sets out [[four|three]] bowls.' },
      { if: s => has(s, 'mom') && !has(s, 'wen'), who: 'mom', t: 'A-Wei! [[Xiao-|]]Breakfast!' },
      { if: s => has(s, 'mom') && !has(s, 'wen'), slow: true, t: 'She sets out [[three|two]] bowls. Just two. Like always.' },
      { if: s => s.family.length === 0, t: 'The house is very quiet. You make breakfast. [[Four bowls.|One bowl.]]' },
      { if: s => s.family.length === 0, slow: true, t: "You're sure there should be more. You can't think who for." },

      { if: () => her().unread() >= 8, t: () => `Your phone says ${her().unread()} unread messages. You don't need to open it to know who they're from.` },

      // The keepsake outlives the memory.
      { if: s => !has(s, 'wen') && got(s, 'ingot'), item: 'ingot', t: 'In your pocket there is a folded gold paper ingot. Careful folds, a little crooked. A child made this.' },
      { if: s => !has(s, 'wen') && got(s, 'ingot'), slow: true, t: "You don't know who. You keep it anyway. You don't know why that makes you want to cry." },
    ],
    end: { invitation: true },
  },
};

// ============================================================================
// DAYS TWO TO SEVEN
// The truth is found in three places: the temple (who she was), the Lin
// house (the other half of the photograph), and the water (what you did).
// Remembering unlocks the only ending where anyone is forgiven.
// ============================================================================
Object.assign(SPEAKERS, {
  keeper:     { name: 'The Temple Keeper' },
  matchmaker: { name: 'The Matchmaker', cls: 'whisper' },
});
const truthFound = s => ['askedWho', 'foundHalf', 'remembered', 'apologized'].filter(f => s.flags[f]).length;

Object.assign(STORY, {
  // ---------------------------------------------------------------- DAY 2: the temple
  day2: {
    bg: 'black', rain: false, chars: [], item: null, ambient: ['drone'],
    lines: [
      { do: s => { s.day = 6; }, big: '六日', sub: 'Six days.' },
      { if: s => has(s, 'mom'), t: "Mom drives you to the temple before the sun is properly up. She doesn't turn on the radio." },
      { if: s => !has(s, 'mom'), t: 'You drive to the temple alone. You leave the radio off. You have the strangest feeling that someone should be in the passenger seat.' },
      { if: s => has(s, 'ama'), t: 'Ama sits in the back, holding her handbag on her knees like a shield.' },
      'Your little finger is still purple. You keep that hand in your pocket, next to the envelope.',
    ],
    go: 'temple',
  },

  temple: {
    bg: 'temple', rain: false, chars: [], item: null, ambient: ['room', 'drone'],
    lines: [
      'The village temple is small and old. The walls are black with a hundred years of incense, and coils of it hang from the ceiling, burning down so slowly you can’t see them move.',
      { chars: ['keeper'], t: 'The temple keeper is a thin old man in a vest. He takes one look at your hand and puts down his broom.' },
      { who: 'keeper', t: 'Who tied that?' },
      { who: 'you', t: '...A girl. Last night.' },
      { who: 'keeper', t: 'A girl.' },
      'He laughs, without any happiness in it.',
      { who: 'keeper', t: 'Sit. We’ll ask.' },
      { item: 'moonblocks', t: 'He puts two red moon blocks in your hands: curved pieces of wood, flat on one side, worn smooth by a century of questions. You kneel. You ask in your head. You let them fall.' },
    ],
    choices: [
      { t: '“Can I refuse the marriage?”', go: 'blocks_refuse' },
      { t: '“Who was she?”', go: 'blocks_who' },
    ],
  },

  blocks_refuse: {
    bg: 'temple', rain: false, chars: ['keeper'], item: 'moonblocks', ambient: ['room', 'drone'],
    lines: [
      { sfx: 'knock', t: 'Clack. Both blocks land flat side up.' },
      { who: 'keeper', t: 'Laughing blocks. The gods think that’s funny.' },
      { sfx: 'knock', t: 'You throw again. Laughing blocks.' },
      { sfx: 'knock', slow: true, t: 'Again. Laughing blocks.' },
      { item: null, who: 'keeper', t: 'Three times. Don’t ask that again. You’re making them nervous.' },
      { who: 'keeper', t: 'A bride like this isn’t asking you, boy. She’s collecting. Somebody owes her something.' },
    ],
    go: 'temple2',
  },

  blocks_who: {
    bg: 'temple', rain: false, chars: ['keeper'], item: 'moonblocks', ambient: ['room', 'drone'],
    lines: [
      { sfx: 'knock', t: 'Clack. One flat side up, one round. A yes.' },
      { item: null, do: s => { s.flags.askedWho = true; }, who: 'keeper', t: 'They’ll allow it. Then ask me. I’ve waited twenty years for somebody to ask.' },
      { who: 'keeper', t: 'Lin Qiu-Yue. Seven years old. Drowned in the reservoir on the first day of Ghost Month, in her best red dress, because she’d been playing weddings all morning.' },
      { who: 'keeper', t: 'She couldn’t swim. Everybody knew that. Nobody ever asked why she went into the water.' },
      { who: 'keeper', slow: true, t: 'Children don’t go into the water alone. Not in the seventh month.' },
    ],
    go: 'temple2',
  },

  temple2: {
    bg: 'temple', rain: false, chars: ['keeper'], item: null, ambient: ['room', 'drone'],
    lines: [
      'He squints at you for a long time.',
      { who: 'keeper', t: 'I know your face. You were smaller.' },
      { who: 'keeper', t: 'Twenty years ago an old woman carried a boy in here, soaked through, burning with fever. His hand was clenched so tight she couldn’t open it.' },
      { slow: true, t: 'He looks at your little finger.' },
      { if: s => has(s, 'ama'), t: 'Ama is standing very still by the door.' },
      { if: s => has(s, 'ama'), who: 'ama', t: 'We should go, A-Wei.' },
      { if: s => has(s, 'ama'), who: 'keeper', t: 'She paid me to call his soul back from the water, and to make him forget it. I did what I was paid for.' },
      { if: s => has(s, 'ama'), t: 'Ama walks out into the sunlight without a word.' },
      { if: s => !has(s, 'ama'), who: 'keeper', t: 'An old woman. Your grandmother, maybe? I can’t—' },
      { if: s => !has(s, 'ama'), slow: true, t: 'He frowns. He tries to remember her face, and you watch him fail.' },
      { if: s => !has(s, 'ama'), who: 'keeper', t: 'Strange. I can’t remember who brought you.' },
      { who: 'keeper', t: 'Forgetting isn’t free. Somebody always pays for it.' },
      { who: 'keeper', t: 'Go up the hill, to the Lin house. Nobody’s lived there since the brothers died. If you want to know what you owe, it’s in that house.' },
    ],
    go: 'day2_night',
  },

  day2_night: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['night', 'clock'],
    lines: [
      'That night the frogs sing until midnight. Then they stop, all at once, as if someone told them to.',
      { ambient: ['drip', 'suona'], t: 'Down on the road, a suona begins to play. Slow. The tempo of a procession.' },
      { beat: 1600 },
      { bg: 'courtyard', rain: false, ambient: ['drip', 'suona', 'heart'], t: 'You go to the window.' },
      'Outside the gate there is a sedan chair made of paper, red and gold, the kind they burn at funerals. Two paper bearers hold its poles. Their painted faces are turned towards your window.',
      { chars: ['matchmaker'], t: 'In the courtyard, right below you, stands an old woman made of paper. A red flower in her hair. A matchmaker’s fan.' },
      'She bows.',
      { who: 'matchmaker', t: 'I’ve come to measure the groom.' },
    ],
    timer: { ms: 8000, go: 'measured', do: s => { s.flags.hesitated2 = true; } },
    choices: [
      { t: 'Open the window', go: 'measured' },
      { t: 'Keep it shut', go: 'unmeasured' },
    ],
  },

  measured: {
    bg: 'courtyard', rain: false, chars: ['matchmaker'], item: null, ambient: ['drip', 'suona'],
    lines: [
      { if: s => s.flags.hesitated2, t: 'You don’t decide to open it. It’s already open. The night air smells of wet paper.' },
      'She doesn’t climb in. She simply reaches, and her arms are longer than they should be.',
      'She measures you with a red string: your wrist, your throat, the ring of bruise on your finger. Her fingers are dry and light, like moths.',
      { who: 'matchmaker', t: 'For the clothes. You’ll want to look nice for her.' },
      { chars: [], slow: true, t: 'When she’s gone, there’s a red string tied loosely around your throat. You didn’t feel her tie it.' },
    ],
    go: 'day3',
  },

  unmeasured: {
    bg: 'courtyard', rain: false, chars: ['matchmaker'], item: null, ambient: ['drip', 'suona'],
    lines: [
      'You keep your hand flat against the glass.',
      'She measures you anyway, with her eyes, the way a tailor does: shoulders, arms, the length of you. She writes something in a little book.',
      { who: 'matchmaker', t: 'He’s grown. She’ll be pleased.' },
      { chars: [], t: 'The suona fades back down the road. The frogs don’t start again until dawn.' },
    ],
    go: 'day3',
  },

  // ---------------------------------------------------------------- DAYS 3-4: the Lin house
  day3: {
    bg: 'black', rain: false, chars: [], item: null, ambient: ['drone'],
    lines: [
      { do: s => { s.day = 4; }, big: '四日', sub: 'Four days.' },
      'Two days pass. You don’t remember them well. You sleep in the afternoons. Your finger stops hurting and starts to feel like a ring.',
      { if: s => has(s, 'mom'), t: 'Mom has started setting an extra bowl at dinner. When you ask her who it’s for, she looks at it as if she has never seen it before.' },
      'On the fourth day before the wedding, you climb the hill to the Lin house.',
    ],
    go: 'linhouse',
  },

  linhouse: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'drip'],
    lines: [
      'The door isn’t locked. It isn’t even closed.',
      'Inside, everything is under a fine grey dust. Everything except the altar. The altar is clean. Someone has been keeping it.',
      'Three tablets. Three brothers. Lin Wen-Kai. Lin Wen-Hao. Lin Wen-Jie. All their dates of death fall within a single year, twenty years ago.',
      { slow: true, t: 'There is no tablet for her.' },
      'In the corner, paper things are stacked and waiting to be burned: a paper house, a paper car, a paper maid with a painted smile. Wedding gifts, for the other side. A dowry.',
      { beat: 1400 },
      { sfx: 'step', t: 'Upstairs, a child’s room. A small bed. A red dress on a hanger, too big for the girl who wore it.' },
      { item: 'photo_half', t: 'On the wall, a photograph, faded to orange the way old photos go.' },
      'A little girl in red, squinting in summer light. Behind her, flat grey water.',
      { slow: true, t: 'She’s holding someone’s hand. The rest of him has been cut out.' },
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— careful with the scissors, you’ll cut me out —' },
      'Two halves of the same picture. Someone cut you apart, and each family kept a half.',
    ],
    choices: [
      { t: 'Take the photograph', go: 'lin_take' },
      { t: 'Burn her dowry', go: 'lin_burn' },
      { t: 'Leave everything as it is', go: 'lin_leave' },
    ],
  },

  lin_take: {
    bg: 'linhouse', rain: false, chars: [], item: 'photo_whole', ambient: ['room', 'drip'],
    lines: [
      { do: s => { s.flags.foundHalf = true; give('photo_half')(s); }, t: 'You take out your half and hold them side by side.' },
      'They fit perfectly. Two children holding hands so hard their knuckles are white.',
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— don’t let go, A-Wei, don’t let go —' },
      { item: null, who: 'bride', slow: true, t: 'You came to my house.' },
    ],
    go: 'turnoff',
  },

  lin_burn: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'heart'],
    lines: [
      { sfx: 'flame', fx: ['flash', 'red'], t: 'The paper house catches first. Then the car. The paper maid burns last, still smiling.' },
      { do: refuse, t: 'Behind you, in the doorway, three pairs of hands begin to clap. Slow and wet.' },
      { who: 'eldest', t: 'She will remember that you burned her dowry.' },
      { fx: 'red-off', t: 'When you turn around, the doorway is empty. The ash on the floor is shaped like small bare feet.' },
    ],
    go: 'turnoff',
  },

  lin_leave: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'drip'],
    lines: [
      'You leave it all where it is.',
      { sfx: 'step', t: 'On the stairs, wet footprints follow you down. Always one step behind.' },
    ],
    go: 'turnoff',
  },

  turnoff: {
    bg: 'road', rain: false, chars: [], item: null, ambient: ['drone'],
    lines: [
      'On the way down the hill, the road passes the turnoff. 水庫 — RESERVOIR, 2 KM.',
      { slow: true, t: 'You don’t hold your breath this time.' },
    ],
    choices: [
      { t: 'Walk down to the water', go: 'water' },
      { t: 'Go home', go: 'day5' },
    ],
  },

  water: {
    bg: 'reservoir', rain: false, chars: [], item: null, ambient: ['drip', 'sub'],
    lines: [
      'The reservoir is flat and grey and very still. Reeds. A concrete sluice. A sign: 禁止游泳, NO SWIMMING, the characters faded almost white.',
      'There is a moon in the water. You look up. There is no moon in the sky.',
      'You know this place. Your body knows it before you do.',
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— the water is warm on top and cold underneath —' },
      { fx: 'memory', who: 'girl', style: 'memory', t: '— something has your ankle, something is pulling —' },
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— she’s in the water too, she’s pulling you up, she’s so small —' },
      { beat: 1600 },
      { slow: true, t: 'And you remember letting go.' },
      'You didn’t slip. You let go because she was being pulled down too, and you were six, and you were so afraid.',
      'You let go, and you climbed out, and you lay on the bank, and you watched the water go still.',
      { do: s => { s.flags.remembered = true; }, who: 'bride', sfx: 'whisper', slow: true, t: 'Now you remember.' },
    ],
    go: 'day5',
  },

  // ---------------------------------------------------------------- DAYS 5-6
  day5: {
    bg: 'house', rain: false, chars: [], item: null, ambient: ['room', 'clock'],
    lines: [
      { do: s => { collect(s); s.day = 2; }, big: '二日', sub: 'Two days.' },
      { chars: familyOnScreen, if: s => s.family.length > 0, t: 'The days before a wedding are supposed to be busy. This house is very still.' },
      { if: s => s.family.length === 0, t: 'The house is very quiet. There is one bowl on the table. There has always been one bowl.' },
      { if: s => has(s, 'mom'), t: 'Mom has stopped asking what’s wrong. In the evenings she sits beside you and holds your wrist, the one with the ring of bruise, as if she’s taking your pulse.' },
      { if: s => has(s, 'wen'), who: 'wen', t: 'Ge, your hands are always wet now. Why are your hands always wet?' },

      // Ama's confession, if she's still here and you've started to find the truth
      { if: s => has(s, 'ama') && truthFound(s) > 0, t: 'Late in the evening, Ama sits down across from you. She doesn’t turn on the light.' },
      { if: s => has(s, 'ama') && truthFound(s) > 0, who: 'ama', t: 'I carried you out of that water. You and a piece of red thread, and nothing else.' },
      { if: s => has(s, 'ama') && truthFound(s) > 0, who: 'ama', t: 'I could have told the Lin family where their daughter was. I told them nothing. I paid the temple to make you forget, and I lit incense for that girl every year, where nobody could see.' },
      { if: s => has(s, 'ama') && truthFound(s) > 0, who: 'ama', slow: true, t: 'I thought that was enough. It wasn’t enough, was it.' },
      { if: s => has(s, 'ama') && truthFound(s) > 0, do: s => { s.flags.amaConfessed = true; }, t: 'She holds your hand, the way you remember someone else holding it.' },
    ],
    go: 'day6_night',
  },

  day6_night: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['night'],
    lines: [
      { fx: 'darker', ambient: [], beat: 2400 },
      { fx: 'dark', ambient: ['drip'], t: 'The night before the night before the wedding, she doesn’t knock.' },
      { chars: ['bride'], slow: true, t: 'When you wake, she is simply there, sitting on the end of your bed.' },
      'Her veil is wet. The mattress is wet where she sits. She is so small.',
      { who: 'bride', t: 'Two more days.' },
      { who: 'bride', t: 'Are you still afraid of me?' },
    ],
    choices: [
      { t: '“Yes.”', go: 'afraid' },
      { t: '“I’m sorry.”', if: s => s.flags.remembered, go: 'sorry' },
      { t: 'Say nothing', go: 'nothing' },
    ],
  },

  afraid: {
    bg: 'bedroom', rain: false, chars: ['bride'], item: null, ambient: ['drip'],
    lines: [
      { who: 'bride', slow: true, t: 'You were afraid then, too.' },
      { chars: [], t: 'When you blink, she’s gone. The bed stays wet until morning.' },
    ],
    go: 'day7',
  },

  sorry: {
    bg: 'bedroom', rain: false, chars: ['bride'], item: null, ambient: ['drip'],
    lines: [
      { who: 'you', t: 'I’m sorry. I let go of you.' },
      { beat: 2000 },
      { do: s => { s.flags.apologized = true; }, who: 'bride', slow: true, t: '...I waited twenty years to hear that.' },
      'She’s quiet for a long time.',
      { who: 'bride', t: 'It doesn’t change what’s owed. But it’s nice to hear.' },
      { chars: [], t: 'In the morning, the bed is dry.' },
    ],
    go: 'day7',
  },

  nothing: {
    bg: 'bedroom', rain: false, chars: ['bride'], item: null, ambient: ['drip'],
    lines: [
      'She waits. You don’t answer.',
      { chars: [], t: 'She leaves the way she came. The bed stays wet.' },
    ],
    go: 'day7',
  },

  // ---------------------------------------------------------------- DAY 7: the seventh night
  day7: {
    bg: 'black', rain: false, chars: [], item: null, ambient: ['drone'],
    lines: [
      { do: s => { collect(s); s.day = 0; }, big: '七夕', sub: 'The seventh night of the seventh month.' },
      'Tonight the Cowherd and the Weaver Girl are allowed to meet across the river of stars, once a year, on a bridge of magpies.',
      'Tonight, everyone in Taiwan is thinking about lovers.',
      { beat: 1600 },
      { bg: 'courtyard', ambient: ['suona', 'drip'], t: 'At 3:33 AM, the suona comes up the road.' },
      { chars: ['men'], t: 'The paper sedan chair is waiting at the gate. The matchmaker bows. The three brothers stand behind her in their wet suits, smiling.' },
      { who: 'eldest', t: 'Son-in-law. It’s time.' },
      'They don’t take your arms. They don’t have to. The thread on your finger pulls, gently, down the road, towards the water.',
      { if: s => has(s, 'mom'), t: 'Mom is standing in the doorway in her nightgown. She doesn’t try to stop you. She raises one hand, the way you wave to someone leaving on a train.' },
      { if: s => !has(s, 'mom'), t: 'Behind you, the house is dark. There is nobody at the window. There is nobody to be at the window.' },
    ],
    go: 'wedding',
  },

  wedding: {
    bg: 'reservoir', rain: false, chars: ['bride_hand'], item: null, ambient: ['suona', 'sub'],
    lines: [
      'They walk you to the reservoir. The water is perfectly still, and the moon is in it again.',
      'She is standing at the edge of the water. Small. The dress too big. The veil moves, though there is no wind.',
      { who: 'bride', t: 'You came.' },
      { if: s => s.flags.foundHalf, t: 'In your pocket, the two halves of the photograph are warm.' },
      { who: 'eldest', t: 'Take her hand, and it’s done.' },
    ],
    timer: { ms: 12000, go: 'end_wedding' },
    choices: [
      { t: 'Take her hand', go: 'end_wedding' },
      { t: 'Give her someone else', go: 'end_substitute' },
      { t: 'Say her name. Bring her home.', if: s => s.flags.remembered && (s.flags.foundHalf || s.flags.apologized || s.flags.askedWho), go: 'end_true' },
    ],
  },

  end_wedding: {
    bg: 'reservoir', rain: false, chars: ['bride_hand'], item: null, ambient: ['suona'],
    lines: [
      'You take her hand. It is small, and cold, and it holds on so tight.',
      { slow: true, t: 'This time, you don’t let go.' },
      { chars: [], ambient: ['sub'], t: 'You walk into the water together. It’s warm on top, and cold underneath, just as you remember.' },
      { beat: 2600 },
      { bg: 'hall', ambient: ['morning'], t: 'In the morning, the blank tablet on the altar has been painted. Two names, side by side, in careful brush strokes.' },
      { slow: true, t: '林秋月 · 阿偉' },
      { if: s => s.family.length > 0, t: 'Downstairs, someone sets out breakfast. They set out one bowl fewer than yesterday, and they don’t know why.' },
      { if: s => s.family.length === 0, t: 'There is nobody left in the house to light the incense. It burns anyway.' },
    ],
    end: { final: 'wedding', cn: '結婚', en: 'The Wedding', note: 'You held on this time.' },
  },

  end_substitute: {
    bg: 'reservoir', rain: false, chars: ['bride_hand'], item: 'envelope', ambient: ['suona'],
    lines: [
      'You take the envelope out of your pocket.',
      'You know how this works. The drowned are always looking for someone to take their place.',
      'You hold it out to her. Someone else. Anyone else. Someone on the road who doesn’t know the rules.',
      { beat: 2200 },
      { who: 'bride', t: '...You’d do that?' },
      { who: 'bride', slow: true, t: 'You’d let go of me again, and make somebody else hold on?' },
      { item: null, t: 'She takes the envelope. Her fingers don’t touch yours. The thread falls from your finger into the water.' },
      { chars: [], t: 'The procession turns, and walks back up to the road.' },
      { beat: 2000 },
      { bg: 'car', rain: true, ambient: ['rain'], t: 'A month later, driving back to Taipei, you pass the turnoff.' },
      { bg: 'road', item: 'envelope', t: 'There is a red envelope in the gravel by the guardrail. Neat. Sealed. Dry in the pouring rain.' },
      { item: null, t: 'Ahead of you, another car slows down.' },
      { slow: true, t: 'You don’t stop. You don’t sound the horn. You don’t do anything at all.' },
    ],
    end: { final: 'substitute', cn: '抓交替', en: 'The Substitute', note: 'Somebody else is holding on now.' },
  },

  end_true: {
    bg: 'reservoir', rain: false, chars: ['bride_hand'], item: null, ambient: ['sub'],
    lines: [
      { who: 'you', t: 'Lin Qiu-Yue.' },
      'You say her whole name, the way her mother must have said it. Nobody has said it out loud in twenty years.',
      { who: 'you', t: 'I remember. You pulled me out, and I let go of you. I was six and I was afraid, and they made me forget, and I’m sorry.' },
      { who: 'you', t: 'You don’t need a husband. You need somewhere to come home to.' },
      { who: 'you', t: 'Come home with us. You’ll have a place on our altar. We’ll feed you every day. We’ll say your name.' },
      { beat: 2000 },
      { who: 'eldest', t: 'That isn’t what was agreed.' },
      { who: 'bride', t: 'Brother. Be quiet.' },
      { chars: [], ambient: ['drip'], slow: true, t: 'She lifts the veil herself.' },
      'Underneath is a little girl’s face. Round. Sunburnt. Seven years old. Her eyes are only eyes.',
      { who: 'bride', t: 'You got so tall.' },
      'She takes the red thread in both hands and unties it from her finger. Then, very carefully, from yours.',
      { who: 'bride', t: 'Don’t let go of them, then.' },
      { beat: 2400 },
      { bg: 'hall', ambient: ['room', 'morning'], do: s => { s.lost.forEach(k => { if (!s.family.includes(k)) s.family.push(k); }); s.lost = []; s.debt = 0; },
        t: 'In the morning, the blank tablet on the altar has been painted. One name, in careful brush strokes: 林秋月. Not as a wife. As a daughter of the house.' },
      'From the kitchen, you hear Ama laughing at something. Mom calling for Xiao-Wen. The clatter of [[three|four]] bowls.',
      { slow: true, t: 'You stand there and listen for a long time. You don’t know why it makes you cry.' },
      'Every morning after that, there is one more bowl of rice on the altar. Somebody always remembers to fill it.',
    ],
    end: { final: 'true', cn: '紅線', en: 'The Red Thread', note: 'You held on to them.' },
  },
});

// Day One now leads on to Day Two.
STORY.morning.end = { invitation: true, next: 'day2' };
