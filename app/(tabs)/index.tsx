import { useEffect } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, BookOpen, ChevronRight } from "lucide-react-native";
import { getAllDecks } from "@/db/queries/decks";
import { getDeckStats } from "@/db/queries/decks";
import { getOrCreateStreak } from "@/db/queries/streak";
import { useStreakStore } from "@/store/useStreakStore";
import type { Deck } from "@/db/schema";
import type { DeckStats } from "@/db/queries/decks";

interface DeckWithStats {
  deck: Deck;
  stats: DeckStats;
}

export default function HomeScreen() {
  const router = useRouter();
  const { currentStreak, totalXP, setStreak } = useStreakStore();

  const { data: streakData } = useQuery({
    queryKey: ["streak"],
    queryFn: getOrCreateStreak,
  });

  useEffect(() => {
    if (streakData) {
      setStreak({
        currentStreak: streakData.currentStreak ?? 0,
        longestStreak: streakData.longestStreak ?? 0,
        totalXP: streakData.totalXP ?? 0,
        weeklyXP: streakData.weeklyXP ?? 0,
        lastStudyDate: streakData.lastStudyDate ?? null,
        streakFreezes: streakData.streakFreezes ?? 0,
      });
    }
  }, [streakData]);

  const { data: decks, isLoading: decksLoading } = useQuery({
    queryKey: ["decks"],
    queryFn: getAllDecks,
  });

  const { data: deckStats, isLoading: statsLoading } = useQuery({
    queryKey: ["deck-stats-all", decks?.map((d) => d.id)],
    queryFn: async (): Promise<DeckWithStats[]> => {
      if (!decks) return [];
      const results = await Promise.all(
        decks.map(async (deck) => ({
          deck,
          stats: await getDeckStats(deck.id),
        }))
      );
      return results;
    },
    enabled: !!decks,
  });

  const decksWithDue =
    deckStats?.filter((d) => d.stats.dueCount + d.stats.newCount > 0) ?? [];
  const firstDeckWithDue = decksWithDue[0];
  const isLoading = decksLoading || statsLoading;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Text className="text-3xl font-bold text-text-primary">Recall</Text>
          <Text className="text-subtext text-sm mt-1">
            Study smarter, not harder.
          </Text>
        </View>

        {/* Streak Banner */}
        <View className="mx-6 mb-6 bg-surface rounded-2xl p-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-full bg-[#FF6B3520] items-center justify-center">
              <Flame size={28} color="#FF6B35" />
            </View>
            <View>
              <Text className="text-text-primary text-2xl font-bold">
                {currentStreak} day{currentStreak !== 1 ? "s" : ""}
              </Text>
              <Text className="text-subtext text-xs">Current streak</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xp text-xl font-bold">{totalXP}</Text>
            <Text className="text-subtext text-xs">Total XP</Text>
          </View>
        </View>

        {/* Due Today */}
        <View className="px-6 mb-4">
          <Text className="text-text-primary text-xl font-bold mb-3">
            Due Today
          </Text>

          {isLoading ? (
            <ActivityIndicator color="#6C63FF" />
          ) : decksWithDue.length === 0 ? (
            <View className="bg-surface rounded-2xl p-6 items-center">
              <Text className="text-4xl mb-3">🎉</Text>
              <Text className="text-text-primary font-semibold text-base">
                All caught up!
              </Text>
              <Text className="text-subtext text-sm text-center mt-1">
                No cards due right now.{"\n"}Add more decks to keep studying.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {decksWithDue.map(({ deck, stats }) => (
                <TouchableOpacity
                  key={deck.id}
                  onPress={() => router.push(`/study/${deck.id}`)}
                  className="bg-surface rounded-2xl p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-12 h-12 rounded-xl items-center justify-center"
                      style={{ backgroundColor: deck.coverColor ?? "#6C63FF" }}
                    >
                      <Text className="text-2xl">{deck.coverEmoji ?? "📚"}</Text>
                    </View>
                    <View>
                      <Text className="text-text-primary font-semibold">
                        {deck.name}
                      </Text>
                      <View className="flex-row gap-2 mt-1">
                        {stats.newCount > 0 && (
                          <View className="bg-[#6C63FF20] rounded-full px-2 py-0.5">
                            <Text className="text-primary text-xs font-medium">
                              {stats.newCount} new
                            </Text>
                          </View>
                        )}
                        {stats.dueCount > 0 && (
                          <View className="bg-[#4CAF5020] rounded-full px-2 py-0.5">
                            <Text className="text-success text-xs font-medium">
                              {stats.dueCount} due
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#8888AA" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Study All button */}
        {decksWithDue.length > 0 && (
          <View className="px-6">
            <TouchableOpacity
              className="bg-primary rounded-2xl py-4 items-center"
              onPress={() =>
                router.push(`/study/${firstDeckWithDue.deck.id}`)
              }
            >
              <Text className="text-white font-bold text-base">
                Study All Due Cards
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
