"use client"

import { useState, useEffect } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { useLocalSearchParams, useRouter, Stack } from "expo-router"
import { useData } from "../../../context/DataContext"
import PostPageComponent from "../../../components/PostPageComponent"
import { theme } from "../../../src/styles/theme"
import type { ForumPost, Project } from "../../../src/utils/types"

export default function ProjectForumPostPage() {
  const { id, projectId } = useLocalSearchParams()
  const router = useRouter()
  const { getForumPosts, getProjectById, currentUser } = useData()
  const [post, setPost] = useState<ForumPost | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPostAndProject = async () => {
      try {
        if (!projectId) {
          throw new Error("Project ID is required")
        }
        const [forumPosts, fetchedProject] = await Promise.all([
          getForumPosts(projectId as string),
          getProjectById(projectId as string),
        ])
        const foundPost = forumPosts.find((p) => p.id === id)

        if (!foundPost) {
          throw new Error("Post not found")
        }

        if (!fetchedProject) {
          throw new Error("Project not found")
        }

        setPost(foundPost)
        setProject(fetchedProject)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load post")
        console.error("Error fetching forum post:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPostAndProject()
  }, [id, projectId, getForumPosts, getProjectById])

  if (isLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  if (error || !post || !project) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}
      >
        <Text style={{ color: theme.colors.error, marginBottom: 16 }}>{error || "Post or project not found"}</Text>
        <Text style={{ color: theme.colors.primary }} onPress={() => router.back()}>
          Go Back
        </Text>
      </View>
    )
  }

  const isOP = post.userId === currentUser?.id
  const isProjectCreator = project.creatorId === currentUser?.id

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PostPageComponent
        postId={id as string}
        projectId={projectId as string}
        isProjectPost={true}
        project={project}
        post={post}
        isOP={isOP}
        isProjectCreator={isProjectCreator}
        onBack={() => router.back()}
      />
    </>
  )
}

