import Foundation

public struct CrypticClue: Sendable {
    public let clue: String
    public let answer: String
    public let hint: String
    public let explanation: String
    public init(_ clue: String, _ answer: String, _ hint: String, _ explanation: String) {
        self.clue = clue; self.answer = answer; self.hint = hint; self.explanation = explanation
    }
}
public struct EstimateQuestion: Sendable {
    public let question: String
    public let answer: Double
    public let unit: String
    public let explanation: String
    public init(_ question: String, _ answer: Double, _ unit: String, _ explanation: String) {
        self.question = question; self.answer = answer; self.unit = unit; self.explanation = explanation
    }
}
public struct TriviaAnswer: Sendable {
    public let name: String
    public let points: Int
    public let aliases: [String]
    public init(_ name: String, _ points: Int, aliases: [String] = []) { self.name = name; self.points = points; self.aliases = aliases }
}
public struct TriviaPrompt: Sendable {
    public let question: String
    public let answers: [TriviaAnswer]
    public init(_ question: String, _ names: [String]) {
        self.question = question
        self.answers = names.enumerated().map { index, name in
            let variants = name.components(separatedBy: "|")
            return TriviaAnswer(variants[0], 10 + 90 * index / max(1, names.count - 1), aliases: Array(variants.dropFirst()))
        }
    }
    public static func normalize(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "en_US_POSIX")).filter { $0.isLetter || $0.isNumber }
    }
    public func match(_ text: String) -> TriviaAnswer? {
        let clean = Self.normalize(text)
        guard !clean.isEmpty else { return nil }
        return answers.first { Self.normalize($0.name) == clean || $0.aliases.contains { Self.normalize($0) == clean } }
    }
}

