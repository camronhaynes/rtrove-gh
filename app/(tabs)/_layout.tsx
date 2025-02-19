"use client"
import { Tabs } from "expo-router"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Link, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Play, User, Bell } from "lucide-react-native"
import { DataProvider, useData } from "../../context/DataContext"
import { theme } from "../../src/styles/theme"

function Header() {
  const { isAuthenticated, currentUser, logout } = useData()
  const router = useRouter()

  return (
    <SafeAreaView edges={["top"]} style={styles.header}>
      <View style={styles.headerWrapper}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeftThird}>
            <Text style={styles.headerText}>RTROVE</Text>
          </View>
          <View style={styles.headerRightThird}>
            {isAuthenticated && currentUser && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    /* Handle notification press */
                  }}
                  style={styles.iconButton}
                >
                  <View style={styles.iconCircle}>
                    <Bell size={18} color={theme.colors.primary} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push(`/user/${currentUser.id}`)} style={styles.iconButton}>
                  <View style={styles.iconCircle}>
                    <User size={18} color={theme.colors.primary} />
                  </View>
                </TouchableOpacity>
              </>
            )}
            {isAuthenticated ? (
              <TouchableOpacity onPress={logout}>
                <Text style={styles.loginText}>LOGOUT</Text>
              </TouchableOpacity>
            ) : (
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginText}>LOGIN</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

function TabLayoutContent() {
  const { isAuthenticated } = useData()
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Header />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: "rgba(196, 220, 229, 0.3)",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "my trove",
            tabBarIcon: ({ color }) => (
              <View style={styles.tabItemContainer}>
                <View style={styles.tabContent}>
                  <Play size={14} color={color} style={styles.playIcon} />
                  <Text style={[styles.tabText, { color }]}>my trove</Text>
                </View>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen
          name="creators"
          options={{
            title: "CREATORS",
            tabBarIcon: ({ color }) => (
              <View style={styles.tabItemContainer}>
                <View style={[styles.divider, styles.leftDivider]} />
                <View style={styles.tabContent}>
                  <Play size={14} color={color} style={styles.playIcon} />
                  <Text style={[styles.tabText, { color }]}>main</Text>
                </View>
                <View style={[styles.divider, styles.rightDivider]} />
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
      </Tabs>
    </View>
  )
}

export default function TabLayout() {
  return (
    <DataProvider>
      <TabLayoutContent />
    </DataProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.background,
  },
  headerWrapper: {
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
  },
  headerContainer: {
    flexDirection: "row",
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  headerLeftThird: {
    flex: 1,
  },
  headerRightThird: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 15,
  },
  headerText: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 36,
    color: theme.colors.primary,
  },
  tabBar: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: "rgba(196, 220, 229, 0.1)",
    height: 60,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItemContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 49,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  playIcon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(196, 882, 229, 0.1)",
    position: "absolute",
  },
  leftDivider: {
    left: 0,
  },
  rightDivider: {
    right: 0,
  },
  loginText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  iconButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(196, 220, 229, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
})

