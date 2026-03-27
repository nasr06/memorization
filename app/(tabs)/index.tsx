import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-5xl mb-4">🔥</Text>
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Recall
        </Text>
        <Text className="text-base text-gray-500 dark:text-gray-400 text-center">
          Your spaced repetition companion.{"\n"}Study smarter, not harder.
        </Text>
      </View>
    </SafeAreaView>
  );
}