public enum PuzzleContent {
    /// This is an original rotating starter pack; add clues here for longer editorial coverage.
    public static let cryptics: [CrypticClue] = [
        .init("Listen, confused, and quiet (6)", "SILENT", "Something has happened to the letters of LISTEN.", "‘Confused’ signals an anagram of LISTEN. Rearrange it to SILENT, meaning ‘quiet’."),
        .init("Ocean found in Chelsea (3)", "SEA", "Look inside one of the words.", "ChelSEA contains SEA, an ocean. ‘Found in’ signals a hidden answer."),
        .init("Desserts returned, feeling the pressure (8)", "STRESSED", "Try reading one word backwards.", "DESSERTS reversed (‘returned’) gives STRESSED: ‘feeling the pressure’."),
        .init("Mixed tone is a musical sound (4)", "NOTE", "‘Mixed’ is an instruction.", "Rearrange TONE to get NOTE, a musical sound."),
        .init("Vehicle concealed in scarlet (3)", "CAR", "The vehicle is already in the clue.", "sCARlet hides CAR. ‘Concealed in’ tells you to look for consecutive letters."),
        .init("Evil turned back, to exist (4)", "LIVE", "Turn EVIL around.", "EVIL backwards is LIVE, meaning ‘to exist’."),
        .init("Art rearranged for a rodent (3)", "RAT", "‘Rearranged’ tells you to mix letters.", "An anagram of ART gives RAT, a rodent."),
        .init("Flower in a rosebud (4)", "ROSE", "The answer is hiding in plain sight.", "ROSEbud begins with ROSE, a flower. ‘In’ signals a hidden answer."),
        .init("Stop, or a station (4)", "HALT", "Both halves define the same word.", "HALT means ‘stop’ and can also mean a small railway station. This is a double definition."),
        .init("Wild stare produces weeping (5)", "TEARS", "‘Wild’ signals rearrangement.", "STARE rearranges to TEARS, the product of weeping."),
        .init("Anger hidden in a tired voice (3)", "IRE", "Find three consecutive letters.", "tIREd contains IRE, meaning anger."),
        .init("A citrus fruit, or a green shade (4)", "LIME", "One answer fits both definitions.", "LIME is a citrus fruit and a shade of green: a double definition."),
        .init("Vile, somehow, and wicked (4)", "EVIL", "Reorder VILE.", "‘Somehow’ signals an anagram of VILE, yielding EVIL: wicked."),
        .init("Insect inside a lantern (3)", "ANT", "Ignore spaces and look inside the last word.", "lANTern contains ANT, an insect."),
        .init("Below, or an unhappy mood (4)", "DOWN", "Two definitions are at work.", "DOWN means ‘below’ and describes an unhappy mood."),
        .init("Crazy thing in the dark (5)", "NIGHT", "Rearrange THING.", "‘Crazy’ signals an anagram of THING: NIGHT, the dark part of the day."),
        .init("Lemon, mixed, becomes a fruit (5)", "MELON", "Use all the letters of LEMON.", "LEMON rearranged (‘mixed’) gives MELON, another fruit."),
        .init("A seat, or a court of judges (5)", "BENCH", "Look for a word with two meanings.", "BENCH is a seat and also refers collectively to judges."),
        .init("Bored, strangely, wearing a gown (5)", "ROBED", "‘Strangely’ tells you what to do with BORED.", "BORED is an anagram of ROBED: wearing a gown."),
        .init("A bird, or to lower your head (4)", "DUCK", "The clue offers two definitions.", "DUCK is a bird and a verb meaning to lower your head."),
        .init("Night bird in a howling wind (3)", "OWL", "The answer crosses no word boundaries.", "hOWLing hides OWL, a night bird."),
        .init("A contest, or to go quickly (4)", "RACE", "Both parts are definitions.", "RACE can be a contest or a verb meaning to go quickly."),
        .init("Stone, oddly, makes musical sounds (5)", "TONES", "Rearrange STONE.", "STONE rearranged (‘oddly’) gives TONES, musical sounds."),
        .init("Spear rebuilt for fruit (5)", "PEARS", "‘Rebuilt’ signals an anagram.", "Rearrange SPEAR to make PEARS: fruit."),
        .init("A tree, or to long for (4)", "PINE", "This is a double definition.", "PINE names a tree and means to long for something."),
        .init("Hear, strangely, a rabbit relative (4)", "HARE", "Mix the letters of HEAR.", "HEAR rearranges to HARE, a relative of the rabbit."),
        .init("A fish, or a musical low voice (4)", "BASS", "One spelling has two meanings and pronunciations.", "BASS is a kind of fish and a low musical voice: a double definition."),
        .init("Ropes tangled into written language (5)", "PROSE", "‘Tangled’ is an anagram instruction.", "ROPES rearranges to PROSE, ordinary written language."),
        .init("A dog sound, or a tree's covering (4)", "BARK", "Two meanings, same word.", "BARK is both a dog's sound and the outer covering of a tree."),
        .init("Earth rearranged as a vital organ (5)", "HEART", "Use every letter of EARTH.", "EARTH rearranges to HEART, a vital organ."),
        .init("A metal, or to smooth a shirt (4)", "IRON", "A double definition.", "IRON is a metal and a verb meaning to smooth clothing with a heated tool."),
        .init("Save, in a way, a flower holder (4)", "VASE", "‘In a way’ suggests rearrangement.", "SAVE rearranges to VASE, a flower holder."),
        .init("A flying mammal, or a cricket implement (3)", "BAT", "Find the shared definition.", "BAT names a flying mammal and the implement used to strike a cricket ball."),
        .init("Mixed alert, coming afterwards (5)", "LATER", "Reorder ALERT.", "ALERT rearranges to LATER: coming afterwards."),
        .init("Evil hidden in a devilish trick (4)", "EVIL", "Look inside DEVILISH.", "dEVILish contains EVIL, meaning wickedness."),
        .init("A musical group, or a strip of material (4)", "BAND", "One answer matches two definitions.", "BAND is a musical group and a strip of material."),
        .init("A river's edge, or a place for savings (4)", "BANK", "Both halves define the answer.", "BANK can be the edge of a river or a financial institution."),
        .init("Tired, oddly, and tested (5)", "TRIED", "‘Oddly’ scrambles TIRED here.", "TIRED rearranges to TRIED, meaning tested."),
        .init("A flying insect, or to escape quickly (3)", "FLY", "A noun and verb share the answer.", "FLY names an insect and can mean to escape quickly."),
        .init("A season, or a coiled piece of metal (6)", "SPRING", "Both halves are definitions.", "SPRING is a season and a coiled mechanical component."),
        .init("A fruit, or a romantic meeting (4)", "DATE", "This is a double definition.", "DATE is a fruit and a romantic meeting."),
        .init("Stale, transformed into stories (5)", "TALES", "Rearrange STALE.", "STALE rearranges to TALES, meaning stories.")
    ]

