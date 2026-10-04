/* Noctis Mourning Vale v0.15.2 — Complete Character & Persona Profile Sheets
   Data-driven detailed profile editor inspired by the uploaded Fall Sheet workbook.
   All fields are optional. Stable legacy fields are mirrored for compatibility.
*/
(() => {
  const BUILD="0.15.2";
  const SHEET_VERSION="1.0";
  const PROFILE_SECTIONS=[{"title":"Identity & Demographics","fields":[{"key":"fullName","label":"Full name","legacy":"name","type":"text"},{"key":"preferredName","label":"Preferred name / goes by","type":"text"},{"key":"nicknames","label":"Nicknames / aliases","type":"text"},{"key":"age","label":"Age","legacy":"age","type":"text"},{"key":"dateOfBirth","label":"Date of birth","type":"text"},{"key":"apparentAge","label":"Apparent age","legacy":"apparentAge","type":"text"},{"key":"actualAge","label":"Actual age","legacy":"actualAge","type":"text"},{"key":"sex","label":"Sex","legacy":"sex","type":"text"},{"key":"genderIdentity","label":"Gender identity","legacy":"genderIdentity","type":"text"},{"key":"pronouns","label":"Pronouns","legacy":"pronouns","type":"text"},{"key":"sexualOrientation","label":"Sexual orientation","legacy":"sexualOrientation","type":"text"},{"key":"romanticOrientation","label":"Romantic orientation","type":"text"},{"key":"species","label":"Species / nature","legacy":"species","type":"text"},{"key":"raceEthnicity","label":"Race / ethnicity","legacy":"ethnicity","type":"text"},{"key":"nationality","label":"Nationality / citizenship","type":"text"},{"key":"birthplace","label":"Place of birth","type":"text"},{"key":"residence","label":"Current residence","type":"text"},{"key":"languages","label":"Languages","type":"text"},{"key":"education","label":"Education level","type":"text"},{"key":"occupation","label":"Occupation","legacy":"occupation","type":"text"},{"key":"income","label":"Income / resources","type":"text"},{"key":"socioeconomicPosition","label":"Socioeconomic position","type":"text"},{"key":"maritalStatus","label":"Marital / relationship status","type":"text"}]},{"title":"Physical Canon","fields":[{"key":"height","label":"Height","legacy":"height","type":"text"},{"key":"weight","label":"Weight","legacy":"weight","type":"text"},{"key":"build","label":"Build / body type","legacy":"build","type":"text"},{"key":"bodyMeasurements","label":"Body measurements / proportions","type":"text"},{"key":"skinTone","label":"Skin tone / color","legacy":"skinTone","type":"text"},{"key":"eyeColor","label":"Eye color","legacy":"eyeColor","type":"text"},{"key":"eyeShape","label":"Eye shape","type":"text"},{"key":"hairColor","label":"Hair color","legacy":"hairColor","type":"text"},{"key":"hairLength","label":"Hair length","type":"text"},{"key":"hairStyle","label":"Hair style / texture","legacy":"hairStyle","type":"text"},{"key":"faceShape","label":"Face shape","type":"text"},{"key":"facialFeatures","label":"Facial features","type":"textarea"},{"key":"bodyFeatures","label":"Prominent bodily features","type":"textarea"},{"key":"distinguishingFeatures","label":"Distinguishing features","legacy":"distinguishingFeatures","type":"textarea"},{"key":"scars","label":"Scars","type":"textarea"},{"key":"tattoos","label":"Tattoos","type":"textarea"},{"key":"birthmarks","label":"Birthmarks","type":"textarea"},{"key":"piercings","label":"Piercings","type":"text"},{"key":"glassesContacts","label":"Glasses / contacts","type":"text"},{"key":"physicalDisabilities","label":"Physical disabilities / limitations","type":"textarea"},{"key":"health","label":"Health / physical condition","type":"textarea"},{"key":"currentForm","label":"Current form / transformation state","legacy":"currentForm","type":"text"}]},{"title":"Clothing, Grooming & Style","fields":[{"key":"workClothing","label":"Typical work clothing","type":"textarea"},{"key":"casualClothing","label":"Typical casual clothing","type":"textarea"},{"key":"formalClothing","label":"Formal / going-out clothing","type":"textarea"},{"key":"sleepwear","label":"Sleepwear","type":"text"},{"key":"underwearStyle","label":"Underwear / lingerie style","type":"text"},{"key":"shoes","label":"Typical shoes","type":"text"},{"key":"jewelry","label":"Jewelry / accessories","type":"textarea"},{"key":"grooming","label":"Grooming level / routine","type":"textarea"},{"key":"makeup","label":"Makeup","type":"textarea"},{"key":"scent","label":"Typical scent / fragrance","type":"text"},{"key":"signatureItems","label":"Signature items / objects kept close","type":"textarea"}]},{"title":"Communication & Mannerisms","fields":[{"key":"accent","label":"Accent / dialect","type":"text"},{"key":"voice","label":"Voice quality","legacy":"voice","type":"textarea"},{"key":"speechStyle","label":"Speech style / vocabulary","type":"textarea"},{"key":"curseStyle","label":"Cursing / favorite curse word","type":"text"},{"key":"catchphrases","label":"Catchphrases / repeated phrases","type":"textarea"},{"key":"speechImpediments","label":"Speech impediments","type":"text"},{"key":"posture","label":"Posture","type":"text"},{"key":"walk","label":"Walk / gait","type":"text"},{"key":"gestures","label":"Gestures / tics / mannerisms","type":"textarea"},{"key":"eyeContact","label":"Eye contact style","type":"text"},{"key":"laugh","label":"Laugh","type":"text"},{"key":"smile","label":"Smile","type":"text"},{"key":"restingExpression","label":"Resting facial expression","type":"text"},{"key":"handwriting","label":"Handwriting","type":"text"},{"key":"emotionalVisibility","label":"How visibly they show emotion","type":"textarea"}]},{"title":"Personality & Psychology","fields":[{"key":"personalitySummary","label":"Personality summary","legacy":"personality","type":"textarea"},{"key":"temperament","label":"Temperament","type":"textarea"},{"key":"introversion","label":"Introversion / extroversion","type":"text"},{"key":"strengths","label":"Greatest strengths","type":"textarea"},{"key":"weaknesses","label":"Weaknesses / flaws","type":"textarea"},{"key":"intelligence","label":"Intelligence / thinking style","type":"textarea"},{"key":"impulseControl","label":"Impulse vs deliberation","type":"textarea"},{"key":"competitiveness","label":"Competitiveness","type":"text"},{"key":"confidence","label":"Confidence / self-image","type":"textarea"},{"key":"attachmentStyle","label":"Attachment style","type":"text"},{"key":"loveLanguage","label":"Love language / affection style","type":"textarea"},{"key":"mbti","label":"MBTI / personality type","type":"text"},{"key":"mentalHealth","label":"Mental health / neurodivergence","type":"textarea"},{"key":"copingStyle","label":"Coping style","type":"textarea"},{"key":"triggers","label":"Emotional triggers","type":"textarea"},{"key":"petPeeves","label":"Pet peeves","type":"textarea"},{"key":"obsessions","label":"Obsessions / fixations","type":"textarea"}]},{"title":"Motivations, Fears & Goals","fields":[{"key":"wants","label":"What they want most","type":"textarea"},{"key":"needs","label":"What they actually need","type":"textarea"},{"key":"shortTermGoals","label":"Short-term goals","type":"textarea"},{"key":"longTermGoals","label":"Long-term goals","type":"textarea"},{"key":"greatestFear","label":"Greatest fear","type":"textarea"},{"key":"phobias","label":"Phobias","type":"textarea"},{"key":"pride","label":"What they are most proud of","type":"textarea"},{"key":"regrets","label":"Greatest regrets","type":"textarea"},{"key":"secrets","label":"Secrets","type":"textarea"},{"key":"ambition","label":"Greatest ambition","type":"textarea"}]},{"title":"Family, Backstory & History","fields":[{"key":"backstory","label":"Backstory summary","legacy":"backstory","type":"textarea"},{"key":"family","label":"Family / household","type":"textarea"},{"key":"parents","label":"Parents / parental relationships","type":"textarea"},{"key":"siblings","label":"Siblings / birth order","type":"textarea"},{"key":"childhood","label":"Childhood","type":"textarea"},{"key":"upbringing","label":"Upbringing / socioeconomic childhood","type":"textarea"},{"key":"trauma","label":"Trauma / major losses","type":"textarea"},{"key":"definingMoments","label":"Defining life moments","type":"textarea"},{"key":"happiestMemories","label":"Happiest memories","type":"textarea"},{"key":"worstMemories","label":"Worst / saddest memories","type":"textarea"},{"key":"greatestAchievement","label":"Greatest achievement","type":"textarea"},{"key":"migrationNotes","label":"Continuity / migration notes","legacy":"migrationNotes","type":"textarea"}]},{"title":"Relationships & Social World","fields":[{"key":"relationshipStatus","label":"Current relationship status","type":"text"},{"key":"relationshipStyle","label":"Relationship style","legacy":"relationshipStyle","type":"textarea"},{"key":"relationshipHistory","label":"Relationship history","type":"textarea"},{"key":"loveBeliefs","label":"Beliefs about love","type":"textarea"},{"key":"friendships","label":"Friends / friendship style","type":"textarea"},{"key":"bestFriend","label":"Best friend","type":"textarea"},{"key":"trust","label":"Who they trust / trust style","type":"textarea"},{"key":"enemies","label":"Enemies / rivals","type":"textarea"},{"key":"neighbors","label":"Neighbors / community relationships","type":"textarea"},{"key":"pets","label":"Pets / animals","type":"textarea"},{"key":"socialReputation","label":"How others see them","type":"textarea"}]},{"title":"Adult Romance & Intimacy (Optional)","adult":true,"fields":[{"key":"intimacyExperience","label":"Intimacy / relationship experience","type":"textarea"},{"key":"firstKiss","label":"First kiss / formative romantic experiences","type":"textarea"},{"key":"sexualPreferences","label":"Sexual preferences","type":"textarea"},{"key":"preferredDynamics","label":"Preferred romantic / sexual dynamics","type":"textarea"},{"key":"initiationStyle","label":"Initiation / pursuit style","type":"textarea"},{"key":"dominanceSubmission","label":"Dominance / submission dynamic","type":"textarea"},{"key":"kinks","label":"Kinks / interests","type":"textarea"},{"key":"turnOns","label":"Turn-ons","type":"textarea"},{"key":"turnOffs","label":"Turn-offs","type":"textarea"},{"key":"hardLimits","label":"Hard limits","type":"textarea"},{"key":"softLimits","label":"Soft limits / situational boundaries","type":"textarea"},{"key":"aftercare","label":"Aftercare / reassurance preferences","type":"textarea"},{"key":"jealousy","label":"Jealousy / possessiveness","type":"textarea"},{"key":"oneNightStandView","label":"View of one-night stands","type":"textarea"},{"key":"breakupStyle","label":"Breakup style","type":"textarea"}]},{"title":"Values, Morality & Conflict","fields":[{"key":"values","label":"Core values","type":"textarea"},{"key":"morals","label":"Morals / ethical boundaries","type":"textarea"},{"key":"politics","label":"Political views (optional fictional canon)","type":"textarea"},{"key":"religion","label":"Religion / faith","type":"textarea"},{"key":"worldview","label":"Worldview / philosophy","type":"textarea"},{"key":"freedom","label":"What freedom means to them","type":"textarea"},{"key":"lying","label":"View of lying","type":"textarea"},{"key":"promises","label":"Promises / loyalty","type":"textarea"},{"key":"forgiveness","label":"Forgiveness style","type":"textarea"},{"key":"threatResponse","label":"Response to threats","type":"textarea"},{"key":"conflictStyle","label":"Conflict style","type":"textarea"},{"key":"weapon","label":"Preferred weapon / combat style","type":"textarea"},{"key":"kryptonite","label":"Kryptonite / exploitable weakness","type":"textarea"}]},{"title":"Lifestyle, Skills & Habits","fields":[{"key":"jobThoughts","label":"Feelings about work","type":"textarea"},{"key":"previousJobs","label":"Previous jobs","type":"textarea"},{"key":"hobbies","label":"Hobbies","type":"textarea"},{"key":"skills","label":"Skills / competencies","type":"textarea"},{"key":"training","label":"Specialist training","type":"textarea"},{"key":"talents","label":"Natural talents","type":"textarea"},{"key":"badHabits","label":"Bad habits","type":"textarea"},{"key":"organization","label":"Organization / clutter style","type":"text"},{"key":"technology","label":"Technology comfort","type":"text"},{"key":"morningRoutine","label":"Morning routine","type":"textarea"},{"key":"weekdayRoutine","label":"Weekday routine","type":"textarea"},{"key":"weekendRoutine","label":"Weekend routine","type":"textarea"},{"key":"sleep","label":"Sleep habits / what keeps them awake","type":"textarea"},{"key":"home","label":"Home / living space","type":"textarea"},{"key":"car","label":"Vehicle","type":"textarea"},{"key":"possessions","label":"Treasured possessions","type":"textarea"},{"key":"allergies","label":"Allergies / sensitivities","type":"textarea"}]},{"title":"Interests & Favorites","fields":[{"key":"favoriteColor","label":"Favorite color","type":"text"},{"key":"favoriteAnimal","label":"Favorite animal","type":"text"},{"key":"favoritePlace","label":"Favorite place / dream destination","type":"textarea"},{"key":"favoriteFood","label":"Favorite food","type":"text"},{"key":"favoriteDrink","label":"Favorite drink(s)","type":"text"},{"key":"favoriteBook","label":"Favorite book","type":"text"},{"key":"favoriteMovie","label":"Favorite movie","type":"text"},{"key":"favoriteTV","label":"Favorite TV / binge watch","type":"text"},{"key":"favoriteMusic","label":"Favorite music / musician / song","type":"textarea"},{"key":"favoriteQuote","label":"Favorite quote / proverb","type":"textarea"},{"key":"guiltyPleasure","label":"Guilty pleasure","type":"textarea"},{"key":"dreamTravel","label":"Place they most want to visit","type":"textarea"}]},{"title":"Spirituality & Supernatural Canon","fields":[{"key":"spirituality","label":"Spirituality","type":"textarea"},{"key":"afterlifeBeliefs","label":"Afterlife beliefs","type":"textarea"},{"key":"superstitions","label":"Superstitions","type":"textarea"},{"key":"zodiac","label":"Zodiac / astrology","type":"text"},{"key":"spiritAnimal","label":"Spirit animal / symbolic animal","type":"text"},{"key":"powers","label":"Powers / abilities","legacy":"powers","type":"textarea"},{"key":"weaknessesSupernatural","label":"Supernatural weaknesses / costs","type":"textarea"},{"key":"transformationRules","label":"Transformation rules","type":"textarea"},{"key":"magicRules","label":"Magic / supernatural rules","type":"textarea"},{"key":"canon","label":"Supernatural / world canon","legacy":"canon","type":"textarea"}]},{"title":"RP Direction & Performance","fields":[{"key":"rpRole","label":"Role / archetype","legacy":"role","type":"text"},{"key":"rpVoice","label":"Narrative voice / dialogue voice","type":"textarea"},{"key":"rpPov","label":"Preferred POV","type":"text"},{"key":"rpTense","label":"Preferred tense","type":"text"},{"key":"rpFormatting","label":"Formatting preferences","type":"textarea"},{"key":"rpPacing","label":"Pacing","type":"textarea"},{"key":"rpInitiative","label":"Initiative / NPC autonomy","type":"textarea"},{"key":"rpAgency","label":"Protagonist agency rules","type":"textarea"},{"key":"rpTone","label":"Tone / genre","type":"textarea"},{"key":"rpThemes","label":"Themes to emphasize","type":"textarea"},{"key":"rpAvoid","label":"Themes / behaviors to avoid","type":"textarea"},{"key":"rpDirectives","label":"Response directives","legacy":"directives","type":"textarea"},{"key":"rpPermanentMemory","label":"Permanent canon memory","legacy":"permanentMemory","type":"textarea"},{"key":"preferences","label":"General RP preferences","legacy":"preferences","type":"textarea"}]},{"title":"Interview — Basic Questions","fields":[{"key":"q086","label":"What is your full name?","type":"text"},{"key":"q087","label":"How do you feel about your name?","type":"text"},{"key":"q088","label":"Does your name have any particular meaning/history?","type":"text"},{"key":"q089","label":"Do you have any nickname?","type":"text"},{"key":"q090","label":"When were you born?","type":"text"},{"key":"q091","label":"What is your age?","type":"text"},{"key":"q092","label":"What is your sexual orientation?","type":"text"}],"interview":true},{"title":"Interview — Physical Attributes","fields":[{"key":"q094","label":"What is your height?","type":"text"},{"key":"q095","label":"What is your weight?","type":"text"},{"key":"q096","label":"How are you built? (Skinny, fat, stocky, well muscled, etc.)","type":"textarea"},{"key":"q097","label":"What is your face shape?","type":"text"},{"key":"q098","label":"What is your hair color?","type":"text"},{"key":"q099","label":"How do you style your hair?","type":"text"},{"key":"q100","label":"What is your eye color?","type":"text"},{"key":"q101","label":"What is your eye shape?","type":"text"},{"key":"q102","label":"Do you wear glasses or contact lenses? If glasses, what style?","type":"textarea"},{"key":"q103","label":"Do you have any distinguishing facial features?","type":"text"},{"key":"q104","label":"What is your most prominent facial feature?","type":"text"},{"key":"q105","label":"What is your most prominent bodily feature?","type":"text"},{"key":"q106","label":"What is your skin tone?","type":"text"},{"key":"q107","label":"What is your race/ethnicity?","type":"text"},{"key":"q108","label":"Do you wear makeup?","type":"text"},{"key":"q109","label":"Do you have any scars, birthmarks, or tattoos?","type":"text"},{"key":"q110","label":"Do you have any physical handicaps or disabilities?","type":"text"},{"key":"q111","label":"What type of clothes do you typically wear? (at home, at work, out on the town, in bed)","type":"textarea"},{"key":"q112","label":"Do you wear any kind of jewelry or accessories?","type":"text"},{"key":"q113","label":"What type of shoes do you wear?","type":"text"},{"key":"q114","label":"Do you have any mannerisms?","type":"text"},{"key":"q115","label":"Would you say you are in good health?","type":"text"}],"interview":true},{"title":"Interview — Personality","fields":[{"key":"q117","label":"Are there any words or phrases that you overuse?","type":"text"},{"key":"q118","label":"What about a catchphrase?","type":"text"},{"key":"q119","label":"Are you a glass-half-full or a glass-half-empty type of person?","type":"textarea"},{"key":"q120","label":"Are you more introverted or extroverted?","type":"text"},{"key":"q121","label":"What makes you laugh?","type":"text"},{"key":"q122","label":"What is your love language? How do you show affection?","type":"text"},{"key":"q123","label":"Do you have any mental disabilities?","type":"text"},{"key":"q124","label":"What do you want others to think about you?","type":"text"},{"key":"q125","label":"How do you see yourself?","type":"text"},{"key":"q126","label":"What is your strongest aspect?","type":"text"},{"key":"q127","label":"What is your weakest aspect?","type":"text"},{"key":"q128","label":"How competitive are you?","type":"text"},{"key":"q129","label":"Do you act on impulse or carefully think through decisions?","type":"textarea"},{"key":"q130","label":"What happens if someone praises your work?","type":"text"},{"key":"q131","label":"What happens if someone criticizes your work?","type":"text"},{"key":"q132","label":"What is your greatest fear?","type":"text"},{"key":"q133","label":"What is your biggest secret that you’ve never told anyone?","type":"textarea"},{"key":"q134","label":"What is the purpose of life?","type":"text"},{"key":"q135","label":"When did you last cry?","type":"text"},{"key":"q136","label":"What haunts you?","type":"text"},{"key":"q137","label":"What are your political views?","type":"text"},{"key":"q138","label":"What will you stand for?","type":"text"},{"key":"q139","label":"Who do you quote most often?","type":"text"},{"key":"q140","label":"Do you prefer the indoors or the outdoors?","type":"text"},{"key":"q141","label":"What is your guilty pleasure?","type":"text"},{"key":"q142","label":"What personal trait do you rely on the most?","type":"text"},{"key":"q143","label":"What do you value most in a friend?","type":"text"},{"key":"q144","label":"If you could change one thing about yourself, what would it be?","type":"textarea"},{"key":"q145","label":"What are you obsessed with?","type":"text"},{"key":"q146","label":"What are your pet peeves?","type":"text"},{"key":"q147","label":"What is your greatest regret?","type":"text"}],"interview":true},{"title":"Interview — Relationships","fields":[{"key":"q149","label":"Do you have a large family? Who are they?","type":"text"},{"key":"q150","label":"What do you think of your family?","type":"text"},{"key":"q151","label":"What is your current relationship with your parents?","type":"text"},{"key":"q152","label":"Do you have siblings? Where do you come in?","type":"text"},{"key":"q153","label":"Describe your best friend.","type":"text"},{"key":"q154","label":"Who is your ideal best friend?","type":"text"},{"key":"q155","label":"Who are your other friends?","type":"text"},{"key":"q156","label":"Do you make friends easily?","type":"text"},{"key":"q157","label":"Do you have any pets?","type":"text"},{"key":"q158","label":"Who do you naturally get along with?","type":"text"},{"key":"q159","label":"Who do you surprisingly get along with?","type":"text"},{"key":"q160","label":"Do you believe in love at first sight?","type":"text"},{"key":"q161","label":"Are you in a relationship?","type":"text"},{"key":"q162","label":"How do you act in a relationship?","type":"text"},{"key":"q163","label":"How many relationships have you had?","type":"text"},{"key":"q164","label":"When was the last time you engaged in intimacy?","type":"text"},{"key":"q165","label":"What kind of sex do you like to have?","type":"text"},{"key":"q166","label":"How would you feel after a one-night stand?","type":"text"},{"key":"q167","label":"How do you break up with someone?","type":"text"},{"key":"q168","label":"Have you ever been in love?","type":"text"},{"key":"q169","label":"Has anyone ever broken your heart?","type":"text"},{"key":"q170","label":"Who do you trust?","type":"text"},{"key":"q171","label":"Do you live with anyone? How do you get along with them?","type":"textarea"},{"key":"q172","label":"Do you get along with your neighbors? Why?","type":"text"},{"key":"q173","label":"How would your family describe you?","type":"text"},{"key":"q174","label":"How would your lover describe you?","type":"text"},{"key":"q175","label":"How would your boss describe you?","type":"text"},{"key":"q176","label":"How would your enemy describe you?","type":"text"}],"interview":true},{"title":"Interview — History","fields":[{"key":"q178","label":"What were you like as a baby/child?","type":"text"},{"key":"q179","label":"Did you grow up rich or poor?","type":"text"},{"key":"q180","label":"Were you nurtured or neglected in childhood?","type":"text"},{"key":"q181","label":"What is the most offensive thing a person has ever said to you?","type":"textarea"},{"key":"q182","label":"What has been your greatest achievement?","type":"text"},{"key":"q183","label":"How was your first kiss?","type":"text"},{"key":"q184","label":"What is the worst thing you did to someone you love?","type":"text"},{"key":"q185","label":"What is your greatest ambition?","type":"text"},{"key":"q186","label":"What advice would you give your younger self?","type":"text"},{"key":"q187","label":"What smells remind you of home/your childhood?","type":"text"},{"key":"q188","label":"What did you want to be when you grow up? Did it work out?","type":"textarea"},{"key":"q189","label":"What is your favorite childhood memory?","type":"text"},{"key":"q190","label":"What is your worst childhood memory?","type":"text"},{"key":"q191","label":"Did you have any imaginary friends as a child?","type":"text"},{"key":"q192","label":"What are you most ashamed of?","type":"text"},{"key":"q193","label":"What are you most proud of?","type":"text"},{"key":"q194","label":"Has anyone saved your life?","type":"text"},{"key":"q195","label":"Were you ever bullied as a child?","type":"text"},{"key":"q196","label":"What is the most embarrassing thing to ever happen to you?","type":"textarea"}],"interview":true},{"title":"Interview — Values and Desires","fields":[{"key":"q198","label":"What are your values?","type":"text"},{"key":"q199","label":"What is the worst thing that can be done to a person?","type":"text"},{"key":"q200","label":"What is freedom?","type":"text"},{"key":"q201","label":"When did you last lie?","type":"text"},{"key":"q202","label":"What is your view of lying?","type":"text"},{"key":"q203","label":"Do you keep your promises?","type":"text"},{"key":"q204","label":"Who is your hero?","type":"text"},{"key":"q205","label":"If you could save one person, who would it be?","type":"text"},{"key":"q206","label":"If you could ask for help from one person, who would it be?","type":"textarea"},{"key":"q207","label":"What is your favorite proverb?","type":"text"},{"key":"q208","label":"Do you believe in happy endings?","type":"text"},{"key":"q209","label":"What is happiness?","type":"text"},{"key":"q210","label":"What is your dream job?","type":"text"},{"key":"q211","label":"What do you like to spend money on?","type":"text"},{"key":"q212","label":"What is something you would never do?","type":"text"},{"key":"q213","label":"What is something you would do that might surprise people?","type":"textarea"},{"key":"q214","label":"Are you a leader, follower, or lone wolf?","type":"text"},{"key":"q215","label":"Would you trade ten years of your life for money/beauty/intelligence?","type":"textarea"}],"interview":true},{"title":"Interview — Conflict","fields":[{"key":"q217","label":"How do you respond to a threat?","type":"text"},{"key":"q218","label":"Do you prefer fighting with your fists or using diplomacy?","type":"textarea"},{"key":"q219","label":"What is your kryptonite?","type":"text"},{"key":"q220","label":"Your house is burning down, and you can only save one thing. What is it?","type":"textarea"},{"key":"q221","label":"How do you view strangers?","type":"text"},{"key":"q222","label":"What do you love to hate?","type":"text"},{"key":"q223","label":"What are your phobias?","type":"text"},{"key":"q224","label":"What is your ideal weapon?","type":"text"},{"key":"q225","label":"Who do you most despise in the world?","type":"text"},{"key":"q226","label":"What do you do when you get angry?","type":"text"},{"key":"q227","label":"Who are your enemies? Why?","type":"text"},{"key":"q228","label":"You witness a victimless crime, what do you do?","type":"text"},{"key":"q229","label":"You’re at a bar, and someone spills your drink, what do you do?","type":"textarea"},{"key":"q230","label":"Are you a forgiving person?","type":"text"},{"key":"q231","label":"Is there anything in your past that you can’t forgive?","type":"text"}],"interview":true},{"title":"Interview — Lifestyle and Habits","fields":[{"key":"q233","label":"What are your bad habits?","type":"text"},{"key":"q234","label":"What is your job?","type":"text"},{"key":"q235","label":"What do you think about your job?","type":"text"},{"key":"q236","label":"What other jobs have you had?","type":"text"},{"key":"q237","label":"What are your hobbies?","type":"text"},{"key":"q238","label":"What is your educational background?","type":"text"},{"key":"q239","label":"Would you describe yourself as intelligent?","type":"text"},{"key":"q240","label":"Do you have any specialist training?","type":"text"},{"key":"q241","label":"Are you ‘naturally talented’ at anything?","type":"text"},{"key":"q242","label":"What is your socioeconomic position?","type":"text"},{"key":"q243","label":"What is in your fridge?","type":"text"},{"key":"q244","label":"What is in your car?","type":"text"},{"key":"q245","label":"What kind of car do you drive?","type":"text"},{"key":"q246","label":"What is in your pocket?","type":"text"},{"key":"q247","label":"What is your most treasured possession?","type":"text"},{"key":"q248","label":"Do you keep anything under your pillow? Next to your bed?","type":"textarea"},{"key":"q249","label":"Do you have any allergies?","type":"text"},{"key":"q250","label":"What does your home look like?","type":"text"},{"key":"q251","label":"Minimalist or hoarder?","type":"text"},{"key":"q252","label":"Are you organized or disorganized?","type":"text"},{"key":"q253","label":"Are you forgetful or easily distracted?","type":"text"},{"key":"q254","label":"Right brain or left brain?","type":"text"},{"key":"q255","label":"What do you do first on the weekend?","type":"text"},{"key":"q256","label":"What do you do first on a weekday?","type":"text"},{"key":"q257","label":"What do you do on a Sunday afternoon?","type":"text"},{"key":"q258","label":"What do you do on a Friday night?","type":"text"},{"key":"q259","label":"Are you comfortable with technology?","type":"text"},{"key":"q260","label":"How do you like to celebrate your birthday?","type":"text"},{"key":"q261","label":"What do you think about when you can’t sleep?","type":"text"},{"key":"q262","label":"What keeps you up at night?","type":"text"},{"key":"q263","label":"What is your morning routine?","type":"text"},{"key":"q264","label":"If you could relive any day of your life, what would it be?","type":"textarea"}],"interview":true},{"title":"Interview — Interests","fields":[{"key":"q266","label":"What is your favorite color?","type":"text"},{"key":"q267","label":"What is your favorite animal?","type":"text"},{"key":"q268","label":"What place would you like to visit the most?","type":"text"},{"key":"q269","label":"What is the most beautiful thing you have ever seen?","type":"text"},{"key":"q270","label":"What is your favorite song?","type":"text"},{"key":"q271","label":"What is your password?","type":"text"},{"key":"q272","label":"What is your favorite food?","type":"text"},{"key":"q273","label":"What is your favorite movie?","type":"text"},{"key":"q274","label":"What TV show can you just binge all day long?","type":"text"},{"key":"q275","label":"Who is your favorite musician?","type":"text"},{"key":"q276","label":"What is your favorite alcoholic drink?","type":"text"},{"key":"q277","label":"What is your favorite non-alcoholic drink?","type":"text"},{"key":"q278","label":"If you could have a superpower, what would it be?","type":"text"}],"interview":true},{"title":"Interview — Emotions and Spirituality","fields":[{"key":"q280","label":"Who could be your guardian angel?","type":"text"},{"key":"q281","label":"Do you believe in the afterlife?","type":"text"},{"key":"q282","label":"What religion do you follow?","type":"text"},{"key":"q283","label":"Do you believe in heaven or hell?","type":"text"},{"key":"q284","label":"What do you think it’s like in heaven or hell?","type":"text"},{"key":"q285","label":"Are you superstitious?","type":"text"},{"key":"q286","label":"If you could be reincarnated, what would you like to be reincarnated as?","type":"textarea"},{"key":"q287","label":"What is your spirit animal?","type":"text"},{"key":"q288","label":"How would you like to die?","type":"text"},{"key":"q289","label":"What is your zodiac sign?","type":"text"},{"key":"q290","label":"What is your Chinese Horoscope?","type":"text"},{"key":"q291","label":"What is your motto or mantra for life?","type":"text"}],"interview":true},{"title":"Interview — Other","fields":[{"key":"q293","label":"What would you dress up for on Halloween?","type":"text"},{"key":"q294","label":"What would you do if you won the lottery?","type":"text"},{"key":"q295","label":"If you could meet anyone, living or dead, who would it be?","type":"textarea"},{"key":"q296","label":"Do you have any food allergies or sensitivities?","type":"text"}],"interview":true}];

  const byId=id=>document.getElementById(id);
  const copy=x=>JSON.parse(JSON.stringify(x));

  function ensureProfile(owner){
    if(!owner || typeof owner!=="object")return {version:SHEET_VERSION,fields:{}};
    if(!owner.profileSheet || typeof owner.profileSheet!=="object" || Array.isArray(owner.profileSheet)){
      owner.profileSheet={version:SHEET_VERSION,fields:{},updatedAt:now()};
    }
    if(!owner.profileSheet.fields || typeof owner.profileSheet.fields!=="object" || Array.isArray(owner.profileSheet.fields)){
      owner.profileSheet.fields={};
    }
    owner.profileSheet.version=SHEET_VERSION;
    return owner.profileSheet;
  }

  function ownerFor(kind){
    if(kind==="persona")return activePersona();
    return typeof activeCastMember==="function" ? activeCastMember() : activeCharacter();
  }

  function getField(owner,def){
    const profile=ensureProfile(owner);
    if(def.legacy && typeof owner?.[def.legacy]==="string" && owner[def.legacy].trim())return owner[def.legacy];
    const v=profile.fields[def.key];
    return typeof v==="string"?v:"";
  }

  function setField(owner,def,value){
    const profile=ensureProfile(owner);
    profile.fields[def.key]=String(value??"");
    if(def.legacy)owner[def.legacy]=String(value??"");
    profile.updatedAt=now();
    owner.updatedAt=now();
  }

  function labelText(def){
    return def.label+(def.required?" *":"");
  }

  function buildControl(kind,def){
    const label=document.createElement("label");
    label.className="profile-field";
    label.dataset.profileLabel=(def.label||"").toLowerCase();
    label.dataset.profileKey=def.key;
    const span=document.createElement("span");
    span.className="profile-field-label";
    span.textContent=labelText(def);
    let control;
    if(def.type==="textarea"){
      control=document.createElement("textarea");
      control.rows=3;
    }else{
      control=document.createElement("input");
      control.type="text";
    }
    control.dataset.profileKind=kind;
    control.dataset.profileKey=def.key;
    if(def.legacy)control.dataset.legacyKey=def.legacy;
    control.autocomplete="off";
    control.addEventListener("input",()=>{
      const owner=ownerFor(kind);
      if(!owner)return;
      setField(owner,def,control.value);
      saveVault();
    });
    label.append(span,control);
    return label;
  }

  function sectionNode(kind,section,index){
    const details=document.createElement("details");
    details.className="profile-section";
    details.dataset.profileSection=(section.title||"").toLowerCase();
    if(index<4)details.open=true;
    const summary=document.createElement("summary");
    summary.textContent=section.title+(section.adult?" — optional adult canon":"");
    const grid=document.createElement("div");
    grid.className="profile-grid";
    for(const def of section.fields)grid.appendChild(buildControl(kind,def));
    details.append(summary,grid);
    return details;
  }

  function inject(kind){
    const view=document.querySelector(`[data-view="${kind==="persona"?"persona":"character"}"] .panel`);
    if(!view)return;
    const id=kind==="persona"?"personaCompleteProfile":"characterCompleteProfile";
    if(byId(id))return;

    const host=document.createElement("div");
    host.id=id;
    host.className="complete-profile-sheet";
    host.dataset.profileKind=kind;

    const head=document.createElement("div");
    head.className="profile-sheet-head";
    head.innerHTML=`<div><h2>${kind==="persona"?"Complete Persona Sheet":"Complete Character Sheet"}</h2>
      <p class="hint">Every field is optional. Fill only what matters for this RP; Noctis preserves the rest for future refinement.</p></div>`;

    const tools=document.createElement("div");
    tools.className="profile-tools";
    tools.innerHTML=`<input class="profile-search" type="search" placeholder="Search fields…" aria-label="Search profile fields">
      <button type="button" class="ghost small profile-expand">Expand all</button>
      <button type="button" class="ghost small profile-collapse">Collapse all</button>`;
    head.appendChild(tools);
    host.appendChild(head);

    PROFILE_SECTIONS.forEach((section,i)=>host.appendChild(sectionNode(kind,section,i)));

    if(kind==="character"){
      const castManager=view.querySelector(".cast-sheet-manager");
      if(castManager)castManager.insertAdjacentElement("afterend",host);
      else{
        const firstAnchor=[...view.children].find(el=>el.tagName==="LABEL") || null;
        if(firstAnchor)view.insertBefore(host,firstAnchor);
        else view.appendChild(host);
      }
    }else{
      const firstAnchor=[...view.children].find(el=>el.tagName==="LABEL") || null;
      if(firstAnchor)view.insertBefore(host,firstAnchor);
      else view.appendChild(host);
    }

    /* This sheet supersedes the older small Physical Canon card visually.
       physical-fields.js remains loaded because its prompt/export compatibility
       helpers still protect older vaults and persona files. */
    const oldPhysical=byId(kind==="persona"?"personaPhysicalCanon":"characterPhysicalCanon");
    if(oldPhysical)oldPhysical.classList.add("profile-sheet-superseded");

    const search=host.querySelector(".profile-search");
    search?.addEventListener("input",()=>filterProfile(host,search.value));
    host.querySelector(".profile-expand")?.addEventListener("click",()=>host.querySelectorAll("details.profile-section").forEach(x=>x.open=true));
    host.querySelector(".profile-collapse")?.addEventListener("click",()=>host.querySelectorAll("details.profile-section").forEach(x=>x.open=false));
  }

  function filterProfile(host,query){
    const q=String(query||"").trim().toLowerCase();
    host.querySelectorAll("details.profile-section").forEach(section=>{
      let any=!q || section.dataset.profileSection.includes(q);
      section.querySelectorAll(".profile-field").forEach(field=>{
        const match=!q || field.dataset.profileLabel.includes(q) || field.dataset.profileKey.toLowerCase().includes(q);
        field.hidden=!match;
        if(match)any=true;
      });
      section.hidden=!any;
      if(q && any)section.open=true;
    });
  }

  function render(kind){
    const host=byId(kind==="persona"?"personaCompleteProfile":"characterCompleteProfile");
    const owner=ownerFor(kind);
    if(!host||!owner)return;
    ensureProfile(owner);
    host.querySelectorAll("[data-profile-key]").forEach(control=>{
      const def=PROFILE_SECTIONS.flatMap(x=>x.fields).find(x=>x.key===control.dataset.profileKey);
      if(!def)return;
      if(document.activeElement===control)return;
      control.value=getField(owner,def);
    });
  }

  function profilePrompt(owner,label,maxChars=3000,baseText=''){
    if(!owner)return"";
    const lines=[], seen=new Set();let used=0;
    const priority=new Set(['fullName','age','species','height','appearance','personality','backstory','relationshipStatus','health','currentForm','rpPermanentMemory']);
    const required=new Set(['hardLimits','softLimits','rpAgency','rpPov','rpAvoid']);
    const rows=[];
    for(const section of PROFILE_SECTIONS){
      if(section.interview)continue;
      for(const def of section.fields){
        const v=getField(owner,def).trim();
        if(!v||seen.has(v)||baseText.includes(v))continue;
        seen.add(v);rows.push({key:def.key,text:`${def.label}: ${v}`});
      }
    }
    rows.sort((a,b)=>(required.has(b.key)?2:priority.has(b.key)?1:0)-(required.has(a.key)?2:priority.has(a.key)?1:0));
    for(const row of rows){
      if(required.has(row.key)){lines.push(row.text);continue;}
      if(used+row.text.length+1>maxChars)continue;
      lines.push(row.text);used+=row.text.length+1;
    }
    const text=lines.join("\n").trim();
    if(!text)return"";
    return `\n\n${label} — DETAILED PROFILE CANON\n${text}`;
  }

  function wrapRenderAll(){
    if(window.__noctisCompleteProfileRenderPatched)return;
    window.__noctisCompleteProfileRenderPatched=true;
    const base=renderAll;
    renderAll=function(){
      base();
      inject("character");inject("persona");
      render("character");render("persona");
    };
  }

  function wrapPrompt(){
    if(window.__noctisCompleteProfilePromptPatched || typeof compileSystemPrompt!=="function")return;
    window.__noctisCompleteProfilePromptPatched=true;
    const base=compileSystemPrompt;
    compileSystemPrompt=function(){
      const baseText=base();
      const cast=(typeof sceneCastMembers==="function"?sceneCastMembers():[(typeof activeCastMember==="function"?activeCastMember():activeCharacter())]).filter(Boolean);
      const castProfiles=cast.map(member=>profilePrompt(member,`CHARACTER: ${member.name||"Unnamed"}`,2400,baseText)).join("");
      return baseText+
        castProfiles+
        profilePrompt(activePersona(),"PROTAGONIST / PERSONA",3000,baseText)+
        `\n\nPROFILE AUTHORITY RULES\n- Treat populated detailed profile fields as canon unless the current timeline explicitly establishes a change.\n- Blank profile fields mean unspecified, not permission to invent permanent facts.\n- More specific structured fields override vague prose when they conflict.
- Skin tone / color is literal physical canon. If populated, it overrides any vague appearance/style adjective.
- "Dark", "gothic", "witchy", "black", "shadowy", "elegant", or similar words in clothing/style/aesthetic fields describe STYLE ONLY and must never be converted into complexion.
- Never infer race, ethnicity, or complexion from names, genre, aesthetic, clothing, hair, supernatural type, or prior assistant prose.`;
    };
  }

  function patchPersonaExport(){
    if(window.__noctisCompleteProfilePersonaExport)return;
    window.__noctisCompleteProfilePersonaExport=true;
    exportActivePersona=function(){
      const p=activePersona();
      ensureProfile(p);
      const payload={
        app:"Noctis Mourning Vale",
        format:"noctis-persona",
        version:BUILD,
        targetSlot:Number(p.slot||1),
        exportedAt:new Date().toISOString(),
        persona:copy(p)
      };
      /* Runtime IDs belong to the vault, not portable persona identity. */
      delete payload.persona.id;
      const safe=(p?.name||"persona").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"persona";
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");
      a.href=url;a.download=`${safe}-v${BUILD}.noctis-persona.json`;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  }

  function importPersona(parsed){
    const src=parsed?.persona&&typeof parsed.persona==="object"?parsed.persona:parsed;
    if(!src || typeof src!=="object" || !src.name)throw new Error("That file is not a Noctis persona.");
    ensurePersonas(vault);
    const requested=Number(parsed?.targetSlot??parsed?.slot??src?.targetSlot??src?.slot);
    const p=Number.isInteger(requested)&&requested>=1&&requested<=4
      ?(vault.personas.find(x=>Number(x.slot)===requested)||vault.personas[requested-1])
      :activePersona();
    if(!p)throw new Error("Could not resolve a persona slot.");
    const protectedKeys=new Set(["id","slot"]);
    Object.entries(src).forEach(([k,v])=>{
      if(protectedKeys.has(k))return;
      if(k==="profileSheet" && v && typeof v==="object")p.profileSheet=copy(v);
      else if(typeof v==="string" || typeof v==="number" || typeof v==="boolean" || v===null)p[k]=v;
    });
    p.updatedAt=now();
    activeChat().activePersonaId=p.id;
    saveVault();renderAll();
    alert(`Imported ${p.name||"persona"} into Persona Slot ${p.slot}, including detailed profile fields.`);
    return p;
  }

  function patchPersonaImporter(){
    const old=byId("personaImportInput");
    if(!old || old.dataset.completeProfileImport==="1")return;
    const fresh=old.cloneNode(true);
    fresh.dataset.completeProfileImport="1";
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener("change",async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        const parsed=JSON.parse(await file.text());
        importPersona(parsed);
      }catch(err){alert(`Could not import persona: ${err?.message||String(err)}`)}
      finally{fresh.value=""}
    });
  }

  function normalizeExisting(){
    ensurePersonas(vault);
    (vault.personas||[]).forEach(ensureProfile);
    (vault.characters||[]).forEach(ensureProfile);
    saveVault();
  }

  wrapRenderAll();
  wrapPrompt();
  patchPersonaExport();
  patchPersonaImporter();
  normalizeExisting();
  inject("character");inject("persona");
  render("character");render("persona");

  const obs=new MutationObserver(()=>{
    inject("character");inject("persona");patchPersonaImporter();
  });
  obs.observe(document.body,{childList:true,subtree:true});

  window.NoctisProfileSheet={
    version:SHEET_VERSION,
    sections:PROFILE_SECTIONS,
    ensureProfile,
    importPersona,
    render
  };
})();
