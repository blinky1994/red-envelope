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
const familyOnScreen = s => ['mom', 'ama', 'wen'].filter(k => has(s, k));
const first = s => !s.flags.loop;

function refuse(s) {
  s.refusals++;
  const gone = REMOVAL_ORDER.find(k => has(s, k));
  if (gone) {
    s.family = s.family.filter(k => k !== gone);
    s.lost.push(gone);
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
      { fx: 'red-off', t: 'When the smoke clears, the envelope is gone. Nobody speaks for the rest of the night.' },
      { beat: 1400 },
      { do: refuse, slow: true, t: "When you undress for bed, it's back in your pocket. You don't need to look." },
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
      { beat: 2000 },
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