    public static let wordAnswers = "CRANE SLATE BRICK CLOUD PLANT SHORE GLASS FLAME PRIDE STONE HEART OCEAN TIGER LEMON MAPLE RIVER SPARK QUIET BRAVE CHARM DRIFT FROST GRAPE HONEY IVORY JOLLY KNACK LIGHT MANGO NOBLE OLIVE PEARL QUEEN ROAST SHINE TRAIL UNITY VIVID WALTZ YOUTH ZEBRA APPLE BREAD CHAIR DANCE EARTH FIELD GIANT HOUSE JUICE KAYAK LAYER MARCH NORTH OPERA PIANO QUILT RADIO SOLAR TRAIN UNDER VALVE WATER YEAST AMBER BLOOM CIDER DREAM ELBOW FLOUR GLOVE HATCH INLET JOINT KNEEL LODGE MOUNT NURSE OASIS PETAL REACH SLEEP TEACH URBAN VOWEL WHEAT YACHT ABODE BLEND CLOVE DRAKE EAGER FEAST GRAIN HAZEL IMAGE JUDGE KIOSK LATCH MIRTH NIGHT ORBIT PULSE RAVEN SNAIL THYME USHER VIGOR WHALE YIELD ANGLE BLUSH CHESS DUSKY ENTRY FABLE GLEAM HOVER IDEAL JOKER KOALA LILAC MOOSE NOVEL ORDER PRISM RATIO SUGAR TWIRL USAGE VISTA WOVEN ZESTY".components(separatedBy: " ")

    public static let triviaPrompts: [TriviaPrompt] = [
        .init("Name one of the eight planets in our solar system.", ["Earth", "Mars", "Jupiter", "Saturn", "Venus", "Mercury", "Neptune", "Uranus"]),
        .init("Name a noble gas with atomic number below 87.", ["Helium|He", "Neon|Ne", "Argon|Ar", "Krypton|Kr", "Xenon|Xe", "Radon|Rn"]),
        .init("Name one of the five oceans.", ["Pacific|Pacific Ocean", "Atlantic|Atlantic Ocean", "Indian|Indian Ocean", "Arctic|Arctic Ocean", "Southern|Southern Ocean|Antarctic Ocean"]),
        .init("Name a type of chess piece.", ["King", "Queen", "Pawn", "Knight|Horse", "Bishop", "Rook|Castle"]),
        .init("Name a base unit in the International System of Units (SI).", ["Metre|Meter|m", "Second|s", "Kilogram|kg", "Ampere|Amp|A", "Kelvin|K", "Mole|mol", "Candela|cd"]),
        .init("Name a continent in the seven-continent model.", ["Asia", "Europe", "Africa", "North America", "South America", "Australia|Oceania", "Antarctica"]),
        .init("Name a month with exactly 30 days.", ["April", "June", "September", "November"]),
        .init("Name one of the five Platonic solids.", ["Cube|Hexahedron", "Tetrahedron", "Octahedron", "Dodecahedron", "Icosahedron"]),
        .init("Name one of the first ten chemical elements.", ["Hydrogen|H", "Oxygen|O", "Helium|He", "Carbon|C", "Neon|Ne", "Nitrogen|N", "Lithium|Li", "Boron|B", "Beryllium|Be", "Fluorine|F"]),
        .init("Name a sovereign country in South America.", ["Brazil", "Argentina", "Chile", "Peru", "Colombia", "Venezuela", "Uruguay", "Ecuador", "Bolivia", "Paraguay", "Guyana", "Suriname"]),
        .init("Name one of the six strings on a standard-tuned guitar (a note letter).", ["E", "A", "D", "G", "B"]),
        .init("Name a color on the five Olympic rings.", ["Blue", "Red", "Black", "Green", "Yellow"]),
        .init("Name a sign of the Western zodiac.", ["Leo", "Aries", "Gemini", "Virgo", "Taurus", "Libra", "Cancer", "Scorpio", "Pisces", "Sagittarius", "Capricorn", "Aquarius"]),
        .init("Name an English vowel letter (excluding Y).", ["A", "E", "I", "O", "U"]),
        .init("Name one of the three Scandinavian countries (strict definition).", ["Sweden", "Norway", "Denmark"]),
        .init("Name a standard punctuation mark that can end an English sentence.", ["Period|Full Stop|Stop", "Question Mark", "Exclamation Mark|Exclamation Point"])
    ]

