import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Plus, Trash2, Play, Share2 } from "lucide-react-native";
import { getDeckById, getDeckStats, deleteDeck } from "@/db/queries/decks";
import { getNotesByDeck } from "@/db/queries/notes";
import { exportApkg } from "@/lib/apkg/export";

export default function DeckDetailScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: deck, isLoading: deckLoading } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: () => getDeckById(deckId),
  });

  const { data: stats } = useQuery({
    queryKey: ["deck-stats", deckId],
    queryFn: () => getDeckStats(deckId),
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ["notes", deckId],
    queryFn: () => getNotesByDeck(deckId),
  });

  const handleExport = async () => {
    try {
      await exportApkg(deckId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      Alert.alert("Export Failed", msg);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Deck",
      "Are you sure you want to delete this deck and all its cards?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteDeck(deckId);
            await queryClient.invalidateQueries({ queryKey: ["decks"] });
            router.back();
          },
        },
      ]
    );
  };

  if (deckLoading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#6C63FF" />
      </SafeAreaView>
    );
  }

  if (!deck) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-text-primary">Deck not found.</Text>
      </SafeAreaView>
    );
  }

  const parsedFields = (fieldsStr: string | null | undefined): Record<string, string> => {
    if (!fieldsStr) return {};
    try { return JSON.parse(fieldsStr); } catch { return {}; }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center"
        >
          <ArrowLeft size={20} color="#F0F0F5" />
        </TouchableOpacity>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={handleExport}
            className="w-10 h-10 rounded-full bg-surface items-center justify-center"
          >
            <Share2 size={18} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="w-10 h-10 rounded-full bg-surface items-center justify-center"
          >
            <Trash2 size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Deck Hero */}
        <View className="items-center px-6 pb-6">
          <View
            className="w-24 h-24 rounded-3xl items-center justify-center mb-4"
            style={{ backgroundColor: deck.coverColor ?? "#6C63FF" }}
          >
            <Text className="text-5xl">{deck.coverEmoji ?? "📚"}</Text>
          </View>
          <Text className="text-text-primary text-2xl font-bold text-center">
            {deck.name}
          </Text>
          {deck.description ? (
            <Text className="text-subtext text-sm text-center mt-2">
              {deck.description}
            </Text>
          ) : null}
        </View>

        {/* Stats row */}
        {stats && (
          <View className="flex-row mx-6 mb-6 gap-3">
            <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
              <Text className="text-text-primary text-2xl font-bold">
                {stats.totalCount}
              </Text>
              <Text className="text-subtext text-xs mt-1">Total</Text>
            </View>
            <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
              <Text className="text-primary text-2xl font-bold">
                {stats.newCount}
              </Text>
              <Text className="text-subtext text-xs mt-1">New</Text>
            </View>
            <View className="flex-1 bg-surface rounded-2xl p-4 items-center">
              <Text className="text-success text-2xl font-bold">
                {stats.dueCount}
              </Text>
              <Text className="text-subtext text-xs mt-1">Due</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-row mx-6 mb-6 gap-3">
          <TouchableOpacity
            className="flex-1 bg-primary rounded-2xl py-4 flex-row items-center justify-center gap-2"
            onPress={() => router.push(`/study/${deckId}`)}
          >
            <Play size={18} color="#fff" />
            <Text className="text-white font-bold">Study</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-surface rounded-2xl py-4 flex-row items-center justify-center gap-2"
            onPress={() => router.push(`/card/new?deckId=${deckId}`)}
          >
            <Plus size={18} color="#6C63FF" />
            <Text className="text-primary font-bold">Add Card</Text>
          </TouchableOpacity>
        </View>

        {/* Cards list */}
        <View className="px-6">
          <Text className="text-text-primary text-lg font-bold mb-3">
            Cards{" "}
            <Text className="text-subtext text-base font-normal">
              ({notes?.length ?? 0})
            </Text>
          </Text>

          {notesLoading ? (
            <ActivityIndicator color="#6C63FF" />
          ) : notes?.length === 0 ? (
            <View className="bg-surface rounded-2xl p-6 items-center">
              <BookOpen size={32} color="#8888AA" />
              <Text className="text-subtext text-sm text-center mt-3">
                No cards yet.{"\n"}Add your first card!
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {notes?.map(({ id, fields }) => {
                const parsed = parsedFields(fields);
                return (
                  <View
                    key={id}
                    className="bg-surface rounded-xl px-4 py-3"
                  >
                    <Text
                      className="text-text-primary font-medium"
                      numberOfLines={1}
                    >
                      {parsed["Front"] ?? "—"}
                    </Text>
                    <Text
                      className="text-subtext text-sm mt-1"
                      numberOfLines={1}
                    >
                      {parsed["Back"] ?? "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
