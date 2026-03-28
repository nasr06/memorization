import { useEffect, useState, useCallback, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Star, RotateCcw } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { CardFlip } from "@/components/CardFlip";
import { CardRenderer } from "@/components/CardRenderer";
import { getDueAndNewCards } from "@/db/queries/cards";
import { updateCardSchedule, logReview } from "@/db/queries/cards";
import { getNotesWithTypes } from "@/db/queries/notes";
import { getDeckById } from "@/db/queries/decks";
import { renderAnkiTemplate } from "@/lib/templateRenderer";
import { recordStudyDay, addXPToStreak } from "@/db/queries/streak";
import { useStreakStore } from "@/store/useStreakStore";
import { sm2, xpForRating } from "@/lib/sm2";
import type { Card } from "@/db/schema";
import type { CardSchedule } from "@/lib/sm2";

interface CardWithContent extends Card {
  frontHtml: string;
  backHtml: string;
  css: string;
}

interface SessionStats {
  studied: number;
  correct: number;
  xpEarned: number;
}

const RATING_LABELS: Record<number, string> = {
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

const RATING_COLORS: Record<number, string> = {
  1: "#F44336",
  2: "#FF9800",
  3: "#4CAF50",
  4: "#00BCD4",
};

function getIntervalLabel(schedule: CardSchedule): string {
  if (schedule.interval <= 1 && schedule.reps === 0) return "10m";
  if (schedule.interval === 1) return "1d";
  return `${schedule.interval}d`;
}

export default function StudyScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setStreak, addXP } = useStreakStore();

  const [cards, setCards] = useState<CardWithContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    studied: 0,
    correct: 0,
    xpEarned: 0,
  });
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deckName, setDeckName] = useState("");
  const [xpBurst, setXpBurst] = useState(0);
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFlipAnimating, setIsFlipAnimating] = useState(false);
  const transitionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipAnimTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const xpOpacity = useSharedValue(0);
  const xpTranslateY = useSharedValue(0);

  const xpBurstStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpTranslateY.value }],
  }));

  useEffect(() => {
    loadCards();
  }, [deckId]);

  const loadCards = async () => {
    setIsLoading(true);
    try {
      const [dueCards, notesWithTypes, deck] = await Promise.all([
        getDueAndNewCards(deckId),
        getNotesWithTypes(deckId),
        getDeckById(deckId),
      ]);

      if (deck) setDeckName(deck.name);

      const noteMap = new Map(notesWithTypes.map((n) => [n.id, n]));

      const enriched: CardWithContent[] = dueCards
        .map((card) => {
          const note = noteMap.get(card.noteId ?? "");
          if (!note) return null;

          let fields: Record<string, string> = {};
          try {
            fields = JSON.parse(note.fields ?? "{}");
          } catch {}

          const nt = note.noteType;
          let templates: Array<{ front: string; back: string }> = [
            { front: "{{Front}}", back: "{{Back}}" },
          ];
          let css = "";
          if (nt) {
            try {
              const parsed = JSON.parse(nt.templates ?? "[]");
              if (parsed.length > 0) templates = parsed;
            } catch {}
            css = nt.css ?? "";
          }

          const templateIndex = card.templateIndex ?? 0;
          const tmpl = templates[templateIndex] ?? templates[0];

          const frontHtml = renderAnkiTemplate(tmpl.front, fields);
          const backHtml = renderAnkiTemplate(tmpl.back, fields, frontHtml);

          return { ...card, frontHtml, backHtml, css };
        })
        .filter((c) => c !== null) as CardWithContent[];

      setCards(enriched);
      setCardStartTime(Date.now());
    } catch (err) {
      console.error("Failed to load cards:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlip = useCallback(() => {
    if (isFlipAnimating) return;
    setIsFlipped((prev) => !prev);
    setIsFlipAnimating(true);
    if (flipAnimTimeout.current) clearTimeout(flipAnimTimeout.current);
    flipAnimTimeout.current = setTimeout(() => setIsFlipAnimating(false), 600);
  }, [isFlipAnimating]);

  const handleRate = async (rating: 1 | 2 | 3 | 4) => {
    if (isTransitioning) return;
    const card = cards[currentIndex];
    if (!card) return;

    const timeTaken = Date.now() - cardStartTime;
    const prevDue = card.due ?? null;
    const prevEase = card.ease ?? null;

    const schedule = sm2(rating, {
      ease: card.ease ?? 2.5,
      interval: card.interval ?? 1,
      reps: card.reps ?? 0,
      due: card.due ?? 0,
    });

    const xp = xpForRating(rating);

    // Persist
    await updateCardSchedule(card.id, schedule);
    await logReview({
      cardId: card.id,
      rating,
      timeTaken,
      prevDue,
      prevEase,
    });
    await addXPToStreak(xp);
    addXP(xp);

    // Show XP burst
    setXpBurst(xp);
    xpOpacity.value = 1;
    xpTranslateY.value = 0;
    xpOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 800 })
    );
    xpTranslateY.value = withTiming(-40, { duration: 900 });

    const correct = rating >= 3 ? 1 : 0;
    const newStats = {
      studied: sessionStats.studied + 1,
      correct: sessionStats.correct + correct,
      xpEarned: sessionStats.xpEarned + xp,
    };
    setSessionStats(newStats);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= cards.length) {
      // Session complete
      const updatedStreak = await recordStudyDay();
      setStreak({
        currentStreak: updatedStreak.currentStreak ?? 0,
        longestStreak: updatedStreak.longestStreak ?? 0,
        totalXP: updatedStreak.totalXP ?? 0,
        weeklyXP: updatedStreak.weeklyXP ?? 0,
        lastStudyDate: updatedStreak.lastStudyDate ?? null,
        streakFreezes: updatedStreak.streakFreezes ?? 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["deck-stats", deckId] });
      await queryClient.invalidateQueries({ queryKey: ["deck-stats-all"] });
      await queryClient.invalidateQueries({ queryKey: ["streak"] });
      setIsComplete(true);
    } else {
      // Flip back to front first, then swap card content after the animation (600ms)
      setIsFlipped(false);
      setIsTransitioning(true);
      if (transitionTimeout.current) clearTimeout(transitionTimeout.current);
      transitionTimeout.current = setTimeout(() => {
        setCurrentIndex(nextIndex);
        setCardStartTime(Date.now());
        setIsTransitioning(false);
      }, 600);
    }
  };

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? (currentIndex / cards.length) : 0;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#6C63FF" size="large" />
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <View className="flex-row items-center px-6 pt-4 pb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-surface items-center justify-center"
          >
            <ArrowLeft size={20} color="#F0F0F5" />
          </TouchableOpacity>
          <Text className="text-text-primary text-xl font-bold ml-3">
            {deckName}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">🎉</Text>
          <Text className="text-text-primary text-xl font-bold">
            All caught up!
          </Text>
          <Text className="text-subtext text-sm text-center mt-2">
            No cards due in this deck right now.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isComplete) {
    const accuracy =
      sessionStats.studied > 0
        ? Math.round((sessionStats.correct / sessionStats.studied) * 100)
        : 0;

    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <View className="w-full bg-surface rounded-3xl p-8 items-center">
          <Star size={48} color="#FFD700" />
          <Text className="text-text-primary text-3xl font-bold mt-4">
            Session Complete!
          </Text>
          <Text className="text-subtext text-sm mt-2 text-center">
            Great work on {deckName}
          </Text>

          <View className="flex-row w-full mt-8 gap-4">
            <View className="flex-1 bg-card rounded-2xl p-4 items-center">
              <Text className="text-text-primary text-2xl font-bold">
                {sessionStats.studied}
              </Text>
              <Text className="text-subtext text-xs mt-1">Cards</Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl p-4 items-center">
              <Text className="text-success text-2xl font-bold">
                {accuracy}%
              </Text>
              <Text className="text-subtext text-xs mt-1">Correct</Text>
            </View>
            <View className="flex-1 bg-card rounded-2xl p-4 items-center">
              <Text className="text-xp text-2xl font-bold">
                +{sessionStats.xpEarned}
              </Text>
              <Text className="text-subtext text-xs mt-1">XP</Text>
            </View>
          </View>

          <TouchableOpacity
            className="mt-6 bg-primary w-full rounded-2xl py-4 items-center"
            onPress={() => router.back()}
          >
            <Text className="text-white font-bold text-base">Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-3 w-full rounded-2xl py-4 items-center flex-row justify-center gap-2"
            onPress={() => {
              setCurrentIndex(0);
              setIsFlipped(false);
              setIsComplete(false);
              setSessionStats({ studied: 0, correct: 0, xpEarned: 0 });
              loadCards();
            }}
          >
            <RotateCcw size={16} color="#8888AA" />
            <Text className="text-subtext font-medium">Study Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header: back button + progress bar + counter on one row */}
      <View className="flex-row items-center px-6 pt-4 pb-4 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center shrink-0"
        >
          <ArrowLeft size={20} color="#F0F0F5" />
        </TouchableOpacity>
        <View className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <Text className="text-subtext text-sm shrink-0">
          {currentIndex + 1} / {cards.length}
        </Text>
      </View>

      {/* Card area — takes all remaining space */}
      <View className="flex-1 px-6">
        {/* XP burst overlay */}
        <Animated.View
          style={[
            xpBurstStyle,
            {
              position: "absolute",
              top: "30%",
              alignSelf: "center",
              zIndex: 10,
            },
          ]}
          pointerEvents="none"
        >
          <Text className="text-xp text-2xl font-bold">+{xpBurst} XP</Text>
        </Animated.View>

        <CardFlip
          isFlipped={isFlipped}
          onFlip={handleFlip}
          front={
            <View className="flex-1 bg-card rounded-3xl p-6 items-center justify-center">
              <CardRenderer
                content={currentCard?.frontHtml ?? ""}
                css={currentCard?.css}
                deckId={deckId}
                isActive={!isFlipped}
              />
              {!isFlipped && (
                <Text className="text-subtext text-sm mt-6 absolute bottom-6">
                  Tap to reveal
                </Text>
              )}
            </View>
          }
          back={
            <View className="flex-1 bg-surface rounded-3xl p-6 items-center justify-center border border-primary/30">
              <CardRenderer
                content={currentCard?.backHtml ?? ""}
                css={currentCard?.css}
                deckId={deckId}
                isActive={isFlipped}
              />
            </View>
          }
        />
      </View>

      {/* Rating buttons / Show Answer — pinned to bottom */}
      <View
        className="px-6 pt-4 pb-4"
        style={{ opacity: isFlipAnimating || isTransitioning ? 0 : 1 }}
        pointerEvents={isFlipAnimating || isTransitioning ? "none" : "auto"}
      >
        {isFlipped ? (
          <View className="flex-row gap-2">
            {([1, 2, 3, 4] as const).map((rating) => {
              const preview = currentCard
                ? sm2(rating, {
                    ease: currentCard.ease ?? 2.5,
                    interval: currentCard.interval ?? 1,
                    reps: currentCard.reps ?? 0,
                    due: currentCard.due ?? 0,
                  })
                : null;

              return (
                <TouchableOpacity
                  key={rating}
                  className="flex-1 rounded-2xl py-4 items-center"
                  style={{ backgroundColor: RATING_COLORS[rating] + "20" }}
                  onPress={() => handleRate(rating)}
                >
                  <Text
                    className="font-bold text-sm"
                    style={{ color: RATING_COLORS[rating] }}
                  >
                    {RATING_LABELS[rating]}
                    {preview ? ` (${getIntervalLabel(preview)})` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center"
            onPress={handleFlip}
          >
            <Text className="text-white font-bold">Show Answer</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
