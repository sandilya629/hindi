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
const REACTION_PAUSE_MS = 1800;
// Raised alongside the slower rates below so this safety-net timeout (for
// devices with no voice installed) doesn't fire before normal, slow speech
// actually finishes on a working device.
const MAX_SPEECH_WAIT_MS = 5500;
// Tuned down a third time after feedback that words were being cut short
// mid-syllable (e.g. "doodh" clipping to "doo") — parents want the whole
// word fully sounded out, not just faster recognition.
const SPEECH_RATE = 0.32;
// Single letters/sounds get an even slower rate so the one utterance is
// stretched out and easy to sound along with, instead of being repeated.
const SOUND_SPEECH_RATE = 0.22;
// Themes with more than this many words (Numbers, Starter sounds have 10)
// still only show this many answer tiles per question — a toddler scanning
// a wall of tiles for the right one loses more than they gain from extra
// distractors. The correct tile is always included.
const ANSWER_OPTIONS_CAP = 6;

type LanguageId = 'hi' | 'ta';

const languageVoiceCode: Record<LanguageId, string> = {
  hi: 'hi-IN',
  ta: 'ta-IN',
};

function speakWord(text: string, language: LanguageId, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: languageVoiceCode[language],
    rate: text.length <= 1 ? SOUND_SPEECH_RATE : SPEECH_RATE,
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

function buildAnswerOptions(correctItem: LessonItem, pool: LessonItem[], cap: number): LessonItem[] {
  const distractors = shuffleItems(pool.filter((item) => item.id !== correctItem.id)).slice(0, Math.max(cap - 1, 0));
  return shuffleItems([correctItem, ...distractors]);
}

type Screen = 'onboarding' | 'home' | 'themes' | 'lesson' | 'match' | 'memory' | 'opposite' | 'reward' | 'progress';
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
  // Id of this item's opposite within the same theme/language. Only set on
  // Opposites/Opposites Two items — powers the "Find the Opposite" game.
  oppositeId?: string;
};

