import React, { useEffect } from "react"
import { Stack } from "expo-router"
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue"
import { DataProvider } from "../context/DataContext"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { theme } from "../src/styles/theme"
import * as SplashScreen from "expo-splash-screen"
import Collapsible from "react-native-collapsible"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <DataProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen
            name="project/[id]"
            options={{
              headerShown: false,
              presentation: "modal",
            }}
          />
          <Stack.Screen
            name="user/[id]"
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
        </Stack>
      </DataProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
})

