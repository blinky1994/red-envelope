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
      { sfx: { n: 'slowclap', pan: -0.4, dist: 0.75 }, slow: true, t: 'And you can hear clapping.' },
      'Slow and wet. Coming from the grass behind you.',
      'Three pairs of hands.',
      { beat: 2200 },
      "You don't turn around.",
      { sfx: { n: 'slowclap', pan: -0.2, dist: 0.3 }, slow: true, t: 'The clapping stops. Now they are much closer.' },
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
      { sfx: { n: 'step', pan: 0.7, dist: 0.85 }, slow: true, t: 'Then, in the courtyard, a footstep.' },
      'Bare. Wet. Unhurried.',
      { beat: 2400 },
      { sfx: { n: 'step', pan: 0.45, dist: 0.5 }, t: 'Another. Closer to your window.' },
      "You wait for the next one. It doesn't come.",
      { beat: 3000 },
      'Minutes pass. Your heart slows down. You start to think you dreamed it. You start to breathe again.',
      { beat: 1800 },
      { sfx: { n: 'tap', pan: 0.35, dist: 0.15 }, slow: true, t: 'Tap.' },
      { beat: 1500 },
      { sfx: [{ n: 'tap', pan: 0.35, dist: 0.15 }, { n: 'tap', pan: 0.35, dist: 0.15, delay: 0.45 }], ambient: ['drip', 'heart'], t: 'Tap. Tap.' },
      { if: s => has(s, 'ama'), who: 'ama', style: 'whisper', sfx: { n: 'whisper', pan: 0.35, dist: 0.2 }, t: 'A-Wei? It’s Ama. Open the window, I’m cold.' },
      { if: s => has(s, 'ama'), slow: true, t: 'Not even if it sounds like me, she said.' },
      { if: s => has(s, 'ama'), beat: 1500 },
      { who: 'bride', sfx: { n: 'whisper', pan: 0.35, dist: 0.15 }, slow: true, t: '...husband?' },
      { if: (s, m) => m.tabLeaves > 0, who: 'bride', t: 'You keep looking away from me.' },
    ],
    timer: { ms: 8000, go: 'look', do: s => { s.flags.hesitated = true; } },
    choices: [
      { t: 'Look out the window', go: 'look' },
      { t: 'Pull the blanket over your head', go: 'cover' },
    ],
  },

  // At the window you never see her. You see a courtyard that is "empty",
  // and then a small hand, pressed flat against the glass.
  look: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['drip', 'heart'],
    lines: [
      { if: s => s.flags.hesitated, slow: true, t: "You didn't choose. Your legs chose. You're already standing at the window." },
      { if: s => !s.flags.hesitated, sfx: [{ n: 'creak', pan: -0.2, dist: 0.1 }, { n: 'creak', pan: 0.1, dist: 0.1, delay: 0.9 }], t: 'You cross the room. Every floorboard you step on is one you remember, and every one of them creaks.' },
      { if: s => got(s, 'charm'), t: 'Ama’s charm hangs from the latch. It is turning slowly on its string, though there is no draft.' },
      'You put your hand on the curtain.',
      { beat: 2000 },
      { bg: 'courtyard', rain: true, chars: ['bride_far'], ambient: ['rain', 'heart'], t: 'You pull it back.' },
      { beat: 1500 },
      'The courtyard is empty.',
      { chars: ['bride_mid'], t: 'Just rain, and the gate, and the dark lanterns nobody has lit since Grandfather died.' },
      'You look for a long time, to be sure. There is nothing there. There is nothing in the courtyard.',
      { beat: 1600 },
      { chars: [], slow: true, t: 'You let out a breath you have been holding for a very long time. You let go of the curtain.' },
      { beat: 1800 },
      { chars: ['hand_glass'], ambient: ['rain', 'heart_fast'], sfx: 'slap', fx: 'shake', t: 'A hand hits the glass.' },
      { slow: true, t: 'Right in front of your face, on the other side of the window.' },
      'Small. Pale as paper. Pressed flat against the window, fingers spread, the way a child presses her hand to an aquarium.',
      'Behind it there is red. A dress. A veil, maybe. The rain on the glass smears it into a shape you are grateful you can’t make out.',
      "Tied around the smallest finger is a red thread.",
      { slow: true, t: 'It runs through the gap under the window frame, and into your room.' },
      { beat: 1200 },
      'You look down at your own hand.',
      { fx: 'red', slow: true, t: 'Red thread. Knotted tight around your little finger. The knot is still wet.' },
      { if: s => got(s, 'charm'), who: 'bride', sfx: { n: 'whisper', pan: 0, dist: 0.1 }, t: 'Your grandmother always did like to get in the way.' },
      { if: () => her().attention() >= 8, who: 'bride', t: 'You always look when I write to you. You never looked at me like that when we were small.' },
      { if: () => her().attention() < 8 && her().unread() >= 5, who: 'bride', t: "You didn't read my messages." },
      { if: () => her().attention() < 8 && her().unread() >= 5, who: 'bride', slow: true, t: "That's all right. I'll keep writing." },
      { who: 'bride', t: 'Seven days is so long. I waited twenty years. I can wait seven days.' },
      { who: 'bride', sfx: { n: 'whisper', pan: 0, dist: 0.1 }, do: s => { s.flags.named = true; }, slow: true, t: "It's me. Qiu-Yue. Don't you remember? You held my hand so tight." },
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
    bg: 'courtyard', rain: true, chars: ['hand_glass'], item: null, ambient: ['rain', 'heart'],
    lines: [
      { who: 'you', t: "I don't remember you. I don't know who you are." },
      { beat: 1600 },
      { slow: true, t: 'The hand doesn’t move for a long time.' },
      { who: 'bride', t: 'I know. They made you forget.' },
      { who: 'bride', t: "It's all right. I remember enough for both of us." },
      { chars: [], t: 'The hand slides down the glass, slowly, leaving a clean streak through the rain. Then it is gone.' },
      { sfx: { n: 'step', pan: 0.6, dist: 0.7 }, t: 'The thread goes slack, and trails away across the wet stones toward the gate.' },
      { do: s => { s.flags.denied = true; }, slow: true, t: 'Toward the road. Toward the reservoir.' },
    ],
    go: 'morning',
  },

  cut: {
    bg: 'courtyard', rain: true, chars: ['hand_glass'], item: null, ambient: ['rain', 'heart_fast'],
    lines: [
      'The scissors are in your desk drawer, where they always were. The thread is thin. It should be easy.',
      { fx: 'memory', who: 'girl', style: 'memory', t: '— careful with the scissors, you’ll cut me out —' },
      { slow: true, t: 'The blades go through it like hair.' },
      { fx: 'flicker', t: 'It is hair.' },
      { beat: 1400 },
      { t: 'On the other side of the glass, the hand doesn’t move.' },
      { chars: [], sfx: { n: 'crinkle', pan: 0.1, dist: 0.15 }, slow: true, t: 'Then it slides away, and in the smear of red beyond the rain, something tilts. Further than a head should.' },
      'You hear paper crease. Softly. Like a letter being folded in half.',
      { who: 'bride', t: "That's all right. Someone already cut me out once." },
      { beat: 1000 },
      { who: 'bride', sfx: { n: 'whisper', pan: -0.3, dist: 0.4 }, do: refuse, slow: true, t: "I'll ask your family instead." },
    ],
    go: 'morning',
  },

  silent: {
    bg: 'courtyard', rain: true, chars: ['hand_glass'], item: null, ambient: ['rain', 'heart'],
    lines: [
      "You don't answer. You don't breathe.",
      { beat: 2600 },
      { chars: [], t: 'After a long time the hand lowers from the glass.' },
      { sfx: [{ n: 'step', pan: 0.3, dist: 0.5 }, { n: 'step', pan: 0.5, dist: 0.7, delay: 0.9 }, { n: 'step', pan: 0.7, dist: 0.9, delay: 1.8 }], t: 'Wet steps cross the courtyard, and go out through the gate.' },
      { fx: 'shake', t: 'The thread pulls tight. Tighter. Your finger goes white, then purple.' },
      { beat: 1400 },
      { slow: true, t: 'Then it goes slack.' },
    ],
    go: 'morning',
  },

  // Under the blanket you see nothing at all. That is the point.
  cover: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['drip', 'heart'],
    lines: [
      { fx: 'pitch', t: "You pull the blanket over your head, like you're six again. Like it has ever helped." },
      'The tapping stops.',
      { beat: 3000 },
      'Silence. It lasts so long that you almost fall asleep. That is the worst part, later. How close you came to sleeping.',
      { beat: 1800 },
      { if: s => got(s, 'charm'), sfx: { n: 'crinkle', pan: 0.6, dist: 0.5 }, t: 'Across the room, paper tears. Softly. Like someone opening a letter.' },
      { sfx: { n: 'door', pan: 0.6, dist: 0.45 }, t: 'The window latch lifts. The window swings in.' },
      { beat: 1600 },
      { sfx: { n: 'step', pan: 0.4, dist: 0.35 }, t: 'A footstep.' },
      { slow: true, t: 'Inside the room.' },
      { beat: 2000 },
      { sfx: { n: 'step', pan: 0.15, dist: 0.15 }, t: 'Another, beside the bed.' },
      { sfx: { n: 'dripNear' }, t: 'Water drips onto the floor. Onto the blanket. It is soaking through, cold, right above your face. It smells of the reservoir.' },
      { beat: 1600 },
      { sfx: { n: 'breath', pan: 0, dist: 0.05 }, t: 'Through the blanket, very close, something breathes. In. Out. The way children breathe when they are trying very hard to be quiet.' },
      { t: 'The end of the mattress sinks. Someone is sitting at the foot of your bed. Someone light. Someone small.' },
      { slow: true, t: 'Cold, wet fingers slide under the blanket and find your hand.' },
      'They tie something around your little finger. Carefully. Lovingly. The way you tie a thread when you are seven and playing at weddings.',
      { who: 'bride', sfx: { n: 'whisper', pan: 0, dist: 0.05 }, slow: true, t: "There. Now you won't get lost." },
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
//
// What frightened playtesters most was the bedroom at 3:33: nothing on screen,
// only darkness, sounds that come closer, and waiting. So every night from
// here on is a listening scene. She is almost never shown, only glimpsed: a
// hand, a hem, strips of wet paper. Sound carries the dread.
//
// The truth is found in four places: the temple (who she was), the Lin house
// (the other half of the photograph), the water (what you did), and her
// (saying sorry). Remembering unlocks the only ending where anyone is forgiven.
// ============================================================================
Object.assign(SPEAKERS, {
  keeper:     { name: 'The Temple Keeper' },
  matchmaker: { name: 'The Matchmaker', cls: 'whisper' },
});
const truthFound = s => ['askedWho', 'foundHalf', 'remembered', 'apologized'].filter(f => s.flags[f]).length;
const herText = t => () => { if (window.Her) Her.receive(t); };   // a message from her, on cue

// A relative is taken in front of you, mid-scene, and nobody reacts. Used
// wherever a refusal's debt is collected with the family on screen.
const vanishAt = (cue, after) => [
  { if: s => (s.debt || 0) > 0, beat: 1400 },
  { if: s => (s.debt || 0) > 0, do: s => { const n = s.family.length; collect(s); s.flags.justVanished = s.family.length < n; },
    chars: familyOnScreen, cut: true, redraw: true, t: cue },
  ...after.map(l => ({ ...l, if: s => !!s.flags.justVanished && (!l.if || l.if(s)) })),
  { if: s => !!s.flags.justVanished, do: s => { s.flags.justVanished = false; } },
];

Object.assign(STORY, {
  // ================================================================ DAY 2 · 六日
  day2: {
    bg: 'black', rain: false, chars: [], item: null, ambient: ['drone'],
    lines: [
      { do: s => { s.day = 6; s.flags.named = true; }, big: '六日', sub: 'Six days.' },
      { if: s => has(s, 'mom'), bg: 'car', ambient: ['drone'], t: "Mom drives you to the temple before the sun is properly up. She doesn't turn on the radio. Neither do you." },
      { if: s => !has(s, 'mom'), bg: 'car', t: 'You drive to the temple alone. You leave the radio off. You have the strangest feeling that someone should be in the passenger seat.' },
      { if: s => has(s, 'ama'), t: 'Ama sits in the back, holding her handbag on her knees like a shield. Every time you pass the reservoir sign, her lips move.' },
      { if: s => has(s, 'wen'), t: 'Xiao-Wen stayed home. She said she was tired. She had gold paper under her fingernails.' },
      'Your little finger is still purple. You keep that hand in your pocket, next to the envelope. The envelope is warm. Your hand is not.',
    ],
    go: 'temple',
  },

  temple: {
    bg: 'temple', rain: false, chars: [], item: null, ambient: ['room', 'drone'],
    lines: [
      'The village temple is small and old. The walls are black with a hundred years of incense, and coils of it hang from the ceiling, burning down so slowly you can’t see them move.',
      'It is the first place in two days where you feel safe. You didn’t know how tired you were until now.',
      { chars: ['keeper'], t: 'The temple keeper is a thin old man in a vest. He takes one look at your hand and puts down his broom.' },
      { who: 'keeper', t: 'Who tied that?' },
      { who: 'you', t: '...A girl. Last night.' },
      { who: 'keeper', t: 'A girl.' },
      'He laughs, without any happiness in it.',
      { who: 'keeper', t: 'First we call you back. Then we ask. Give me your shirt.' },
    ],
    go: 'shoujing',
  },

  // 收驚: calling a frightened soul back into the body.
  shoujing: {
    bg: 'temple', rain: false, chars: ['keeper'], item: null, ambient: ['room', 'drone'],
    lines: [
      'He fills a cup to the brim with uncooked rice and levels it with the edge of his hand. He wraps it tight in your shirt.',
      'Then he passes it over your head, round and round, slowly, murmuring. He calls your name. Your full name. Your childhood name. He calls it into your ears, one then the other, as if you were somewhere far away.',
      { sfx: { n: 'whisper', pan: -0.6, dist: 0.1 }, t: 'A-Wei. Come back. A-Wei. Come back to your body.' },
      { sfx: { n: 'whisper', pan: 0.6, dist: 0.1 }, t: 'A-Wei. Come home.' },
      { beat: 1600 },
      'He unwraps the cup, and looks at the rice, and doesn’t say anything for a long time.',
      { who: 'you', t: 'What is it?' },
      'When a soul is frightened, the rice sinks a little, on one side. That’s all. That’s what it’s supposed to do.',
      { slow: true, t: 'Pressed into the surface of the rice is the shape of a small hand.' },
      { who: 'keeper', t: 'That isn’t yours.' },
      { item: 'moonblocks', t: 'He puts two red moon blocks in your palms: curved wood, flat on one side, worn smooth by a century of questions. Kneel. Ask in your head. Let them fall.' },
    ],
    choices: [
      { t: '“Can I refuse the marriage?”', go: 'blocks_refuse' },
      { t: '“Who was she?”', go: 'blocks_who' },
    ],
  },

  blocks_refuse: {
    bg: 'temple', rain: false, chars: ['keeper'], item: 'moonblocks', ambient: ['room', 'drone'],
    lines: [
      { sfx: { n: 'knock', pan: 0, dist: 0.3 }, t: 'Clack. Both blocks land flat side up.' },
      { who: 'keeper', t: 'Laughing blocks. The gods think that’s funny.' },
      { sfx: { n: 'knock', pan: 0.1, dist: 0.3 }, t: 'You throw again. Laughing blocks.' },
      { sfx: { n: 'knock', pan: -0.1, dist: 0.3 }, slow: true, t: 'Again. Laughing blocks.' },
      { item: null, who: 'keeper', t: 'Three times. Don’t ask that again. You’re making them nervous.' },
      { who: 'keeper', t: 'A bride like this isn’t asking you, boy. She’s collecting. Somebody owes her something.' },
    ],
    go: 'temple2',
  },

  blocks_who: {
    bg: 'temple', rain: false, chars: ['keeper'], item: 'moonblocks', ambient: ['room', 'drone'],
    lines: [
      { sfx: { n: 'knock', pan: 0, dist: 0.3 }, t: 'Clack. One flat side up, one round. A yes.' },
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
      { who: 'keeper', t: 'Twenty years ago an old woman carried a boy in here, soaked through, burning with fever. His fist was clenched so tight she couldn’t open it.' },
      { slow: true, t: 'He looks at your little finger.' },
      { if: s => has(s, 'ama'), t: 'Ama is standing very still by the door.' },
      { if: s => has(s, 'ama'), who: 'ama', t: 'We should go, A-Wei.' },
      { if: s => has(s, 'ama'), who: 'keeper', t: 'She paid me to call his soul back from the water, and to make him forget it. I did what I was paid for.' },
      { if: s => has(s, 'ama'), t: 'Ama walks out into the sunlight without a word.' },
      { if: s => !has(s, 'ama'), who: 'keeper', t: 'An old woman. Your grandmother, maybe? I can’t—' },
      { if: s => !has(s, 'ama'), slow: true, t: 'He frowns. He tries to remember her face, and you watch him fail.' },
      { if: s => !has(s, 'ama'), who: 'keeper', t: 'Strange. I can’t remember who brought you.' },
      { who: 'keeper', t: 'Forgetting isn’t free. Somebody always pays for it.' },
      { who: 'keeper', t: 'Tonight they’ll send the matchmaker, to measure you for the wedding clothes. Listen to me.' },
      { who: 'keeper', slow: true, t: 'Whatever you hear, keep your eyes shut. What they can’t look you in the eye, they can’t take the measure of.' },
      { who: 'keeper', t: 'And afterwards, go up the hill, to the Lin house. If you want to know what you owe, it’s in that house.' },
    ],
    go: 'day2_night',
  },

  // The matchmaker: never seen. A suona on the road, paper feet in the
  // courtyard, something on the roof, and your eyes shut the whole time.
  day2_night: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['night', 'clock'],
    lines: [
      'That night you lie in the dark and listen to the frogs, and count them, the way you count sheep.',
      { fx: 'darker', ambient: [], beat: 2600 },
      { fx: 'dark', ambient: ['drip'], t: 'You wake at 2:47. The frogs have stopped. You were expecting that. It doesn’t help.' },
      { beat: 2000 },
      { sfx: { n: 'suonaFar', pan: -0.8, dist: 1 }, t: 'Far away, down on the main road, a suona.' },
      'Slow. The tempo of a procession. A wedding, or a funeral. At this distance you can’t tell which.',
      { beat: 2600 },
      { sfx: { n: 'suonaFar', pan: -0.5, dist: 0.7 }, t: 'Closer. The turnoff to the village.' },
      { beat: 2600 },
      { sfx: { n: 'suonaFar', pan: -0.2, dist: 0.45 }, t: 'Closer. The lane.' },
      { beat: 2200 },
      { t: 'It stops outside the gate.' },
      { beat: 3000 },
      { sfx: { n: 'crinkle', pan: 0.2, dist: 0.6 }, t: 'Something crosses the courtyard. Not footsteps. The whisper of paper sliding over wet stone.' },
      { beat: 1800 },
      { sfx: [{ n: 'creak', pan: 0.3, dist: 0.4 }, { n: 'crinkle', pan: 0.2, dist: 0.35, delay: 0.6 }], t: 'It climbs the wall. You hear the roof tiles take its weight, one by one, and it weighs almost nothing.' },
      { beat: 1600 },
      { sfx: { n: 'door', pan: 0.5, dist: 0.3 }, t: 'The window latch lifts. You locked it. You know you locked it.' },
      { fx: 'pitch', slow: true, t: 'You shut your eyes.' },
      { sfx: { n: 'crinkle', pan: 0.2, dist: 0.1 }, t: 'Paper, close. Very close. It smells of joss money and wet dust.' },
      { sfx: { n: 'breath', pan: 0.1, dist: 0.05 }, t: 'Something dry touches your wrist. A fingertip, light as a moth, measuring.' },
      'It moves to your throat. It rests there, and waits, while your pulse knocks against it.',
      'It slides down your arm to your little finger, and settles on the knot.',
      { who: 'matchmaker', sfx: { n: 'whisper', pan: 0, dist: 0.03 }, slow: true, t: 'Such a good size.' },
      { who: 'matchmaker', sfx: { n: 'whisper', pan: 0.1, dist: 0.03 }, t: 'Now let me see his eyes.' },
    ],
    timer: { ms: 9000, go: 'eyes_shut' },
    choices: [
      { t: 'Keep your eyes shut', go: 'eyes_shut' },
      { t: 'Open your eyes', go: 'eyes_open' },
    ],
  },

  eyes_shut: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['drip', 'heart'],
    lines: [
      { fx: 'pitch', t: 'You keep them shut. You keep them shut so hard you see sparks.' },
      { beat: 2600 },
      { sfx: { n: 'breath', pan: 0, dist: 0.02 }, t: 'Something breathes against your eyelids. It is waiting for you to look.' },
      { beat: 3000 },
      { who: 'matchmaker', sfx: { n: 'whisper', pan: 0.3, dist: 0.15 }, t: 'Shy. Like his bride.' },
      { sfx: { n: 'crinkle', pan: 0.5, dist: 0.4 }, t: 'Paper, moving away. The window. The tiles.' },
      { beat: 2000 },
      { sfx: { n: 'suonaFar', pan: -0.5, dist: 0.8 }, t: 'The suona starts again, and goes back down the road, and doesn’t stop until you can’t hear it anymore.' },
      { fx: 'pitch-off', ambient: ['night'], t: 'When the frogs begin again, you open your eyes. There is a red string tied loosely around your wrist. You didn’t feel her tie it.' },
    ],
    go: 'day3',
  },

  eyes_open: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['drip', 'heart_fast'],
    lines: [
      { fx: 'pitch-off', t: 'You open your eyes.' },
      { beat: 1400 },
      'The room is empty. The window is shut and latched. Nothing is standing over you. Nothing was ever standing over you.',
      { slow: true, t: 'On the pillow beside your head there is a dent, small and round, as if someone has been lying there with their face very close to yours.' },
      'It is wet.',
      { do: s => { s.flags.seenEyes = true; }, who: 'matchmaker', sfx: { n: 'whisper', pan: 0, dist: 0.2 }, t: 'There. Now I’ve seen them.' },
      'The voice came from under the bed.',
      { beat: 2400 },
      { ambient: ['night'], t: 'You don’t look under the bed. You lie there with the light on until the sky goes grey, and you don’t look.' },
    ],
    go: 'day3',
  },

  // ================================================================ DAY 3 · 五日
  day3: {
    bg: 'black', rain: false, chars: [], item: null, ambient: ['drone'],
    lines: [
      { do: s => { s.day = 5; s.flags.decor = true; }, big: '五日', sub: 'Five days.' },
      { bg: 'house', chars: familyOnScreen, ambient: ['room', 'clock'], t: 'In the morning there are red paper 囍 characters pasted on the front doors, the window, the wall above the altar. Double happiness. The paper is still damp with glue.' },
      { if: s => has(s, 'mom'), who: 'mom', t: 'Did you do these, A-Wei? They’re a bit early for anything.' },
      { if: s => has(s, 'mom'), t: 'She is smiling. She looks at them the way she looks at a gift. You don’t tell her you’ve never seen them before.' },
      { if: s => has(s, 'wen'), who: 'wen', t: 'I dreamt I was sewing all night, Ge. Little red clothes. My fingers hurt.' },
      { if: s => has(s, 'wen'), t: 'Her fingertips are pricked all over, tiny red dots, like she really was.' },
      { if: s => s.family.length === 0, t: 'There is nobody to ask who put them there. There is nobody in the house but you.' },
      { chars: [], t: 'In the afternoon, you climb the hill to the Lin house.' },
    ],
    go: 'linhouse',
  },

  // The Lin house: whatever lives here walks when you walk, one step behind.
  linhouse: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'drip'],
    lines: [
      'The door isn’t locked. It isn’t even closed.',
      'Inside, everything is under a fine grey dust. Your footprints are the only ones on the floor.',
      { sfx: { n: 'creak', pan: 0.2, dist: 0.5 }, t: 'Somewhere upstairs, a floorboard creaks.' },
      'You stop.',
      { beat: 1600 },
      'It stops.',
      { sfx: [{ n: 'creak', pan: -0.1, dist: 0.1 }, { n: 'creak', pan: 0.2, dist: 0.5, delay: 0.35 }], t: 'You take a step. Upstairs, a step.' },
      { sfx: [{ n: 'creak', pan: 0, dist: 0.1 }, { n: 'creak', pan: 0.25, dist: 0.5, delay: 0.35 }], t: 'Another. Another, upstairs.' },
      { slow: true, t: 'Always a moment behind you. Like a child copying.' },
    ],
    go: 'lin_hub',
  },

  lin_hub: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'drip'],
    lines: [
      { if: s => (s.flags.linSeen || 0) === 1 && !s.flags.linUp, t: 'Upstairs, the footsteps have stopped. Whatever it is, it is waiting to see where you go next.' },
      { if: s => (s.flags.linSeen || 0) >= 2, t: 'The house is very quiet now. The dust has settled back over your footprints, as if you were never here.' },
    ],
    choices: [
      { t: 'The altar', if: s => !s.flags.linAltar, go: 'lin_altar' },
      { t: 'The paper dowry', if: s => !s.flags.linDowry, go: 'lin_dowry' },
      { t: 'Upstairs', if: s => !s.flags.linUp, go: 'lin_up' },
      { t: 'Leave the house', go: 'lin_exit' },
    ],
  },

  lin_altar: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'drip'],
    lines: [
      { do: s => { s.flags.linAltar = true; s.flags.linSeen = (s.flags.linSeen || 0) + 1; }, t: 'The altar is clean. Everything else in this house is buried in dust, and the altar is clean. Someone has been keeping it.' },
      'Three tablets. Three brothers. Lin Wen-Kai. Lin Wen-Hao. Lin Wen-Jie. All three died within a single year, twenty years ago.',
      'The incense in the burner is short and fresh. You touch the ash. It is still warm.',
      { slow: true, t: 'There is no tablet for her.' },
      'Beside the brothers’ tablets there is a space in the dust, clean and exactly the right size. As if a fourth tablet had stood there for years, and somebody took it away very recently.',
      { sfx: { n: 'creak', pan: 0.3, dist: 0.45 }, t: 'Upstairs, one creak. Then nothing.' },
    ],
    go: 'lin_hub',
  },

  lin_dowry: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'drip'],
    lines: [
      { do: s => { s.flags.linDowry = true; s.flags.linSeen = (s.flags.linSeen || 0) + 1; }, t: 'In the corner, paper things are stacked and waiting to be burned. A paper house with a gold roof. A paper car. A paper maid with a painted smile.' },
      'Wedding gifts, for the other side. A dowry. Twenty years of dust has turned all their bright colours the grey of old bone.',
      'Except the maid’s face. Her face is clean, and white, and freshly painted.',
      { slow: true, t: 'Her head is turned towards the stairs. You are almost sure it was facing the wall when you came in.' },
      { sfx: { n: 'crinkle', pan: 0.4, dist: 0.3 }, t: 'Behind you, somewhere in the pile, paper settles. Softly.' },
    ],
    choices: [
      { t: 'Burn the dowry', go: 'lin_burn' },
      { t: 'Leave it alone', go: 'lin_hub' },
    ],
  },

  lin_burn: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'heart'],
    lines: [
      { sfx: 'flame', fx: ['flash', 'red'], t: 'The paper house catches first. Then the car. The maid burns last, still smiling, her head still turned towards the stairs.' },
      { do: refuse, sfx: { n: 'slowclap', pan: 0, dist: 0.55 }, t: 'In the doorway behind you, three pairs of hands begin to clap. Slow, and wet.' },
      { who: 'eldest', sfx: { n: 'whisper', pan: 0, dist: 0.5 }, t: 'She will remember that you burned her dowry.' },
      { fx: 'red-off', t: 'When you turn around, the doorway is empty. The ash on the floor is shaped like small, bare feet.' },
    ],
    go: 'lin_hub',
  },

  lin_up: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'heart'],
    lines: [
      { do: s => { s.flags.linUp = true; s.flags.linSeen = (s.flags.linSeen || 0) + 1; }, sfx: { n: 'creak', pan: 0, dist: 0.1 }, t: 'The stairs are narrow. The footsteps above you stopped the moment you touched the first one.' },
      { sfx: { n: 'creak', pan: 0, dist: 0.1 }, t: 'One room at the top. A child’s room. The door is open a hand’s width.' },
      { beat: 1600 },
      'A small bed. A red dress on a hanger, too big for the girl who wore it. Dust on everything.',
      { slow: true, t: 'On the floor there are footprints in the dust. Small. Bare. Wet. Fresh.' },
      'They lead to the bed.',
      { slow: true, t: 'They don’t lead away.' },
      { beat: 2000 },
      'You don’t look under the bed.',
      { item: 'photo_half', t: 'On the wall, a photograph, faded to orange the way old photos go.' },
      'A little girl in red, squinting in summer light. Behind her, flat grey water.',
      { slow: true, t: 'She’s holding someone’s hand. The rest of him has been cut out.' },
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— careful with the scissors, you’ll cut me out —' },
      'Two halves of the same picture. Someone cut you apart, and each family kept a half.',
    ],
    choices: [
      { t: 'Take the photograph', go: 'lin_take' },
      { t: 'Leave it on the wall', go: 'lin_leavephoto' },
    ],
  },

  lin_take: {
    bg: 'linhouse', rain: false, chars: [], item: 'photo_whole', ambient: ['room', 'drip'],
    lines: [
      { do: s => { s.flags.foundHalf = true; give('photo_half')(s); }, t: 'You take out your half and hold them side by side.' },
      'They fit perfectly. Two children holding hands so hard their knuckles are white.',
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— don’t let go, A-Wei, don’t let go —' },
      { item: null, sfx: { n: 'breath', pan: -0.3, dist: 0.25 }, t: 'Under the bed, something breathes out. A long, slow breath, like someone who has been holding it for a very long time.' },
      { who: 'bride', sfx: { n: 'whisper', pan: -0.3, dist: 0.25 }, slow: true, t: 'You came to my house.' },
    ],
    go: 'lin_hub',
  },

  lin_leavephoto: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'drip'],
    lines: [
      'You leave it on the wall, where it has been for twenty years.',
      { sfx: { n: 'crinkle', pan: -0.3, dist: 0.2 }, t: 'As you turn to go, under the bed, something small shifts its weight.' },
    ],
    go: 'lin_hub',
  },

  lin_exit: {
    bg: 'linhouse', rain: false, chars: [], item: null, ambient: ['room', 'drip'],
    lines: [
      'You leave.',
      { sfx: [{ n: 'creak', pan: 0, dist: 0.5 }, { n: 'creak', pan: 0, dist: 0.45, delay: 0.7 }, { n: 'creak', pan: 0, dist: 0.4, delay: 1.4 }], t: 'Behind you, on the stairs, wet footsteps come down. Always one step behind.' },
      { slow: true, t: 'They stop at the door. Whatever it is, it doesn’t come outside.' },
      'Not in daylight.',
    ],
    go: 'turnoff',
  },

  turnoff: {
    bg: 'road', rain: false, chars: [], item: null, ambient: ['drone'],
    lines: [
      'On the way down the hill, the road passes the turnoff. 水庫 — RESERVOIR, 2 KM.',
      'The sun is going down. In an hour it will be dark.',
      { slow: true, t: 'You don’t hold your breath this time.' },
    ],
    choices: [
      { t: 'Walk down to the water', go: 'water' },
      { t: 'Go home before dark', go: 'day4' },
    ],
  },

  water: {
    bg: 'reservoir', rain: false, chars: [], item: null, ambient: ['drip', 'sub'],
    lines: [
      'The reservoir is flat and grey and very still. Reeds. A concrete sluice. A sign: 禁止游泳, NO SWIMMING, the characters faded almost white.',
      { slow: true, t: 'There is a moon in the water. You look up. There is no moon in the sky.' },
      'You know this place. Your body knows it before you do. Your feet find the path down to the bank on their own.',
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— the water is warm on top and cold underneath —' },
      { fx: 'memory', who: 'girl', style: 'memory', t: '— something has your ankle, something is pulling —' },
      { fx: 'memory', sfx: 'water', who: 'girl', style: 'memory', t: '— she’s in the water too, she’s pulling you up, she’s so small —' },
      { beat: 1600 },
      { slow: true, t: 'And you remember letting go.' },
      'You didn’t slip. You let go because she was being pulled down too, and you were six, and you were so afraid.',
      'You let go, and you climbed out, and you lay on the bank, and you watched the water go still.',
      { sfx: { n: 'splash', pan: 0.4, dist: 0.6 }, t: 'Out on the water, something small breaks the surface, and goes under again.' },
      { do: s => { s.flags.remembered = true; }, who: 'bride', sfx: { n: 'whisper', pan: 0.4, dist: 0.5 }, slow: true, t: 'Now you remember.' },
    ],
    go: 'day4',
  },

  // ================================================================ DAY 4 · 四日: the stairs
  day4: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['night', 'clock'],
    lines: [
      { do: s => { s.day = 4; }, big: '四日', sub: 'Four days.' },
      { if: s => s.flags.remembered, t: 'You don’t sleep. Every time you close your eyes you are six years old, and the water is warm on top and cold underneath.' },
      'The frogs are singing. You tell yourself that means something. You tell yourself that until it’s almost midnight.',
      { do: herText('i’m in the house'), sfx: 'buzz', t: 'Your phone lights up on the nightstand.' },
      'You don’t pick it up. You can read it from here.',
      { slow: true, t: 'i’m in the house' },
      { beat: 2000 },
      'The stairs in Ama’s house have nine steps. When you were small you used to count them in the dark, so you’d know when you were safe at the top.',
      { fx: 'darker', beat: 2400 },
      { sfx: { n: 'creak', pan: -0.5, dist: 0.85 }, slow: true, t: 'One.' },
      { beat: 2200 },
      { sfx: { n: 'creak', pan: -0.5, dist: 0.8 }, t: 'Two.' },
      { beat: 2000 },
      { sfx: { n: 'creak', pan: -0.45, dist: 0.75 }, t: 'Three.' },
      { beat: 3600 },
      'Nothing. For so long that you start to breathe again.',
      { sfx: [{ n: 'creak', pan: -0.4, dist: 0.65 }, { n: 'creak', pan: -0.4, dist: 0.6, delay: 0.7 }], t: 'Four. Five.' },
      { sfx: { n: 'creak', pan: -0.35, dist: 0.5 }, t: 'Six.' },
      { beat: 1800 },
      { sfx: { n: 'creak', pan: -0.3, dist: 0.42 }, t: 'Seven.' },
      { sfx: { n: 'creak', pan: -0.25, dist: 0.35 }, t: 'Eight.' },
      { beat: 2800 },
      { sfx: { n: 'creak', pan: -0.2, dist: 0.28 }, slow: true, t: 'Nine.' },
      { fx: 'pitch', beat: 4200 },
      'Nothing happens.',
      { beat: 3000 },
      { bg: 'bedroom_fingers', fx: 'pitch-off', t: 'You make yourself look at the room. The door is shut. The window is shut. The wardrobe door is shut.' },
      'Everything is exactly where it was.',
      { beat: 2600 },
      { sfx: { n: 'creak', pan: -0.1, dist: 0.12 }, slow: true, t: 'Ten.' },
      { slow: true, t: 'The stairs only have nine steps.' },
      { beat: 2400 },
      { sfx: { n: 'scratch', pan: 0.7, dist: 0.2 }, t: 'Something scratches, very gently, on wood. Not the door. Somewhere closer.' },
    ],
    timer: { ms: 9000, go: 'stairs_stay' },
    choices: [
      { t: 'Open the bedroom door', go: 'stairs_open' },
      { t: 'Stay in bed', go: 'stairs_stay' },
    ],
  },

  stairs_open: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['drip', 'heart_fast'],
    lines: [
      { sfx: { n: 'door', pan: -0.2, dist: 0.1 }, t: 'You open the door.' },
      { fx: 'pitch', t: 'The landing is black. Your hand finds the light switch. The switch clicks. Nothing happens.' },
      { beat: 2000 },
      'You count the stairs going down with your foot, one at a time, the way you did as a child.',
      { sfx: { n: 'creak', pan: 0, dist: 0.1 }, t: 'Nine. There are nine.' },
      { slow: true, t: 'You let out your breath.' },
      { beat: 1800 },
      { fx: 'cam', t: 'You hold up your phone and open the camera, for the light. The screen shows the stairwell as a grey smear, crawling with noise.' },
      'The flash won’t fire. The camera hunts for focus in the dark, in and out, in and out.',
      { beat: 2200 },
      { fx: 'cam-lock', slow: true, t: 'A yellow square snaps onto the darkness at the bottom of the stairs.' },
      { slow: true, t: 'FACE 1, it says.' },
      'There is nothing there. You can see there is nothing there. The square stays where it is, locked on, adjusting itself very slightly, as if whatever it has found is breathing.',
      { beat: 2600 },
      { who: 'girl', style: 'memory', sfx: { n: 'whisper', pan: 0, dist: 0.6 }, t: 'Ten.' },
      { fx: ['cam-off', 'pitch'], t: 'The phone dies in your hand.' },
      { fx: 'pitch-off', t: 'You don’t remember going back to bed. In the morning your feet are wet.' },
    ],
    go: 'day5',
  },

  stairs_stay: {
    bg: 'bedroom_fingers', rain: false, chars: [], item: null, ambient: ['drip', 'heart'],
    lines: [
      'You don’t move. You lie on your back with the blanket up to your chin and your eyes on the ceiling.',
      { sfx: { n: 'scratch', pan: 0.7, dist: 0.15 }, t: 'The scratching stops.' },
      { beat: 3200 },
      { sfx: { n: 'creak', pan: 0.7, dist: 0.15 }, t: 'Something in the room shifts its weight. A small creak, like a wardrobe door easing on its hinge.' },
      { beat: 2600 },
      { who: 'bride', sfx: { n: 'whisper', pan: 0.7, dist: 0.15 }, slow: true, t: 'Four more days.' },
      { bg: 'bedroom', beat: 2400 },
      'In the morning the wardrobe is closed, and your clothes inside it are wet.',
    ],
    go: 'day5',
  },

  // ================================================================ DAY 5 · 三日
  day5: {
    bg: 'house', rain: false, chars: familyOnScreen, item: null, ambient: ['room', 'clock'],
    lines: [
      { do: s => { s.day = 3; s.flags.aloneAtDawn = s.family.length === 0; }, big: '三日', sub: 'Three days.' },
      { if: s => s.family.length > 0, t: 'Breakfast. Congee and pickles and the radio playing a weather report. Rain in the mountains. Ordinary things. You hold on to them.' },
      { if: s => has(s, 'mom'), who: 'mom', t: 'You look terrible, A-Wei. Did you sleep at all?' },
      ...vanishAt('You look up to answer.', [
        { if: s => has(s, 'mom'), who: 'mom', t: 'Well? Did you?' },
        { slow: true, t: 'There is a bowl of congee going cold in front of an empty chair. Nobody reaches for it.' },
      ]),
      { if: s => s.flags.aloneAtDawn, chars: [], t: 'The house is very quiet. There is one bowl on the table. There has always been one bowl.' },
      { if: s => has(s, 'wen') && got(s, 'ingot'), who: 'wen', t: 'Ge. I folded another one. For the other one.' },
      { if: s => has(s, 'wen') && got(s, 'ingot'), who: 'you', t: 'What other one?' },
      { if: s => has(s, 'wen') && got(s, 'ingot'), who: 'wen', slow: true, t: 'The girl who sits at the end of the table. She never gets anything.' },
      { if: s => has(s, 'mom'), t: 'All day, Mom sits beside you and holds your wrist, the one with the ring of bruise, as if she is taking your pulse. She doesn’t know she’s doing it.' },

      // Ama's confession, if she's still here and you've started to find the truth
      { if: s => has(s, 'ama') && truthFound(s) > 0, chars: ['ama'], fx: 'dark', t: 'Late in the evening, Ama sits down across from you. She doesn’t turn on the light.' },
      { if: s => has(s, 'ama') && truthFound(s) > 0, who: 'ama', t: 'I carried you out of that water. You and a piece of red thread, and nothing else.' },
      { if: s => has(s, 'ama') && truthFound(s) > 0, who: 'ama', t: 'I could have told the Lin family where their daughter was. I told them nothing. I paid the temple to make you forget, and I lit incense for that girl every year, where nobody could see.' },
      { if: s => has(s, 'ama') && truthFound(s) > 0, who: 'ama', slow: true, t: 'I thought that was enough. It wasn’t enough, was it.' },
      { if: s => has(s, 'ama') && truthFound(s) > 0, do: s => { s.flags.amaConfessed = true; }, t: 'She holds your hand, the way you remember someone else holding it.' },
      { if: s => has(s, 'ama') && truthFound(s) === 0, who: 'ama', t: 'Stay inside tonight, A-Wei. Whatever you hear.' },
    ],
    go: 'day6',
  },

  // ================================================================ DAY 6 · 二日: the bed
  day6: {
    bg: 'bedroom', rain: false, chars: [], item: null, ambient: ['night'],
    lines: [
      { do: s => { s.day = 2; }, big: '二日', sub: 'Two days.' },
      'You fall asleep in the middle of the evening, all at once, as if something switched you off.',
      { fx: 'pitch', ambient: [], beat: 3000 },
      'You wake up in the dark.',
      { sfx: { n: 'dripNear' }, t: 'Something is dripping onto your pillow. Onto your cheek. Slow, cold drops, a few seconds apart.' },
      { beat: 2000 },
      'You don’t open your eyes. You don’t want to know how close it is.',
      { sfx: { n: 'breath', pan: 0, dist: 0.02 }, t: 'Breathing. Right above your face.' },
      { chars: ['veil_top'], fx: 'pitch-off', slow: true, t: 'Something brushes your cheek. Your forehead. Strips of wet paper, hanging down, swaying as she leans over you.' },
      'The mattress sinks beside your hip. She is kneeling on the bed. She weighs about as much as a seven-year-old.',
      { who: 'bride', sfx: { n: 'whisper', pan: 0, dist: 0.02 }, t: 'Two more days.' },
      { who: 'bride', t: 'Do you remember the game? We played it every day. You always lost, because you always laughed.' },
      { sfx: { n: 'claps', pan: 0, dist: 0.08 }, slow: true, t: 'Small cold hands, clapping, in the dark above you. The rhythm of a children’s rhyme.' },
      { who: 'bride', t: 'Play with me.' },
    ],
    timer: { ms: 9000, go: 'nothing' },
    choices: [
      { t: 'Clap along', go: 'play' },
      { t: '“I’m sorry.”', if: s => s.flags.remembered, go: 'sorry' },
      { t: 'Hold up your phone camera', go: 'bed_camera' },
      { t: 'Lie still', go: 'nothing' },
    ],
  },

  // The one time the game lets you see her face, you have to ask for it.
  bed_camera: {
    bg: 'bedroom', rain: false, chars: ['veil_top'], item: null, ambient: ['drip'],
    lines: [
      { fx: 'cam', t: 'Your phone is under your pillow. You slide it out, very slowly, and open the camera without looking.' },
      'The screen is almost black. Noise crawls over it like rain.',
      'You tilt it up, towards the breathing.',
      { beat: 1800 },
      'Nothing. Just the dark, and the noise, and the grey edge of your own thumb.',
      'The camera hunts for focus, in and out, in and out, and finds nothing to hold on to.',
      { beat: 2200 },
      { slow: true, t: 'The breathing has stopped. Maybe it was you. Maybe it was always you.' },
      { beat: 1600 },
      'You start to lower the phone.',
      { fx: ['cam-lock', 'cam-face'], t: 'FACE 1.' },
      { beat: 1400 },
      'Her eyes are black. Not dark. Black, all the way across, like holes punched in paper.',
      { slow: true, t: 'Her mouth is open. It keeps opening. The paper at the corners has split, and it keeps splitting.' },
      { beat: 3200 },
      'She isn’t doing anything. She is just letting you look.',
      { do: s => { s.flags.sawFace = true; }, who: 'bride', sfx: { n: 'whisper', pan: 0, dist: 0.02 }, slow: true, t: 'Is this what you wanted to see?' },
      { beat: 1600 },
      { fx: ['cam-off', 'pitch'], chars: [], t: 'The screen goes black. Battery 0%. You lie in the dark with the dead phone on your chest.' },
      { beat: 2400 },
      { fx: 'pitch-off', chars: ['veil_top'], t: 'The paper strips are still there, brushing your face. She hasn’t moved.' },
      { who: 'bride', t: 'Now. Play with me.' },
    ],
    choices: [
      { t: 'Clap along', go: 'play' },
      { t: '“I’m sorry.”', if: s => s.flags.remembered, go: 'sorry' },
      { t: 'Lie still', go: 'nothing' },
    ],
  },

  play: {
    bg: 'bedroom', rain: false, chars: ['veil_top'], item: null, ambient: ['drip'],
    lines: [
      { sfx: { n: 'claps', pan: 0, dist: 0.05 }, t: 'You lift your hands in the dark, and she finds them.' },
      'Her palms are wet and cold and so small. Your hands remember the rhythm before you do. Clap, clap, cross, clap.',
      { who: 'bride', t: 'Red thread, red thread, tie it tight—' },
      { who: 'you', style: 'memory', fx: 'memory', t: '— so the bride won’t lose her way tonight —' },
      'The words come out of your mouth in a six-year-old’s voice. You haven’t thought of this rhyme in twenty years. You know every word.',
      { beat: 1600 },
      { do: s => { s.flags.played = true; }, who: 'bride', slow: true, t: 'You still laughed, at the end. Did you notice?' },
      { chars: [], t: 'When you open your eyes, the room is empty, and the pillow is wet, and your palms are cold for the rest of the night.' },
    ],
    go: 'day7',
  },

  sorry: {
    bg: 'bedroom', rain: false, chars: ['veil_top'], item: null, ambient: ['drip'],
    lines: [
      { who: 'you', t: 'I’m sorry. I let go of you.' },
      { beat: 2400 },
      'The dripping stops.',
      { do: s => { s.flags.apologized = true; }, who: 'bride', sfx: { n: 'whisper', pan: 0, dist: 0.05 }, slow: true, t: '...I waited twenty years to hear that.' },
      'She’s quiet for a long time. The strips of her veil rest against your face, very lightly, like a hand.',
      { who: 'bride', t: 'It doesn’t change what’s owed. But it’s nice to hear.' },
      { chars: [], t: 'In the morning, the pillow is dry.' },
    ],
    go: 'day7',
  },

  nothing: {
    bg: 'bedroom', rain: false, chars: ['veil_top'], item: null, ambient: ['drip'],
    lines: [
      'You lie still. You don’t lift your hands.',
      { sfx: { n: 'claps', pan: 0, dist: 0.08 }, t: 'She plays both parts of the game on her own, above you in the dark. Clap, clap, cross, clap.' },
      { who: 'bride', slow: true, t: 'You were never any fun when you were scared.' },
      { chars: [], t: 'The weight lifts from the bed. The dripping goes on until morning.' },
    ],
    go: 'day7',
  },

  // ================================================================ DAY 7 · 七夕: the procession
  day7: {
    bg: 'black', rain: false, chars: [], item: null, ambient: ['drone'],
    lines: [
      { do: s => { collect(s); s.day = 0; }, big: '七夕', sub: 'The seventh night of the seventh month.' },
      'Tonight the Cowherd and the Weaver Girl are allowed to meet across the river of stars, once a year, on a bridge of magpies. Everyone in Taiwan is thinking about lovers.',
      'It is also the birthday of 七娘媽, who watches over children until they turn sixteen. In Tainan, families take their sixteen-year-olds to her temple to thank her for getting them through.',
      { slow: true, t: 'Lin Qiu-Yue never turned sixteen.' },
      { bg: 'bedroom', fx: 'dark', ambient: ['night'], beat: 2400 },
      { t: 'You don’t try to sleep. You sit on the edge of the bed in your clothes and wait.' },
      { ambient: [], big: '3:33' },
      { fx: 'dark', t: 'The frogs stop.' },
      { beat: 2200 },
      { sfx: { n: 'suonaFar', pan: -0.7, dist: 1 }, t: 'The suona, far off, on the main road.' },
      { beat: 2400 },
      { sfx: { n: 'suonaFar', pan: -0.4, dist: 0.65 }, t: 'Closer.' },
      { fx: 'darker', t: 'Downstairs, the kitchen light goes out.' },
      { beat: 1800 },
      { t: 'Then the light in the hall.' },
      { if: s => has(s, 'mom'), t: 'Then the little lamp by Mom’s bed, the one she never turns off.' },
      { beat: 2200 },
      { sfx: { n: 'suonaFar', pan: 0, dist: 0.3 }, t: 'It stops outside the gate.' },
      { beat: 3000 },
      { fx: 'pitch', sfx: { n: 'knock', pan: 0, dist: 0.55 }, slow: true, t: 'Knock.' },
      { sfx: { n: 'knock', pan: 0, dist: 0.55 }, t: 'Knock.' },
      { sfx: { n: 'knock', pan: 0, dist: 0.55 }, t: 'Knock.' },
      { beat: 1600 },
      { who: 'eldest', sfx: { n: 'whisper', pan: 0, dist: 0.5 }, t: 'Son-in-law. It’s time.' },
      { fx: 'pitch-off', bg: 'courtyard', chars: ['men'], ambient: ['suona', 'drip'], t: 'You go down. You open the door. They are waiting in the courtyard in their wet suits, smiling, with a paper sedan chair behind them and the matchmaker bowing.' },
      { if: s => s.flags.seenEyes, who: 'matchmaker', t: 'Such good eyes. She’ll love them.' },
      'They don’t take your arms. They don’t have to. The thread on your finger pulls, gently, down the road, towards the water.',
      { if: s => has(s, 'mom'), chars: [], t: 'Behind you, Mom is standing in the doorway in her nightgown. She doesn’t try to stop you. She raises one hand, the way you wave to someone leaving on a train.' },
      { if: s => !has(s, 'mom'), chars: [], t: 'Behind you the house is dark. There is nobody at the window. There is nobody to be at the window.' },
      { bg: 'road', sfx: { n: 'crinkle', pan: 0, dist: 0.3 }, t: 'You walk. Paper feet shuffle around you. You pass the little shrine with its bowl of soup, still steaming, twenty years later.' },
    ],
    go: 'wedding',
  },

  wedding: {
    bg: 'reservoir', rain: false, chars: ['bride_far'], item: null, ambient: ['suona', 'sub'],
    lines: [
      'They walk you down to the reservoir. The water is perfectly still, and the moon is in it again, and not in the sky.',
      'At the edge of the water, a small red shape is waiting. You can’t see her face. The veil moves, though there is no wind.',
      { who: 'bride', sfx: { n: 'whisper', pan: 0, dist: 0.5 }, t: 'You came.' },
      { if: s => s.flags.foundHalf, t: 'In your pocket, the two halves of the photograph are warm.' },
      { if: s => s.flags.played, t: 'Your palms still remember the game.' },
      { if: s => s.flags.sawFace, t: 'You know what is under that veil. You came anyway.' },
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
    bg: 'reservoir', rain: false, chars: ['bride_far'], item: null, ambient: ['suona'],
    lines: [
      { chars: [], t: 'You walk down to her. You take her hand. It is small, and cold, and it holds on so tight.' },
      { slow: true, t: 'This time, you don’t let go.' },
      { fx: 'pitch', ambient: ['sub'], sfx: { n: 'splash', pan: 0, dist: 0.2 }, t: 'You walk into the water together. It’s warm on top, and cold underneath, just as you remember.' },
      { beat: 3000 },
      { fx: 'pitch-off', bg: 'hall', ambient: ['morning'], t: 'In the morning, the blank tablet on the altar has been painted. Two names, side by side, in careful brush strokes.' },
      { slow: true, t: '林秋月 · 阿偉' },
      { if: s => s.family.length > 0, t: 'Downstairs, someone sets out breakfast. They set out one bowl fewer than yesterday, and they don’t know why.' },
      { if: s => s.family.length === 0, t: 'There is nobody left in the house to light the incense. It burns anyway.' },
    ],
    end: { final: 'wedding', cn: '結婚', en: 'The Wedding', note: 'You held on this time.' },
  },

  end_substitute: {
    bg: 'reservoir', rain: false, chars: ['bride_far'], item: 'envelope', ambient: ['suona'],
    lines: [
      'You take the envelope out of your pocket.',
      'You know how this works. The drowned are always looking for someone to take their place.',
      'You hold it out to her. Someone else. Anyone else. Someone on the road who doesn’t know the rules.',
      { beat: 2600 },
      { who: 'bride', t: '...You’d do that?' },
      { who: 'bride', slow: true, t: 'You’d let go of me again, and make somebody else hold on?' },
      { item: null, chars: [], t: 'She takes the envelope. Her fingers don’t touch yours. The thread slips off your finger into the water without a sound.' },
      { sfx: { n: 'crinkle', pan: -0.4, dist: 0.6 }, t: 'Paper feet, going back up to the road.' },
      { beat: 2400 },
      { bg: 'car', rain: true, ambient: ['rain'], t: 'A month later, driving back to Taipei, you pass the turnoff.' },
      { bg: 'road', item: 'envelope', t: 'There is a red envelope in the gravel by the guardrail. Neat. Sealed. Dry in the pouring rain.' },
      { item: null, t: 'Ahead of you, another car slows down.' },
      { slow: true, t: 'You don’t stop. You don’t sound the horn. You don’t do anything at all.' },
    ],
    end: { final: 'substitute', cn: '抓交替', en: 'The Substitute', note: 'Somebody else is holding on now.' },
  },

  end_true: {
    bg: 'reservoir', rain: false, chars: ['bride_far'], item: null, ambient: ['sub'],
    lines: [
      { who: 'you', t: 'Lin Qiu-Yue.' },
      'You say her whole name, the way her mother must have said it. Nobody has said it out loud in twenty years.',
      { who: 'you', t: 'I remember. You pulled me out, and I let go of you. I was six and I was afraid, and they made me forget, and I’m sorry.' },
      { who: 'you', t: 'You don’t need a husband. You need somewhere to come home to.' },
      { who: 'you', t: 'Come home with us. You’ll have a place on our altar. We’ll feed you every day. We’ll say your name.' },
      { beat: 2000 },
      { who: 'eldest', t: 'That isn’t what was agreed.' },
      { who: 'bride', t: 'Brother. Be quiet.' },
      'You take a paper lantern from the matchmaker’s hands, the kind they set on the water in the seventh month to guide the drowned ashore. You write her name on it with your finger, in the wet.',
      { sfx: { n: 'splash', pan: 0, dist: 0.4 }, t: 'You set it on the water. It doesn’t drift away. It drifts back, to the bank, to your feet.' },
      { chars: [], fx: 'pitch', ambient: ['drip'], slow: true, t: 'In the dark, she lifts her veil herself. You don’t see it. You hear the paper fold back.' },
      { who: 'bride', t: 'You got so tall.' },
      'Her voice is just a little girl’s voice now. Nothing else in it.',
      'She takes the red thread in both hands and unties it from her finger. Then, very carefully, from yours.',
      { who: 'bride', t: 'Don’t let go of them, then.' },
      { beat: 2600 },
      { fx: 'pitch-off', bg: 'hall', ambient: ['room', 'morning'], do: s => { s.lost.forEach(k => { if (!s.family.includes(k)) s.family.push(k); }); s.lost = []; s.debt = 0; },
        t: 'In the morning, the blank tablet on the altar has been painted. One name, in careful brush strokes: 林秋月. Not as a wife. As a daughter of the house.' },
      'From the kitchen, you hear Ama laughing at something. Mom calling for Xiao-Wen. The clatter of [[three|four]] bowls.',
      { slow: true, t: 'You stand there and listen for a long time. You don’t know why it makes you cry.' },
      'Every morning after that, there is one more bowl of rice on the altar. Somebody always remembers to fill it.',
    ],
    end: { final: 'true', cn: '紅線', en: 'The Red Thread', note: 'You held on to them.' },
  },
});

// Day One leads on to Day Two.
STORY.morning.end = { invitation: true, next: 'day2' };
