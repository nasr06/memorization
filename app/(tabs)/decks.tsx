import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, ChevronRight, PackageOpen } from "lucide-react-native";
import { getAllDecks, getDeckStats } from "@/db/queries/decks";
import type { Deck } from "@/db/schema";
import type { DeckStats } from "@/db/queries/decks";

interface DeckWithStats {
  deck: Deck;
  stats: DeckStats;
}

export default function DecksScreen() {
  const router = useRouter();

  const { data: decks, isLoading: decksLoading } = useQuery({
    queryKey: ["decks"],
    queryFn: getAllDecks,
  });

  const { data: deckStats, isLoading: statsLoading } = useQuery({
    queryKey: ["deck-stats-all", decks?.map((d) => d.id)],
    queryFn: async (): Promise<DeckWithStats[]> => {
      if (!decks) return [];
      return Promise.all(
        decks.map(async (deck) => ({
          deck,
          stats: await getDeckStats(deck.id),
        }))
      );
    },
    enabled: !!decks,
  });

  const isLoading = decksLoading || statsLoading;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-6 pb-4">
        <Text className="text-3xl font-bold text-text-primary">My Decks</Text>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => router.push("/import")}
            className="bg-surface rounded-full w-10 h-10 items-center justify-center"
          >
            <PackageOpen size={20} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/deck/new")}
            className="bg-primary rounded-full w-10 h-10 items-center justify-center"
          >
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#6C63FF" />
        </View>
      ) : (
        <FlatList
          data={deckStats ?? []}
          keyExtractor={(item) => item.deck.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-24">
              <Text className="text-5xl mb-4">📚</Text>
              <Text className="text-text-primary font-semibold text-lg text-center">
                No decks yet.
              </Text>
              <Text className="text-subtext text-sm text-center mt-2">
                Create your first deck!
              </Text>
              <TouchableOpacity
                className="mt-6 bg-primary rounded-2xl px-6 py-3"
                onPress={() => router.push("/deck/new")}
              >
                <Text className="text-white font-bold">Create Deck</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="mt-3 bg-surface rounded-2xl px-6 py-3"
                onPress={() => router.push("/import")}
              >
                <Text className="text-primary font-bold">Import .apkg</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: { deck, stats } }) => (
            <TouchableOpacity
              onPress={() => router.push(`/deck/${deck.id}`)}
              className="bg-surface rounded-2xl p-4 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{ backgroundColor: deck.coverColor ?? "#6C63FF" }}
                >
                  <Text className="text-3xl">{deck.coverEmoji ?? "📚"}</Text>
                </View>
                <View>
                  <Text className="text-text-primary font-semibold text-base">
                    {deck.name}
                  </Text>
                  <View className="flex-row gap-2 mt-1">
                    <Text className="text-subtext text-xs">
                      {stats.totalCount} cards
                    </Text>
                    {stats.newCount + stats.dueCount > 0 && (
                      <View className="bg-[#6C63FF20] rounded-full px-2 py-0.5">
                        <Text className="text-primary text-xs font-medium">
                          {stats.newCount + stats.dueCount} to study
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <ChevronRight size={20} color="#8888AA" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
