import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const PROGRESS_STORAGE_KEY = 'hindi-quest-progress';
const REACTION_PAUSE_MS = 900;
const MAX_SPEECH_WAIT_MS = 3000;

type LanguageId = 'hi' | 'ta';

const languageVoiceCode: Record<LanguageId, string> = {
  hi: 'hi-IN',
  ta: 'ta-IN',
};

function speakWord(text: string, language: LanguageId, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: languageVoiceCode[language],
    rate: 0.8,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

function shuffleItems<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Screen = 'onboarding' | 'home' | 'themes' | 'lesson' | 'match' | 'memory' | 'reward' | 'progress';
type ItemStatus = 'new' | 'known' | 'practice';
type CharacterId = 'mithu' | 'bunny' | 'golu';
type CharacterMood = 'hello' | 'ready' | 'speak' | 'happy';

type LessonItem = {
  id: string;
  word: string;
  language: LanguageId;
  transliteration: string;
  meaning: string;
  theme: string;
  color: string;
  emoji: string;
};

type ThemeId = 'food' | 'colors' | 'family' | 'sounds';

type Theme = {
  id: string;
  title: string;
  subtitle: string;
  status: 'ready' | 'soon';
  color: string;
};

type Progress = Record<string, ItemStatus>;

type MemoryCard = {
  id: string;
  itemId: string;
  kind: 'sound' | 'meaning';
  label: string;
  language: LanguageId;
};

const foodItems: LessonItem[] = [
  { id: 'paani', word: 'पानी', language: 'hi', transliteration: 'paani', meaning: 'water', theme: 'Food', color: '#78C6E7', emoji: '💧' },
  { id: 'doodh', word: 'दूध', language: 'hi', transliteration: 'doodh', meaning: 'milk', theme: 'Food', color: '#F6F1DF', emoji: '🥛' },
  { id: 'aam', word: 'आम', language: 'hi', transliteration: 'aam', meaning: 'mango', theme: 'Food', color: '#F7B733', emoji: '🥭' },
  { id: 'roti', word: 'रोटी', language: 'hi', transliteration: 'roti', meaning: 'flatbread', theme: 'Food', color: '#DFA45B', emoji: '🫓' },
  { id: 'chawal', word: 'चावल', language: 'hi', transliteration: 'chawal', meaning: 'rice', theme: 'Food', color: '#EEE7CF', emoji: '🍚' },
  { id: 'kela', word: 'केला', language: 'hi', transliteration: 'kela', meaning: 'banana', theme: 'Food', color: '#F5DE6E', emoji: '🍌' },
];

const colorItems: LessonItem[] = [
  { id: 'laal', word: 'लाल', language: 'hi', transliteration: 'laal', meaning: 'red', theme: 'Colors', color: '#D64545', emoji: '🔴' },
  { id: 'neela', word: 'नीला', language: 'hi', transliteration: 'neela', meaning: 'blue', theme: 'Colors', color: '#3E7CB1', emoji: '🔵' },
  { id: 'peela', word: 'पीला', language: 'hi', transliteration: 'peela', meaning: 'yellow', theme: 'Colors', color: '#F2C230', emoji: '🟡' },
  { id: 'hara', word: 'हरा', language: 'hi', transliteration: 'hara', meaning: 'green', theme: 'Colors', color: '#4CAF6D', emoji: '🟢' },
  { id: 'kaala', word: 'काला', language: 'hi', transliteration: 'kaala', meaning: 'black', theme: 'Colors', color: '#3A3A3A', emoji: '⚫' },
];

const familyItems: LessonItem[] = [
  { id: 'maa', word: 'माँ', language: 'hi', transliteration: 'maa', meaning: 'mother', theme: 'Family', color: '#F4B8C4', emoji: '👩' },
  { id: 'pita', word: 'पिता', language: 'hi', transliteration: 'pita', meaning: 'father', theme: 'Family', color: '#8FB8DE', emoji: '👨' },
  { id: 'bhai', word: 'भाई', language: 'hi', transliteration: 'bhai', meaning: 'brother', theme: 'Family', color: '#A8D8B9', emoji: '👦' },
  { id: 'bahan', word: 'बहन', language: 'hi', transliteration: 'bahan', meaning: 'sister', theme: 'Family', color: '#F7D488', emoji: '👧' },
  { id: 'baccha', word: 'बच्चा', language: 'hi', transliteration: 'baccha', meaning: 'child', theme: 'Family', color: '#C9B8E8', emoji: '👶' },
];

const soundItems: LessonItem[] = [
  { id: 'a', word: 'अ', language: 'hi', transliteration: 'a', meaning: 'sound "a"', theme: 'Starter sounds', color: '#F7B733', emoji: 'अ' },
  { id: 'aa', word: 'आ', language: 'hi', transliteration: 'aa', meaning: 'sound "aa"', theme: 'Starter sounds', color: '#6EC6DE', emoji: 'आ' },
  { id: 'ka', word: 'क', language: 'hi', transliteration: 'ka', meaning: 'sound "ka"', theme: 'Starter sounds', color: '#7FC77E', emoji: 'क' },
  { id: 'ma', word: 'म', language: 'hi', transliteration: 'ma', meaning: 'sound "ma"', theme: 'Starter sounds', color: '#E88A73', emoji: 'म' },
  { id: 'pa', word: 'प', language: 'hi', transliteration: 'pa', meaning: 'sound "pa"', theme: 'Starter sounds', color: '#C9A0E0', emoji: 'प' },
  { id: 'na', word: 'न', language: 'hi', transliteration: 'na', meaning: 'sound "na"', theme: 'Starter sounds', color: '#F2D06B', emoji: 'न' },
  { id: 'ra', word: 'र', language: 'hi', transliteration: 'ra', meaning: 'sound "ra"', theme: 'Starter sounds', color: '#8FD0C4', emoji: 'र' },
  { id: 'la', word: 'ल', language: 'hi', transliteration: 'la', meaning: 'sound "la"', theme: 'Starter sounds', color: '#F0A8C0', emoji: 'ल' },
  { id: 'sa', word: 'स', language: 'hi', transliteration: 'sa', meaning: 'sound "sa"', theme: 'Starter sounds', color: '#A8B8E0', emoji: 'स' },
  { id: 'ha', word: 'ह', language: 'hi', transliteration: 'ha', meaning: 'sound "ha"', theme: 'Starter sounds', color: '#D8B98A', emoji: 'ह' },
];

function itemsForTheme(themeId: ThemeId): LessonItem[] {
  if (themeId === 'colors') return colorItems;
  if (themeId === 'family') return familyItems;
  if (themeId === 'sounds') return soundItems;
  return foodItems;
}

const themes: Theme[] = [
  { id: 'food', title: 'Food', subtitle: 'Learn tasty everyday words', status: 'ready', color: '#F7B733' },
  { id: 'colors', title: 'Colors', subtitle: 'Paint with Hindi words', status: 'ready', color: '#78C6E7' },
  { id: 'family', title: 'Family', subtitle: 'Words for people at home', status: 'ready', color: '#76B77C' },
  { id: 'sounds', title: 'Starter sounds', subtitle: 'Meet friendly Hindi letters', status: 'ready', color: '#E7755F' },
];

// Order in which themes unlock. Themes with no real content yet (status
// 'soon') aren't part of this sequence — they stay locked regardless.
const themeUnlockOrder: ThemeId[] = ['food', 'colors', 'family', 'sounds'];

function isThemeMastered(themeId: ThemeId, progress: Progress): boolean {
  return itemsForTheme(themeId).every((item) => progress[item.id] === 'known');
}

type ThemePlayability = 'ready' | 'locked' | 'soon';

function themePlayability(theme: Theme, progress: Progress): ThemePlayability {
  if (theme.status === 'soon') return 'soon';
  const index = themeUnlockOrder.indexOf(theme.id as ThemeId);
  if (index <= 0) return 'ready';
  return isThemeMastered(themeUnlockOrder[index - 1], progress) ? 'ready' : 'locked';
}

function currentLevel(progress: Progress): number {
  return 1 + themeUnlockOrder.filter((id) => isThemeMastered(id, progress)).length;
}

const themeRewardName: Record<ThemeId, string> = {
  food: 'picnic basket',
  colors: 'color palette',
  family: 'family photo album',
  sounds: 'sound chart',
};

const themeUnitLabel: Record<ThemeId, string> = {
  food: 'words',
  colors: 'words',
  family: 'words',
  sounds: 'sounds',
};

const initialProgress: Progress = Object.fromEntries(
  [...foodItems, ...colorItems, ...familyItems, ...soundItems].map((item) => [item.id, 'new']),
) as Progress;

const characters: { id: CharacterId; name: string; subtitle: string }[] = [
  { id: 'mithu', name: 'Mithu', subtitle: 'the parrot' },
  { id: 'bunny', name: 'Bunny', subtitle: 'the rainbow bunny' },
  { id: 'golu', name: 'Golu', subtitle: 'the elephant' },
];

const CHARACTER_STORAGE_KEY = 'hindi-quest-character';

const languages: { id: LanguageId; name: string; ready: boolean }[] = [
  { id: 'hi', name: 'Hindi', ready: true },
  { id: 'ta', name: 'Tamil', ready: false },
];

const LANGUAGE_STORAGE_KEY = 'hindi-quest-language';

export default function App() {
  const successPlayer = useAudioPlayer(require('./assets/sounds/success.mp3'));
  const failPlayer = useAudioPlayer(require('./assets/sounds/fail-buzz.mp3'));

  function playSuccessSound() {
    successPlayer.seekTo(0);
    successPlayer.play();
  }

  function playFailSound() {
    failPlayer.seekTo(0);
    failPlayer.play();
  }

  const [screen, setScreen] = useState<Screen>('onboarding');
  const [language, setLanguage] = useState<LanguageId>('hi');
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [matchIndex, setMatchIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('Tap what you hear.');
  const [matchedCards, setMatchedCards] = useState<string[]>([]);
  const [flippedCards, setFlippedCards] = useState<MemoryCard[]>([]);
  const [earnedReward, setEarnedReward] = useState('a picnic basket');
  const [justMasteredTheme, setJustMasteredTheme] = useState<ThemeId | null>(null);
  const [missedThisLesson, setMissedThisLesson] = useState<string[]>([]);
  const [isReviewRound, setIsReviewRound] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeId>('food');
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);
  const [character, setCharacter] = useState<CharacterId>('mithu');
  const [isCharacterLoaded, setIsCharacterLoaded] = useState(false);
  const [promptOrder, setPromptOrder] = useState<LessonItem[]>([]);
  const [answerOrder, setAnswerOrder] = useState<LessonItem[]>([]);
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);

  const themeItems = itemsForTheme(activeTheme);
  const activeThemeMeta = themes.find((theme) => theme.id === activeTheme);
  const characterMeta = characters.find((entry) => entry.id === character) ?? characters[0];
  const languageMeta = languages.find((entry) => entry.id === language) ?? languages[0];
  const masteryMessage = (() => {
    if (!justMasteredTheme) return null;
    const masteredMeta = themes.find((theme) => theme.id === justMasteredTheme);
    const nextIndex = themeUnlockOrder.indexOf(justMasteredTheme) + 1;
    const nextMeta = themes.find((theme) => theme.id === themeUnlockOrder[nextIndex]);
    return nextMeta
      ? `You mastered ${masteredMeta?.title}! ${nextMeta.title} is now unlocked.`
      : `You mastered ${masteredMeta?.title}!`;
  })();
  const foodLearnedCount = foodItems.filter((item) => progress[item.id] === 'known').length;
  const foodPracticeCount = foodItems.filter((item) => progress[item.id] === 'practice').length;
  const themeLearnedCount = themeItems.filter((item) => progress[item.id] === 'known').length;
  const themePracticeCount = themeItems.filter((item) => progress[item.id] === 'practice').length;
  const currentItem = promptOrder[matchIndex] ?? promptOrder[0] ?? themeItems[0];
  const adultSupport = showPronunciation;

  useEffect(() => {
    if (screen === 'match') {
      speakWord(currentItem.word, currentItem.language);
    }
  }, [screen, matchIndex, isReviewRound]);

  useEffect(() => {
    if (screen === 'memory') {
      const cards: MemoryCard[] = itemsForTheme(activeTheme).slice(0, 4).flatMap((item) => [
        { id: `${item.id}-sound`, itemId: item.id, kind: 'sound', label: item.word, language: item.language },
        { id: `${item.id}-meaning`, itemId: item.id, kind: 'meaning', label: item.meaning, language: item.language },
      ]);
      setMemoryCards(shuffleItems(cards));
    }
  }, [screen, activeTheme]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PROGRESS_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (stored) {
        try {
          setProgress(JSON.parse(stored));
        } catch {
          // ignore malformed stored progress, keep defaults
        }
      }
      setIsProgressLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isProgressLoaded) return;
    AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, [progress, isProgressLoaded]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CHARACTER_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (stored === 'mithu' || stored === 'bunny' || stored === 'golu') {
        setCharacter(stored);
      }
      setIsCharacterLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isCharacterLoaded) return;
    AsyncStorage.setItem(CHARACTER_STORAGE_KEY, character);
  }, [character, isCharacterLoaded]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (stored === 'hi' || stored === 'ta') {
        setLanguage(stored);
      }
      setIsLanguageLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLanguageLoaded) return;
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language, isLanguageLoaded]);

  function startLesson() {
    setMatchIndex(0);
    setAttempts({});
    setSelectedAnswer(null);
    setFeedback('Tap what you hear.');
    setMissedThisLesson([]);
    setIsReviewRound(false);
    setJustMasteredTheme(null);
    setPromptOrder(shuffleItems(themeItems));
    setAnswerOrder(shuffleItems(themeItems));
    setScreen('match');
  }

  function handleAnswer(itemId: string) {
    const isCorrect = itemId === currentItem.id;
    const nextAttempts = { ...attempts, [currentItem.id]: (attempts[currentItem.id] ?? 0) + 1 };
    setAttempts(nextAttempts);
    setSelectedAnswer(itemId);

    if (!isCorrect) {
      playFailSound();
      setFeedback(`Try again. ${characterMeta.name} will play it once more.`);
      setProgress((prev) => ({ ...prev, [currentItem.id]: 'practice' }));
      setMissedThisLesson((prev) => (prev.includes(currentItem.id) ? prev : [...prev, currentItem.id]));
      return;
    }

    playSuccessSound();
    setFeedback(`Nice! ${currentItem.word} means ${currentItem.meaning}.`);
    const nextProgress = { ...progress, [currentItem.id]: 'known' as ItemStatus };
    setProgress(nextProgress);

    const wasMastered = isThemeMastered(activeTheme, progress);
    const isMasteredNow = isThemeMastered(activeTheme, nextProgress);
    if (!wasMastered && isMasteredNow) {
      setJustMasteredTheme(activeTheme);
    }

    let advanced = false;
    const advanceToNext = () => {
      if (advanced) return;
      advanced = true;
      setTimeout(() => {
        if (matchIndex < promptOrder.length - 1) {
          setMatchIndex((index) => index + 1);
          setAnswerOrder(shuffleItems(themeItems));
          setSelectedAnswer(null);
          setFeedback('Tap what you hear.');
          return;
        }

        if (!isReviewRound && missedThisLesson.length > 0) {
          setIsReviewRound(true);
          setMatchIndex(0);
          setPromptOrder(shuffleItems(themeItems.filter((item) => missedThisLesson.includes(item.id))));
          setAnswerOrder(shuffleItems(themeItems));
          setSelectedAnswer(null);
          setFeedback('Review round: let\'s try those tricky words again.');
          return;
        }

        setSelectedAnswer(null);
        setFeedback('Find the matching pairs.');
        setMatchedCards([]);
        setFlippedCards([]);
        setScreen('memory');
      }, REACTION_PAUSE_MS);
    };

    // Advance once the word finishes playing, but never wait longer than
    // MAX_SPEECH_WAIT_MS in case the device has no voice installed for this
    // language and speech synthesis stalls instead of erroring out quickly.
    speakWord(currentItem.word, currentItem.language, advanceToNext);
    setTimeout(advanceToNext, MAX_SPEECH_WAIT_MS);
  }

  function handleCardPress(card: MemoryCard) {
    if (matchedCards.includes(card.itemId) || flippedCards.some((flipped) => flipped.id === card.id)) {
      return;
    }

    if (card.kind === 'sound') {
      speakWord(card.label, card.language);
    }

    const nextFlipped = [...flippedCards, card];
    setFlippedCards(nextFlipped);

    if (nextFlipped.length === 2) {
      const [first, second] = nextFlipped;
      const isMatch = first.itemId === second.itemId && first.kind !== second.kind;

      setTimeout(() => {
        if (isMatch) {
          const nextMatched = [...matchedCards, first.itemId];
          setMatchedCards(nextMatched);
          setFeedback('Pair found!');
          playSuccessSound();
          if (nextMatched.length === 4) {
            setEarnedReward(`${characterMeta.name}'s ${themeRewardName[activeTheme]}`);
            setScreen('reward');
          }
        } else {
          setFeedback('Not yet. Try another pair.');
          playFailSound();
        }
        setFlippedCards([]);
      }, 600);
    }
  }

  function resetPrototype() {
    setProgress(initialProgress);
    setMatchIndex(0);
    setAttempts({});
    setMatchedCards([]);
    setFlippedCards([]);
    setSelectedAnswer(null);
    setFeedback('Tap what you hear.');
    setMissedThisLesson([]);
    setIsReviewRound(false);
    setJustMasteredTheme(null);
    setActiveTheme('food');
    setScreen('onboarding');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {screen !== 'onboarding' ? (
          <View style={styles.topBar}>
            <Pressable style={styles.topLink} onPress={() => setScreen('home')} accessibilityRole="button">
              <Text style={styles.topLinkText}>Home</Text>
            </Pressable>
            <Text style={styles.brandSmall}>{languageMeta.name} Quest</Text>
            <Pressable style={styles.topLink} onPress={() => setScreen('progress')} accessibilityRole="button">
              <Text style={styles.topLinkText}>Progress</Text>
            </Pressable>
          </View>
        ) : null}

        {screen === 'onboarding' && (
          <ScreenShell>
            <View style={styles.heroRow}>
              <CharacterMascot character={character} mood="hello" />
              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>Meet {characterMeta.name}</Text>
                <Text style={styles.title}>{languageMeta.name} Quest</Text>
                <Text style={styles.subtitle}>Learn {languageMeta.name} through quick, happy games.</Text>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Choose your language</Text>
              <View style={styles.segmentRow}>
                {languages.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => setLanguage(option.id)}
                    style={[styles.segment, language === option.id && styles.segmentActive]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.segmentText, language === option.id && styles.segmentTextActive]}>{option.name}</Text>
                    {!option.ready ? <Text style={styles.segmentSoon}>Coming soon</Text> : null}
                  </Pressable>
                ))}
              </View>
              {!languageMeta.ready ? (
                <Text style={styles.helperText}>
                  Tamil lessons are on their way. Switch back to Hindi to start playing today.
                </Text>
              ) : null}
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Choose your guide</Text>
              <View style={styles.characterRow}>
                {characters.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => setCharacter(option.id)}
                    style={[styles.characterTile, character === option.id && styles.characterTileActive]}
                    accessibilityRole="button"
                  >
                    <CharacterMascot character={option.id} mood="ready" compact />
                    <Text style={styles.characterName}>{option.name}</Text>
                    <Text style={styles.characterSubtitle}>{option.subtitle}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.panel}>
              <Pressable
                style={styles.toggleRow}
                onPress={() => setShowPronunciation((value) => !value)}
                accessibilityRole="switch"
                accessibilityState={{ checked: showPronunciation }}
              >
                <View style={[styles.toggleTrack, showPronunciation && styles.toggleTrackActive]}>
                  <View style={[styles.toggleKnob, showPronunciation && styles.toggleKnobActive]} />
                </View>
                <Text style={styles.toggleText}>Show pronunciation help</Text>
              </Pressable>

              <Text style={styles.helperText}>Turn sound on. {characterMeta.name} will say each {languageMeta.name} word.</Text>
              <PrimaryButton
                label={languageMeta.ready ? 'Start' : 'Select Hindi to start'}
                onPress={() => languageMeta.ready && setScreen('home')}
              />
            </View>
          </ScreenShell>
        )}

        {screen === 'home' && (
          <ScreenShell>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Level {currentLevel(progress)}</Text>
            </View>
            <View style={styles.homeHero}>
              <View style={styles.heroCopyWide}>
                <Text style={styles.kicker}>Ready for a quick {languageMeta.name} game?</Text>
                <Text style={styles.title}>Play the Food lesson</Text>
                <Text style={styles.subtitle}>Hear {languageMeta.name}, tap the right tile, and help {characterMeta.name} pack a picnic.</Text>
              </View>
              <CharacterMascot character={character} mood="ready" />
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Words learned" value={`${foodLearnedCount}/${foodItems.length}`} />
              <StatCard label="Needs practice" value={`${foodPracticeCount}`} />
            </View>

            <PrimaryButton
              label={foodLearnedCount > 0 ? 'Continue' : 'Start first lesson'}
              onPress={() => {
                setActiveTheme('food');
                setScreen('lesson');
              }}
            />
            <SecondaryButton label="Choose a theme" onPress={() => setScreen('themes')} />
          </ScreenShell>
        )}

        {screen === 'themes' && (
          <ScreenShell>
            <View style={styles.lessonHeader}>
              <View>
                <Text style={styles.title}>Pick a theme</Text>
                <Text style={styles.subtitle}>Start with Food, then unlock more Hindi worlds.</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Level {currentLevel(progress)}</Text>
              </View>
            </View>
            <View style={styles.themeGrid}>
              {themes.map((theme, index) => {
                const playability = themePlayability(theme, progress);
                const items = playability === 'ready' ? itemsForTheme(theme.id as ThemeId) : [];
                const learned = items.filter((item) => progress[item.id] === 'known').length;
                const prevTheme = themes[index - 1];
                return (
                  <Pressable
                    key={theme.id}
                    style={[styles.themeTile, playability !== 'ready' && styles.themeTileSoon]}
                    onPress={() => {
                      if (playability !== 'ready') return;
                      setActiveTheme(theme.id as ThemeId);
                      setScreen('lesson');
                    }}
                    accessibilityRole="button"
                  >
                    <View style={[styles.themeDot, { backgroundColor: theme.color }]} />
                    <Text style={styles.themeTitle}>{theme.title}</Text>
                    <Text style={styles.themeSubtitle}>{theme.subtitle}</Text>
                    <Text style={playability === 'ready' ? styles.readyBadge : styles.soonBadge}>
                      {playability === 'ready'
                        ? `${learned}/${items.length} learned`
                        : playability === 'locked'
                          ? `Master ${prevTheme?.title ?? 'the previous theme'} to unlock`
                          : 'Coming soon'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScreenShell>
        )}

        {screen === 'lesson' && (
          <ScreenShell>
            <View style={styles.lessonHeader}>
              <View>
                <Text style={styles.kicker}>{activeThemeMeta?.title ?? 'Food'} Game</Text>
                <Text style={styles.title}>Learn {themeItems.length} {languageMeta.name} {themeUnitLabel[activeTheme]}</Text>
              </View>
              <CharacterMascot character={character} mood="ready" compact />
            </View>
            <Text style={styles.subtitle}>Tap one to hear it. Then {characterMeta.name} will quiz you.</Text>
            <View style={styles.wordPreviewGrid}>
              {themeItems.map((item) => (
                <WordPreview key={item.id} item={item} showPronunciation={adultSupport} onPress={() => speakWord(item.word, item.language)} />
              ))}
            </View>
            <PrimaryButton label="Play" onPress={startLesson} />
            <SecondaryButton label="Back to themes" onPress={() => setScreen('themes')} />
          </ScreenShell>
        )}

        {screen === 'match' && (
          <ScreenShell>
            <View style={styles.gameHeader}>
              <Text style={styles.progressText}>{matchIndex + 1}/{promptOrder.length}</Text>
              <Text style={styles.kicker}>{isReviewRound ? 'Review round' : 'Match and Listen'}</Text>
            </View>
            <Pressable
              style={styles.soundCard}
              onPress={() => speakWord(currentItem.word, currentItem.language)}
              accessibilityRole="button"
              accessibilityLabel="Replay the word"
            >
              <CharacterMascot character={character} mood="speak" compact />
              <View style={styles.soundCopy}>
                <Text style={styles.instruction}>Tap what you hear.</Text>
                <Text style={styles.promptWord}>{currentItem.word}</Text>
                {adultSupport ? <Text style={styles.promptHelp}>{currentItem.transliteration}</Text> : null}
                <Text style={styles.replayHint}>Tap to hear again</Text>
              </View>
            </Pressable>
            <Text style={styles.feedbackText}>{feedback}</Text>
            <View style={styles.answerGrid}>
              {answerOrder.map((item) => {
                const isSelected = selectedAnswer === item.id;
                const isCorrect = isSelected && item.id === currentItem.id;
                const isWrong = isSelected && item.id !== currentItem.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleAnswer(item.id)}
                    style={[styles.answerTile, isCorrect && styles.answerCorrect, isWrong && styles.answerWrong]}
                    accessibilityRole="button"
                  >
                    <FoodVisual item={item} />
                    <Text style={styles.answerHindi}>{item.word}</Text>
                    <Text style={styles.answerMeaning}>{item.meaning}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScreenShell>
        )}

        {screen === 'memory' && (
          <ScreenShell>
            <Text style={styles.kicker}>Memory Pairs</Text>
            <Text style={styles.title}>Find the matching pairs</Text>
            <Text style={styles.subtitle}>Match the Hindi word with its meaning.</Text>
            <Text style={styles.feedbackText}>{feedback}</Text>
            <View style={styles.memoryGrid}>
              {memoryCards.map((card) => {
                const item = themeItems.find((entry) => entry.id === card.itemId) ?? themeItems[0];
                const isOpen = matchedCards.includes(card.itemId) || flippedCards.some((flipped) => flipped.id === card.id);
                return (
                  <Pressable
                    key={card.id}
                    onPress={() => handleCardPress(card)}
                    style={[styles.memoryCard, isOpen && styles.memoryCardOpen]}
                    accessibilityRole="button"
                  >
                    {isOpen ? (
                      <>
                        <FoodVisual item={item} small />
                        <Text style={styles.memoryLabel}>{card.label}</Text>
                      </>
                    ) : (
                      <Image source={characterImages[character]} style={styles.cardBackImage} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScreenShell>
        )}

        {screen === 'reward' && (
          <ScreenShell>
            <View style={styles.rewardPanel}>
              <CharacterMascot character={character} mood="happy" />
              <Text style={styles.title}>You learned Hindi!</Text>
              <Text style={styles.subtitle}>{themeItems.length} words practiced. Unlocked: {earnedReward}.</Text>
              <View style={styles.rewardBasket}>
                {themeItems.slice(0, 4).map((item) => (
                  <FoodVisual key={item.id} item={item} small />
                ))}
              </View>
              {masteryMessage ? (
                <View style={styles.masteryBanner}>
                  <Text style={styles.masteryBannerText}>{masteryMessage}</Text>
                </View>
              ) : null}
            </View>
            <PrimaryButton label="Play next" onPress={() => setScreen('themes')} />
            <SecondaryButton label="See progress" onPress={() => setScreen('progress')} />
          </ScreenShell>
        )}

        {screen === 'progress' && (
          <ScreenShell>
            <Text style={styles.title}>Your {languageMeta.name} progress</Text>
            <Text style={styles.subtitle}>{activeThemeMeta?.title ?? 'Food'} words · a simple view for parents and adult learners.</Text>
            <View style={styles.statsRow}>
              <StatCard label="Words learned" value={`${themeLearnedCount}`} />
              <StatCard label="Needs practice" value={`${themePracticeCount}`} />
            </View>
            <View style={styles.progressList}>
              {themeItems.map((item) => (
                <View key={item.id} style={styles.progressRow}>
                  <FoodVisual item={item} small />
                  <View style={styles.progressCopy}>
                    <Text style={styles.progressHindi}>{item.word} · {item.meaning}</Text>
                    <Text style={styles.progressMeta}>{item.transliteration}</Text>
                  </View>
                  <Text style={progress[item.id] === 'known' ? styles.knownPill : styles.practicePill}>
                    {progress[item.id] === 'known' ? 'Known' : progress[item.id] === 'practice' ? 'Practice' : 'New'}
                  </Text>
                </View>
              ))}
            </View>
            <PrimaryButton label={`Review ${activeThemeMeta?.title ?? 'Food'}`} onPress={startLesson} />
            <SecondaryButton label="Reset prototype" onPress={resetPrototype} />
          </ScreenShell>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ScreenShell({ children }: { children: React.ReactNode }) {
  return <View style={styles.screenShell}>{children}</View>;
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress} accessibilityRole="button">
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress} accessibilityRole="button">
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function WordPreview({
  item,
  showPronunciation,
  onPress,
}: {
  item: LessonItem;
  showPronunciation: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.wordPreview} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Hear ${item.word}`}>
      <FoodVisual item={item} />
      <Text style={styles.previewHindi}>{item.word}</Text>
      {showPronunciation ? <Text style={styles.previewMeta}>{item.transliteration}</Text> : null}
      <Text style={styles.previewMeaning}>{item.meaning}</Text>
    </Pressable>
  );
}

const characterImages: Record<CharacterId, ImageSourcePropType> = {
  mithu: require('./assets/characters/mithu.png'),
  bunny: require('./assets/characters/bunny.png'),
  golu: require('./assets/characters/golu.png'),
};

function CharacterMascot({
  character,
  compact = false,
  mood,
}: {
  character: CharacterId;
  compact?: boolean;
  mood: CharacterMood;
}) {
  return (
    <View style={[styles.mascot, compact && styles.mascotCompact]}>
      <Image source={characterImages[character]} style={[styles.mascotImage, compact && styles.mascotImageCompact]} />
      <Text style={[styles.mascotBubble, compact && styles.mascotBubbleCompact]}>
        {mood === 'hello' ? 'नमस्ते' : mood === 'speak' ? 'सुनो' : mood === 'happy' ? 'शाबाश' : 'चलो'}
      </Text>
    </View>
  );
}

function FoodVisual({ item, small = false }: { item: LessonItem; small?: boolean }) {
  return (
    <View style={[styles.foodVisual, small && styles.foodVisualSmall, { backgroundColor: item.color }]}>
      <Text style={[styles.foodVisualEmoji, small && styles.foodVisualEmojiSmall]}>{item.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 32 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  topLink: {
    backgroundColor: '#F7F1DF',
    borderColor: '#E4D4A5',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  topLinkText: { color: '#24324C', fontSize: 14, fontWeight: '700' },
  brandSmall: { color: '#596270', fontSize: 14, fontWeight: '800' },
  screenShell: { gap: 16, padding: 20 },
  heroRow: { alignItems: 'center', flexDirection: 'row', gap: 18 },
  heroCopy: { flex: 1 },
  heroCopyWide: { flex: 1, gap: 6 },
  homeHero: {
    alignItems: 'center',
    backgroundColor: '#F7F1DF',
    borderColor: '#E7DDBD',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 18,
  },
  kicker: { color: '#7B5B00', fontSize: 13, fontWeight: '800' },
  title: { color: '#24324C', fontSize: 31, fontWeight: '900', lineHeight: 36 },
  subtitle: { color: '#526070', fontSize: 16, lineHeight: 23 },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6E1D4',
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  sectionTitle: { color: '#24324C', fontSize: 20, fontWeight: '900' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
    borderColor: '#D8DEE8',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: '#24324C', borderColor: '#24324C' },
  segmentText: { color: '#334155', fontSize: 15, fontWeight: '800' },
  segmentTextActive: { color: '#FFFFFF' },
  segmentSoon: { color: '#8C5B10', fontSize: 11, fontWeight: '800', marginTop: 2, textAlign: 'center' },
  characterRow: { flexDirection: 'row', gap: 8 },
  characterTile: {
    alignItems: 'center',
    backgroundColor: '#F4F6F8',
    borderColor: '#D8DEE8',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingBottom: 10,
    paddingTop: 4,
  },
  characterTileActive: { backgroundColor: '#FFF7E6', borderColor: '#B9780D' },
  characterName: { color: '#24324C', fontSize: 14, fontWeight: '900' },
  characterSubtitle: { color: '#596270', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 52 },
  toggleTrack: {
    backgroundColor: '#D9E1EA',
    borderRadius: 16,
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 54,
  },
  toggleTrackActive: { backgroundColor: '#76B77C' },
  toggleKnob: { backgroundColor: '#FFFFFF', borderRadius: 12, height: 24, width: 24 },
  toggleKnobActive: { alignSelf: 'flex-end' },
  toggleText: { color: '#24324C', fontSize: 15, fontWeight: '700' },
  helperText: { color: '#596270', fontSize: 14, lineHeight: 20 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#B9780D',
    borderRadius: 16,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7DEE8',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  secondaryButtonText: { color: '#24324C', fontSize: 16, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    backgroundColor: '#EFF7F0',
    borderColor: '#CCE4CF',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  statValue: { color: '#23613B', fontSize: 28, fontWeight: '900' },
  statLabel: { color: '#365444', fontSize: 13, fontWeight: '800', marginTop: 4 },
  themeGrid: { gap: 12 },
  themeTile: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4EC',
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    minHeight: 132,
    padding: 16,
  },
  themeTileSoon: { opacity: 0.72 },
  themeDot: { borderRadius: 14, height: 28, width: 28 },
  themeTitle: { color: '#24324C', fontSize: 22, fontWeight: '900' },
  themeSubtitle: { color: '#596270', fontSize: 14, lineHeight: 20 },
  readyBadge: { color: '#23613B', fontSize: 13, fontWeight: '900', marginTop: 4 },
  soonBadge: { color: '#8C5B10', fontSize: 13, fontWeight: '900', marginTop: 4 },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#24324C',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  levelBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  masteryBanner: {
    backgroundColor: '#FFF7E6',
    borderColor: '#F7B733',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  masteryBannerText: { color: '#7B5B00', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  lessonHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  wordPreviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wordPreview: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4EC',
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 12,
    width: '47%',
  },
  previewHindi: { color: '#24324C', fontSize: 24, fontWeight: '900' },
  previewMeta: { color: '#596270', fontSize: 13, fontWeight: '700' },
  previewMeaning: { color: '#7B5B00', fontSize: 13, fontWeight: '800' },
  gameHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: '#24324C', fontSize: 18, fontWeight: '900' },
  soundCard: {
    alignItems: 'center',
    backgroundColor: '#EAF5FB',
    borderColor: '#C8E5F5',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  soundCopy: { flex: 1 },
  instruction: { color: '#24324C', fontSize: 16, fontWeight: '900' },
  promptWord: { color: '#24324C', fontSize: 42, fontWeight: '900', marginTop: 4 },
  promptHelp: { color: '#526070', fontSize: 16, fontWeight: '700' },
  replayHint: { color: '#7B5B00', fontSize: 13, fontWeight: '800', marginTop: 6 },
  feedbackText: { color: '#3F4A5C', fontSize: 15, fontWeight: '800', minHeight: 24 },
  answerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  answerTile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4EC',
    borderRadius: 16,
    borderWidth: 2,
    gap: 4,
    minHeight: 150,
    padding: 12,
    width: '47%',
  },
  answerCorrect: { backgroundColor: '#EFF7F0', borderColor: '#3D9158' },
  answerWrong: { backgroundColor: '#FFF0EB', borderColor: '#E7755F' },
  answerHindi: { color: '#24324C', fontSize: 24, fontWeight: '900' },
  answerMeaning: { color: '#596270', fontSize: 14, fontWeight: '800' },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  memoryCard: {
    alignItems: 'center',
    backgroundColor: '#24324C',
    borderRadius: 16,
    height: 126,
    justifyContent: 'center',
    padding: 10,
    width: '47%',
  },
  memoryCardOpen: { backgroundColor: '#FFFFFF', borderColor: '#DDE4EC', borderWidth: 1 },
  cardBackImage: { borderRadius: 12, height: 64, resizeMode: 'contain', width: 64 },
  memoryLabel: { color: '#24324C', fontSize: 18, fontWeight: '900', marginTop: 6, textAlign: 'center' },
  rewardPanel: {
    alignItems: 'center',
    backgroundColor: '#F7F1DF',
    borderColor: '#E7DDBD',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  rewardBasket: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7DDBD',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    padding: 12,
  },
  progressList: { gap: 10 },
  progressRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4EC',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  progressCopy: { flex: 1 },
  progressHindi: { color: '#24324C', fontSize: 16, fontWeight: '900' },
  progressMeta: { color: '#596270', fontSize: 13, fontWeight: '700' },
  knownPill: {
    backgroundColor: '#DDF0DF',
    borderRadius: 12,
    color: '#23613B',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  practicePill: {
    backgroundColor: '#F7F1DF',
    borderRadius: 12,
    color: '#7B5B00',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mascot: { alignItems: 'center', height: 162, justifyContent: 'center', width: 122 },
  mascotCompact: { height: 92, width: 76 },
  mascotImage: { height: 122, resizeMode: 'contain', width: 122 },
  mascotImageCompact: { height: 72, width: 72 },
  mascotBubble: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4EC',
    borderRadius: 14,
    borderWidth: 1,
    color: '#24324C',
    fontSize: 15,
    fontWeight: '900',
    marginTop: -4,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mascotBubbleCompact: { fontSize: 11, paddingHorizontal: 7, paddingVertical: 3 },
  foodVisual: {
    alignItems: 'center',
    borderColor: 'rgba(36,50,76,0.14)',
    borderRadius: 24,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  foodVisualSmall: { borderRadius: 18, height: 38, width: 38 },
  foodVisualEmoji: { fontSize: 30, lineHeight: 34 },
  foodVisualEmojiSmall: { fontSize: 20, lineHeight: 24 },
});
