import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          This screen doesn't exist.
        </Text>
        <Link href="/" className="text-primary-500">
          Go to home screen
        </Link>
      </View>
    </>
  );
}
