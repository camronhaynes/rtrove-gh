"use client"

import { useState, useEffect } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { useLocalSearchParams, useRouter, Stack } from "expo-router"
import { useData } from "../../../context/DataContext"
import PostPageComponent from "../../../components/PostPageComponent"
import { theme } from "../../../src/styles/theme"
import type { Post } from "../../../src/utils/types"

export default function UserPostPage() {
  const { id, userId } = useLocalSearchParams()
  const router = useRouter()
  const { getUserPosts } = useData()
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        if (!userId) {
          throw new Error("User ID is required")
        }
        const userPosts = getUserPosts(userId as string)
        const foundPost = userPosts.find((p) => p.id === id)

        if (!foundPost) {
          throw new Error("Post not found")
        }

        setPost(foundPost)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post")
        console.error("Error fetching user post:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [id, userId, getUserPosts])

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  if (error || !post) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}
      >
        <Text style={{ color: theme.colors.error, marginBottom: 16 }}>{error || "Post not found"}</Text>
        <Text style={{ color: theme.colors.primary }} onPress={() => router.back()}>
          Go Back
        </Text>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PostPageComponent
        postId={id as string}
        userId={userId as string}
        isProjectPost={false}
        post={post}
        onBack={() => router.back()}
      />
    </>
  )
}

