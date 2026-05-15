export interface AACIcon {
  id: string;
  label: string;
  icon: string; // Lucide icon name or emoji
}

export interface Verse {
  id: string;
  text: string;
  missingWord: string;
  options: string[];
  simplified: string;
  aacSequence: string[]; // IDs of AAC icons
  question?: string;
}

export interface Encounter {
  id: string;
  name: string;
  canto: number;
  description: string;
  simplifiedDescription?: string;
  journeyAacSequence?: string[];
  puzzleHeader?: string;
  puzzleHeaderSimplified?: string;
  introduction: string;
  verse: Verse;
  background: string; // Color or theme
}

export const AAC_ICONS: Record<string, AACIcon> = {
  "forest": { id: "forest", label: "Selva", icon: "🌲" },
  "dark": { id: "dark", label: "Oscura", icon: "🌑" },
  "fear": { id: "fear", label: "Paura", icon: "😨" },
  "hope": { id: "hope", label: "Speranza", icon: "✨" },
  "gate": { id: "gate", label: "Porta", icon: "🚪" },
  "sad": { id: "sad", label: "Triste", icon: "😢" },
  "people": { id: "people", label: "Gente", icon: "👥" },
  "love": { id: "love", label: "Amore", icon: "❤️" },
  "light": { id: "light", label: "Luce", icon: "☀️" },
  "guide": { id: "guide", label: "Guida", icon: "🧭" },
  "lion": { id: "lion", label: "Leone", icon: "🦁" },
  "wolf": { id: "wolf", label: "Lupa", icon: "🐺" },
  "leopard": { id: "leopard", label: "Lonza", icon: "🐆" },
  "no_one": { id: "no_one", label: "Nessuno", icon: "🚫" },
  "give_back": { id: "give_back", label: "Ricambia", icon: "🔄" },
  "doubt": { id: "doubt", label: "Dubbio", icon: "🤔" },
  "friend": { id: "friend", label: "Amico", icon: "🤝" },
  "boat": { id: "boat", label: "Barca", icon: "🛶" },
  "river": { id: "river", label: "Fiume", icon: "🌊" },
  "fire": { id: "fire", label: "Fuoco", icon: "🔥" },
  "castle": { id: "castle", label: "Castello", icon: "🏰" },
  "sigh": { id: "sigh", label: "Sospiri", icon: "😮‍💨" },
  "hard": { id: "hard", label: "Dura", icon: "🧱" },
  "wild": { id: "wild", label: "Selvaggio", icon: "🌪️" },
  // Expression Icons
  "voglio": { id: "voglio", label: "Voglio", icon: "☝️" },
  "sento": { id: "sento", label: "Sento", icon: "👂" },
  "felice": { id: "felice", label: "Felice", icon: "😊" },
  "triste": { id: "triste", label: "Triste", icon: "😢" },
  "spaventato": { id: "spaventato", label: "Spaventato", icon: "😨" },
  "arrabbiato": { id: "arrabbiato", label: "Arrabbiato", icon: "😠" },
  "stanco": { id: "stanco", label: "Stanco", icon: "😴" },
  "aiuto": { id: "aiuto", label: "Aiuto", icon: "🆘" },
  "pausa": { id: "pausa", label: "Pausa", icon: "⏸️" },
  "ancora": { id: "ancora", label: "Ancora", icon: "➕" },
  "finito": { id: "finito", label: "Finito", icon: "✅" },
  "ciao": { id: "ciao", label: "Ciao", icon: "👋" },
  "grazie": { id: "grazie", label: "Grazie", icon: "🙏" },
  "si": { id: "si", label: "Sì", icon: "👍" },
  "no": { id: "no", label: "No", icon: "👎" },
  "domanda": { id: "domanda", label: "Domanda", icon: "❓" },
  "giocare": { id: "giocare", label: "Giocare", icon: "🎮" },
  "mangiare": { id: "mangiare", label: "Mangiare", icon: "🍎" },
  "bere": { id: "bere", label: "Bere", icon: "💧" },
  "uscire": { id: "uscire", label: "Uscire", icon: "🚶" },
};

export const EXPRESSION_CATEGORIES = [
  {
    name: "Azioni",
    icons: ["voglio", "sento", "giocare", "mangiare", "bere", "uscire"]
  },
  {
    name: "Sentimenti",
    icons: ["felice", "triste", "spaventato", "arrabbiato", "stanco"]
  },
  {
    name: "Bisogni",
    icons: ["aiuto", "pausa", "ancora", "finito"]
  },
  {
    name: "Sociale",
    icons: ["ciao", "grazie", "si", "no", "domanda"]
  }
];

