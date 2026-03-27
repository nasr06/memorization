import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function DecksScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-500 dark:text-gray-400">
          Decks — coming in Phase 1
        </Text>
      </View>
    </SafeAreaView>
  );
}
