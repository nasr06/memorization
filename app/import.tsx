import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileDown,
  CheckCircle,
  AlertCircle,
  PackageOpen,
} from "lucide-react-native";
import { importApkg } from "@/lib/apkg/import";
import type { ImportProgress, ImportResult } from "@/lib/apkg/types";

type Stage = "idle" | "importing" | "success" | "error";

export default function ImportScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handlePick = useCallback(async () => {
    let picked;
    try {
      picked = await DocumentPicker.getDocumentAsync({
        type: ["application/zip", "application/octet-stream", "*/*"],
        copyToCacheDirectory: true,
      });
    } catch {
      Alert.alert("Error", "Could not open file picker.");
      return;
    }

    if (picked.canceled || !picked.assets?.[0]) return;

    const file = picked.assets[0];
    const name = file.name ?? "";
    if (!name.endsWith(".apkg") && !name.endsWith(".zip")) {
      Alert.alert(
        "Invalid file",
        "Please select a .apkg file exported from Anki."
      );
      return;
    }

    setStage("importing");
    setProgress({ stage: "extracting", progress: 0, message: "Starting..." });

    const importResult = await importApkg(file.uri, (p) => setProgress(p));

    setResult(importResult);
    setStage(importResult.success ? "success" : "error");

    if (importResult.success) {
      await queryClient.invalidateQueries({ queryKey: ["decks"] });
      await queryClient.invalidateQueries({ queryKey: ["deck-stats-all"] });
    }
  }, [queryClient]);

  const handleReset = useCallback(() => {
    setStage("idle");
    setProgress(null);
    setResult(null);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center"
        >
          <ArrowLeft size={20} color="#F0F0F5" />
        </TouchableOpacity>
        <Text className="text-text-primary text-xl font-bold ml-3">
          Import Deck
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1 px-6"
      >
        {/* IDLE */}
        {stage === "idle" && (
          <View className="flex-1 items-center justify-center pb-8">
            <View className="bg-surface rounded-3xl p-8 w-full items-center mb-6">
              <View className="bg-primary/10 rounded-full p-5 mb-4">
                <PackageOpen size={48} color="#6C63FF" />
              </View>
              <Text className="text-text-primary text-xl font-bold">
                Import Anki Deck
              </Text>
              <Text className="text-subtext text-sm text-center mt-2 leading-5">
                Select a .apkg file exported from Anki to import your decks,
                notes, cards, and scheduling data.
              </Text>
            </View>

            <View className="w-full gap-3">
              <TouchableOpacity
                className="bg-primary rounded-2xl py-4 items-center"
                onPress={handlePick}
              >
                <Text className="text-white font-bold text-base">
                  Choose .apkg File
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-subtext text-xs text-center mt-6 leading-4">
              Supports Anki 2.0+ decks. Scheduling data, tags, and media are
              preserved.
            </Text>
          </View>
        )}

        {/* IMPORTING */}
        {stage === "importing" && progress && (
          <View className="flex-1 items-center justify-center pb-8">
            <View className="bg-surface rounded-3xl p-8 w-full items-center">
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text className="text-text-primary font-semibold text-lg mt-5">
                Importing...
              </Text>
              <Text className="text-subtext text-sm mt-2 text-center">
                {progress.message}
              </Text>
              <View className="w-full bg-card rounded-full h-2 mt-5 overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${Math.round(progress.progress * 100)}%`,
                  }}
                />
              </View>
              <Text className="text-subtext text-xs mt-2">
                {Math.round(progress.progress * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* SUCCESS */}
        {stage === "success" && result && (
          <View className="flex-1 items-center justify-center pb-8">
            <View className="bg-surface rounded-3xl p-8 w-full items-center">
              <CheckCircle size={64} color="#4CAF50" />
              <Text className="text-text-primary text-2xl font-bold mt-4">
                Import Complete!
              </Text>
              <Text className="text-subtext text-sm mt-1">
                {result.deckName}
              </Text>

              <View className="flex-row w-full mt-6 gap-3">
                <View className="flex-1 bg-card rounded-2xl p-4 items-center">
                  <Text className="text-text-primary text-2xl font-bold">
                    {result.noteCount}
                  </Text>
                  <Text className="text-subtext text-xs mt-1">Notes</Text>
                </View>
                <View className="flex-1 bg-card rounded-2xl p-4 items-center">
                  <Text className="text-text-primary text-2xl font-bold">
                    {result.cardCount}
                  </Text>
                  <Text className="text-subtext text-xs mt-1">Cards</Text>
                </View>
                {result.mediaCount > 0 && (
                  <View className="flex-1 bg-card rounded-2xl p-4 items-center">
                    <Text className="text-text-primary text-2xl font-bold">
                      {result.mediaCount}
                    </Text>
                    <Text className="text-subtext text-xs mt-1">Media</Text>
                  </View>
                )}
              </View>

              <Text className="text-xp text-sm font-semibold mt-4">
                +20 XP earned!
              </Text>
            </View>

            <View className="w-full gap-3 mt-4">
              <TouchableOpacity
                className="bg-primary rounded-2xl py-4 items-center"
                onPress={() => router.back()}
              >
                <Text className="text-white font-bold">Go to Decks</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-3 items-center"
                onPress={handleReset}
              >
                <Text className="text-subtext">Import Another Deck</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ERROR */}
        {stage === "error" && result && (
          <View className="flex-1 items-center justify-center pb-8">
            <View className="bg-surface rounded-3xl p-8 w-full items-center">
              <AlertCircle size={64} color="#F44336" />
              <Text className="text-text-primary text-2xl font-bold mt-4">
                Import Failed
              </Text>
              <Text className="text-subtext text-sm mt-2 text-center leading-5">
                {result.error}
              </Text>
            </View>

            <TouchableOpacity
              className="mt-4 bg-primary rounded-2xl py-4 w-full items-center"
              onPress={handleReset}
            >
              <Text className="text-white font-bold">Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