    public static let groupBank: [WordGroup] = [
        .init("Ways to cook", ["BAKE", "BROIL", "STEAM", "POACH"]),
        .init("Parts of a tree", ["ROOT", "BARK", "TRUNK", "LEAF"]),
        .init("Chess pieces", ["ROOK", "PAWN", "BISHOP", "KNIGHT"]),
        .init("Before ‘cake’", ["CUP", "PAN", "CHEESE", "SHORT"]),
        .init("Things with keys", ["PIANO", "LOCK", "KEYBOARD", "MAP"]),
        .init("Musical tempos", ["LARGO", "ADAGIO", "ALLEGRO", "PRESTO"]),
        .init("Shades of blue", ["NAVY", "COBALT", "AZURE", "CERULEAN"]),
        .init("Cuts of pasta", ["PENNE", "FUSILLI", "RIGATONI", "FARFALLE"]),
        .init("A bit of rain", ["DROP", "DRIZZLE", "SHOWER", "SPRINKLE"]),
        .init("At the theater", ["STAGE", "CURTAIN", "WINGS", "AISLE"]),
        .init("Before ‘board’", ["SKATE", "SURF", "DASH", "CUP"]),
        .init("A running event", ["SPRINT", "MARATHON", "RELAY", "HURDLES"]),
        .init("Can follow ‘sun’", ["RISE", "SET", "FLOWER", "BEAM"]),
        .init("Anatomy of a book", ["SPINE", "COVER", "INDEX", "JACKET"]),
        .init("Metric prefixes", ["KILO", "MEGA", "GIGA", "TERA"]),
        .init("Shades of red", ["SCARLET", "CRIMSON", "RUBY", "VERMILION"]),
        .init("A kind of wave", ["SOUND", "RADIO", "TIDAL", "SINE"]),
        .init("Can follow ‘foot’", ["BALL", "PRINT", "NOTE", "PATH"]),
        .init("Tools for a drawing", ["PENCIL", "RULER", "COMPASS", "ERASER"]),
        .init("A place to sit", ["STOOL", "BENCH", "CHAIR", "SOFA"]),
        .init("Containers for a drink", ["MUG", "GLASS", "GOBLET", "TUMBLER"]),
        .init("Units of time", ["SECOND", "MINUTE", "HOUR", "DAY"]),
        .init("A way to fasten", ["ZIP", "BUTTON", "BUCKLE", "CLASP"]),
        .init("In an orchestra", ["OBOE", "CELLO", "HARP", "VIOLA"])
    ]

