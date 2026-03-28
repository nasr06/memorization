import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle } from "lucide-react-native";
import { createNoteWithCard } from "@/db/queries/notes";

const schema = z.object({
  front: z.string().min(1, "Front side is required"),
  back: z.string().min(1, "Back side is required"),
});

type FormValues = z.infer<typeof schema>;

export default function NewCardScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addedCount, setAddedCount] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { front: "", back: "" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!deckId) {
      Alert.alert("Error", "No deck specified.");
      return;
    }
    try {
      await createNoteWithCard(deckId, values.front, values.back);
      await queryClient.invalidateQueries({ queryKey: ["notes", deckId] });
      await queryClient.invalidateQueries({ queryKey: ["deck-stats", deckId] });
      await queryClient.invalidateQueries({ queryKey: ["decks"] });
      setAddedCount((n) => n + 1);
      reset();
    } catch (err) {
      Alert.alert("Error", "Failed to add card. Please try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-surface items-center justify-center"
            >
              <ArrowLeft size={20} color="#F0F0F5" />
            </TouchableOpacity>
            <Text className="text-text-primary text-xl font-bold">
              Add Card
            </Text>
          </View>
          {addedCount > 0 && (
            <View className="flex-row items-center gap-1 bg-[#4CAF5020] rounded-full px-3 py-1">
              <CheckCircle size={14} color="#4CAF50" />
              <Text className="text-success text-xs font-medium">
                {addedCount} added
              </Text>
            </View>
          )}
        </View>

        <ScrollView
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* Front */}
          <View className="mb-4">
            <Text className="text-text-primary font-semibold mb-2">
              Front <Text className="text-danger">*</Text>
            </Text>
            <Controller
              control={control}
              name="front"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface rounded-xl px-4 py-3 text-text-primary"
                  placeholder="Question or term..."
                  placeholderTextColor="#8888AA"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                  numberOfLines={4}
                  style={{ textAlignVertical: "top", minHeight: 100 }}
                />
              )}
            />
            {errors.front && (
              <Text className="text-danger text-xs mt-1">
                {errors.front.message}
              </Text>
            )}
          </View>

          {/* Back */}
          <View className="mb-6">
            <Text className="text-text-primary font-semibold mb-2">
              Back <Text className="text-danger">*</Text>
            </Text>
            <Controller
              control={control}
              name="back"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface rounded-xl px-4 py-3 text-text-primary"
                  placeholder="Answer or definition..."
                  placeholderTextColor="#8888AA"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  multiline
                  numberOfLines={5}
                  style={{ textAlignVertical: "top", minHeight: 120 }}
                />
              )}
            />
            {errors.back && (
              <Text className="text-danger text-xs mt-1">
                {errors.back.message}
              </Text>
            )}
          </View>

          {/* Add Card Button */}
          <TouchableOpacity
            className={`rounded-2xl py-4 items-center ${
              isSubmitting ? "bg-primary/50" : "bg-primary"
            }`}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            <Text className="text-white font-bold text-base">
              {isSubmitting ? "Adding..." : "Add Card"}
            </Text>
          </TouchableOpacity>

          {addedCount > 0 && (
            <TouchableOpacity
              className="mt-3 rounded-2xl py-4 items-center bg-surface"
              onPress={() => router.back()}
            >
              <Text className="text-subtext font-medium">Done</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
