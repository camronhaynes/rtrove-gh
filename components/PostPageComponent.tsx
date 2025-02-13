"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useRouter } from "expo-router"
import { BlurView } from "expo-blur"
import { ArrowLeft, Send } from "lucide-react-native"
import { useData } from "../context/DataContext"
import { theme } from "../src/styles/theme"
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue"
import type { Post, Comment, ForumPost, ForumComment, Project } from "../src/utils/types"

interface UserBadgeProps {
  isCreator: boolean
  isOP: boolean
}

const UserBadge: React.FC<UserBadgeProps> = ({ isCreator, isOP }) => {
  return (
    <>
      {isCreator && <Text style={[styles.badge, { backgroundColor: theme.colors.primary }]}>Creator</Text>}
      {isOP && <Text style={[styles.badge, { backgroundColor: "plum" }]}>OP</Text>}
    </>
  )
}

interface PostPageProps {
  postId: string
  userId?: string
  projectId?: string
  isProjectPost: boolean
  project?: Project
  post?: ForumPost | Post // Update 1: Added post prop
  onBack?: () => void
}

export default function PostPageComponent({
  postId,
  userId,
  projectId,
  isProjectPost,
  project,
  post: initialPost, // Update 1: Receive initialPost prop
  onBack,
}: PostPageProps) {
  const router = useRouter()
  const {
    getUserPosts,
    getProjectPosts,
    addUserPostComment,
    deleteUserPostComment,
    currentUser,
    likePost,
    unlikePost,
    getForumPosts,
    addForumComment,
    deleteForumComment,
    projects,
  } = useData()

  const [post, setPost] = useState<Post | ForumPost | null>(null)
  const [newReply, setNewReply] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
  })

  const scrollViewRef = useRef<ScrollView>(null)

  const fetchPost = useCallback(async () => {
    try {
      let postData: Post | ForumPost | undefined

      if (isProjectPost && projectId) {
        const forumPosts = await getForumPosts(projectId)
        postData = forumPosts.find((p) => p.id === postId)
      } else if (userId) {
        const userPosts = getUserPosts(userId)
        postData = userPosts.find((p) => p.id === postId)
      }

      if (!postData) {
        throw new Error("Post not found")
      }

      setPost(postData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post")
      console.error("Error fetching post:", err)
    } finally {
      setIsLoading(false)
    }
  }, [postId, projectId, userId, isProjectPost, getUserPosts, getForumPosts])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    if (initialPost) {
      // Update 2: Check for initialPost
      setPost(initialPost)
      setIsLoading(false)
    } else {
      fetchPost()
    }
  }, [fetchPost, initialPost]) // Update 2: Added initialPost to dependency array

  const handleAddReply = async () => {
    if (!newReply.trim() || !post || !currentUser) {
      return
    }

    try {
      if (isProjectPost && projectId) {
        await addForumComment(projectId, post.id, newReply, currentUser.id, currentUser.username, null)
      } else {
        await addUserPostComment(post.id, newReply, currentUser.id, currentUser.username)
      }

      setNewReply("")
      fetchPost() // Refresh the post to get updated comments

      // Scroll to the bottom after adding the new reply
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (err) {
      console.error("Error adding reply:", err)
      Alert.alert("Error", "Failed to add reply. Please try again.")
    }
  }

  const handleDeleteReply = async (commentId: string) => {
    if (!post) return

    try {
      if (isProjectPost) {
        await deleteForumComment(commentId)
      } else {
        await deleteUserPostComment(post.id, commentId)
      }
      fetchPost() // Refresh the post to get updated comments
    } catch (err) {
      console.error("Error deleting reply:", err)
      Alert.alert("Error", "Failed to delete reply. Please try again.")
    }
  }

  const handleToggleLike = async () => {
    if (!post || !currentUser) return

    try {
      if ("likes" in post) {
        if (post.likes.includes(currentUser.id)) {
          await unlikePost(post.id, currentUser.id)
        } else {
          await likePost(post.id, currentUser.id)
        }
        fetchPost() // Refresh the post to get updated likes
      }
    } catch (err) {
      console.error("Error toggling like:", err)
      Alert.alert("Error", "Failed to update like status. Please try again.")
    }
  }

  const renderReply = ({ item }: { item: Comment | ForumComment }) => {
    const canDelete = currentUser?.id && (currentUser.id === item.userId || currentUser.id === post?.userId)
    const isCreator = project && item.userId === project.creatorId
    const isOP = item.userId === post?.userId

    return (
      <BlurView
        intensity={30}
        tint="dark"
        style={[
          styles.replyContainer,
          (isCreator || isOP) && { borderLeftWidth: 3, borderLeftColor: isCreator ? theme.colors.primary : "plum" },
        ]}
      >
        <View style={styles.replyHeader}>
          <Text style={styles.replyUsername}>{item.username}</Text>
          {isCreator && <Text style={[styles.badge, { backgroundColor: theme.colors.primary }]}>Creator</Text>}
          {isOP && <Text style={[styles.badge, { backgroundColor: "plum" }]}>OP</Text>}
        </View>
        <Text style={styles.replyContent}>{item.content}</Text>
        <View style={styles.replyFooter}>
          <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
          <View style={styles.badgeContainer}>
            {canDelete && (
              <TouchableOpacity onPress={() => handleDeleteReply(item.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BlurView>
    )
  }

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={theme.colors.primary} size={24} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const getPostTitle = () => {
    if (!post) return ""
    if ("subject" in post) return post.subject
    if ("title" in post) return post.title
    return "Post"
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={styles.container}>
        <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.backButton}>
            <ArrowLeft color={theme.colors.primary} size={24} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{getPostTitle()}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : post ? (
          <>
            <ScrollView
              style={styles.content}
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              <BlurView intensity={30} tint="dark" style={styles.postContainer}>
                <Text style={styles.postTitle}>{getPostTitle()}</Text>
                <Text style={styles.postContent}>{post.content}</Text>
                <View style={styles.postInfo}>
                  <Text style={styles.postInfoText}>
                    Posted by {"username" in post ? post.username : "Unknown"} on{" "}
                    {new Date("timestamp" in post ? post.timestamp : post.createdAt).toLocaleString()}
                  </Text>
                  {"likes" in post && (
                    <TouchableOpacity onPress={handleToggleLike} style={styles.likeButton}>
                      <Text style={styles.likeCount}>{post.likes.length} likes</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </BlurView>
              <Text style={styles.repliesHeader}>Replies</Text>
              <FlatList
                data={"comments" in post ? post.comments : []}
                renderItem={renderReply}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text style={styles.emptyRepliesText}>No replies yet. Be the first to reply!</Text>}
                scrollEnabled={false}
              />
            </ScrollView>
            <BlurView intensity={30} tint="dark" style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                value={newReply}
                onChangeText={setNewReply}
                placeholder="Write a reply..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline={false}
                numberOfLines={1}
              />
              <TouchableOpacity onPress={handleAddReply} style={styles.sendButton}>
                <Send size={20} color={theme.colors.white} />
              </TouchableOpacity>
            </BlurView>
          </>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  backButtonText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 16,
  },
  title: {
    fontFamily: "BebasNeue_400Regular",
    fontSize: 36,
    color: theme.colors.text,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  postContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  postTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
  },
  postInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postInfoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  likeButton: {
    padding: 4,
  },
  likeCount: {
    fontSize: 12,
    color: theme.colors.primary,
  },
  repliesHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 16,
  },
  replyContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  replyUsername: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
  },
  replyContent: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  replyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteButton: {
    marginRight: 8,
  },
  deleteButtonText: {
    color: theme.colors.error,
    fontSize: 12,
  },
  emptyRepliesText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
  replyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  replyInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: theme.colors.text,
    marginRight: 8,
    height: 40,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 20,
  },
  badge: {
    color: theme.colors.white,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden" as const,
    marginLeft: 6,
    marginRight: 4,
  },
})

