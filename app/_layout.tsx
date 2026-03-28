import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { queryClient } from "@/lib/queryClient";
import { runMigrations } from "@/db/migrate";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [migrationsReady, setMigrationsReady] = useState(false);

  useEffect(() => {
    runMigrations()
      .then(() => {
        setMigrationsReady(true);
        SplashScreen.hideAsync();
      })
      .catch((err) => {
        console.error("Migration failed:", err);
        setMigrationsReady(true);
        SplashScreen.hideAsync();
      });
  }, []);

  if (!migrationsReady) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Text className="text-text-primary text-base">Loading...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView className="flex-1">
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          <Stack.Screen
            name="deck/[deckId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="deck/new"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="card/new"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="study/[deckId]"
            options={{ headerShown: false }}
          />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
