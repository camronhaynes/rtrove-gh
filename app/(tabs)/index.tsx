"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  SectionList,
  Modal,
  TextInput,
} from "react-native"
import { useData } from "../../context/DataContext"
import { theme } from "../../src/styles/theme"
import { BlurView } from "expo-blur"
import {
  Heart,
  Folder,
  Plus,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Tag,
  MessageCircle,
  Users,
  PenSquare,
  X,
} from "lucide-react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { CreateFolderViewModal } from "../../components/CreateFolderViewModal"
import { ConfirmationDialog } from "../../components/ConfirmationDialog"

type TabType = "feed" | "trovebook"
type FeedViewType = "folders" | "allProjects" | "allPosts" | "following" | "customFolder"

interface FolderView {
  id: string
  name: string
  filters: {
    timeRange: {
      startDate?: string
      endDate?: string
    }
    username: string[]
    projectType: string[]
    tags: string[]
    includeProjects: boolean
    includePosts: boolean
  }
}

const PROJECT_TYPES = ["Live", "Community", "Songs", "Album", "Production", "Distribution", "Merch", "Collab"]

const groupItemsByDate = (items: any[]) => {
  const grouped = items.reduce((acc, item) => {
    const date = new Date(item.createdAt)
    const dateStr = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    if (!acc[dateStr]) {
      acc[dateStr] = []
    }
    acc[dateStr].push(item)
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([date, items]) => ({
      date,
      data: items as any[],
    }))
    .sort((a, b) => new Date(b.data[0].createdAt).getTime() - new Date(a.data[0].createdAt).getTime())
}

const DaySeparator = ({ date }: { date: string }) => (
  <View style={styles.daySeparatorContainer}>
    <View style={styles.daySeparatorLine} />
    <Text style={styles.daySeparatorText}>{date}</Text>
    <View style={styles.daySeparatorLine} />
  </View>
)

export default function Index() {
  const {
    isAuthenticated,
    currentUser,
    getCreatedUsers,
    projects,
    likeProject,
    unlikeProject,
    createFolderView,
    deleteFolderView,
    updateFolderView,
    getUserFolderViews,
    getUserPosts,
    users,
    addPost,
  } = useData()
  const [activeTab, setActiveTab] = useState<TabType>("feed")
  const [feedView, setFeedView] = useState<FeedViewType>("folders")
  const [createdUsers, setCreatedUsers] = useState([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isAddPostModalVisible, setIsAddPostModalVisible] = useState(false)
  const [newPostSubject, setNewPostSubject] = useState("")
  const [newPostContent, setNewPostContent] = useState("")
  const [activeFolderView, setActiveFolderView] = useState<FolderView | null>(null)
  const [isConfirmationDialogVisible, setIsConfirmationDialogVisible] = useState(false)
  const [folderViewToDelete, setFolderViewToDelete] = useState<string | null>(null)
  const router = useRouter()
  const { context } = useLocalSearchParams()

  const [folderViews, setFolderViews] = useState<FolderView[]>([])
  const [filteredContent, setFilteredContent] = useState<Array<any>>([])
  const [allPosts, setAllPosts] = useState<Array<any>>([])
  const [followingContent, setFollowingContent] = useState<Array<any>>([])
  const [isLoading, setIsLoading] = useState(true)

  const filterContent = useCallback(
    async (filters: FolderView["filters"]) => {
      let filteredProjects: any[] = []
      let filteredPosts: any[] = []

      if (filters.includeProjects) {
        filteredProjects = projects.filter((project) => {
          const createdAt = new Date(project.createdAt)
          let timeRangeMatch = true

          if (filters.timeRange) {
            const { startDate, endDate } = filters.timeRange
            if (startDate && endDate) {
              const start = new Date(startDate)
              const end = new Date(endDate)
              timeRangeMatch = createdAt >= start && createdAt <= end
            } else if (startDate) {
              const start = new Date(startDate)
              timeRangeMatch = createdAt >= start
            } else if (endDate) {
              const end = new Date(endDate)
              timeRangeMatch = createdAt <= end
            }
          }

          const usernameMatch =
            filters.username.length === 0 ||
            filters.username.some((username) => project.creator.toLowerCase().includes(username.toLowerCase()))

          const projectTypeMatch =
            filters.projectType.length === 0 ||
            filters.projectType.some((type) => project.primaryType.toLowerCase() === type.toLowerCase())

          const tagMatch =
            filters.tags.length === 0 ||
            filters.tags.some((tag) =>
              project.tags.some((projectTag) => projectTag.toLowerCase() === tag.toLowerCase()),
            )

          return timeRangeMatch && usernameMatch && projectTypeMatch && tagMatch
        })
      }

      if (filters.includePosts) {
        const userIds =
          filters.username.length > 0
            ? createdUsers.filter((user) => filters.username.includes(user.username)).map((user) => user.id)
            : createdUsers.map((user) => user.id)
        const allPosts = await Promise.all(userIds.map((userId) => getUserPosts(userId)))
        filteredPosts = allPosts.flat().filter((post) => {
          const createdAt = new Date(post.createdAt)
          let timeRangeMatch = true

          if (filters.timeRange) {
            const { startDate, endDate } = filters.timeRange
            if (startDate && endDate) {
              const start = new Date(startDate)
              const end = new Date(endDate)
              timeRangeMatch = createdAt >= start && createdAt <= end
            } else if (startDate) {
              const start = new Date(startDate)
              timeRangeMatch = createdAt >= start
            } else if (endDate) {
              const end = new Date(endDate)
              timeRangeMatch = createdAt <= end
            }
          }

          const tagMatch =
            filters.tags.length === 0 ||
            filters.tags.some(
              (tag) => post.tags && post.tags.some((postTag) => postTag.toLowerCase() === tag.toLowerCase()),
            )

          return timeRangeMatch && tagMatch
        })
      }

      const combinedContent = [
        ...filteredProjects.map((p) => ({ ...p, type: "project" })),
        ...filteredPosts.map((p) => ({ ...p, type: "post" })),
      ]
      return combinedContent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },
    [projects, createdUsers, getUserPosts],
  )

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)
      try {
        const users = await getCreatedUsers()
        setCreatedUsers(users)

        if (currentUser) {
          const userFolderViews = await getUserFolderViews(currentUser.id)
          setFolderViews(userFolderViews)
        }

        const userIds = users.map((user) => user.id)
        const fetchedPosts = await Promise.all(userIds.map((userId) => getUserPosts(userId)))
        const allFetchedPosts = fetchedPosts.flat().map((p) => ({ ...p, type: "post" }))
        setAllPosts(allFetchedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      } catch (error) {
        console.error("Error loading initial data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [getCreatedUsers, getUserFolderViews, getUserPosts, currentUser])

  useEffect(() => {
    const loadFilteredContent = async () => {
      if (feedView === "customFolder" && activeFolderView) {
        const filtered = await filterContent(activeFolderView.filters)
        setFilteredContent(filtered)
      }
    }
    loadFilteredContent()
  }, [feedView, activeFolderView, filterContent])

  useEffect(() => {
    if (context && typeof context === "string") {
      const [source, folderName] = context.split("_")
      if (source === "folderView") {
        const folder = folderViews.find((f) => f.name === folderName)
        if (folder) {
          setActiveFolderView(folder)
          setFeedView("customFolder")
        }
      }
    }
  }, [context, folderViews])

  useEffect(() => {
    const fetchFollowingContent = async () => {
      if (currentUser) {
        const followedUsers = currentUser.following
        const followedProjects = projects.filter((project) => followedUsers.includes(project.creatorId))
        const followedPosts = (await Promise.all(followedUsers.map((userId) => getUserPosts(userId)))).flat()

        const combinedContent = [
          ...followedProjects.map((p) => ({ ...p, type: "project" })),
          ...followedPosts.map((p) => ({ ...p, type: "post" })),
        ]

        setFollowingContent(
          combinedContent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        )
      }
    }

    fetchFollowingContent()
  }, [currentUser, projects, getUserPosts])

  const handleCreateFolder = useCallback(
    async (folderName: string, filters: FolderView["filters"]) => {
      if (!currentUser) {
        console.error("No user logged in")
        return
      }

      try {
        const newFolder: Omit<FolderView, "id"> = {
          name: folderName,
          filters: {
            ...filters,
            username: Array.isArray(filters.username) ? filters.username : [filters.username],
            projectType: Array.isArray(filters.projectType) ? filters.projectType : [filters.projectType],
            tags: Array.isArray(filters.tags) ? filters.tags : [filters.tags],
            includeProjects: filters.includeProjects,
            includePosts: filters.includePosts,
          },
        }
        await createFolderView(currentUser.id, newFolder)
        const updatedFolderViews = await getUserFolderViews(currentUser.id)
        setFolderViews(updatedFolderViews)
      } catch (error) {
        console.error("Error creating folder view:", error)
      }
    },
    [currentUser, createFolderView, getUserFolderViews],
  )

  const handleDeleteFolderView = useCallback(
    async (folderId: string) => {
      if (!currentUser) {
        console.error("No user logged in")
        return
      }

      try {
        await deleteFolderView(currentUser.id, folderId)
        const updatedFolderViews = await getUserFolderViews(currentUser.id)
        setFolderViews(updatedFolderViews)
      } catch (error) {
        console.error("Error deleting folder view:", error)
      }
    },
    [currentUser, deleteFolderView, getUserFolderViews],
  )

  const handleLikeToggle = useCallback(
    async (projectId: string) => {
      if (!isAuthenticated || !currentUser) {
        return
      }

      try {
        const project = projects.find((p) => p.id === projectId)
        if (project) {
          if (project.likes.includes(currentUser.id)) {
            await unlikeProject(currentUser.id, projectId)
          } else {
            await likeProject(currentUser.id, projectId)
          }
        }
      } catch (error) {
        console.error("Error toggling project like:", error)
      }
    },
    [isAuthenticated, currentUser, projects, likeProject, unlikeProject],
  )

  const handleAddPost = async () => {
    if (!currentUser || !newPostSubject.trim() || !newPostContent.trim()) {
      return
    }

    try {
      await addPost(currentUser.id, newPostContent, newPostSubject, "")
      setNewPostSubject("")
      setNewPostContent("")
      setIsAddPostModalVisible(false)

      // Refresh the posts
      const userIds = createdUsers.map((user) => user.id)
      const fetchedPosts = await Promise.all(userIds.map((userId) => getUserPosts(userId)))
      const allFetchedPosts = fetchedPosts.flat().map((p) => ({ ...p, type: "post" }))
      setAllPosts(allFetchedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (error) {
      console.error("Error adding post:", error)
    }
  }

  const renderUserItem = ({ item }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => router.push(`/user/${item.id}`)}>
      <View style={styles.userItemContent}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={styles.userJoinDate}>Joined: {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Image
          source={{ uri: item.avatar || "https://picsum.photos/seed/default/200" }}
          style={styles.userAvatar}
          defaultSource={{ uri: "https://picsum.photos/seed/default/200" }}
        />
      </View>
    </TouchableOpacity>
  )

  const renderContentItem = useCallback(
    ({ item }) => {
      if (item.type === "project") {
        return (
          <TouchableOpacity
            style={styles.projectItem}
            onPress={() =>
              router.push({
                pathname: `/project/${item.id}`,
                params: {
                  context: activeFolderView
                    ? `folderView_${activeFolderView.name}`
                    : feedView === "allProjects"
                      ? "allProjects"
                      : feedView === "following"
                        ? "following"
                        : "index",
                },
              })
            }
          >
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
            <Text style={styles.projectTitle}>{item.title}</Text>
            <Text style={styles.projectCreator}>by {item.creator}</Text>
            <Text style={styles.projectDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.projectMetadata}>
              <View style={styles.tagsContainer}>
                {item.tags &&
                  item.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Tag size={12} color={theme.colors.textSecondary} />
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
              </View>
            </View>
            <View style={styles.projectFooter}>
              <View style={styles.projectType}>
                <Text style={styles.projectTypeText}>{item.primaryType}</Text>
              </View>
              <View style={styles.projectStats}>
                <TouchableOpacity onPress={() => handleLikeToggle(item.id)} style={styles.likeButton}>
                  <Heart
                    size={16}
                    color={
                      currentUser && item.likes.includes(currentUser.id)
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                    fill={currentUser && item.likes.includes(currentUser.id) ? theme.colors.primary : "transparent"}
                  />
                  <Text style={styles.statText}>{item.likes.length}</Text>
                </TouchableOpacity>
                <View style={styles.dateContainer}>
                  <Clock size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )
      } else if (item.type === "post") {
        // Find the user from createdUsers array using the post's userId
        const postUser = createdUsers.find((user) => user.id === item.userId)

        return (
          <TouchableOpacity
            style={[styles.postItem, { backgroundColor: "rgba(142, 69, 133, 0.3)" }]}
            onPress={() =>
              router.push({
                pathname: `/user/posts/${item.id}`,
                params: {
                  userId: item.userId,
                  context: activeFolderView
                    ? `folderView_${activeFolderView.name}`
                    : feedView === "allPosts"
                      ? "allPosts"
                      : feedView === "following"
                        ? "following"
                        : "index",
                },
              })
            }
          >
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
            <Text style={styles.postTitle}>{item.subject || "Untitled Post"}</Text>
            <View style={styles.postCreatorContainer}>
              <Text style={styles.postCreatorLabel}>post by </Text>
              <TouchableOpacity onPress={() => router.push(`/user/${item.userId}`)}>
                <Text style={styles.postCreatorName}>@{postUser?.username || "unknown"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.postContent} numberOfLines={3}>
              {item.content}
            </Text>
            <View style={styles.postFooter}>
              <View style={styles.postStats}>
                <View style={styles.statItem}>
                  <MessageCircle size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.statText}>{item.comments?.length || 0}</Text>
                </View>
                <View style={styles.dateContainer}>
                  <Clock size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )
      }
      return null
    },
    [router, handleLikeToggle, currentUser, activeFolderView, feedView, createdUsers],
  )

  const renderFolderViewItem = ({ item }: { item: FolderView }) => (
    <TouchableOpacity
      style={styles.folderViewButton}
      onPress={() => {
        setActiveFolderView(item)
        setFeedView("customFolder")
      }}
    >
      <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={styles.folderViewContent}>
        <View style={styles.folderViewHeader}>
          <Folder size={24} color={theme.colors.primary} />
          <Text style={styles.folderViewText}>{item.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            setFolderViewToDelete(item.id)
            setIsConfirmationDialogVisible(true)
          }}
        >
          <Trash2 size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  const FolderViewDetails = ({ folderView }) => {
    const [isExpanded, setIsExpanded] = useState(false)

    const formatDateRange = (timeRange) => {
      if (timeRange.startDate && timeRange.endDate) {
        return `${timeRange.startDate} to ${timeRange.endDate}`
      } else if (timeRange.startDate) {
        return `From ${timeRange.startDate}`
      } else if (timeRange.endDate) {
        return `Until ${timeRange.endDate}`
      } else {
        return "No date range specified"
      }
    }

    return (
      <View style={styles.folderViewDetails}>
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.folderViewSummary}>
          <Text style={styles.folderViewSummaryText}>View Filters</Text>
          {isExpanded ? (
            <ChevronUp size={20} color={theme.colors.primary} />
          ) : (
            <ChevronDown size={20} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.folderViewFilters}>
            <Text style={styles.filterText}>Date Range: {formatDateRange(folderView.filters.timeRange)}</Text>
            <Text style={styles.filterText}>Usernames: {folderView.filters.username.join(", ")}</Text>
            <Text style={styles.filterText}>Project Types: {folderView.filters.projectType.join(", ")}</Text>
            <Text style={styles.filterText}>Tags: {folderView.filters.tags.join(", ")}</Text>
            <Text style={styles.filterText}>Include Projects: {folderView.filters.includeProjects ? "Yes" : "No"}</Text>
            <Text style={styles.filterText}>Include Posts: {folderView.filters.includePosts ? "Yes" : "No"}</Text>
          </View>
        )}
      </View>
    )
  }

  const renderFeedContent = () => {
    if (isLoading) {
      return <Text style={styles.loadingText}>Loading...</Text>
    }

    if (!isAuthenticated || !currentUser) {
      return (
        <View>
          <Text style={styles.contentText}>Sign in to view your feed and Trove Book</Text>
          <Text style={styles.subText}>Explore the world of digital art and music</Text>
        </View>
      )
    }

    if (feedView === "folders") {
      return (
        <View>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.addPostButton} onPress={() => setIsAddPostModalVisible(true)}>
              <PenSquare size={20} color={theme.colors.primary} />
              <Text style={styles.addPostText}>Add a Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createFolderButton} onPress={() => setIsModalVisible(true)}>
              <Folder size={20} color={theme.colors.primary} />
              <Plus size={20} color={theme.colors.primary} />
              <Text style={styles.createFolderText}>Create folder view</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.folderGrid}>
            <TouchableOpacity style={styles.allProjectsButton} onPress={() => setFeedView("allProjects")}>
              <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
              <View style={styles.allProjectsContent}>
                <View style={styles.allProjectsHeader}>
                  <Folder size={24} color={theme.colors.primary} />
                  <Text style={styles.allProjectsText}>All Projects</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.allPostsButton} onPress={() => setFeedView("allPosts")}>
              <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
              <View style={styles.allPostsContent}>
                <View style={styles.allPostsHeader}>
                  <MessageCircle size={24} color={theme.colors.primary} />
                  <Text style={styles.allPostsText}>All Posts</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.followingButton} onPress={() => setFeedView("following")}>
              <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
              <View style={styles.followingContent}>
                <View style={styles.followingHeader}>
                  <Users size={24} color={theme.colors.primary} />
                  <Text style={styles.followingText}>Following</Text>
                </View>
              </View>
            </TouchableOpacity>
            {folderViews.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={styles.folderViewButton}
                onPress={() => {
                  setActiveFolderView(folder)
                  setFeedView("customFolder")
                }}
              >
                <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                <View style={styles.folderViewContent}>
                  <View style={styles.folderViewHeader}>
                    <Folder size={24} color={theme.colors.primary} />
                    <Text style={styles.folderViewText}>{folder.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      setFolderViewToDelete(folder.id)
                      setIsConfirmationDialogVisible(true)
                    }}
                  >
                    <Trash2 size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )
    } else if (feedView === "allProjects") {
      const groupedProjects = groupItemsByDate(projects.map((p) => ({ ...p, type: "project" })))
      return (
        <SectionList
          sections={groupedProjects}
          renderItem={renderContentItem}
          renderSectionHeader={({ section: { date } }) => <DaySeparator date={date} />}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <TouchableOpacity style={styles.backButton} onPress={() => setFeedView("folders")}>
              <Text style={styles.backButtonText}>← Back to Folders</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No projects in your feed yet.</Text>}
          stickySectionHeadersEnabled={false}
        />
      )
    } else if (feedView === "allPosts") {
      const groupedPosts = groupItemsByDate(allPosts)
      return (
        <SectionList
          sections={groupedPosts}
          renderItem={renderContentItem}
          renderSectionHeader={({ section: { date } }) => <DaySeparator date={date} />}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <TouchableOpacity style={styles.backButton} onPress={() => setFeedView("folders")}>
              <Text style={styles.backButtonText}>← Back to Folders</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No posts in your feed yet.</Text>}
          stickySectionHeadersEnabled={false}
        />
      )
    } else if (feedView === "following") {
      const groupedFollowingContent = groupItemsByDate(followingContent)
      return (
        <SectionList
          sections={groupedFollowingContent}
          renderItem={renderContentItem}
          renderSectionHeader={({ section: { date } }) => <DaySeparator date={date} />}
          keyExtractor={(item) => `${item.type}_${item.id}`}
          ListHeaderComponent={
            <TouchableOpacity style={styles.backButton} onPress={() => setFeedView("folders")}>
              <Text style={styles.backButtonText}>← Back to Folders</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No content from followed users yet.</Text>}
          stickySectionHeadersEnabled={false}
        />
      )
    } else if (feedView === "customFolder" && activeFolderView) {
      return (
        <FlatList
          data={filteredContent}
          renderItem={renderContentItem}
          keyExtractor={(item) => `${item.type}_${item.id}`}
          ListHeaderComponent={
            <View>
              <TouchableOpacity style={styles.backButton} onPress={() => setFeedView("folders")}>
                <Text style={styles.backButtonText}>← Back to Folders</Text>
              </TouchableOpacity>
              <Text style={styles.folderTitle}>{activeFolderView.name}</Text>
              <FolderViewDetails folderView={activeFolderView} />
            </View>
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No content matches the current folder view filters.</Text>}
        />
      )
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "feed" && styles.activeTab]}
          onPress={() => setActiveTab("feed")}
        >
          <Text style={[styles.tabText, activeTab === "feed" && styles.activeTabText]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "trovebook" && styles.activeTab]}
          onPress={() => setActiveTab("trovebook")}
        >
          <Text style={[styles.tabText, activeTab === "trovebook" && styles.activeTabText]}>Trove Book</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {activeTab === "feed" ? (
          renderFeedContent()
        ) : (
          <View style={styles.rUsersBox}>
            <Text style={styles.rUsersTitle}>R-Users</Text>
            <FlatList
              data={createdUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.emptyText}>No created users found.</Text>}
            />
          </View>
        )}
      </View>
      <CreateFolderViewModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onCreateFolder={handleCreateFolder}
      />
      <ConfirmationDialog
        isVisible={isConfirmationDialogVisible}
        onClose={() => setIsConfirmationDialogVisible(false)}
        onConfirm={() => {
          if (folderViewToDelete) {
            handleDeleteFolderView(folderViewToDelete)
            setFolderViewToDelete(null)
          }
          setIsConfirmationDialogVisible(false)
        }}
        title="Delete Folder View"
        message="Are you sure you want to delete this folder view?"
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddPostModalVisible}
        onRequestClose={() => setIsAddPostModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsAddPostModalVisible(false)}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add a New Post</Text>
            <TextInput
              style={styles.input}
              placeholder="Subject"
              placeholderTextColor={theme.colors.textSecondary}
              value={newPostSubject}
              onChangeText={setNewPostSubject}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Content"
              placeholderTextColor={theme.colors.textSecondary}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddPost}>
              <Text style={styles.addButtonText}>Add Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: "bold",
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentText: {
    fontFamily: theme.fonts.regular,
    fontSize: 24,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  subText: {
    fontFamily: theme.fonts.regular,
    fontSize: 18,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  rUsersBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  rUsersTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 10,
  },
  userItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  userJoinDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
  },
  projectItem: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 15,
    position: "relative",
  },
  projectTitle: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: "bold",
    marginBottom: 5,
  },
  projectCreator: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  projectDescription: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 10,
  },
  projectMetadata: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 5,
    marginBottom: 5,
  },
  tagText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  projectType: {
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  projectTypeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  projectStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  statText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 5,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    marginLeft: "auto",
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginLeft: 4,
    flexShrink: 1,
  },
  emptyText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
  allProjectsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
    width: "48%",
  },
  allPostsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
    width: "48%",
  },
  followingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
    width: "48%",
  },
  allProjectsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginLeft: 10,
  },
  allPostsText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginLeft: 10,
  },
  followingText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginLeft: 10,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  addPostButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  addPostText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  createFolderButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  createFolderText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  folderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 16,
  },
  allProjectsContent: {
    alignItems: "center",
  },
  allPostsContent: {
    alignItems: "center",
  },
  followingContent: {
    alignItems: "center",
  },
  allProjectsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  allPostsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  followingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  folderTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 10,
  },
  folderViewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
    width: "48%",
  },
  folderViewContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  folderViewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  folderViewText: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginLeft: 10,
  },
  deleteButton: {
    padding: 5,
  },
  folderViewDetails: {
    marginBottom: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    overflow: "hidden",
  },
  folderViewSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    backgroundColor: theme.colors.surfaceVariant,
  },
  folderViewSummaryText: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  folderViewFilters: {
    padding: 10,
  },
  filterText: {
    color: theme.colors.text,
  },
  postItem: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 15,
    position: "relative",
  },
  postTitle: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: "bold",
    marginBottom: 5,
  },
  postCreator: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  postContent: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  postCreatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  postCreatorLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  postCreatorName: {
    fontSize: 14,
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
  daySeparatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  daySeparatorText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginHorizontal: 10,
    fontFamily: theme.fonts.regular,
  },
  loadingText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    color: theme.colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 5,
    padding: 10,
    alignItems: "center",
  },
  addButtonText: {
    color: theme.colors.background,
    fontWeight: "bold",
  },
})

export default Index