type ThemeId = 'food' | 'colors' | 'opposites' | 'opposites2' | 'family' | 'sounds' | 'animals' | 'numbers' | 'body' | 'clothes' | 'transport' | 'places' | 'school';

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

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilFoodItems: LessonItem[] = [
  { id: 'thanneer', word: 'தண்ணீர்', language: 'ta', transliteration: 'thanneer', meaning: 'water', theme: 'Food', color: '#78C6E7', emoji: '💧' },
  { id: 'paal', word: 'பால்', language: 'ta', transliteration: 'paal', meaning: 'milk', theme: 'Food', color: '#F6F1DF', emoji: '🥛' },
  { id: 'maampazham', word: 'மாம்பழம்', language: 'ta', transliteration: 'maampazham', meaning: 'mango', theme: 'Food', color: '#F7B733', emoji: '🥭' },
  { id: 'rotti', word: 'ரொட்டி', language: 'ta', transliteration: 'rotti', meaning: 'flatbread', theme: 'Food', color: '#DFA45B', emoji: '🫓' },
  { id: 'arisi', word: 'அரிசி', language: 'ta', transliteration: 'arisi', meaning: 'rice', theme: 'Food', color: '#EEE7CF', emoji: '🍚' },
  { id: 'vaazhaipazham', word: 'வாழைப்பழம்', language: 'ta', transliteration: 'vaazhaipazham', meaning: 'banana', theme: 'Food', color: '#F5DE6E', emoji: '🍌' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilColorItems: LessonItem[] = [
  { id: 'sivappu', word: 'சிவப்பு', language: 'ta', transliteration: 'sivappu', meaning: 'red', theme: 'Colors', color: '#D64545', emoji: '🔴' },
  { id: 'neelam', word: 'நீலம்', language: 'ta', transliteration: 'neelam', meaning: 'blue', theme: 'Colors', color: '#3E7CB1', emoji: '🔵' },
  { id: 'manjal', word: 'மஞ்சள்', language: 'ta', transliteration: 'manjal', meaning: 'yellow', theme: 'Colors', color: '#F2C230', emoji: '🟡' },
  { id: 'pachai', word: 'பச்சை', language: 'ta', transliteration: 'pachai', meaning: 'green', theme: 'Colors', color: '#4CAF6D', emoji: '🟢' },
  { id: 'karuppu', word: 'கருப்பு', language: 'ta', transliteration: 'karuppu', meaning: 'black', theme: 'Colors', color: '#3A3A3A', emoji: '⚫' },
];

const colorItems: LessonItem[] = [
  { id: 'laal', word: 'लाल', language: 'hi', transliteration: 'laal', meaning: 'red', theme: 'Colors', color: '#D64545', emoji: '🔴' },
  { id: 'neela', word: 'नीला', language: 'hi', transliteration: 'neela', meaning: 'blue', theme: 'Colors', color: '#3E7CB1', emoji: '🔵' },
  { id: 'peela', word: 'पीला', language: 'hi', transliteration: 'peela', meaning: 'yellow', theme: 'Colors', color: '#F2C230', emoji: '🟡' },
  { id: 'hara', word: 'हरा', language: 'hi', transliteration: 'hara', meaning: 'green', theme: 'Colors', color: '#4CAF6D', emoji: '🟢' },
  { id: 'kaala', word: 'काला', language: 'hi', transliteration: 'kaala', meaning: 'black', theme: 'Colors', color: '#3A3A3A', emoji: '⚫' },
];

const oppositeItems: LessonItem[] = [
  { id: 'din', word: 'दिन', language: 'hi', transliteration: 'din', meaning: 'day', theme: 'Opposites', color: '#F7D488', emoji: '☀️', oppositeId: 'raat' },
  { id: 'raat', word: 'रात', language: 'hi', transliteration: 'raat', meaning: 'night', theme: 'Opposites', color: '#5D6D9E', emoji: '🌙', oppositeId: 'din' },
  { id: 'garam', word: 'गरम', language: 'hi', transliteration: 'garam', meaning: 'hot', theme: 'Opposites', color: '#E86A5A', emoji: '🔥', oppositeId: 'thanda' },
  { id: 'thanda', word: 'ठंडा', language: 'hi', transliteration: 'thanda', meaning: 'cold', theme: 'Opposites', color: '#A8DCE8', emoji: '❄️', oppositeId: 'garam' },
  { id: 'oopar', word: 'ऊपर', language: 'hi', transliteration: 'oopar', meaning: 'up', theme: 'Opposites', color: '#8FC4E8', emoji: '⬆️', oppositeId: 'neeche' },
  { id: 'neeche', word: 'नीचे', language: 'hi', transliteration: 'neeche', meaning: 'down', theme: 'Opposites', color: '#A8C48A', emoji: '⬇️', oppositeId: 'oopar' },
  { id: 'bada', word: 'बड़ा', language: 'hi', transliteration: 'bada', meaning: 'big', theme: 'Opposites', color: '#A8B4C0', emoji: '🐘', oppositeId: 'chota' },
  { id: 'chota', word: 'छोटा', language: 'hi', transliteration: 'chota', meaning: 'small', theme: 'Opposites', color: '#E8C9A0', emoji: '🐜', oppositeId: 'bada' },
  { id: 'khush', word: 'खुश', language: 'hi', transliteration: 'khush', meaning: 'happy', theme: 'Opposites', color: '#F2C230', emoji: '😊', oppositeId: 'udaas' },
  { id: 'udaas', word: 'उदास', language: 'hi', transliteration: 'udaas', meaning: 'sad', theme: 'Opposites', color: '#8FA0B8', emoji: '😢', oppositeId: 'khush' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilOppositeItems: LessonItem[] = [
  { id: 'pagal', word: 'பகல்', language: 'ta', transliteration: 'pagal', meaning: 'day', theme: 'Opposites', color: '#F7D488', emoji: '☀️', oppositeId: 'iravu' },
  { id: 'iravu', word: 'இரவு', language: 'ta', transliteration: 'iravu', meaning: 'night', theme: 'Opposites', color: '#5D6D9E', emoji: '🌙', oppositeId: 'pagal' },
  { id: 'soodu', word: 'சூடு', language: 'ta', transliteration: 'soodu', meaning: 'hot', theme: 'Opposites', color: '#E86A5A', emoji: '🔥', oppositeId: 'kulir' },
  { id: 'kulir', word: 'குளிர்', language: 'ta', transliteration: 'kulir', meaning: 'cold', theme: 'Opposites', color: '#A8DCE8', emoji: '❄️', oppositeId: 'soodu' },
  { id: 'mele', word: 'மேலே', language: 'ta', transliteration: 'mele', meaning: 'up', theme: 'Opposites', color: '#8FC4E8', emoji: '⬆️', oppositeId: 'keezhe' },
  { id: 'keezhe', word: 'கீழே', language: 'ta', transliteration: 'keezhe', meaning: 'down', theme: 'Opposites', color: '#A8C48A', emoji: '⬇️', oppositeId: 'mele' },
  { id: 'periya', word: 'பெரிய', language: 'ta', transliteration: 'periya', meaning: 'big', theme: 'Opposites', color: '#A8B4C0', emoji: '🐘', oppositeId: 'siriya' },
  { id: 'siriya', word: 'சிறிய', language: 'ta', transliteration: 'siriya', meaning: 'small', theme: 'Opposites', color: '#E8C9A0', emoji: '🐜', oppositeId: 'periya' },
  { id: 'santhosham', word: 'சந்தோஷம்', language: 'ta', transliteration: 'santhosham', meaning: 'happy', theme: 'Opposites', color: '#F2C230', emoji: '😊', oppositeId: 'sokam' },
  { id: 'sokam', word: 'சோகம்', language: 'ta', transliteration: 'sokam', meaning: 'sad', theme: 'Opposites', color: '#8FA0B8', emoji: '😢', oppositeId: 'santhosham' },
];

const oppositeTwoItems: LessonItem[] = [
  { id: 'aao', word: 'आओ', language: 'hi', transliteration: 'aao', meaning: 'come', theme: 'Opposites Two', color: '#8FC4E8', emoji: '👋', oppositeId: 'jaao' },
  { id: 'jaao', word: 'जाओ', language: 'hi', transliteration: 'jaao', meaning: 'go', theme: 'Opposites Two', color: '#A8C48A', emoji: '🚶', oppositeId: 'aao' },
  { id: 'baitho', word: 'बैठो', language: 'hi', transliteration: 'baitho', meaning: 'sit down', theme: 'Opposites Two', color: '#D9A45C', emoji: '🪑', oppositeId: 'utho' },
  { id: 'utho', word: 'उठो', language: 'hi', transliteration: 'utho', meaning: 'get up', theme: 'Opposites Two', color: '#F2C230', emoji: '🧍', oppositeId: 'baitho' },
  { id: 'shuru', word: 'शुरू', language: 'hi', transliteration: 'shuru', meaning: 'start', theme: 'Opposites Two', color: '#6EC67E', emoji: '▶️', oppositeId: 'ruko' },
  { id: 'ruko', word: 'रुको', language: 'hi', transliteration: 'ruko', meaning: 'stop', theme: 'Opposites Two', color: '#E86A5A', emoji: '✋', oppositeId: 'shuru' },
  { id: 'yahaan', word: 'यहाँ', language: 'hi', transliteration: 'yahaan', meaning: 'here', theme: 'Opposites Two', color: '#E85D8A', emoji: '📍', oppositeId: 'vahaan' },
  { id: 'vahaan', word: 'वहाँ', language: 'hi', transliteration: 'vahaan', meaning: 'there', theme: 'Opposites Two', color: '#8FA0D9', emoji: '👉', oppositeId: 'yahaan' },
  { id: 'aage', word: 'आगे', language: 'hi', transliteration: 'aage', meaning: 'front', theme: 'Opposites Two', color: '#5D8AA8', emoji: '➡️', oppositeId: 'peeche' },
  { id: 'peeche', word: 'पीछे', language: 'hi', transliteration: 'peeche', meaning: 'back', theme: 'Opposites Two', color: '#A8B4C0', emoji: '⬅️', oppositeId: 'aage' },
  { id: 'kholo', word: 'खोलो', language: 'hi', transliteration: 'kholo', meaning: 'open', theme: 'Opposites Two', color: '#F2D06B', emoji: '📂', oppositeId: 'bandkaro' },
  { id: 'bandkaro', word: 'बंद करो', language: 'hi', transliteration: 'band karo', meaning: 'close', theme: 'Opposites Two', color: '#C9A0E0', emoji: '📁', oppositeId: 'kholo' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilOppositeTwoItems: LessonItem[] = [
  { id: 'vaa', word: 'வா', language: 'ta', transliteration: 'vaa', meaning: 'come', theme: 'Opposites Two', color: '#8FC4E8', emoji: '👋', oppositeId: 'po' },
  { id: 'po', word: 'போ', language: 'ta', transliteration: 'po', meaning: 'go', theme: 'Opposites Two', color: '#A8C48A', emoji: '🚶', oppositeId: 'vaa' },
  { id: 'utkaaru', word: 'உட்காரு', language: 'ta', transliteration: 'utkaaru', meaning: 'sit down', theme: 'Opposites Two', color: '#D9A45C', emoji: '🪑', oppositeId: 'ezhundhiru' },
  { id: 'ezhundhiru', word: 'எழுந்திரு', language: 'ta', transliteration: 'ezhundhiru', meaning: 'get up', theme: 'Opposites Two', color: '#F2C230', emoji: '🧍', oppositeId: 'utkaaru' },
  { id: 'thodangu', word: 'தொடங்கு', language: 'ta', transliteration: 'thodangu', meaning: 'start', theme: 'Opposites Two', color: '#6EC67E', emoji: '▶️', oppositeId: 'nil' },
  { id: 'nil', word: 'நில்', language: 'ta', transliteration: 'nil', meaning: 'stop', theme: 'Opposites Two', color: '#E86A5A', emoji: '✋', oppositeId: 'thodangu' },
  { id: 'inge', word: 'இங்கே', language: 'ta', transliteration: 'inge', meaning: 'here', theme: 'Opposites Two', color: '#E85D8A', emoji: '📍', oppositeId: 'ange' },
  { id: 'ange', word: 'அங்கே', language: 'ta', transliteration: 'ange', meaning: 'there', theme: 'Opposites Two', color: '#8FA0D9', emoji: '👉', oppositeId: 'inge' },
  { id: 'munne', word: 'முன்னே', language: 'ta', transliteration: 'munne', meaning: 'front', theme: 'Opposites Two', color: '#5D8AA8', emoji: '➡️', oppositeId: 'pinne' },
  { id: 'pinne', word: 'பின்னே', language: 'ta', transliteration: 'pinne', meaning: 'back', theme: 'Opposites Two', color: '#A8B4C0', emoji: '⬅️', oppositeId: 'munne' },
  { id: 'thira', word: 'திற', language: 'ta', transliteration: 'thira', meaning: 'open', theme: 'Opposites Two', color: '#F2D06B', emoji: '📂', oppositeId: 'moodu' },
  { id: 'moodu', word: 'மூடு', language: 'ta', transliteration: 'moodu', meaning: 'close', theme: 'Opposites Two', color: '#C9A0E0', emoji: '📁', oppositeId: 'thira' },
];

const familyItems: LessonItem[] = [
  { id: 'maa', word: 'माँ', language: 'hi', transliteration: 'maa', meaning: 'mother', theme: 'Family', color: '#F4B8C4', emoji: '👩' },
  { id: 'pita', word: 'पिता', language: 'hi', transliteration: 'pita', meaning: 'father', theme: 'Family', color: '#8FB8DE', emoji: '👨' },
  { id: 'bhai', word: 'भाई', language: 'hi', transliteration: 'bhai', meaning: 'brother', theme: 'Family', color: '#A8D8B9', emoji: '👦' },
  { id: 'bahan', word: 'बहन', language: 'hi', transliteration: 'bahan', meaning: 'sister', theme: 'Family', color: '#F7D488', emoji: '👧' },
  { id: 'baccha', word: 'बच्चा', language: 'hi', transliteration: 'baccha', meaning: 'child', theme: 'Family', color: '#C9B8E8', emoji: '👶' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilFamilyItems: LessonItem[] = [
  { id: 'amma', word: 'அம்மா', language: 'ta', transliteration: 'amma', meaning: 'mother', theme: 'Family', color: '#F4B8C4', emoji: '👩' },
  { id: 'appa', word: 'அப்பா', language: 'ta', transliteration: 'appa', meaning: 'father', theme: 'Family', color: '#8FB8DE', emoji: '👨' },
  { id: 'annan', word: 'அண்ணன்', language: 'ta', transliteration: 'annan', meaning: 'brother', theme: 'Family', color: '#A8D8B9', emoji: '👦' },
  { id: 'akka', word: 'அக்கா', language: 'ta', transliteration: 'akka', meaning: 'sister', theme: 'Family', color: '#F7D488', emoji: '👧' },
  { id: 'kuzhandhai', word: 'குழந்தை', language: 'ta', transliteration: 'kuzhandhai', meaning: 'child', theme: 'Family', color: '#C9B8E8', emoji: '👶' },
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

const animalItems: LessonItem[] = [
  { id: 'kutta', word: 'कुत्ता', language: 'hi', transliteration: 'kutta', meaning: 'dog', theme: 'Animals', color: '#D4A574', emoji: '🐶' },
  { id: 'billi', word: 'बिल्ली', language: 'hi', transliteration: 'billi', meaning: 'cat', theme: 'Animals', color: '#E8C9A0', emoji: '🐱' },
  { id: 'haathi', word: 'हाथी', language: 'hi', transliteration: 'haathi', meaning: 'elephant', theme: 'Animals', color: '#A8B4C0', emoji: '🐘' },
  { id: 'sher', word: 'शेर', language: 'hi', transliteration: 'sher', meaning: 'lion', theme: 'Animals', color: '#F2B84B', emoji: '🦁' },
  { id: 'khargosh', word: 'खरगोश', language: 'hi', transliteration: 'khargosh', meaning: 'rabbit', theme: 'Animals', color: '#EAD9E8', emoji: '🐰' },
  { id: 'chidiya', word: 'चिड़िया', language: 'hi', transliteration: 'chidiya', meaning: 'bird', theme: 'Animals', color: '#8FD0C4', emoji: '🐦' },
];

const numberItems: LessonItem[] = [
  { id: 'ek', word: 'एक', language: 'hi', transliteration: 'ek', meaning: '1', theme: 'Numbers', color: '#9B8FD9', emoji: '1️⃣' },
  { id: 'do', word: 'दो', language: 'hi', transliteration: 'do', meaning: '2', theme: 'Numbers', color: '#8FA0D9', emoji: '2️⃣' },
  { id: 'teen', word: 'तीन', language: 'hi', transliteration: 'teen', meaning: '3', theme: 'Numbers', color: '#8FB8D9', emoji: '3️⃣' },
  { id: 'chaar', word: 'चार', language: 'hi', transliteration: 'chaar', meaning: '4', theme: 'Numbers', color: '#8FCCD9', emoji: '4️⃣' },
  { id: 'paanch', word: 'पाँच', language: 'hi', transliteration: 'paanch', meaning: '5', theme: 'Numbers', color: '#8FD9CC', emoji: '5️⃣' },
  { id: 'chhah', word: 'छह', language: 'hi', transliteration: 'chhah', meaning: '6', theme: 'Numbers', color: '#A0D98F', emoji: '6️⃣' },
  { id: 'saat', word: 'सात', language: 'hi', transliteration: 'saat', meaning: '7', theme: 'Numbers', color: '#D9CC8F', emoji: '7️⃣' },
  { id: 'aath', word: 'आठ', language: 'hi', transliteration: 'aath', meaning: '8', theme: 'Numbers', color: '#D9A88F', emoji: '8️⃣' },
  { id: 'nau', word: 'नौ', language: 'hi', transliteration: 'nau', meaning: '9', theme: 'Numbers', color: '#D98FA0', emoji: '9️⃣' },
  { id: 'das', word: 'दस', language: 'hi', transliteration: 'das', meaning: '10', theme: 'Numbers', color: '#C08FD9', emoji: '🔟' },
];

const bodyItems: LessonItem[] = [
  { id: 'aankh', word: 'आँख', language: 'hi', transliteration: 'aankh', meaning: 'eye', theme: 'Body', color: '#F2A6C4', emoji: '👁️' },
  { id: 'naak', word: 'नाक', language: 'hi', transliteration: 'naak', meaning: 'nose', theme: 'Body', color: '#F7C6D9', emoji: '👃' },
  { id: 'kaan', word: 'कान', language: 'hi', transliteration: 'kaan', meaning: 'ear', theme: 'Body', color: '#F2B8CC', emoji: '👂' },
  { id: 'haath', word: 'हाथ', language: 'hi', transliteration: 'haath', meaning: 'hand', theme: 'Body', color: '#EDA6D4', emoji: '✋' },
  { id: 'pair', word: 'पैर', language: 'hi', transliteration: 'pair', meaning: 'foot', theme: 'Body', color: '#E8A6E0', emoji: '🦶' },
  { id: 'munh', word: 'मुँह', language: 'hi', transliteration: 'munh', meaning: 'mouth', theme: 'Body', color: '#F2A6AC', emoji: '👄' },
];

const clothesItems: LessonItem[] = [
  { id: 'shirt', word: 'शर्ट', language: 'hi', transliteration: 'shirt', meaning: 'shirt', theme: 'Clothes', color: '#89C4E1', emoji: '👕' },
  { id: 'pant', word: 'पैंट', language: 'hi', transliteration: 'pant', meaning: 'pants', theme: 'Clothes', color: '#5B7C99', emoji: '👖' },
  { id: 'topi', word: 'टोपी', language: 'hi', transliteration: 'topi', meaning: 'hat', theme: 'Clothes', color: '#E8B04B', emoji: '🧢' },
  { id: 'joote', word: 'जूते', language: 'hi', transliteration: 'joote', meaning: 'shoes', theme: 'Clothes', color: '#8B6F47', emoji: '👟' },
  { id: 'moze', word: 'मोज़े', language: 'hi', transliteration: 'moze', meaning: 'socks', theme: 'Clothes', color: '#E88AA8', emoji: '🧦' },
  { id: 'saari', word: 'साड़ी', language: 'hi', transliteration: 'saari', meaning: 'saree', theme: 'Clothes', color: '#D64545', emoji: '🥻' },
];

const transportItems: LessonItem[] = [
  { id: 'kaar', word: 'कार', language: 'hi', transliteration: 'kaar', meaning: 'car', theme: 'Transport', color: '#E85D5D', emoji: '🚗' },
  { id: 'bas', word: 'बस', language: 'hi', transliteration: 'bas', meaning: 'bus', theme: 'Transport', color: '#F2C230', emoji: '🚌' },
  { id: 'train', word: 'ट्रेन', language: 'hi', transliteration: 'train', meaning: 'train', theme: 'Transport', color: '#5B8AA6', emoji: '🚂' },
  { id: 'vimaan', word: 'विमान', language: 'hi', transliteration: 'vimaan', meaning: 'airplane', theme: 'Transport', color: '#A8C4E0', emoji: '✈️' },
  { id: 'saaikil', word: 'साइकिल', language: 'hi', transliteration: 'saaikil', meaning: 'bicycle', theme: 'Transport', color: '#7FC77E', emoji: '🚲' },
  { id: 'naav', word: 'नाव', language: 'hi', transliteration: 'naav', meaning: 'boat', theme: 'Transport', color: '#6EC6DE', emoji: '⛵' },
];

const placeItems: LessonItem[] = [
  { id: 'ghar', word: 'घर', language: 'hi', transliteration: 'ghar', meaning: 'home', theme: 'Places', color: '#F2C879', emoji: '🏠' },
  { id: 'baazaar', word: 'बाज़ार', language: 'hi', transliteration: 'baazaar', meaning: 'market', theme: 'Places', color: '#E8935A', emoji: '🏪' },
  { id: 'aspataal', word: 'अस्पताल', language: 'hi', transliteration: 'aspataal', meaning: 'hospital', theme: 'Places', color: '#E86A6A', emoji: '🏥' },
  { id: 'mandir', word: 'मंदिर', language: 'hi', transliteration: 'mandir', meaning: 'temple', theme: 'Places', color: '#D9A45C', emoji: '🛕' },
  { id: 'park', word: 'पार्क', language: 'hi', transliteration: 'park', meaning: 'park', theme: 'Places', color: '#7FC77E', emoji: '🏞️' },
  { id: 'sadak', word: 'सड़क', language: 'hi', transliteration: 'sadak', meaning: 'road', theme: 'Places', color: '#8A8A8A', emoji: '🛣️' },
];

const schoolItems: LessonItem[] = [
  { id: 'kitaab', word: 'किताब', language: 'hi', transliteration: 'kitaab', meaning: 'book', theme: 'School', color: '#6EA8D9', emoji: '📖' },
  { id: 'pencil', word: 'पेंसिल', language: 'hi', transliteration: 'pencil', meaning: 'pencil', theme: 'School', color: '#F2C230', emoji: '✏️' },
  { id: 'basta', word: 'बस्ता', language: 'hi', transliteration: 'basta', meaning: 'school bag', theme: 'School', color: '#E86A6A', emoji: '🎒' },
  { id: 'kalam', word: 'कलम', language: 'hi', transliteration: 'kalam', meaning: 'pen', theme: 'School', color: '#4A9D8F', emoji: '🖊️' },
  { id: 'scale', word: 'स्केल', language: 'hi', transliteration: 'scale', meaning: 'ruler', theme: 'School', color: '#F2A64B', emoji: '📏' },
  { id: 'copy', word: 'कॉपी', language: 'hi', transliteration: 'copy', meaning: 'notebook', theme: 'School', color: '#8E7CC3', emoji: '📓' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families. IDs are prefixed (ta_*) since the transliterations
// match Hindi's sound ids and would otherwise collide in shared progress.
const tamilSoundItems: LessonItem[] = [
  { id: 'ta_a', word: 'அ', language: 'ta', transliteration: 'a', meaning: 'sound "a"', theme: 'Starter sounds', color: '#F7B733', emoji: 'அ' },
  { id: 'ta_aa', word: 'ஆ', language: 'ta', transliteration: 'aa', meaning: 'sound "aa"', theme: 'Starter sounds', color: '#6EC6DE', emoji: 'ஆ' },
  { id: 'ta_ka', word: 'க', language: 'ta', transliteration: 'ka', meaning: 'sound "ka"', theme: 'Starter sounds', color: '#7FC77E', emoji: 'க' },
  { id: 'ta_ma', word: 'ம', language: 'ta', transliteration: 'ma', meaning: 'sound "ma"', theme: 'Starter sounds', color: '#E88A73', emoji: 'ம' },
  { id: 'ta_pa', word: 'ப', language: 'ta', transliteration: 'pa', meaning: 'sound "pa"', theme: 'Starter sounds', color: '#C9A0E0', emoji: 'ப' },
  { id: 'ta_na', word: 'ந', language: 'ta', transliteration: 'na', meaning: 'sound "na"', theme: 'Starter sounds', color: '#F2D06B', emoji: 'ந' },
  { id: 'ta_ra', word: 'ர', language: 'ta', transliteration: 'ra', meaning: 'sound "ra"', theme: 'Starter sounds', color: '#8FD0C4', emoji: 'ர' },
  { id: 'ta_la', word: 'ல', language: 'ta', transliteration: 'la', meaning: 'sound "la"', theme: 'Starter sounds', color: '#F0A8C0', emoji: 'ல' },
  { id: 'ta_sa', word: 'ஸ', language: 'ta', transliteration: 'sa', meaning: 'sound "sa"', theme: 'Starter sounds', color: '#A8B8E0', emoji: 'ஸ' },
  { id: 'ta_ha', word: 'ஹ', language: 'ta', transliteration: 'ha', meaning: 'sound "ha"', theme: 'Starter sounds', color: '#D8B98A', emoji: 'ஹ' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilAnimalItems: LessonItem[] = [
  { id: 'naai', word: 'நாய்', language: 'ta', transliteration: 'naai', meaning: 'dog', theme: 'Animals', color: '#D4A574', emoji: '🐶' },
  { id: 'poonai', word: 'பூனை', language: 'ta', transliteration: 'poonai', meaning: 'cat', theme: 'Animals', color: '#E8C9A0', emoji: '🐱' },
  { id: 'yaanai', word: 'யானை', language: 'ta', transliteration: 'yaanai', meaning: 'elephant', theme: 'Animals', color: '#A8B4C0', emoji: '🐘' },
  { id: 'singam', word: 'சிங்கம்', language: 'ta', transliteration: 'singam', meaning: 'lion', theme: 'Animals', color: '#F2B84B', emoji: '🦁' },
  { id: 'muyal', word: 'முயல்', language: 'ta', transliteration: 'muyal', meaning: 'rabbit', theme: 'Animals', color: '#EAD9E8', emoji: '🐰' },
  { id: 'paravai', word: 'பறவை', language: 'ta', transliteration: 'paravai', meaning: 'bird', theme: 'Animals', color: '#8FD0C4', emoji: '🐦' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilNumberItems: LessonItem[] = [
  { id: 'ondru', word: 'ஒன்று', language: 'ta', transliteration: 'ondru', meaning: '1', theme: 'Numbers', color: '#9B8FD9', emoji: '1️⃣' },
  { id: 'irandu', word: 'இரண்டு', language: 'ta', transliteration: 'irandu', meaning: '2', theme: 'Numbers', color: '#8FA0D9', emoji: '2️⃣' },
  { id: 'moondru', word: 'மூன்று', language: 'ta', transliteration: 'moondru', meaning: '3', theme: 'Numbers', color: '#8FB8D9', emoji: '3️⃣' },
  { id: 'naangu', word: 'நான்கு', language: 'ta', transliteration: 'naangu', meaning: '4', theme: 'Numbers', color: '#8FCCD9', emoji: '4️⃣' },
  { id: 'aindhu', word: 'ஐந்து', language: 'ta', transliteration: 'aindhu', meaning: '5', theme: 'Numbers', color: '#8FD9CC', emoji: '5️⃣' },
  { id: 'aaru', word: 'ஆறு', language: 'ta', transliteration: 'aaru', meaning: '6', theme: 'Numbers', color: '#A0D98F', emoji: '6️⃣' },
  { id: 'ezhu', word: 'ஏழு', language: 'ta', transliteration: 'ezhu', meaning: '7', theme: 'Numbers', color: '#D9CC8F', emoji: '7️⃣' },
  { id: 'ettu', word: 'எட்டு', language: 'ta', transliteration: 'ettu', meaning: '8', theme: 'Numbers', color: '#D9A88F', emoji: '8️⃣' },
  { id: 'onbadhu', word: 'ஒன்பது', language: 'ta', transliteration: 'onbadhu', meaning: '9', theme: 'Numbers', color: '#D98FA0', emoji: '9️⃣' },
  { id: 'paththu', word: 'பத்து', language: 'ta', transliteration: 'paththu', meaning: '10', theme: 'Numbers', color: '#C08FD9', emoji: '🔟' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilBodyItems: LessonItem[] = [
  { id: 'kan', word: 'கண்', language: 'ta', transliteration: 'kan', meaning: 'eye', theme: 'Body', color: '#F2A6C4', emoji: '👁️' },
  { id: 'mookku', word: 'மூக்கு', language: 'ta', transliteration: 'mookku', meaning: 'nose', theme: 'Body', color: '#F7C6D9', emoji: '👃' },
  { id: 'kaadhu', word: 'காது', language: 'ta', transliteration: 'kaadhu', meaning: 'ear', theme: 'Body', color: '#F2B8CC', emoji: '👂' },
  { id: 'kai', word: 'கை', language: 'ta', transliteration: 'kai', meaning: 'hand', theme: 'Body', color: '#EDA6D4', emoji: '✋' },
  { id: 'kaal', word: 'கால்', language: 'ta', transliteration: 'kaal', meaning: 'foot', theme: 'Body', color: '#E8A6E0', emoji: '🦶' },
  { id: 'vaai', word: 'வாய்', language: 'ta', transliteration: 'vaai', meaning: 'mouth', theme: 'Body', color: '#F2A6AC', emoji: '👄' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilClothesItems: LessonItem[] = [
  { id: 'sattai', word: 'சட்டை', language: 'ta', transliteration: 'sattai', meaning: 'shirt', theme: 'Clothes', color: '#89C4E1', emoji: '👕' },
  { id: 'kaarchattai', word: 'காற்சட்டை', language: 'ta', transliteration: 'kaarchattai', meaning: 'pants', theme: 'Clothes', color: '#5B7C99', emoji: '👖' },
  { id: 'thoppi', word: 'தொப்பி', language: 'ta', transliteration: 'thoppi', meaning: 'hat', theme: 'Clothes', color: '#E8B04B', emoji: '🧢' },
  { id: 'kaalani', word: 'காலணி', language: 'ta', transliteration: 'kaalani', meaning: 'shoes', theme: 'Clothes', color: '#8B6F47', emoji: '👟' },
  { id: 'kaalurai', word: 'காலுறை', language: 'ta', transliteration: 'kaalurai', meaning: 'socks', theme: 'Clothes', color: '#E88AA8', emoji: '🧦' },
  { id: 'saelai', word: 'சேலை', language: 'ta', transliteration: 'saelai', meaning: 'saree', theme: 'Clothes', color: '#D64545', emoji: '🥻' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families. 'kaar' is prefixed (ta_) since its transliteration
// matches Hindi's car id and would otherwise collide in shared progress.
const tamilTransportItems: LessonItem[] = [
  { id: 'ta_kaar', word: 'கார்', language: 'ta', transliteration: 'kaar', meaning: 'car', theme: 'Transport', color: '#E85D5D', emoji: '🚗' },
  { id: 'perundhu', word: 'பேருந்து', language: 'ta', transliteration: 'perundhu', meaning: 'bus', theme: 'Transport', color: '#F2C230', emoji: '🚌' },
  { id: 'rayil', word: 'ரயில்', language: 'ta', transliteration: 'rayil', meaning: 'train', theme: 'Transport', color: '#5B8AA6', emoji: '🚂' },
  { id: 'vimaanam', word: 'விமானம்', language: 'ta', transliteration: 'vimaanam', meaning: 'airplane', theme: 'Transport', color: '#A8C4E0', emoji: '✈️' },
  { id: 'mithivandi', word: 'மிதிவண்டி', language: 'ta', transliteration: 'mithivandi', meaning: 'bicycle', theme: 'Transport', color: '#7FC77E', emoji: '🚲' },
  { id: 'padagu', word: 'படகு', language: 'ta', transliteration: 'padagu', meaning: 'boat', theme: 'Transport', color: '#6EC6DE', emoji: '⛵' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families.
const tamilPlaceItems: LessonItem[] = [
  { id: 'veedu', word: 'வீடு', language: 'ta', transliteration: 'veedu', meaning: 'home', theme: 'Places', color: '#F2C879', emoji: '🏠' },
  { id: 'santhai', word: 'சந்தை', language: 'ta', transliteration: 'santhai', meaning: 'market', theme: 'Places', color: '#E8935A', emoji: '🏪' },
  { id: 'maruthuvamanai', word: 'மருத்துவமனை', language: 'ta', transliteration: 'maruthuvamanai', meaning: 'hospital', theme: 'Places', color: '#E86A6A', emoji: '🏥' },
  { id: 'koyil', word: 'கோவில்', language: 'ta', transliteration: 'koyil', meaning: 'temple', theme: 'Places', color: '#D9A45C', emoji: '🛕' },
  { id: 'poonga', word: 'பூங்கா', language: 'ta', transliteration: 'poonga', meaning: 'park', theme: 'Places', color: '#7FC77E', emoji: '🏞️' },
  { id: 'saalai', word: 'சாலை', language: 'ta', transliteration: 'saalai', meaning: 'road', theme: 'Places', color: '#8A8A8A', emoji: '🛣️' },
];

// NOTE: sourced from common, well-established everyday Tamil vocabulary,
// but not yet checked by a native speaker. Flagged for review before use
// with real families. 'pencil' is prefixed (ta_) since its transliteration
// matches Hindi's pencil id and would otherwise collide in shared progress.
const tamilSchoolItems: LessonItem[] = [
  { id: 'puthagam', word: 'புத்தகம்', language: 'ta', transliteration: 'puthagam', meaning: 'book', theme: 'School', color: '#6EA8D9', emoji: '📖' },
  { id: 'ta_pencil', word: 'பென்சில்', language: 'ta', transliteration: 'pencil', meaning: 'pencil', theme: 'School', color: '#F2C230', emoji: '✏️' },
  { id: 'pallippai', word: 'பள்ளிப்பை', language: 'ta', transliteration: 'pallippai', meaning: 'school bag', theme: 'School', color: '#E86A6A', emoji: '🎒' },
  { id: 'penaa', word: 'பேனா', language: 'ta', transliteration: 'penaa', meaning: 'pen', theme: 'School', color: '#4A9D8F', emoji: '🖊️' },
  { id: 'alavukol', word: 'அளவுகோல்', language: 'ta', transliteration: 'alavukol', meaning: 'ruler', theme: 'School', color: '#F2A64B', emoji: '📏' },
  { id: 'kurippedu', word: 'குறிப்பேடு', language: 'ta', transliteration: 'kurippedu', meaning: 'notebook', theme: 'School', color: '#8E7CC3', emoji: '📓' },
];

function itemsForTheme(themeId: ThemeId, language: LanguageId): LessonItem[] {
  if (language === 'ta') {
    if (themeId === 'food') return tamilFoodItems;
    if (themeId === 'colors') return tamilColorItems;
    if (themeId === 'opposites') return tamilOppositeItems;
    if (themeId === 'opposites2') return tamilOppositeTwoItems;
    if (themeId === 'family') return tamilFamilyItems;
    if (themeId === 'sounds') return tamilSoundItems;
    if (themeId === 'animals') return tamilAnimalItems;
    if (themeId === 'numbers') return tamilNumberItems;
    if (themeId === 'body') return tamilBodyItems;
    if (themeId === 'clothes') return tamilClothesItems;
    if (themeId === 'transport') return tamilTransportItems;
    if (themeId === 'places') return tamilPlaceItems;
    if (themeId === 'school') return tamilSchoolItems;
    return [];
  }
  if (themeId === 'colors') return colorItems;
  if (themeId === 'opposites') return oppositeItems;
  if (themeId === 'opposites2') return oppositeTwoItems;
  if (themeId === 'family') return familyItems;
  if (themeId === 'sounds') return soundItems;
  if (themeId === 'animals') return animalItems;
  if (themeId === 'numbers') return numberItems;
  if (themeId === 'body') return bodyItems;
  if (themeId === 'clothes') return clothesItems;
  if (themeId === 'transport') return transportItems;
  if (themeId === 'places') return placeItems;
  if (themeId === 'school') return schoolItems;
  return foodItems;
}

const themes: Theme[] = [
  { id: 'food', title: 'Food', subtitle: 'Learn tasty everyday words', status: 'ready', color: '#F7B733' },
  { id: 'colors', title: 'Colors', subtitle: 'Paint with colorful words', status: 'ready', color: '#78C6E7' },
  { id: 'opposites', title: 'Opposites', subtitle: "Discover words that don't match", status: 'ready', color: '#D46A9E' },
  { id: 'opposites2', title: 'Opposites Two', subtitle: 'More opposite words to discover', status: 'ready', color: '#E8C547' },
  { id: 'family', title: 'Family', subtitle: 'Words for people at home', status: 'ready', color: '#76B77C' },
  { id: 'sounds', title: 'Starter sounds', subtitle: 'Meet friendly letters', status: 'ready', color: '#E7755F' },
  { id: 'animals', title: 'Animals', subtitle: 'Meet furry, feathery friends', status: 'ready', color: '#D4A574' },
  { id: 'numbers', title: 'Numbers', subtitle: 'Count from one to ten', status: 'ready', color: '#9B8FD9' },
  { id: 'body', title: 'Body', subtitle: 'Learn parts of the body', status: 'ready', color: '#F2A6C4' },
  { id: 'clothes', title: 'Clothes', subtitle: 'What are we wearing today?', status: 'ready', color: '#5FBFAE' },
  { id: 'transport', title: 'Transport', subtitle: 'Cars, trains, and planes', status: 'ready', color: '#5D8AA8' },
  { id: 'places', title: 'Places', subtitle: 'Homes, markets, and more', status: 'ready', color: '#C97B4A' },
  { id: 'school', title: 'School', subtitle: 'Pack your school bag', status: 'ready', color: '#4A9D8F' },
];

// Order in which themes unlock. Themes with no real content yet (status
// 'soon') aren't part of this sequence — they stay locked regardless.
const themeUnlockOrder: ThemeId[] = ['food', 'colors', 'opposites', 'opposites2', 'family', 'sounds', 'animals', 'numbers', 'body', 'clothes', 'transport', 'places', 'school'];

function isThemeMastered(themeId: ThemeId, progress: Progress, language: LanguageId): boolean {
  const items = itemsForTheme(themeId, language);
  return items.length > 0 && items.every((item) => progress[item.id] === 'known');
}

type ThemePlayability = 'ready' | 'locked' | 'soon';

function themePlayability(theme: Theme, progress: Progress, language: LanguageId): ThemePlayability {
  if (theme.status === 'soon') return 'soon';
  if (itemsForTheme(theme.id as ThemeId, language).length === 0) return 'soon';
  const index = themeUnlockOrder.indexOf(theme.id as ThemeId);
  if (index <= 0) return 'ready';
  return isThemeMastered(themeUnlockOrder[index - 1], progress, language) ? 'ready' : 'locked';
}

function currentLevel(progress: Progress, language: LanguageId): number {
  return 1 + themeUnlockOrder.filter((id) => isThemeMastered(id, progress, language)).length;
}

function currentThemeId(progress: Progress, language: LanguageId): ThemeId {
  const nextUnmastered = themeUnlockOrder.find((id) => !isThemeMastered(id, progress, language));
  return nextUnmastered ?? themeUnlockOrder[themeUnlockOrder.length - 1];
}

const themeRewardName: Record<ThemeId, string> = {
  food: 'picnic basket',
  colors: 'color palette',
  opposites: 'opposites poster',
  opposites2: 'action word cards',
  family: 'family photo album',
  sounds: 'sound chart',
  animals: 'animal sticker book',
  numbers: 'counting chart',
  body: 'body map poster',
  clothes: 'wardrobe collection',
  transport: 'toy vehicle set',
  places: 'neighborhood map',
  school: 'school supply kit',
};

const themeUnitLabel: Record<ThemeId, string> = {
  food: 'words',
  colors: 'words',
  opposites: 'words',
  opposites2: 'words',
  family: 'words',
  sounds: 'sounds',
  animals: 'words',
  numbers: 'numbers',
  body: 'words',
  clothes: 'words',
  transport: 'words',
  places: 'words',
  school: 'words',
};

const initialProgress: Progress = Object.fromEntries(
  [...foodItems, ...colorItems, ...oppositeItems, ...oppositeTwoItems, ...familyItems, ...soundItems, ...animalItems, ...numberItems, ...bodyItems, ...clothesItems, ...transportItems, ...placeItems, ...schoolItems, ...tamilFoodItems, ...tamilColorItems, ...tamilOppositeItems, ...tamilOppositeTwoItems, ...tamilFamilyItems, ...tamilSoundItems, ...tamilAnimalItems, ...tamilNumberItems, ...tamilBodyItems, ...tamilClothesItems, ...tamilTransportItems, ...tamilPlaceItems, ...tamilSchoolItems].map((item) => [item.id, 'new']),
) as Progress;

const characters: { id: CharacterId; name: string; subtitle: string }[] = [
  { id: 'mithu', name: 'Mithu', subtitle: 'the parrot' },
  { id: 'bunny', name: 'Bunny', subtitle: 'the rainbow bunny' },
  { id: 'golu', name: 'Golu', subtitle: 'the elephant' },
];

const CHARACTER_STORAGE_KEY = 'hindi-quest-character';

const languages: { id: LanguageId; name: string; ready: boolean }[] = [
  { id: 'hi', name: 'Hindi', ready: true },
  { id: 'ta', name: 'Tamil', ready: true },
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
  const [oppositeIndex, setOppositeIndex] = useState(0);
  const [oppositePromptOrder, setOppositePromptOrder] = useState<LessonItem[]>([]);
  const [oppositeAnswerOrder, setOppositeAnswerOrder] = useState<LessonItem[]>([]);
  const [oppositeSelectedAnswer, setOppositeSelectedAnswer] = useState<string | null>(null);
  const [oppositeFeedback, setOppositeFeedback] = useState('Find the opposite.');

  const themeItems = itemsForTheme(activeTheme, language);
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
  const homeThemeId = currentThemeId(progress, language);
  const homeThemeMeta = themes.find((theme) => theme.id === homeThemeId);
  const homeThemeItems = itemsForTheme(homeThemeId, language);
  const homeLearnedCount = homeThemeItems.filter((item) => progress[item.id] === 'known').length;
  const homePracticeCount = homeThemeItems.filter((item) => progress[item.id] === 'practice').length;
  const themeLearnedCount = themeItems.filter((item) => progress[item.id] === 'known').length;
  const themePracticeCount = themeItems.filter((item) => progress[item.id] === 'practice').length;
  const currentItem = promptOrder[matchIndex] ?? promptOrder[0] ?? themeItems[0];
  const adultSupport = showPronunciation;
  const isOppositesTheme = activeTheme === 'opposites' || activeTheme === 'opposites2';
  const currentOppositeItem = oppositePromptOrder[oppositeIndex] ?? oppositePromptOrder[0] ?? themeItems[0];
  const currentOppositeAnswer = themeItems.find((item) => item.id === currentOppositeItem.oppositeId);

  useEffect(() => {
    if (screen === 'match') {
      speakWord(currentItem.word, currentItem.language);
    }
  }, [screen, matchIndex, isReviewRound]);

  useEffect(() => {
    if (screen === 'opposite') {
      speakWord(currentOppositeItem.word, currentOppositeItem.language);
    }
  }, [screen, oppositeIndex]);

  useEffect(() => {
    if (screen === 'memory') {
      const cards: MemoryCard[] = itemsForTheme(activeTheme, language).slice(0, 4).flatMap((item) => [
        { id: `${item.id}-sound`, itemId: item.id, kind: 'sound', label: item.word, language: item.language },
        { id: `${item.id}-meaning`, itemId: item.id, kind: 'meaning', label: item.meaning, language: item.language },
      ]);
      setMemoryCards(shuffleItems(cards));
    }
  }, [screen, activeTheme, language]);

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
    const order = shuffleItems(themeItems);
    setPromptOrder(order);
    setAnswerOrder(buildAnswerOptions(order[0], themeItems, ANSWER_OPTIONS_CAP));
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

    const wasMastered = isThemeMastered(activeTheme, progress, language);
    const isMasteredNow = isThemeMastered(activeTheme, nextProgress, language);
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
          setAnswerOrder(buildAnswerOptions(promptOrder[matchIndex + 1], themeItems, ANSWER_OPTIONS_CAP));
          setSelectedAnswer(null);
          setFeedback('Tap what you hear.');
          return;
        }

        if (!isReviewRound && missedThisLesson.length > 0) {
          const reviewOrder = shuffleItems(themeItems.filter((item) => missedThisLesson.includes(item.id)));
          setIsReviewRound(true);
          setMatchIndex(0);
          setPromptOrder(reviewOrder);
          setAnswerOrder(buildAnswerOptions(reviewOrder[0], themeItems, ANSWER_OPTIONS_CAP));
          setSelectedAnswer(null);
          setFeedback('Review round: let\'s try those tricky words again.');
          return;
        }

        setSelectedAnswer(null);
        setEarnedReward(`${characterMeta.name}'s ${themeRewardName[activeTheme]}`);
        setScreen('reward');
      }, REACTION_PAUSE_MS);
    };

    // Replay the word as confirmation, then advance once it finishes playing
    // (never waiting longer than MAX_SPEECH_WAIT_MS in case the device has
    // no voice installed and speech synthesis silently stalls). If the
    // question's initial auto-play is still going — a quick correct tap can
    // easily land before it finishes — don't call speakWord again: it stops
    // whatever is currently playing first, which was cutting the word off
    // mid-syllable. Just let the in-flight audio finish undisturbed.
    Speech.isSpeakingAsync().then((isSpeaking) => {
      if (isSpeaking) {
        advanceToNext();
        return;
      }
      speakWord(currentItem.word, currentItem.language, advanceToNext);
      setTimeout(advanceToNext, MAX_SPEECH_WAIT_MS);
    });
  }

  function startOppositeGame() {
    setOppositeIndex(0);
    setOppositeSelectedAnswer(null);
    setOppositeFeedback('Find the opposite.');
    const order = shuffleItems(themeItems);
    setOppositePromptOrder(order);
    const firstCorrect = themeItems.find((item) => item.id === order[0].oppositeId) ?? order[0];
    setOppositeAnswerOrder(buildAnswerOptions(firstCorrect, themeItems.filter((item) => item.id !== order[0].id), ANSWER_OPTIONS_CAP));
    setScreen('opposite');
  }

  function handleOppositeAnswer(itemId: string) {
    const correctItem = themeItems.find((item) => item.id === currentOppositeItem.oppositeId);
    const isCorrect = itemId === correctItem?.id;
    setOppositeSelectedAnswer(itemId);

    if (!isCorrect) {
      playFailSound();
      setOppositeFeedback('Try again.');
      return;
    }

    playSuccessSound();
    setOppositeFeedback(correctItem ? `Nice! The opposite of ${currentOppositeItem.word} is ${correctItem.word}.` : 'Nice!');

    let advanced = false;
    const advanceToNext = () => {
      if (advanced) return;
      advanced = true;
      setTimeout(() => {
        if (oppositeIndex < oppositePromptOrder.length - 1) {
          const nextItem = oppositePromptOrder[oppositeIndex + 1];
          const nextCorrect = themeItems.find((item) => item.id === nextItem.oppositeId) ?? nextItem;
          setOppositeIndex((index) => index + 1);
          setOppositeAnswerOrder(buildAnswerOptions(nextCorrect, themeItems.filter((item) => item.id !== nextItem.id), ANSWER_OPTIONS_CAP));
          setOppositeSelectedAnswer(null);
          setOppositeFeedback('Find the opposite.');
          return;
        }
        setOppositeSelectedAnswer(null);
        setScreen('themes');
      }, REACTION_PAUSE_MS);
    };

    // Same interruption-avoidance as Match-and-Listen's confirmation replay:
    // only re-speak if nothing is already playing, otherwise just advance.
    Speech.isSpeakingAsync().then((isSpeaking) => {
      if (isSpeaking || !correctItem) {
        advanceToNext();
        return;
      }
      speakWord(correctItem.word, correctItem.language, advanceToNext);
      setTimeout(advanceToNext, MAX_SPEECH_WAIT_MS);
    });
  }

  function startMemoryPairs() {
    setFeedback('Find the matching pairs.');
    setMatchedCards([]);
    setFlippedCards([]);
    setScreen('memory');
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
            setScreen('themes');
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
              <CharacterMascot character={character} mood="hello" language={language} />
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
                    onPress={() => {
                      setLanguage(option.id);
                      setActiveTheme('food');
                    }}
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
                    <CharacterMascot character={option.id} mood="ready" language={language} compact />
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
              <Text style={styles.levelBadgeText}>Level {currentLevel(progress, language)}</Text>
            </View>
            <View style={styles.homeHero}>
              <View style={styles.heroCopyWide}>
                <Text style={styles.kicker}>Ready for a quick {languageMeta.name} game?</Text>
                <Text style={styles.title}>Play the {homeThemeMeta?.title ?? 'Food'} lesson</Text>
                <Text style={styles.subtitle}>Hear {languageMeta.name}, tap the right tile — {homeThemeMeta?.subtitle ?? 'learn tasty everyday words'}.</Text>
              </View>
              <CharacterMascot character={character} mood="ready" language={language} />
            </View>

            <View style={styles.statsRow}>
              <StatCard label="Words learned" value={`${homeLearnedCount}/${homeThemeItems.length}`} />
              <StatCard label="Needs practice" value={`${homePracticeCount}`} />
            </View>

            <PrimaryButton
              label={homeLearnedCount > 0 ? 'Continue' : 'Start first lesson'}
              onPress={() => {
                setActiveTheme(homeThemeId);
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
                <Text style={styles.subtitle}>Start with Food, then unlock more {languageMeta.name} worlds.</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Level {currentLevel(progress, language)}</Text>
              </View>
            </View>
            <View style={styles.themePath}>
              <View style={styles.themePathLine} />
              {themes.map((theme) => {
                const playability = themePlayability(theme, progress, language);
                const isReady = playability === 'ready';
                const items = isReady ? itemsForTheme(theme.id as ThemeId, language) : [];
                const learned = items.filter((item) => progress[item.id] === 'known').length;
                const mastered = isReady && isThemeMastered(theme.id as ThemeId, progress, language);
                const isCurrent = isReady && !mastered;
                return (
                  <Pressable
                    key={theme.id}
                    disabled={!isReady}
                    style={styles.themeNode}
                    onPress={() => {
                      if (!isReady) return;
                      setActiveTheme(theme.id as ThemeId);
                      setScreen('lesson');
                    }}
                    accessibilityRole="button"
                  >
                    {isCurrent ? (
                      <View style={styles.themeNodeHereBadge}>
                        <Image source={characterImages[character]} style={styles.themeNodeHereAvatar} />
                        <Text style={styles.themeNodeHereText}>{characterMeta.name} is here</Text>
                      </View>
                    ) : null}
                    <View style={styles.themeNodeCircleWrap}>
                      {isReady && items[0] ? (
                        <FoodVisual item={items[0]} small={mastered} />
                      ) : (
                        <View style={styles.themeLockCircle}>
                          <Text style={styles.themeLockIcon}>🔒</Text>
                        </View>
                      )}
                      {mastered ? (
                        <View style={styles.themeNodeCheckBadge}>
                          <Text style={styles.themeNodeCheckText}>✓</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.themeNodeLabel, !isReady && styles.themeNodeLabelLocked]}>{theme.title}</Text>
                    {isReady ? (
                      <Text style={styles.themeNodeSublabel}>{learned}/{items.length} learned</Text>
                    ) : null}
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
              <CharacterMascot character={character} mood="ready" language={language} compact />
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
              <CharacterMascot character={character} mood="speak" language={language} compact />
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

        {screen === 'opposite' && (
          <ScreenShell>
            <View style={styles.gameHeader}>
              <Text style={styles.progressText}>{oppositeIndex + 1}/{oppositePromptOrder.length}</Text>
              <Text style={styles.kicker}>Find the Opposite</Text>
            </View>
            <Pressable
              style={styles.soundCard}
              onPress={() => speakWord(currentOppositeItem.word, currentOppositeItem.language)}
              accessibilityRole="button"
              accessibilityLabel="Replay the word"
            >
              <CharacterMascot character={character} mood="speak" language={language} compact />
              <View style={styles.soundCopy}>
                <Text style={styles.instruction}>Tap the opposite word.</Text>
                <Text style={styles.promptWord}>{currentOppositeItem.word}</Text>
                {adultSupport ? <Text style={styles.promptHelp}>{currentOppositeItem.transliteration}</Text> : null}
                <Text style={styles.replayHint}>Tap to hear again</Text>
              </View>
            </Pressable>
            <Text style={styles.feedbackText}>{oppositeFeedback}</Text>
            <View style={styles.answerGrid}>
              {oppositeAnswerOrder.map((item) => {
                const isSelected = oppositeSelectedAnswer === item.id;
                const isCorrect = isSelected && item.id === currentOppositeAnswer?.id;
                const isWrong = isSelected && item.id !== currentOppositeAnswer?.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleOppositeAnswer(item.id)}
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
            <Text style={styles.subtitle}>Match the {languageMeta.name} word with its meaning.</Text>
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
              <CharacterMascot character={character} mood="happy" language={language} />
              <Text style={styles.title}>You learned {languageMeta.name}!</Text>
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
            {isOppositesTheme ? (
              <SecondaryButton label="Find the Opposite (optional)" onPress={startOppositeGame} />
            ) : (
              <SecondaryButton label="Play Memory Pairs (optional)" onPress={startMemoryPairs} />
            )}
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

// Large, crisp icon renders (Twemoji, CC-BY 4.0 — see assets/icons/CREDIT.md)
// for concrete-noun themes (Food, Family, Animals, Body, Clothes, Transport,
// Places, School), keyed by the item's English `meaning` so one icon is
// shared by the matching Hindi and Tamil word for the same concept. These
// are bright, simple, friendly illustrations — deliberately not real photos,
// since photographic close-ups (macro body parts, animal faces, etc.) read
// as too intense/adult for the toddler audience this app is built for.
// Colors/Numbers/Starter sounds intentionally have no entry here and keep
// their emoji/glyph treatment in FoodVisual below.
const objectIcons: Record<string, ImageSourcePropType> = {
  water: require('./assets/icons/water.png'),
  milk: require('./assets/icons/milk.png'),
  mango: require('./assets/icons/mango.png'),
  flatbread: require('./assets/icons/flatbread.png'),
  rice: require('./assets/icons/rice.png'),
  banana: require('./assets/icons/banana.png'),
  mother: require('./assets/icons/mother.png'),
  father: require('./assets/icons/father.png'),
  brother: require('./assets/icons/brother.png'),
  sister: require('./assets/icons/sister.png'),
  child: require('./assets/icons/child.png'),
  dog: require('./assets/icons/dog.png'),
  cat: require('./assets/icons/cat.png'),
  elephant: require('./assets/icons/elephant.png'),
  lion: require('./assets/icons/lion.png'),
  rabbit: require('./assets/icons/rabbit.png'),
  bird: require('./assets/icons/bird.png'),
  eye: require('./assets/icons/eye.png'),
  nose: require('./assets/icons/nose.png'),
  ear: require('./assets/icons/ear.png'),
  hand: require('./assets/icons/hand.png'),
  foot: require('./assets/icons/foot.png'),
  mouth: require('./assets/icons/mouth.png'),
  shirt: require('./assets/icons/shirt.png'),
  pants: require('./assets/icons/pants.png'),
  hat: require('./assets/icons/hat.png'),
  shoes: require('./assets/icons/shoes.png'),
  socks: require('./assets/icons/socks.png'),
  saree: require('./assets/icons/saree.png'),
  car: require('./assets/icons/car.png'),
  bus: require('./assets/icons/bus.png'),
  train: require('./assets/icons/train.png'),
  airplane: require('./assets/icons/airplane.png'),
  bicycle: require('./assets/icons/bicycle.png'),
  boat: require('./assets/icons/boat.png'),
  home: require('./assets/icons/home.png'),
  market: require('./assets/icons/market.png'),
  hospital: require('./assets/icons/hospital.png'),
  temple: require('./assets/icons/temple.png'),
  park: require('./assets/icons/park.png'),
  road: require('./assets/icons/road.png'),
  book: require('./assets/icons/book.png'),
  pencil: require('./assets/icons/pencil.png'),
  'school bag': require('./assets/icons/school-bag.png'),
  pen: require('./assets/icons/pen.png'),
  ruler: require('./assets/icons/ruler.png'),
  notebook: require('./assets/icons/notebook.png'),
};

const mascotMoodText: Record<LanguageId, Record<CharacterMood, string>> = {
  hi: { hello: 'नमस्ते', speak: 'सुनो', happy: 'शाबाश', ready: 'चलो' },
  ta: { hello: 'வணக்கம்', speak: 'கேளு', happy: 'சபாஷ்', ready: 'வா' },
};

function CharacterMascot({
  character,
  compact = false,
  mood,
  language,
}: {
  character: CharacterId;
  compact?: boolean;
  mood: CharacterMood;
  language: LanguageId;
}) {
  return (
    <View style={[styles.mascot, compact && styles.mascotCompact]}>
      <Image source={characterImages[character]} style={[styles.mascotImage, compact && styles.mascotImageCompact]} />
      <Text style={[styles.mascotBubble, compact && styles.mascotBubbleCompact]}>
        {mascotMoodText[language][mood]}
      </Text>
    </View>
  );
}

function FoodVisual({ item, small = false }: { item: LessonItem; small?: boolean }) {
  const icon = objectIcons[item.meaning];
  return (
    <View style={[styles.foodVisual, small && styles.foodVisualSmall, { backgroundColor: item.color }]}>
      {icon ? (
        <Image source={icon} style={[styles.foodVisualIcon, small && styles.foodVisualIconSmall]} resizeMode="contain" />
      ) : (
        <Text style={[styles.foodVisualEmoji, small && styles.foodVisualEmojiSmall]}>{item.emoji}</Text>
      )}
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
  themePath: { alignItems: 'center', gap: 28, paddingVertical: 8, position: 'relative' },
  themePathLine: {
    borderLeftColor: '#DDE4EC',
    borderLeftWidth: 3,
    borderStyle: 'dashed',
    bottom: 40,
    left: '50%',
    position: 'absolute',
    top: 40,
  },
  themeNode: { alignItems: 'center', gap: 6 },
  themeNodeHereBadge: {
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderColor: '#F0D28A',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  themeNodeHereAvatar: { borderRadius: 10, height: 20, width: 20 },
  themeNodeHereText: { color: '#8C5B10', fontSize: 12, fontWeight: '800' },
  themeNodeCircleWrap: { position: 'relative' },
  themeNodeCheckBadge: {
    alignItems: 'center',
    backgroundColor: '#3FA34D',
    borderColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    bottom: -2,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 22,
  },
  themeNodeCheckText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  themeLockCircle: {
    alignItems: 'center',
    backgroundColor: '#EDEFF3',
    borderColor: '#DDE4EC',
    borderRadius: 20,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  themeLockIcon: { fontSize: 22, opacity: 0.55 },
  themeNodeLabel: { color: '#24324C', fontSize: 16, fontWeight: '800' },
  themeNodeLabelLocked: { color: '#9AA3AF' },
  themeNodeSublabel: { color: '#596270', fontSize: 12, fontWeight: '700' },
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
  wordPreviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordPreview: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4EC',
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 8,
    width: '47%',
    shadowColor: '#24324C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  previewHindi: { color: '#24324C', fontSize: 20, fontWeight: '900' },
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
  answerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  answerTile: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4EC',
    borderRadius: 18,
    borderWidth: 2,
    gap: 4,
    minHeight: 150,
    padding: 8,
    width: '47%',
    shadowColor: '#24324C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  answerCorrect: { backgroundColor: '#EFF7F0', borderColor: '#3D9158' },
  answerWrong: { backgroundColor: '#FFF0EB', borderColor: '#E7755F' },
  answerHindi: { color: '#24324C', fontSize: 20, fontWeight: '900' },
  answerMeaning: { color: '#596270', fontSize: 14, fontWeight: '800' },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memoryCard: {
    alignItems: 'center',
    backgroundColor: '#24324C',
    borderRadius: 18,
    height: 124,
    justifyContent: 'center',
    padding: 8,
    width: '47%',
    shadowColor: '#24324C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
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
    borderRadius: 30,
    borderWidth: 1,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  foodVisualSmall: { borderRadius: 20, height: 56, width: 56 },
  foodVisualEmoji: { fontSize: 36, lineHeight: 40 },
  foodVisualEmojiSmall: { fontSize: 26, lineHeight: 30 },
  foodVisualIcon: { height: 54, width: 54 },
  foodVisualIconSmall: { height: 36, width: 36 },
});
