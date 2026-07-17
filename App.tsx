import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function speakHindi(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'hi-IN' });
}

type Screen = 'onboarding' | 'home' | 'themes' | 'lesson' | 'match' | 'memory' | 'reward' | 'progress';
type LearnerMode = 'Kid' | 'Adult' | 'Family';
type ItemStatus = 'new' | 'known' | 'practice';

type LessonItem = {
  id: string;
  hindi: string;
  transliteration: string;
  meaning: string;
  theme: string;
  color: string;
  visual: 'drop' | 'glass' | 'mango' | 'bread' | 'rice' | 'swatch';
};

type ThemeId = 'food' | 'colors';

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
};

const foodItems: LessonItem[] = [
  { id: 'paani', hindi: 'पानी', transliteration: 'paani', meaning: 'water', theme: 'Food', color: '#78C6E7', visual: 'drop' },
  { id: 'doodh', hindi: 'दूध', transliteration: 'doodh', meaning: 'milk', theme: 'Food', color: '#F6F1DF', visual: 'glass' },
  { id: 'aam', hindi: 'आम', transliteration: 'aam', meaning: 'mango', theme: 'Food', color: '#F7B733', visual: 'mango' },
  { id: 'roti', hindi: 'रोटी', transliteration: 'roti', meaning: 'flatbread', theme: 'Food', color: '#DFA45B', visual: 'bread' },
  { id: 'chawal', hindi: 'चावल', transliteration: 'chawal', meaning: 'rice', theme: 'Food', color: '#EEE7CF', visual: 'rice' },
];

const colorItems: LessonItem[] = [
  { id: 'laal', hindi: 'लाल', transliteration: 'laal', meaning: 'red', theme: 'Colors', color: '#D64545', visual: 'swatch' },
  { id: 'neela', hindi: 'नीला', transliteration: 'neela', meaning: 'blue', theme: 'Colors', color: '#3E7CB1', visual: 'swatch' },
  { id: 'peela', hindi: 'पीला', transliteration: 'peela', meaning: 'yellow', theme: 'Colors', color: '#F2C230', visual: 'swatch' },
  { id: 'hara', hindi: 'हरा', transliteration: 'hara', meaning: 'green', theme: 'Colors', color: '#4CAF6D', visual: 'swatch' },
  { id: 'kaala', hindi: 'काला', transliteration: 'kaala', meaning: 'black', theme: 'Colors', color: '#3A3A3A', visual: 'swatch' },
];

function itemsForTheme(themeId: ThemeId): LessonItem[] {
  return themeId === 'colors' ? colorItems : foodItems;
}

const themes: Theme[] = [
  { id: 'food', title: 'Food', subtitle: 'Learn tasty everyday words', status: 'ready', color: '#F7B733' },
  { id: 'colors', title: 'Colors', subtitle: 'Paint with Hindi words', status: 'ready', color: '#78C6E7' },
  { id: 'family', title: 'Family', subtitle: 'Words for people at home', status: 'soon', color: '#76B77C' },
  { id: 'sounds', title: 'Starter sounds', subtitle: 'Meet friendly Hindi letters', status: 'soon', color: '#E7755F' },
];

