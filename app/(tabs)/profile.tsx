import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-500 dark:text-gray-400">
          Profile — coming in Phase 3
        </Text>
      </View>
    </SafeAreaView>
  );
}