    public static func cryptic(for edition: DailyEdition) -> CrypticClue { cryptics[edition.index(count: cryptics.count)] }
    public static func word(for edition: DailyEdition) -> String { wordAnswers[edition.index(count: wordAnswers.count, salt: 31)] }
    public static func trivia(for edition: DailyEdition) -> [TriviaPrompt] {
        var rng = SeededRandom(seed: edition.day + 73)
        return Array(triviaPrompts.shuffled(using: &rng).prefix(7))
    }
    public static func groups(for edition: DailyEdition) -> [WordGroup] {
        var rng = SeededRandom(seed: edition.day + 91)
        var used: Set<String> = [], selected: [WordGroup] = []
        for group in groupBank.shuffled(using: &rng) {
            guard used.isDisjoint(with: group.words) else { continue }
            selected.append(group); used.formUnion(group.words)
            if selected.count == 4 { break }
        }
        return selected
    }
    public static func estimates(for edition: DailyEdition) -> [EstimateQuestion] {
        let days = Double(7 + edition.index(count: 35))
        let distance = Double(100 + edition.index(count: 90) * 10)
        let recipes: [EstimateQuestion] = [
            .init("How many minutes are there in \(Int(days)) days?", days * 24 * 60, "minutes", "\(Int(days)) days × 24 hours × 60 minutes = \(Int(days * 1440)) minutes."),
            .init("How many seconds does light take to travel \(Int(distance)) million kilometers in a vacuum?", distance * 1e6 / 299_792.458, "seconds", "Light travels at 299,792.458 km/s. Divide \(Int(distance)) million km by that speed."),
            .init("How many liters of water fit in a cube with sides of \(Int(days)) centimeters?", pow(days, 3) / 1000, "liters", "Volume is side³. There are 1,000 cubic centimeters in a liter."),
            .init("How many squares of all sizes are on a standard 8 × 8 chessboard?", 204, "squares", "Count 1² + 2² + … + 8² = 204, including the larger overlapping squares."),
            .init("How many different five-card hands can be dealt from a standard 52-card deck?", 2_598_960, "hands", "Order does not matter: 52 choose 5 = (52 × 51 × 50 × 49 × 48) ÷ 120."),
            .init("How many millimeters of rain would cover a \(Int(distance)) m² roof if 1,000 liters fell on it?", 1000 / distance, "millimeters", "One liter per square meter makes a depth of one millimeter. Divide 1,000 by \(Int(distance))."),
            .init("How many degrees does the minute hand turn in \(Int(days)) minutes?", days * 6, "degrees", "A minute hand covers 360° in 60 minutes: 6° per minute."),
            .init("How many ways can you arrange all the letters of the word PLANET?", 720, "arrangements", "All six letters differ. There are 6! = 6 × 5 × 4 × 3 × 2 × 1 = 720 arrangements."),
            .init("How many tennis balls, each 6.7 cm across, fit in a \(Int(distance)) cm straight line, without overlap?", floor(distance / 6.7), "balls", "Divide the line length by 6.7 cm, then round down to count whole balls."),
            .init("How many pages are there in \(Int(days)) books if each has 320 pages?", days * 320, "pages", "Multiply \(Int(days)) books by 320 pages per book."),
            .init("How many individual small cubes make a \(Int(days)) × \(Int(days)) × \(Int(days)) cube?", pow(days, 3), "small cubes", "Multiply the number along each of the three dimensions: \(Int(days))³."),
            .init("How many milliliters are in \(Int(days)) US fluid ounces?", days * 29.5735295625, "milliliters", "One US fluid ounce is 29.5735295625 mL. Multiply by \(Int(days)).")
        ]
        let start = edition.index(count: recipes.count)
        return [recipes[start], recipes[(start + 4) % recipes.count], recipes[(start + 8) % recipes.count]]
    }
}
