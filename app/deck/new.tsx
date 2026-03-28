import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react-native";
import { createDeck } from "@/db/queries/decks";

const EMOJI_OPTIONS = ["📚", "🎯", "🔬", "🌍", "💻", "🎨", "🎵", "⚡"];

const COLOR_OPTIONS = [
  "#6C63FF",
  "#FF6B35",
  "#4CAF50",
  "#FF9800",
  "#F44336",
  "#00BCD4",
];

const schema = z.object({
  name: z.string().min(1, "Deck name is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewDeckScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedEmoji, setSelectedEmoji] = useState("📚");
  const [selectedColor, setSelectedColor] = useState("#6C63FF");

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const deck = await createDeck({
        name: values.name,
        description: values.description || undefined,
        coverColor: selectedColor,
        coverEmoji: selectedEmoji,
      });
      await queryClient.invalidateQueries({ queryKey: ["decks"] });
      router.replace(`/deck/${deck.id}`);
    } catch (err) {
      Alert.alert("Error", "Failed to create deck. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-4 pb-4 gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center"
        >
          <ArrowLeft size={20} color="#F0F0F5" />
        </TouchableOpacity>
        <Text className="text-text-primary text-xl font-bold">New Deck</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Emoji preview */}
        <View className="items-center my-6">
          <View
            className="w-24 h-24 rounded-3xl items-center justify-center"
            style={{ backgroundColor: selectedColor }}
          >
            <Text className="text-5xl">{selectedEmoji}</Text>
          </View>
        </View>

        {/* Emoji picker */}
        <Text className="text-text-primary font-semibold mb-2">Icon</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {EMOJI_OPTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => setSelectedEmoji(emoji)}
              className={`w-14 h-14 rounded-xl items-center justify-center ${
                selectedEmoji === emoji ? "bg-primary" : "bg-surface"
              }`}
            >
              <Text className="text-2xl">{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color picker */}
        <Text className="text-text-primary font-semibold mb-2">Color</Text>
        <View className="flex-row gap-3 mb-6">
          {COLOR_OPTIONS.map((color) => (
            <TouchableOpacity
              key={color}
              onPress={() => setSelectedColor(color)}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{
                backgroundColor: color,
                borderWidth: selectedColor === color ? 3 : 0,
                borderColor: "#F0F0F5",
              }}
            />
          ))}
        </View>

        {/* Deck Name */}
        <Text className="text-text-primary font-semibold mb-2">
          Deck Name <Text className="text-danger">*</Text>
        </Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="bg-surface rounded-xl px-4 py-3 text-text-primary mb-1"
              placeholder="e.g. Spanish Vocabulary"
              placeholderTextColor="#8888AA"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.name && (
          <Text className="text-danger text-xs mb-3">{errors.name.message}</Text>
        )}

        {/* Description */}
        <Text className="text-text-primary font-semibold mb-2 mt-4">
          Description{" "}
          <Text className="text-subtext text-xs font-normal">(optional)</Text>
        </Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="bg-surface rounded-xl px-4 py-3 text-text-primary"
              placeholder="What will you study?"
              placeholderTextColor="#8888AA"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              multiline
              numberOfLines={3}
              style={{ textAlignVertical: "top" }}
            />
          )}
        />

        {/* Submit */}
        <TouchableOpacity
          className={`mt-8 rounded-2xl py-4 items-center ${
            isSubmitting ? "bg-primary/50" : "bg-primary"
          }`}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "Creating..." : "Create Deck"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