export const ENCOUNTERS: Encounter[] = [
  {
    id: "la-selva-oscura",
    name: "La Selva Oscura",
    canto: 1,
    description: "Nel mezzo del cammin di nostra vita\nmi ritrovai per una selva oscura,\nché la diritta via era smarrita.",
    simplifiedDescription: "A metà della mia vita mi sono perso in un bosco buio.",
    journeyAacSequence: ["forest", "dark", "fear"],
    puzzleHeader: "Ahi quanto a dir qual era è cosa dura\nesta selva selvaggia e aspra e forte\nche nel pensier rinova la paura!",
    puzzleHeaderSimplified: "È difficile raccontare di questo bosco selvaggio che fa ancora molta paura.",
    introduction: "Benvenuto, viandante. Ti trovi all'inizio di un viaggio periglioso. Smarrito in una selva dove la luce fatica a penetrare, dovrai ritrovare la via tra ombre e timori.",
    verse: {
      id: "v1",
      text: "Cosa rinnova il pensiero della selva ____?",
      missingWord: "paura",
      options: ["paura", "fuga", "pena", "tristezza"],
      simplified: "È difficile raccontare di questo bosco selvaggio che fa ancora molta paura.",
      aacSequence: ["hard", "wild", "forest", "fear"],
      question: "Cosa rinnova il pensiero della selva spaventosa?"
    },
    background: "from-[#1e3a1e] via-[#0a1a0a] to-black"
  },
  {
    id: "three_beasts",
    name: "Le Tre Fiere",
    canto: 1,
    description: "Una lonza leggera, un leone superbo e una lupa insaziabile\n ti sbarrano la strada verso il colle luminoso,\nspingendoti con terrore verso l'oscurità della selva",
    introduction: "Il cammino verso la salvezza è sbarrato da tre ostacoli insormontabili. La lussuria, la superbia e l'avarizia prendono forma in tre bestie feroci che ti circondano, spegnendo ogni speranza di risalita.",
    verse: {
      id: "v_three_beasts",
      text: "Una lonza, un leone e una ____ mi facevan paura e mi spingevano indietro.",
      missingWord: "lupa",
      options: ["lupa", "tigre", "bestia", "ombra"],
      simplified: "Sulla montagna incontro tre animali feroci:\nuna lonza, un leone e una lupa spaventosa",
      aacSequence: ["leopard", "lion", "wolf", "fear"]
    },
    background: "from-[#1e3a1e] via-[#0a1a0a] to-black"
  },
  {
    id: "virgil_appears",
    name: "L'Incontro con Virgilio",
    canto: 1,
    description: "O de li altri poeti onore e lume,\nvagliami 'l lungo studio e 'l grande amore\nche m'ha fatto cercar lo tuo volume.",
    introduction: "Mentre lo smarrimento ti assale, un'ombra si profila all'orizzonte. È una guida saggia, pronta a condurti attraverso i regni dell'eterno dolore. Ascolta la sua voce.",
    verse: {
      id: "v2",
      text: "O degli altri poeti onore e ____",
      missingWord: "lume",
      options: ["lume", "voce", "guida", "sole"],
      simplified: "Tu sei la luce e l'onore di tutti gli altri poeti.",
      aacSequence: ["light", "guide", "hope"]
    },
    background: "from-indigo-950 to-blue-900"
  },
  {
    id: "dante_doubt",
    name: "Il Dubbio di Dante",
    canto: 2,
    description: "Io non Enëa, io non Paulo sono;\nme degno a ciò né io né altri crede.\nMa io, perché venirvi? o chi 'l concede?",
    introduction: "L'entusiasmo iniziale svanisce. Dante si sente piccolo e indegno di fronte a un'impresa così grande. 'Perché proprio io?', si chiede il poeta, temendo che il suo viaggio sia una follia.",
    verse: {
      id: "v_doubt",
      text: "Io non Enëa, io non Paulo ____; me degno a ciò né io né altri crede",
      missingWord: "sono",
      options: ["sono", "ero", "fui", "sarò"],
      simplified: "Io non sono un eroe o un santo, non mi sento degno di questo viaggio.",
      aacSequence: ["doubt", "fear", "no_one"]
    },
    background: "from-blue-900 to-indigo-900"
  },
  {
    id: "beatrice_mission",
    name: "La Missione di Beatrice",
    canto: 2,
    description: "L'amico mio, e non de la ventura,\nne la diserta piaggia è impedito\nsì nel cammin, che vòlt' è per paura;",
    introduction: "Virgilio rassicura Dante: non è solo. Una donna bellissima e beata, Beatrice, è scesa dal cielo per chiedere aiuto. L'amore è la vera forza che muove questo cammino.",
    verse: {
      id: "v_beatrice",
      text: "L'amico mio, e non de la ____, ne la diserta piaggia è impedito",
      missingWord: "ventura",
      options: ["ventura", "fortuna", "paura", "natura"],
      simplified: "Beatrice dice che Dante è un suo amico vero e ha bisogno di aiuto.",
      aacSequence: ["love", "friend", "hope"]
    },
    background: "from-indigo-900 to-blue-800"
  },
  {
    id: "gates_of_hell",
    name: "La Porta dell'Inferno",
    canto: 3,
    description: "Dinanzi a me non fuor cose create\nse non etterne, e io etterno duro.\nLasciate ogne speranza, voi ch'intrate.",
    introduction: "Siete giunti dinanzi alla soglia definitiva. Un monito severo è scolpito nella pietra, avvertendo chiunque osi varcarla che la speranza deve essere abbandonata.",
    verse: {
      id: "v3",
      text: "Lasciate ogni ____, voi ch'intrate",
      missingWord: "speranza",
      options: ["speranza", "paura", "dolore", "vita"],
      simplified: "Voi che entrate qui, perdete ogni speranza.",
      aacSequence: ["gate", "sad", "hope"]
    },
    background: "from-[#1e3a1e] via-[#0a1a0a] to-black"
  },
  {
    id: "ignavi",
    name: "Gli Ignavi",
    canto: 3,
    description: "Fama di loro il mondo esser non lassa;\nmisericordia e giustizia li sdegna:\nnon ragioniam di lor, ma guarda e passa.",
    introduction: "Oltre la porta, un rumore assordante di sospiri e pianti riempie l'aria senza stelle. Sono le anime di coloro che vissero senza lode e senza infamia, rifiutati sia dal cielo che dall'inferno. Non perdere tempo con loro: guarda e prosegui.",
    verse: {
      id: "v_ignavi",
      text: "non ragioniam di lor, ma guarda e ____",
      missingWord: "passa",
      options: ["passa", "vai", "corri", "guarda"],
      simplified: "Non parliamo di queste persone che non hanno scelto,\nguarda e vai avanti",
      aacSequence: ["sad", "people", "no_one"]
    },
    background: "from-red-950 to-stone-900"
  },
  {
    id: "charon",
    name: "Caronte",
    canto: 3,
    description: "Caron dimonio, con occhi di bragia\nloro accennando, tutte le raccoglie;\nbatte col remo qualunque s'adagia.",
    introduction: "Sulle rive del fiume Acheronte, un vecchio nocchiero dalle fiamme negli occhi urla alle anime. È Caronte, colui che traghetta i dannati verso l'eterna oscurità. Preparati a varcare l'acqua.",
    verse: {
      id: "v_charon",
      text: "Caron dimonio, con occhi di bragia... batte col ____ qualunque s'adagia",
      missingWord: "remo",
      options: ["remo", "legno", "ferro", "fuoco"],
      simplified: "Caronte ha gli occhi di fuoco e colpisce con il remo chi si ferma.",
      aacSequence: ["boat", "river", "fire"]
    },
    background: "from-stone-900 to-red-900"
  },
  {
    id: "limbo",
    name: "Il Limbo",
    canto: 4,
    description: "Quivi, secondo che per ascoltare,\nnon avea pianto mai che di sospiri\nche l'aura eterna facevan tremare.",
    introduction: "Sei giunto nel primo cerchio dell'Inferno: il Limbo. Qui risiedono coloro che vissero virtuosamente ma senza battesimo. Non udrai grida, ma solo il suono di infiniti sospiri che fanno tremare l'aria eterna.",
    verse: {
      id: "v_limbo",
      text: "non avea pianto mai che di ____",
      missingWord: "sospiri",
      options: ["sospiri", "pianti", "gridi", "lamenti"],
      simplified: "In questo posto non si sente piangere, ma si sentono solo molti sospiri.",
      aacSequence: ["sad", "people", "sigh"]
    },
    background: "from-slate-900 to-indigo-950"
  },
  {
    id: "francesca",
    name: "Paolo e Francesca",
    canto: 5,
    description: "Amor, ch'a nullo amato amar perdona,\nmi prese del costui piacer sì forte,\nche, come vedi, ancor non m'abbandona.",
    introduction: "Nel turbine della bufera infernale, due anime volano unite. Scoprirai come l'amore, forza inarrestabile, possa legare per l'eternità anche nel mezzo della sofferenza.",
    verse: {
      id: "v4",
      text: "Amor, ch'a nullo amato amar ____",
      missingWord: "perdona",
      options: ["perdona", "abbandona", "condanna", "ritorna"],
      simplified: "L'amore obbliga chi è amato ad amare a sua volta.",
      aacSequence: ["love", "no_one", "give_back"]
    },
    background: "from-red-950 to-rose-900"
  }
];

export interface VeltroEncounter {
  id: string;
  character: string;
  message: string;
  reward: number;
  icon: string;
}

export const VELTRO_ENCOUNTERS: VeltroEncounter[] = [
  {
    id: "v_farinata",
    character: "Farinata degli Uberti",
    message: "La tua stirpe è degna di nota, ma attento all'orgoglio che acceca.",
    reward: 15,
    icon: "🔥"
  },
  {
    id: "v_brunetto",
    character: "Brunetto Latini",
    message: "Segui la tua stella, e non potrai fallire a glorioso porto.",
    reward: 20,
    icon: "📖"
  },
  {
    id: "v_ulisse",
    character: "Ulisse",
    message: "Fatti non foste a viver come bruti, ma per seguir virtute e canoscenza.",
    reward: 25,
    icon: "⛵"
  },
  {
    id: "v_ugolino",
    character: "Conte Ugolino",
    message: "Il dolore è un sapore amaro, ma la verità è più dura del ghiaccio.",
    reward: 15,
    icon: "🧊"
  }
];
