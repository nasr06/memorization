import { useState, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, Bold, Italic, Underline, Image, Music, Minus, Eye, Edit3 } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { createNoteWithCard } from "@/db/queries/notes";
import { CardRenderer } from "@/components/CardRenderer";

type Field = "front" | "back";
type TabMode = "edit" | "preview";

// Convert [sound:file] to <audio controls> so CardRenderer shows it in preview
function toPreviewHtml(text: string): string {
  return text.replace(/\[sound:(.*?)\]/g, (_, f) => `<audio src="${f}" controls></audio>`);
}

export default function NewCardScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [activeField, setActiveField] = useState<Field>("front");
  const [tab, setTab] = useState<TabMode>("edit");
  const [addedCount, setAddedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const frontRef = useRef<TextInput>(null);
  const backRef = useRef<TextInput>(null);
  const frontSelection = useRef({ start: 0, end: 0 });
  const backSelection = useRef({ start: 0, end: 0 });

  const getValue = (field: Field) => (field === "front" ? front : back);
  const setValue = (field: Field, v: string) =>
    field === "front" ? setFront(v) : setBack(v);
  const getSelection = (field: Field) =>
    field === "front" ? frontSelection : backSelection;

  // Insert text at cursor or wrap selection with open/close tags
  function insertAtCursor(field: Field, open: string, close = "") {
    const val = getValue(field);
    const sel = getSelection(field).current;
    const { start, end } = sel;
    const selected = val.substring(start, end);
    const inserted = open + selected + close;
    const next = val.substring(0, start) + inserted + val.substring(end);
    setValue(field, next);
  }

  async function pickImage(field: Field) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to your photo library to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop() ?? "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const mediaDir = `${FileSystem.documentDirectory}media/${deckId}/`;
    await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
    await FileSystem.copyAsync({ from: asset.uri, to: mediaDir + filename });

    insertAtCursor(field, `<img src="${filename}">`, "");
  }

  async function pickAudio(field: Field) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const filename = asset.name;
    const mediaDir = `${FileSystem.documentDirectory}media/${deckId}/`;
    await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
    await FileSystem.copyAsync({ from: asset.uri, to: mediaDir + filename });

    insertAtCursor(field, `[sound:${filename}]`, "");
  }

  const onSubmit = async () => {
    if (!front.trim()) {
      Alert.alert("Required", "Front side cannot be empty.");
      return;
    }
    if (!back.trim()) {
      Alert.alert("Required", "Back side cannot be empty.");
      return;
    }
    if (!deckId) return;

    setIsSubmitting(true);
    try {
      await createNoteWithCard(deckId, front, back);
      await queryClient.invalidateQueries({ queryKey: ["notes", deckId] });
      await queryClient.invalidateQueries({ queryKey: ["deck-stats", deckId] });
      await queryClient.invalidateQueries({ queryKey: ["decks"] });
      setAddedCount((n) => n + 1);
      setFront("");
      setBack("");
      setTab("edit");
    } catch {
      Alert.alert("Error", "Failed to add card. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Toolbar = ({ field }: { field: Field }) => (
    <View className="flex-row bg-surface rounded-xl mb-2 overflow-hidden">
      {[
        { icon: <Bold size={16} color="#F0F0F5" />, onPress: () => insertAtCursor(field, "<b>", "</b>") },
        { icon: <Italic size={16} color="#F0F0F5" />, onPress: () => insertAtCursor(field, "<i>", "</i>") },
        { icon: <Underline size={16} color="#F0F0F5" />, onPress: () => insertAtCursor(field, "<u>", "</u>") },
        { icon: <Minus size={16} color="#F0F0F5" />, onPress: () => insertAtCursor(field, "<hr>", "") },
        { icon: <Image size={16} color="#6C63FF" />, onPress: () => pickImage(field) },
        { icon: <Music size={16} color="#4CAF50" />, onPress: () => pickAudio(field) },
      ].map((btn, i) => (
        <TouchableOpacity
          key={i}
          className="flex-1 py-2 items-center justify-center"
          style={{ borderRightWidth: i < 5 ? 1 : 0, borderRightColor: "#12122a" }}
          onPress={btn.onPress}
        >
          {btn.icon}
        </TouchableOpacity>
      ))}
    </View>
  );

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
            <Text className="text-text-primary text-xl font-bold">Add Card</Text>
          </View>
          <View className="flex-row items-center gap-2">
            {addedCount > 0 && (
              <View className="flex-row items-center gap-1 bg-[#4CAF5020] rounded-full px-3 py-1">
                <CheckCircle size={14} color="#4CAF50" />
                <Text className="text-success text-xs font-medium">{addedCount} added</Text>
              </View>
            )}
            {/* Edit / Preview toggle */}
            <View className="flex-row bg-surface rounded-xl overflow-hidden">
              <TouchableOpacity
                className={`px-3 py-2 flex-row items-center gap-1 ${tab === "edit" ? "bg-primary" : ""}`}
                onPress={() => setTab("edit")}
              >
                <Edit3 size={14} color={tab === "edit" ? "#fff" : "#8888AA"} />
                <Text className={`text-xs font-medium ${tab === "edit" ? "text-white" : "text-subtext"}`}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`px-3 py-2 flex-row items-center gap-1 ${tab === "preview" ? "bg-primary" : ""}`}
                onPress={() => setTab("preview")}
              >
                <Eye size={14} color={tab === "preview" ? "#fff" : "#8888AA"} />
                <Text className={`text-xs font-medium ${tab === "preview" ? "text-white" : "text-subtext"}`}>Preview</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {tab === "edit" ? (
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
              <Toolbar field="front" />
              <TextInput
                ref={frontRef}
                className="bg-surface rounded-xl px-4 py-3 text-text-primary"
                placeholder="Question or term... (HTML supported)"
                placeholderTextColor="#8888AA"
                onFocus={() => setActiveField("front")}
                onChangeText={setFront}
                onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
                  frontSelection.current = e.nativeEvent.selection;
                }}
                value={front}
                multiline
                style={{ textAlignVertical: "top", minHeight: 120, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
              />
            </View>

            {/* Back */}
            <View className="mb-6">
              <Text className="text-text-primary font-semibold mb-2">
                Back <Text className="text-danger">*</Text>
              </Text>
              <Toolbar field="back" />
              <TextInput
                ref={backRef}
                className="bg-surface rounded-xl px-4 py-3 text-text-primary"
                placeholder="Answer or definition... (HTML supported)"
                placeholderTextColor="#8888AA"
                onFocus={() => setActiveField("back")}
                onChangeText={setBack}
                onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
                  backSelection.current = e.nativeEvent.selection;
                }}
                value={back}
                multiline
                style={{ textAlignVertical: "top", minHeight: 120, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
              />
            </View>

            <TouchableOpacity
              className={`rounded-2xl py-4 items-center ${isSubmitting ? "bg-primary/50" : "bg-primary"}`}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text className="text-white font-bold text-base">
                {isSubmitting ? "Adding..." : "Add Card"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* Preview */
          <View className="flex-1 px-6 gap-4">
            <View className="flex-1">
              <Text className="text-subtext text-xs font-semibold uppercase mb-2 tracking-widest">Front</Text>
              <View className="flex-1 bg-card rounded-3xl p-4">
                <CardRenderer content={toPreviewHtml(front) || "<i style='color:#8888AA'>Nothing yet</i>"} deckId={deckId} />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-subtext text-xs font-semibold uppercase mb-2 tracking-widest">Back</Text>
              <View className="flex-1 bg-surface rounded-3xl p-4">
                <CardRenderer content={toPreviewHtml(back) || "<i style='color:#8888AA'>Nothing yet</i>"} deckId={deckId} />
              </View>
            </View>
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center mb-6 ${isSubmitting ? "bg-primary/50" : "bg-primary"}`}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text className="text-white font-bold text-base">
                {isSubmitting ? "Adding..." : "Add Card"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
