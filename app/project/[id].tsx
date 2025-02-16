"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from "react-native"
import { useLocalSearchParams, useRouter, Link } from "expo-router"
import { BlurView } from "expo-blur"
import { ArrowLeft, Heart, Send, ChevronDown, ChevronUp, Pencil, Check, Trash2, Plus, X } from "lucide-react-native"
import { useFonts, BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue"
import Collapsible from "react-native-collapsible"
import FundraisingComponent from "../../components/FundraisingComponent"

import { useData } from "../../context/DataContext"
import { theme } from "../../src/styles/theme"
import type { Project, Chat, User, ForumPost } from "../../src/utils/types"
import { ConfirmationDialog } from "../../components/ConfirmationDialog"

const renderChatItem = (
  item: Chat,
  users: User[],
  project: Project | null,
  currentUser: User | null,
  handleDeleteChat: (chatId: string) => void,
) => {
  const chatUser = users.find((user) => user.id === item.userId)
  const isCreator = item.userId === project?.creatorId
  const canDelete = currentUser?.id === item.userId || currentUser?.id === project?.creatorId
  return (
    <View style={[styles.chatItem, isCreator && styles.creatorChatItem]}>
      <View style={styles.chatItemHeader}>
        <Text style={styles.chatItemUser}>{chatUser?.username || "Unknown User"}</Text>
        <Text style={styles.chatItemTimestamp}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={styles.chatItemContent}>{item.content}</Text>
      <View style={styles.chatItemFooter}>
        {canDelete && (
          <TouchableOpacity onPress={() => handleDeleteChat(item.id)}>
            <Text style={styles.deleteButton}>Delete</Text>
          </TouchableOpacity>
        )}
        {isCreator && <Text style={styles.creatorBadge}>Creator</Text>}
      </View>
    </View>
  )
}

export default function ProjectPage() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const {
    currentUser,
    toggleProjectParticipation,
    likeProject,
    unlikeProject,
    addChat,
    getProjectChats,
    deleteChat,
    getProjectById,
    users,
    editProject,
    getForumPosts,
    addForumPost,
    addForumComment,
    deleteForumPost,
    projects,
    updateProject,
  } = useData()

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id])

  const [isParticipant, setIsParticipant] = useState(false)
  const [activeTab, setActiveTab] = useState("feed")
  const [newChat, setNewChat] = useState("")
  const [chats, setChats] = useState<Chat[]>([])
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProject, setEditedProject] = useState<Partial<Project>>({})
  const scrollViewRef = useRef<ScrollView>(null)
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
  })

  // Forum state
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [newPostTitle, setNewPostTitle] = useState("")
  const [newPostContent, setNewPostContent] = useState("")
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null)
  const [newComment, setNewComment] = useState("")
  const [modalVisible, setModalVisible] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [fundraisingGoal, setFundraisingGoal] = useState(() => project?.fundraisingGoal?.toString() || "")

  const joinedUsers = useMemo(
    () => users.filter((user) => project?.collaborators.includes(user.id)),
    [users, project?.collaborators],
  )

  useEffect(() => {
    const fetchProjectAndChats = async () => {
      if (project) {
        setEditedProject(project)
        setIsParticipant(project.collaborators.includes(currentUser?.id || ""))
      }
      const fetchedChats = await getProjectChats(id as string)
      setChats(fetchedChats)
      const fetchedForumPosts = await getForumPosts(id as string)
      setForumPosts(fetchedForumPosts)
    }
    fetchProjectAndChats()
  }, [id, getProjectChats, currentUser, getForumPosts, project])

  const handleParticipation = async () => {
    if (project && currentUser) {
      await toggleProjectParticipation(project.id, currentUser.id)
      setIsParticipant(!isParticipant)
    }
  }

  const handleLike = async () => {
    if (project && currentUser) {
      const isCurrentlyLiked = project.likes.includes(currentUser.id)
      const updatedLikes = isCurrentlyLiked
        ? project.likes.filter((userId) => userId !== currentUser.id)
        : [...project.likes, currentUser.id]

      const updatedProject = { ...project, likes: updatedLikes }

      try {
        if (isCurrentlyLiked) {
          await unlikeProject(currentUser.id, project.id)
        } else {
          await likeProject(currentUser.id, project.id)
        }
        // Update the project in the global state
        updateProject(updatedProject)
      } catch (error) {
        console.error("Error toggling like:", error)
        Alert.alert("Error", "Failed to update like status. Please try again.")
      }
    }
  }

  const handleChatSubmit = async () => {
    if (project && currentUser && newChat.trim() !== "") {
      const newChatMessage: Chat = {
        id: Date.now().toString(), // Temporary ID
        projectId: project.id,
        userId: currentUser.id,
        content: newChat,
        createdAt: Date.now(),
      }

      // Optimistic update
      setChats((prevChats) => [...prevChats, newChatMessage])
      setNewChat("")

      try {
        await addChat(project.id, currentUser.id, newChat)
        // Fetch updated chats to ensure consistency
        const updatedChats = await getProjectChats(project.id)
        setChats(updatedChats)
      } catch (error) {
        console.error("Error adding chat:", error)
        // Revert optimistic update on error
        setChats((prevChats) => prevChats.filter((chat) => chat.id !== newChatMessage.id))
        Alert.alert("Error", "Failed to send message. Please try again.")
      }

      // Scroll to the bottom of the feed
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId)
      // Update the local state after successful deletion
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId))
    } catch (error) {
      console.error("Error deleting chat:", error)
      Alert.alert("Error", "Failed to delete message. Please try again.")
    }
  }

  const toggleCollapsible = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleEditSave = async () => {
    if (isEditing && project) {
      try {
        await editProject(project.id, editedProject)
        const updatedProject = { ...project, ...editedProject }
        // Update the project in the global state
        updateProject(updatedProject)
        setIsEditing(false)
      } catch (error) {
        console.error("Error saving project:", error)
        Alert.alert("Error", "Failed to save project changes. Please try again.")
      }
    } else {
      setIsEditing(true)
    }
  }

  const handleInputChange = (key: keyof Project, value: string) => {
    setEditedProject((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveFundraisingGoal = async () => {
    if (project && currentUser && currentUser.id === project.creatorId) {
      try {
        const updatedProject = { ...project, fundraisingGoal: Number.parseFloat(fundraisingGoal) || 0 }
        await editProject(project.id, { fundraisingGoal: Number.parseFloat(fundraisingGoal) || 0 })
        updateProject(updatedProject)
        Alert.alert("Success", "Fundraising goal updated successfully")
      } catch (error) {
        console.error("Error saving fundraising goal:", error)
        Alert.alert("Error", "Failed to save fundraising goal. Please try again.")
      }
    }
  }

  // Forum functions
  const handleCreatePost = async () => {
    if (newPostTitle.trim() && newPostContent.trim() && currentUser && project) {
      try {
        await addForumPost(project.id, newPostTitle, newPostContent, currentUser.id, currentUser.username)
        const updatedPosts = await getForumPosts(project.id)
        setForumPosts(updatedPosts)
        setNewPostTitle("")
        setNewPostContent("")
        setModalVisible(false)
      } catch (error) {
        console.error("Error creating forum post:", error)
        Alert.alert("Error", "Failed to create post. Please try again.")
      }
    }
  }

  const handleAddComment = async (postId: string, parentId: string | null = null) => {
    if (newComment.trim() && currentUser && project) {
      try {
        await addForumComment(project.id, postId, newComment, currentUser.id, currentUser.username, parentId)
        const updatedPosts = await getForumPosts(project.id)
        setForumPosts(updatedPosts)
        setNewComment("")
      } catch (error) {
        console.error("Error adding comment:", error)
        Alert.alert("Error", "Failed to add comment. Please try again.")
      }
    }
  }

  const handleDeletePress = (postId: string) => {
    setPostToDelete(postId)
    setShowDeleteConfirmation(true)
  }

  const handleConfirmDelete = async () => {
    if (postToDelete && project) {
      try {
        await deleteForumPost(postToDelete)
        const updatedPosts = await getForumPosts(project.id)
        setForumPosts(updatedPosts)
      } catch (error) {
        console.error("Error deleting forum post:", error)
        Alert.alert("Error", "Failed to delete post. Please try again.")
      }
    }
    setShowDeleteConfirmation(false)
    setPostToDelete(null)
  }

  const navigateToForumPost = (post: ForumPost) => {
    if (!project) return
    router.push({
      pathname: `/project/forum/${post.id}`,
      params: {
        projectId: project.id,
        id: post.id,
      },
    })
  }

  const handleBackNavigation = () => {
    router.back()
  }

  if (!project || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  const renderForumPostItem = ({ item }: { item: ForumPost }) => (
    <TouchableOpacity onPress={() => navigateToForumPost(item)}>
      <BlurView intensity={30} tint="dark" style={styles.forumPostItem}>
        <Text style={styles.forumPostTitle}>{item.title}</Text>
        <Text style={styles.forumPostUsername}>Posted by: {item.username}</Text>
        <Text style={styles.forumPostTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
        <Text style={styles.forumPostComments}>{item.comments?.length || 0} comments</Text>
        {currentUser && (currentUser.id === item.userId || currentUser.id === project.creatorId) && (
          <TouchableOpacity style={styles.deleteForumButton} onPress={() => handleDeletePress(item.id)}>
            <Trash2 color={theme.colors.error} size={20} />
          </TouchableOpacity>
        )}
      </BlurView>
    </TouchableOpacity>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case "feed":
        return (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.feedContainer}>
            <FlatList
              ref={scrollViewRef}
              data={chats}
              renderItem={({ item }) => renderChatItem(item, users, project, currentUser, handleDeleteChat)}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.feedContent}
              ListEmptyComponent={<Text style={styles.emptyListText}>No chats yet. Start the conversation!</Text>}
            />
            <View style={styles.newChatContainer}>
              <TextInput
                style={styles.newChatInput}
                value={newChat}
                onChangeText={setNewChat}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline={false}
                numberOfLines={1}
              />
              <TouchableOpacity onPress={handleChatSubmit} style={styles.newChatButton}>
                <Send size={20} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )
      case "forum":
        return (
          <View style={styles.forumContainer}>
            <TouchableOpacity style={styles.newPostButton} onPress={() => setModalVisible(true)}>
              <BlurView intensity={40} tint="dark" style={styles.newPostButtonContent}>
                <View style={styles.addIconContainer}>
                  <Plus color={theme.colors.primary} size={24} />
                </View>
                <Text style={styles.newPostButtonText}>Create New Post</Text>
              </BlurView>
            </TouchableOpacity>
            <FlatList
              data={forumPosts}
              renderItem={renderForumPostItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.forumContent}
              ListEmptyComponent={<Text style={styles.emptyListText}>No forum posts yet. Start a discussion!</Text>}
            />
          </View>
        )
      case "fundraising":
        return (
          <View style={styles.tabContent}>
            <FundraisingComponent project={project} currentUser={currentUser} />
          </View>
        )
      default:
        return null
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="dark" />
        <TouchableOpacity style={styles.backButton} onPress={handleBackNavigation}>
          <ArrowLeft color={theme.colors.primary} size={24} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{project.title}</Text>
        {currentUser && currentUser.id === project.creatorId && (
          <TouchableOpacity style={styles.editButton} onPress={handleEditSave}>
            {isEditing ? (
              <Check color={theme.colors.primary} size={20} />
            ) : (
              <Pencil color={theme.colors.primary} size={20} />
            )}
            <Text style={styles.editButtonText}>{isEditing ? "Save" : "Edit Project"}</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.projectInfo}>
          <View style={styles.projectMetaInfo}>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
                <Heart
                  size={24}
                  color={
                    project.likes.includes(currentUser?.id || "") ? theme.colors.primary : theme.colors.textSecondary
                  }
                  fill={project.likes.includes(currentUser?.id || "") ? theme.colors.primary : "transparent"}
                />
                <Text style={styles.likeCount}>{project.likes.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleParticipation}
                style={[styles.participateButton, isParticipant && styles.leaveButton]}
              >
                <Text style={styles.participateButtonText}>{isParticipant ? "Leave Project" : "Join Project"}</Text>
              </TouchableOpacity>
            </View>
            <Link href={`/user/${project.creatorId}`} asChild>
              <TouchableOpacity style={styles.creatorNameContainer}>
                <Text style={styles.creatorName}>@{project.creator}</Text>
              </TouchableOpacity>
            </Link>
            <Text style={styles.infoText}>{new Date(project.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.infoText}>{project.primaryType}</Text>
          </View>
          <View style={styles.joinedUsersSection}>
            <TouchableOpacity onPress={toggleCollapsible} style={styles.collapsibleButton}>
              <Text style={styles.collapsibleButtonText}>Joined Users</Text>
              {isCollapsed ? (
                <ChevronDown size={20} color={theme.colors.primary} />
              ) : (
                <ChevronUp size={20} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
            <Collapsible collapsed={isCollapsed}>
              <View style={styles.joinedUsersContainer}>
                {joinedUsers.map((user) => (
                  <Link key={user.id} href={`/user/${user.id}`} asChild>
                    <TouchableOpacity style={styles.joinedUserItem}>
                      <Text style={styles.joinedUserName}>@{user.username}</Text>
                    </TouchableOpacity>
                  </Link>
                ))}
              </View>
            </Collapsible>
          </View>
        </View>
        <Text style={styles.overviewHeader}>Overview</Text>
        {isEditing ? (
          <TextInput
            style={styles.editInput}
            value={editedProject.description}
            onChangeText={(value) => handleInputChange("description", value)}
            placeholder="Project Description"
            multiline
          />
        ) : (
          <Text style={styles.description}>{project.description}</Text>
        )}
        <View style={styles.infoContainer}>
          <View style={styles.tabContainer}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
            {["feed", "forum", "fundraising"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.tabContentContainer}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
            {renderTabContent()}
          </View>
        </View>
      </ScrollView>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={60} tint="dark" style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <X color={theme.colors.primary} size={24} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.titleInput]}
            value={newPostTitle}
            onChangeText={setNewPostTitle}
            placeholder="Post Title"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <TextInput
            style={[styles.input, styles.contentInput]}
            value={newPostContent}
            onChangeText={setNewPostContent}
            placeholder="Post Content"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
          />
          <TouchableOpacity style={styles.button} onPress={handleCreatePost}>
            <Text style={styles.buttonText}>Create Post</Text>
          </TouchableOpacity>
        </BlurView>
      </Modal>
      <ConfirmationDialog
        isVisible={showDeleteConfirmation}
        title="Delete Forum Post"
        message="Are you sure you want to delete this forum post? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirmation(false)
          setPostToDelete(null)
        }}
      />
    </View>
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
  header: {
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    position: "absolute",
    left: 16,
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
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    right: 16,
    top: 16,
  },
  editButtonText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
    padding: 16,
  },
  editInput: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
  },
  infoContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "right",
    marginBottom: 8,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 16,
    width: "50%",
  },
  participateButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 4,
  },
  leaveButton: {
    backgroundColor: "#8E4585", // Plum purple color
  },
  participateButtonText: {
    color: theme.colors.white,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 48,
    flex: 1,
    marginRight: 8,
  },
  likeCount: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 0,
  },
  activeTab: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  tabText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  feedContainer: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
  },
  chatItem: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  creatorChatItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  chatItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatItemUser: {
    fontWeight: "bold",
    color: theme.colors.text,
  },
  chatItemTimestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  chatItemContent: {
    color: theme.colors.text,
    marginBottom: 8,
  },
  chatItemFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  creatorBadge: {
    backgroundColor: theme.colors.primary,
    color: theme.colors.white,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  deleteButton: {
    color: theme.colors.error,
    marginRight: 10,
  },
  newChatContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  newChatInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: theme.colors.text,
    marginRight: 8,
    height: 40,
  },
  newChatButton: {
    backgroundColor: theme.colors.primary,
    padding: 10,
    borderRadius: 20,
  },
  tabContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyListText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
  comingSoonText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
  projectInfo: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
  },
  creatorNameContainer: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  creatorName: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
  projectMetaInfo: {
    width: "100%",
  },
  joinedUsersSection: {
    marginTop: 16,
  },
  collapsibleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 8,
  },
  collapsibleButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  joinedUsersContainer: {
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    padding: 12,
  },
  joinedUserItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  joinedUserName: {
    color: theme.colors.text,
    fontSize: 16,
  },
  overviewHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  forumContainer: {
    flex: 1,
    padding: 16,
  },
  newPostButton: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  newPostButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  addIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  newPostButtonText: {
    color: theme.colors.primary,
    fontWeight: "bold",
  },
  forumContent: {
    paddingBottom: 16,
  },
  forumPostItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  forumPostTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
  },
  forumPostUsername: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  forumPostTimestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  forumPostComments: {
    fontSize: 14,
    color: theme.colors.primary,
  },
  deleteForumButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  modalView: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: theme.colors.text,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "bold",
  },
  contentInput: {
    height: 120,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: "bold",
  },
  tabContentContainer: {
    marginHorizontal: 20,
    borderRadius: 25,
    overflow: "hidden",
  },
  fundraisingGoalContainer: {
    marginBottom: 16,
  },
  fundraisingGoalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    marginBottom: 8,
  },
  saveFundraisingGoalButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  saveFundraisingGoalButtonText: {
    color: theme.colors.white,
    fontWeight: "bold",
  },
  fundraisingGoalText: {
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 16,
  },
})

