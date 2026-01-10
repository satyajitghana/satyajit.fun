export interface LifeEvent {
    id: string;
    label: string;
}

export const LIFE_EVENTS: LifeEvent[] = [
    // Early Life & Basics
    { id: "born", label: "👶 Be born" },
    { id: "first-steps", label: "🚶‍ Take first steps" },
    { id: "first-words", label: "📣 Say first words" },
    { id: "read", label: "👨‍🏫 Learn to read" },
    { id: "friend", label: "🤗 Make a friend" },
    { id: "bike", label: "🚴‍ Learn to ride a bike" },
    { id: "book", label: "📗 Read a book" },
    { id: "swim", label: "🏊‍ Learn to swim" },
    { id: "elementary", label: "🏫 Finish elementary school" },
    { id: "sport", label: "⚽ Play a sport" },

    // Travel & Adventure
    { id: "plane", label: "🛫 Fly in a plane" },
    { id: "boat", label: "🛥️ Ride a boat" },
    { id: "train", label: "🚆 Ride in a train" },
    { id: "helicopter", label: "🚁 Ride a helicopter" },
    { id: "ocean", label: "🌊 See the ocean" },
    { id: "snow", label: "❄️ See snow" },
    { id: "snowman", label: "☃️ Make a snowman" },
    { id: "middle-school", label: "🏫 Finish middle school" },
    { id: "concert", label: "🎶 Go to a concert" },
    { id: "camping", label: "🏕️ Go camping" },
    { id: "rollercoaster", label: "🎢 Ride a rollercoaster" },

    // Growing Up
    { id: "instrument", label: "🎻 Play an instrument" },
    { id: "kiss", label: "💋 Get kissed" },
    { id: "credit-card", label: "💳 Get a credit card" },
    { id: "driving", label: "🚘 Start driving" },
    { id: "roadtrip", label: "🗺️ Go on a roadtrip" },
    { id: "country", label: "🗾 Visit another country" },
    { id: "speech", label: "🎤 Give a speech" },
    { id: "high-school", label: "🏫 Graduate high school" },
    { id: "language", label: "🌐 Learn another language" },
    { id: "invest", label: "💸 Invest some money" },

    // Milestones & Mishaps
    { id: "idol", label: "📷 Meet an idol" },
    { id: "mistake", label: "😩 Make a terrible mistake" },
    { id: "trophy", label: "🏆 Win a trophy" },
    { id: "mountain", label: "⛰️ Climb a mountain" },
    { id: "marathon", label: "🎽 Run a marathon" },
    { id: "cook", label: "🍳 Learn to cook" },
    { id: "cave", label: "🔦 Explore a cave" },
    { id: "volcano", label: "🌋 See a volcano" },
    { id: "college", label: "🎓 Graduate college" },

    // Relationships & Career
    { id: "relationship", label: "💕 Have a long relationship" },
    { id: "dumped", label: "🗑️ Get dumped" },
    { id: "contract", label: "🖊️ Sign a contract" },
    { id: "job", label: "🏢 Get a job" },
    { id: "promoted", label: "☝️ Get promoted" },
    { id: "paycheck", label: "💵 Get a paycheck" },
    { id: "fired", label: "🔥 Get fired" },
    { id: "news", label: "📰 Get in the news" },
    { id: "vote", label: "🗳️ Vote in an election" },
    { id: "switch-careers", label: "🤡 Switch careers" },

    // Settling Down
    { id: "house", label: "🏠 Buy a house" },
    { id: "engaged", label: "💍 Get engaged" },
    { id: "married", label: "👰 Get married" },
    { id: "kid", label: "👶 Have a kid" },
    { id: "kid-walk", label: "🚶‍ Teach your kid to walk" },
    { id: "kid-talk", label: "📣 Teach your kid to talk" },
    { id: "kid-grad", label: "🎓 Watch your kid graduate" },
    { id: "kid-married", label: "👰 Watch your kid get married" },

    // Later Life
    { id: "grandparent", label: "👴 Become a grandparent" },
    { id: "retire", label: "🏖️ Retire" },
    { id: "grandkid-story", label: "📔 Tell your grandkid a story" },
    { id: "solar-eclipse", label: "🌑 See a solar eclipse" },
    { id: "garden", label: "🌷 Plant a garden" },
    { id: "travel-world", label: "🌎 Travel the world" },
    { id: "turn-100", label: "🎂 Turn 100" },
    { id: "complete-list", label: "✔️ Complete Life Checklist" },

    // Quirky & Fun Extras
    { id: "pet", label: "🐾 Adopt a pet" },
    { id: "binge-watch", label: "📺 Binge-watch a whole series in one day" },
    { id: "tattoo", label: "💉 Get a tattoo" },
    { id: "magic-trick", label: "🎩 Learn a magic trick" },
    { id: "rubiks", label: "🧩 Solve a Rubik's cube" },
    { id: "bake-cake", label: "🎂 Bake a cake that actually tastes good" },
    { id: "viral", label: "📈 Go viral on the internet" },
    { id: "stars", label: "✨ Sleep under the stars" },
    { id: "juggle", label: "🤹 Learn to juggle" },
    { id: "donate-blood", label: "🩸 Donate blood" },
    { id: "volunteer", label: "🤝 Volunteer for a cause" },
    { id: "code", label: "💻 Learn to code" },
    { id: "robot", label: "🤖 Build a robot" },
    { id: "write-book", label: "✍️ Write a book" },
    { id: "song", label: "🎵 Compose a song" },
    { id: "masterpiece", label: "🎨 Paint a masterpiece" },
    { id: "dance", label: "💃 Learn to dance" },
    { id: "skydiving", label: "🪂 Go skydiving" },
    { id: "bungee", label: "🧗 Go bungee jumping" },
    { id: "scuba", label: "🤿 Go scuba diving" },
    { id: "surf", label: "🏄 Learn to surf" },
    { id: "ski-snowboard", label: "🏂 Learn to ski/snowboard" },
    { id: "continents", label: "🌍 Visit all 7 continents" },
    { id: "space", label: "🚀 Go to space (maybe one day!)" },
];