const initialProgress: Progress = Object.fromEntries(
  [...foodItems, ...colorItems].map((item) => [item.id, 'new']),
) as Progress;

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [mode, setMode] = useState<LearnerMode>('Kid');
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [matchIndex, setMatchIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('Tap what you hear.');
  const [matchedCards, setMatchedCards] = useState<string[]>([]);
  const [flippedCards, setFlippedCards] = useState<MemoryCard[]>([]);
  const [earnedReward, setEarnedReward] = useState('Mithu\'s picnic basket');
  const [missedThisLesson, setMissedThisLesson] = useState<string[]>([]);
  const [isReviewRound, setIsReviewRound] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeId>('food');

  const themeItems = itemsForTheme(activeTheme);
  const activeThemeMeta = themes.find((theme) => theme.id === activeTheme);
  const foodLearnedCount = foodItems.filter((item) => progress[item.id] === 'known').length;
  const foodPracticeCount = foodItems.filter((item) => progress[item.id] === 'practice').length;
  const themeLearnedCount = themeItems.filter((item) => progress[item.id] === 'known').length;
  const themePracticeCount = themeItems.filter((item) => progress[item.id] === 'practice').length;
  const roundItems = isReviewRound ? themeItems.filter((item) => missedThisLesson.includes(item.id)) : themeItems;
  const currentItem = roundItems[matchIndex] ?? roundItems[0] ?? themeItems[0];
  const adultSupport = mode !== 'Kid' || showPronunciation;

  const memoryCards = useMemo<MemoryCard[]>(() => {
    const cards: MemoryCard[] = itemsForTheme(activeTheme).slice(0, 4).flatMap((item) => [
      { id: `${item.id}-sound`, itemId: item.id, kind: 'sound', label: item.hindi },
      { id: `${item.id}-meaning`, itemId: item.id, kind: 'meaning', label: item.meaning },
    ]);
    for (let i = cards.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }, [activeTheme]);

  useEffect(() => {
    if (screen === 'match') {
      speakHindi(currentItem.hindi);
    }
  }, [screen, matchIndex, isReviewRound]);

  function startLesson() {
    setMatchIndex(0);
    setAttempts({});
    setSelectedAnswer(null);
    setFeedback('Tap what you hear.');
    setMissedThisLesson([]);
    setIsReviewRound(false);
    setScreen('match');
  }

  function handleMode(nextMode: LearnerMode) {
    setMode(nextMode);
    setShowPronunciation(nextMode !== 'Kid');
  }

  function handleAnswer(itemId: string) {
    const isCorrect = itemId === currentItem.id;
    const nextAttempts = { ...attempts, [currentItem.id]: (attempts[currentItem.id] ?? 0) + 1 };
    setAttempts(nextAttempts);
    setSelectedAnswer(itemId);

    if (!isCorrect) {
      setFeedback('Try again. Mithu will play it once more.');
      setProgress((prev) => ({ ...prev, [currentItem.id]: 'practice' }));
      setMissedThisLesson((prev) => (prev.includes(currentItem.id) ? prev : [...prev, currentItem.id]));
      return;
    }

    setFeedback(`Nice! ${currentItem.hindi} means ${currentItem.meaning}.`);
    setProgress((prev) => ({ ...prev, [currentItem.id]: 'known' }));
    speakHindi(currentItem.hindi);

    setTimeout(() => {
      if (matchIndex < roundItems.length - 1) {
        setMatchIndex((index) => index + 1);
        setSelectedAnswer(null);
        setFeedback('Tap what you hear.');
        return;
      }

      if (!isReviewRound && missedThisLesson.length > 0) {
        setIsReviewRound(true);
        setMatchIndex(0);
        setSelectedAnswer(null);
        setFeedback('Review round: let\'s try those tricky words again.');
        return;
      }

      setSelectedAnswer(null);
      setFeedback('Find the matching pairs.');
      setMatchedCards([]);
      setFlippedCards([]);
      setScreen('memory');
    }, 700);
  }

  function handleCardPress(card: MemoryCard) {
    if (matchedCards.includes(card.itemId) || flippedCards.some((flipped) => flipped.id === card.id)) {
      return;
    }

    if (card.kind === 'sound') {
      speakHindi(card.label);
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
          if (nextMatched.length === 4) {
            setEarnedReward(activeTheme === 'colors' ? 'Mithu\'s color palette' : 'Mithu\'s picnic basket');
            setScreen('reward');
          }
        } else {
          setFeedback('Not yet. Try another pair.');
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
            <Text style={styles.brandSmall}>Hindi Quest</Text>
            <Pressable style={styles.topLink} onPress={() => setScreen('progress')} accessibilityRole="button">
              <Text style={styles.topLinkText}>Progress</Text>
            </Pressable>
          </View>
        ) : null}

        {screen === 'onboarding' && (
          <ScreenShell>
            <View style={styles.heroRow}>
              <MithuParrot mood="hello" />
              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>Meet Mithu</Text>
                <Text style={styles.title}>Hindi Quest</Text>
                <Text style={styles.subtitle}>Learn Hindi through quick, happy games.</Text>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Who is playing?</Text>
              <View style={styles.segmentRow}>
                {(['Kid', 'Adult', 'Family'] as LearnerMode[]).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => handleMode(option)}
                    style={[styles.segment, mode === option && styles.segmentActive]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.segmentText, mode === option && styles.segmentTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>

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

              <Text style={styles.helperText}>Turn sound on. Mithu will say each Hindi word.</Text>
              <PrimaryButton label="Start" onPress={() => setScreen('home')} />
            </View>
          </ScreenShell>
        )}

        {screen === 'home' && (
          <ScreenShell>
            <View style={styles.homeHero}>
              <View style={styles.heroCopyWide}>
                <Text style={styles.kicker}>Ready for a quick Hindi game?</Text>
                <Text style={styles.title}>Play the Food lesson</Text>
                <Text style={styles.subtitle}>Hear Hindi, tap the right tile, and help Mithu pack a picnic.</Text>
              </View>
              <MithuParrot mood="ready" />
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
            <Text style={styles.title}>Pick a theme</Text>
            <Text style={styles.subtitle}>Start with Food, then unlock more Hindi worlds.</Text>
            <View style={styles.themeGrid}>
              {themes.map((theme) => {
                const items = theme.status === 'ready' ? itemsForTheme(theme.id as ThemeId) : [];
                const learned = items.filter((item) => progress[item.id] === 'known').length;
                return (
                  <Pressable
                    key={theme.id}
                    style={[styles.themeTile, theme.status === 'soon' && styles.themeTileSoon]}
                    onPress={() => {
                      if (theme.status !== 'ready') return;
                      setActiveTheme(theme.id as ThemeId);
                      setScreen('lesson');
                    }}
                    accessibilityRole="button"
                  >
                    <View style={[styles.themeDot, { backgroundColor: theme.color }]} />
                    <Text style={styles.themeTitle}>{theme.title}</Text>
                    <Text style={styles.themeSubtitle}>{theme.subtitle}</Text>
                    <Text style={theme.status === 'ready' ? styles.readyBadge : styles.soonBadge}>
                      {theme.status === 'ready' ? `${learned}/${items.length} learned` : 'Coming soon'}
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
                <Text style={styles.title}>Learn {themeItems.length} Hindi words</Text>
              </View>
              <MithuParrot mood="ready" compact />
            </View>
            <Text style={styles.subtitle}>Tap a word to hear it. Then Mithu will quiz you.</Text>
            <View style={styles.wordPreviewGrid}>
              {themeItems.map((item) => (
                <WordPreview key={item.id} item={item} showPronunciation={adultSupport} onPress={() => speakHindi(item.hindi)} />
              ))}
            </View>
            <PrimaryButton label="Play" onPress={startLesson} />
            <SecondaryButton label="Back to themes" onPress={() => setScreen('themes')} />
          </ScreenShell>
        )}

        {screen === 'match' && (
          <ScreenShell>
            <View style={styles.gameHeader}>
              <Text style={styles.progressText}>{matchIndex + 1}/{roundItems.length}</Text>
              <Text style={styles.kicker}>{isReviewRound ? 'Review round' : 'Match and Listen'}</Text>
            </View>
            <Pressable
              style={styles.soundCard}
              onPress={() => speakHindi(currentItem.hindi)}
              accessibilityRole="button"
              accessibilityLabel="Replay the Hindi word"
            >
              <MithuParrot mood="speak" compact />
              <View style={styles.soundCopy}>
                <Text style={styles.instruction}>Tap what you hear.</Text>
                <Text style={styles.promptWord}>{currentItem.hindi}</Text>
                {adultSupport ? <Text style={styles.promptHelp}>{currentItem.transliteration}</Text> : null}
                <Text style={styles.replayHint}>Tap to hear again</Text>
              </View>
            </Pressable>
            <Text style={styles.feedbackText}>{feedback}</Text>
            <View style={styles.answerGrid}>
              {themeItems.map((item) => {
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
                    <Text style={styles.answerHindi}>{item.hindi}</Text>
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
                      <Text style={styles.cardBack}>मि</Text>
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
              <MithuParrot mood="happy" />
              <Text style={styles.title}>You learned Hindi!</Text>
              <Text style={styles.subtitle}>{themeItems.length} words practiced. Unlocked: {earnedReward}.</Text>
              <View style={styles.rewardBasket}>
                {themeItems.slice(0, 4).map((item) => (
                  <FoodVisual key={item.id} item={item} small />
                ))}
              </View>
            </View>
            <PrimaryButton label="Play next" onPress={() => setScreen('themes')} />
            <SecondaryButton label="See progress" onPress={() => setScreen('progress')} />
          </ScreenShell>
        )}

        {screen === 'progress' && (
          <ScreenShell>
            <Text style={styles.title}>Your Hindi progress</Text>
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
                    <Text style={styles.progressHindi}>{item.hindi} · {item.meaning}</Text>
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
    <Pressable style={styles.wordPreview} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Hear ${item.hindi}`}>
      <FoodVisual item={item} />
      <Text style={styles.previewHindi}>{item.hindi}</Text>
      {showPronunciation ? <Text style={styles.previewMeta}>{item.transliteration}</Text> : null}
      <Text style={styles.previewMeaning}>{item.meaning}</Text>
    </Pressable>
  );
}

function MithuParrot({ compact = false, mood }: { compact?: boolean; mood: 'hello' | 'ready' | 'speak' | 'happy' }) {
  return (
    <View style={[styles.mithu, compact && styles.mithuCompact]}>
      <View style={[styles.mithuWing, compact && styles.mithuWingCompact]} />
      <View style={[styles.mithuBody, compact && styles.mithuBodyCompact]}>
        <View style={[styles.mithuFace, compact && styles.mithuFaceCompact]}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
        <View style={[styles.beak, compact && styles.beakCompact]} />
        <View style={[styles.cheek, mood === 'happy' && styles.cheekHappy]} />
      </View>
      <Text style={[styles.mithuBubble, compact && styles.mithuBubbleCompact]}>
        {mood === 'hello' ? 'नमस्ते' : mood === 'speak' ? 'सुनो' : mood === 'happy' ? 'शाबाश' : 'चलो'}
      </Text>
    </View>
  );
}

function FoodVisual({ item, small = false }: { item: LessonItem; small?: boolean }) {
  return (
    <View style={[styles.foodVisual, small && styles.foodVisualSmall, { backgroundColor: item.color }]}>
      {item.visual === 'drop' ? <View style={[styles.dropShape, small && styles.dropShapeSmall]} /> : null}
      {item.visual === 'glass' ? <View style={[styles.glassShape, small && styles.glassShapeSmall]} /> : null}
      {item.visual === 'mango' ? <View style={[styles.mangoShape, small && styles.mangoShapeSmall]} /> : null}
      {item.visual === 'bread' ? <View style={[styles.breadShape, small && styles.breadShapeSmall]} /> : null}
      {item.visual === 'rice' ? <View style={[styles.riceShape, small && styles.riceShapeSmall]} /> : null}
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
  cardBack: { color: '#F7B733', fontSize: 36, fontWeight: '900' },
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
  mithu: { alignItems: 'center', height: 162, justifyContent: 'center', width: 122 },
  mithuCompact: { height: 92, width: 76 },
  mithuWing: {
    backgroundColor: '#2F8F6A',
    borderRadius: 34,
    height: 70,
    left: 10,
    position: 'absolute',
    top: 62,
    transform: [{ rotate: '-16deg' }],
    width: 52,
  },
  mithuWingCompact: { borderRadius: 20, height: 42, top: 38, width: 30 },
  mithuBody: {
    alignItems: 'center',
    backgroundColor: '#76B77C',
    borderColor: '#23613B',
    borderRadius: 48,
    borderWidth: 2,
    height: 104,
    justifyContent: 'center',
    width: 88,
  },
  mithuBodyCompact: { borderRadius: 30, height: 64, width: 54 },
  mithuFace: {
    alignItems: 'center',
    backgroundColor: '#BCE0A7',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 12,
    height: 40,
    justifyContent: 'center',
    width: 58,
  },
  mithuFaceCompact: { borderRadius: 14, gap: 7, height: 25, width: 36 },
  eye: { backgroundColor: '#24324C', borderRadius: 5, height: 8, width: 8 },
  beak: {
    backgroundColor: '#F7B733',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    height: 18,
    marginTop: -2,
    width: 28,
  },
  beakCompact: { height: 10, width: 17 },
  cheek: { backgroundColor: '#E7755F', borderRadius: 8, height: 10, marginTop: 5, opacity: 0.8, width: 18 },
  cheekHappy: { width: 28 },
  mithuBubble: {
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
  mithuBubbleCompact: { fontSize: 11, paddingHorizontal: 7, paddingVertical: 3 },
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
  dropShape: { backgroundColor: '#1E7DAD', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, borderTopLeftRadius: 16, height: 34, transform: [{ rotate: '45deg' }], width: 34 },
  dropShapeSmall: { height: 22, width: 22 },
  glassShape: { backgroundColor: '#FFFFFF', borderColor: '#78C6E7', borderRadius: 8, borderWidth: 3, height: 34, width: 24 },
  glassShapeSmall: { borderRadius: 6, height: 22, width: 16 },
  mangoShape: { backgroundColor: '#F28C28', borderBottomLeftRadius: 22, borderBottomRightRadius: 18, borderTopLeftRadius: 18, borderTopRightRadius: 22, height: 36, transform: [{ rotate: '-15deg' }], width: 28 },
  mangoShapeSmall: { height: 24, width: 19 },
  breadShape: { backgroundColor: '#B9780D', borderRadius: 20, height: 34, width: 42 },
  breadShapeSmall: { height: 22, width: 27 },
  riceShape: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, borderColor: '#D7CBA9', borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 2, height: 30, width: 42 },
  riceShapeSmall: { height: 20, width: 27 },
});
