"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  TextInput,
  SectionList,
  Dimensions, // Import Dimensions
  Alert, // Import Alert
  StyleSheet as RNStyleSheet, // Import StyleSheet
} from "react-native"
import { useLocalSearchParams, useRouter, Link } from "expo-router"
import { BlurView } from "expo-blur"
import { Pencil, ArrowLeft, Check, Camera, Plus, Heart, ChevronDown, ChevronUp, PlusCircle } from "lucide-react-native"
import Collapsible from "react-native-collapsible"
import { ConfirmationDialog } from "../../components/ConfirmationDialog"

import { useData } from "../../context/DataContext"
import { theme } from "../../src/styles/theme"
import type { Project, Post } from "../../src/utils/types"

const userTypes = [
  "artist",
  "producer",
  "vocalist",
  "guitarist",
  "bassist",
  "drummer",
  "music videographer",
  "graphic designer",
  "DJ",
  "session musician",
]

type User = {
  id: string
  name: string
  username: string
  avatar: string
  artType: string
  bio?: string
  location?: string
  createdAt: string
  posts: string[]
  followers: string[]
  following: string[]
  likedPosts: string[]
  primaryUserType: string
  secondaryUserType: string
}

const groupItemsByDateTime = (items: any[]) => {
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
    .map(([date, data]) => ({
      date,
      data: (data as any[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

const DaySeparator = ({ date }: { date: string }) => (
  <View style={styles.daySeparatorContainer}>
    <View style={styles.daySeparatorLine} />
    <Text style={styles.daySeparatorText}>{date}</Text>
    <View style={styles.daySeparatorLine} />
  </View>
)

const UserPage: React.FC = () => {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const {
    currentUser,
    users,
    updateUserProfile,
    getUserPosts,
    likePost,
    unlikePost,
    deletePost,
    addPost,
    getUserCreatedProjects,
    likeProject,
    unlikeProject,
    projects,
    toggleProjectParticipation,
    followUser,
    unfollowUser,
    deleteUserProfile,
    getLikedProjects,
    updateUserTypes,
  } = useData()
  const { width } = Dimensions.get("window") // Get screen width

  // Add validation to check if user exists
  useEffect(() => {
    const userExists = users.some((u) => u.id === id)
    if (!userExists) {
      Alert.alert("User Not Found", "This user profile no longer exists.", [
        {
          text: "Go Back",
          onPress: () => router.back(),
        },
      ])
    }
  }, [id, users, router])

  const [userState, setUserState] = useState<User | undefined>(users.find((u) => u.id === id))
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("about")
  const [newPostContent, setNewPostContent] = useState("")
  const [newPostSubject, setNewPostSubject] = useState("")
  const [userProjects, setUserProjects] = useState<Project[]>([])
  const [joinedProjects, setJoinedProjects] = useState<Project[]>([])
  const [isCreatedProjectsCollapsed, setIsCreatedProjectsCollapsed] = useState(true)
  const [isJoinedProjectsCollapsed, setIsJoinedProjectsCollapsed] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowersCollapsed, setIsFollowersCollapsed] = useState(true)
  const [isFollowingCollapsed, setIsFollowingCollapsed] = useState(true)

  // Add all editable fields
  const [editedName, setEditedName] = useState(userState?.name || "")
  const [editedUsername, setEditedUsername] = useState(userState?.username || "")
  const [editedAvatar, setEditedAvatar] = useState(userState?.avatar || "")
  const [editedArtType, setEditedArtType] = useState(userState?.artType || "")
  const [editedBio, setEditedBio] = useState(userState?.bio || "")
  const [editedLocation, setEditedLocation] = useState(userState?.location || "")
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)

  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false)

  const [likedProjects, setLikedProjects] = useState<Project[]>([])
  const [isLikedProjectsCollapsed, setIsLikedProjectsCollapsed] = useState(true)

  const [customUserType, setCustomUserType] = useState("")
  const [availableUserTypes, setAvailableUserTypes] = useState(userTypes)

  useEffect(() => {
    const foundUser = users.find((u) => u.id === id)
    if (foundUser) {
      setUserState(foundUser)
      setEditedName(foundUser.name)
      setEditedUsername(foundUser.username)
      setEditedAvatar(foundUser.avatar)
      setEditedArtType(foundUser.artType)
      setEditedBio(foundUser.bio || "")
      setEditedLocation(foundUser.location || "")
    }
  }, [id, users])

  useEffect(() => {
    if (currentUser && userState) {
      setIsFollowing(currentUser.following?.includes(userState.id) || false)
    }
  }, [currentUser, userState])

  useEffect(() => {
    if (userState) {
    }
  }, [userState])

  const fetchUserProjects = useCallback(async () => {
    if (userState) {
      try {
        const createdProjects = await getUserCreatedProjects(userState.id)
        setUserProjects(createdProjects)
      } catch (error) {
        console.error("Error fetching user projects:", error)
      }
    }
  }, [userState, getUserCreatedProjects])

  const fetchJoinedProjects = useCallback(() => {
    if (userState) {
      const joined = projects.filter(
        (project) => project.collaborators.includes(userState.id) && project.creatorId !== userState.id,
      )
      setJoinedProjects(joined)
    }
  }, [userState, projects])

  const fetchLikedProjects = useCallback(async () => {
    if (userState) {
      try {
        const liked = await getLikedProjects(userState.id)
        setLikedProjects(liked.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      } catch (error) {
        console.error("Error fetching liked projects:", error)
      }
    }
  }, [userState, getLikedProjects])

  useEffect(() => {
    fetchUserProjects()
    fetchJoinedProjects()
    fetchLikedProjects()
  }, [fetchUserProjects, fetchJoinedProjects, fetchLikedProjects])

  const isCurrentUser = currentUser?.id === id

  const handleSave = async () => {
    if (!userState) return

    try {
      await updateUserProfile(userState.id, {
        name: editedName,
        username: editedUsername,
        avatar: editedAvatar,
        artType: editedArtType,
        bio: editedBio,
        location: editedLocation,
      })
      await updateUserTypes(userState.id, userState.primaryUserType, userState.secondaryUserType)
      setUserState({
        ...userState,
        name: editedName,
        username: editedUsername,
        avatar: editedAvatar,
        artType: editedArtType,
        bio: editedBio,
        location: editedLocation,
      })
      setIsEditing(false)
      setIsEditingAvatar(false)
    } catch (error) {
      console.error("Error updating profile:", error)
    }
  }

  const handleLikeProject = async (projectId: string) => {
    if (!currentUser) return

    try {
      const project = projects.find((p) => p.id === projectId)
      if (project) {
        if (project.likes.includes(currentUser.id)) {
          await unlikeProject(currentUser.id, projectId)
          setLikedProjects((prev) => prev.filter((p) => p.id !== projectId))
        } else {
          await likeProject(currentUser.id, projectId)
          setLikedProjects((prev) => [...prev, project])
        }
        // Update the local state to reflect the change
        setUserProjects((prevProjects) =>
          prevProjects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  likes: p.likes.includes(currentUser.id)
                    ? p.likes.filter((id) => id !== currentUser.id)
                    : [...p.likes, currentUser.id],
                }
              : p,
          ),
        )
      }
    } catch (error) {
      console.error("Error toggling project like:", error)
    }
  }

  const handleToggleProjectParticipation = async (projectId: string) => {
    if (!currentUser) return

    try {
      await toggleProjectParticipation(projectId, currentUser.id)
      const updatedProject = projects.find((p) => p.id === projectId)
      if (updatedProject) {
        if (updatedProject.collaborators.includes(currentUser.id)) {
          setJoinedProjects((prev) => [...prev, updatedProject])
        } else {
          setJoinedProjects((prev) => prev.filter((p) => p.id !== projectId))
        }
      }
    } catch (error) {
      console.error("Error toggling project participation:", error)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !userState) return

    try {
      if (isFollowing) {
        await unfollowUser(currentUser.id, userState.id)
      } else {
        await followUser(currentUser.id, userState.id)
      }
      setIsFollowing(!isFollowing)
    } catch (error) {
      console.error("Error toggling follow status:", error)
    }
  }

  const handleDeleteAccount = async () => {
    if (!currentUser) return

    try {
      await deleteUserProfile(currentUser.id)
      // Close the confirmation dialog
      setIsDeleteConfirmationVisible(false)
      // Show a success message
      Alert.alert("Account Deleted", "Your account has been successfully deleted.")
      // Redirect to the login page or home page after successful deletion
      router.replace("/login")
    } catch (error) {
      console.error("Error deleting account:", error)
      // Show an error message to the user
      Alert.alert("Error", "Failed to delete account. Please try again.")
    }
  }

  const handlePrimaryUserTypeSelect = (type: string) => {
    if (type === userState?.secondaryUserType) {
      updateUserTypes(userState.id, type, "")
    } else {
      updateUserTypes(userState.id, type, userState?.secondaryUserType || "")
    }
  }

  const handleSecondaryUserTypeSelect = (type: string) => {
    if (type === userState?.primaryUserType) {
      updateUserTypes(userState.id, "", type)
    } else {
      updateUserTypes(userState.id, userState?.primaryUserType || "", type)
    }
  }

  const handleAddCustomUserType = () => {
    if (customUserType && !availableUserTypes.includes(customUserType)) {
      setAvailableUserTypes([...availableUserTypes, customUserType])
      setCustomUserType("")
    }
  }

  const UserTypeSelection = () => (
    <View style={styles.userTypeContainer}>
      <Text style={styles.userTypeTitle}>Select User Types</Text>
      <View style={styles.userTypeGrid}>
        {availableUserTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.userTypeChip,
              userState?.primaryUserType === type && styles.primaryUserType,
              userState?.secondaryUserType === type && styles.secondaryUserType,
            ]}
            onPress={() => {
              if (userState?.primaryUserType === type) {
                handlePrimaryUserTypeSelect("")
              } else if (userState?.secondaryUserType === type) {
                handleSecondaryUserTypeSelect("")
              } else if (!userState?.primaryUserType) {
                handlePrimaryUserTypeSelect(type)
              } else if (!userState?.secondaryUserType) {
                handleSecondaryUserTypeSelect(type)
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`Select ${type} as user type`}
            accessibilityState={{
              selected: userState?.primaryUserType === type || userState?.secondaryUserType === type,
            }}
          >
            <Text
              style={[
                styles.userTypeText,
                (userState?.primaryUserType === type || userState?.secondaryUserType === type) &&
                  styles.selectedUserTypeText,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.customUserTypeContainer}>
        <TextInput
          style={styles.customUserTypeInput}
          placeholder="Add custom user type"
          placeholderTextColor={theme.colors.textSecondary}
          value={customUserType}
          onChangeText={setCustomUserType}
        />
        <TouchableOpacity style={styles.addCustomUserTypeButton} onPress={handleAddCustomUserType}>
          <PlusCircle color={theme.colors.primary} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  )

  if (!userState) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    )
  }

  const renderPostItem = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => router.push(`/user/posts/${item.id}?userId=${userState?.id}`)}
    >
      {item.subject && <Text style={styles.postSubject}>{item.subject}</Text>}
      {item.content && (
        <Text style={styles.postContent} numberOfLines={2}>
          {item.content}
        </Text>
      )}
      <Text style={styles.postDate}>
        {new Date(item.createdAt).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
      <View style={styles.postFooter}>
        <Text style={styles.likeCount}>{item.likes.length} likes</Text>
        <TouchableOpacity
          onPress={() =>
            currentUser &&
            (item.likes.includes(currentUser.id)
              ? unlikePost(item.id, currentUser.id)
              : likePost(item.id, currentUser.id))
          }
          style={styles.likeButton}
        >
          <View style={styles.likeCircle}>
            <Heart
              size={16}
              color={
                currentUser && item.likes.includes(currentUser.id) ? theme.colors.primary : theme.colors.textSecondary
              }
              fill={currentUser && item.likes.includes(currentUser.id) ? theme.colors.primary : "transparent"}
            />
          </View>
          <Text style={styles.likeButtonText}>
            {currentUser && item.likes.includes(currentUser.id) ? "Unlike" : "Like"}
          </Text>
        </TouchableOpacity>
        {isCurrentUser && (
          <TouchableOpacity onPress={() => deletePost(item.id)}>
            <Text style={styles.deleteButton}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderProjectItem = (project: Project, isCreator: boolean) => {
    const handleLike = async () => {
      await handleLikeProject(project.id)
    }
    const handleLeave = async () => {
      await handleToggleProjectParticipation(project.id)
    }
    return (
      <TouchableOpacity
        style={styles.projectItem}
        key={project.id}
        onPress={() => router.push(`/project/${project.id}`)}
      >
        <Text style={styles.projectTitle}>{project.title}</Text>
        <Text style={styles.projectDate}>{new Date(project.createdAt).toLocaleDateString()}</Text>
        <View style={styles.projectTypeContainer}>
          <Text style={styles.projectType}>{project.primaryType}</Text>
        </View>
        <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
          <View style={styles.likeCircle}>
            <Heart
              size={16}
              color={
                currentUser && project.likes.includes(currentUser.id)
                  ? theme.colors.primary
                  : theme.colors.textSecondary
              }
              fill={currentUser && project.likes.includes(currentUser.id) ? theme.colors.primary : "transparent"}
            />
          </View>
          <Text style={styles.likeButtonText}>
            {currentUser && project.likes.includes(currentUser.id) ? "Unlike" : "Like"}
          </Text>
        </TouchableOpacity>
        {!isCreator && currentUser && (
          <TouchableOpacity onPress={handleLeave} style={styles.leaveProjectButton}>
            <Text style={styles.leaveProjectButtonText}>Leave Project</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header section */}
      <View style={styles.header}>
        <BlurView intensity={60} style={RNStyleSheet.absoluteFill} tint="dark" />
        <Link href="/creators" asChild>
          <TouchableOpacity style={styles.backButton}>
            <BlurView intensity={80} style={RNStyleSheet.absoluteFill} tint="dark" />
            <ArrowLeft color={theme.colors.primary} size={24} />
            <Text style={styles.backButtonText}>Back to Creators</Text>
          </TouchableOpacity>
        </Link>
        {isCurrentUser && (
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(!isEditing)}>
            <BlurView intensity={20} style={RNStyleSheet.absoluteFill} tint="dark" />
            <View style={styles.editButtonContent}>
              {isEditing ? (
                <Check color={theme.colors.primary} size={20} />
              ) : (
                <Pencil color={theme.colors.primary} size={20} />
              )}
              <Text style={styles.editButtonText}>{isEditing ? "Save" : "Edit Profile"}</Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: editedAvatar || userState.avatar || "https://picsum.photos/seed/default/200" }}
            style={styles.avatar}
            defaultSource={{ uri: "https://picsum.photos/seed/default/200" }}
          />
          {isEditing && (
            <TouchableOpacity style={styles.avatarEditButton} onPress={() => setIsEditingAvatar(true)}>
              <Camera color={theme.colors.background} size={20} />
            </TouchableOpacity>
          )}
        </View>
        {!isCurrentUser && (
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={handleFollowToggle}
          >
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        )}
        {isEditing ? (
          <View style={styles.editForm}>
            {isEditingAvatar && (
              <View style={styles.avatarUrlInput}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="Enter image URL"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={editedAvatar}
                  onChangeText={setEditedAvatar}
                  autoCapitalize="none"
                />
                <View style={styles.avatarUrlButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditingAvatar(false)
                      setEditedAvatar(userState.avatar)
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.uploadButton} onPress={() => setIsEditingAvatar(false)}>
                    <Text style={styles.uploadButtonText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <TextInput
              style={styles.editInput}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Name"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TextInput
              style={styles.editInput}
              value={editedUsername}
              onChangeText={setEditedUsername}
              placeholder="Username"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TextInput
              style={styles.editInput}
              value={editedArtType}
              onChangeText={setEditedArtType}
              placeholder="Art Type"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TextInput
              style={styles.editInput}
              value={editedLocation}
              onChangeText={setEditedLocation}
              placeholder="Location"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.editInput, styles.multilineInput]}
              value={editedBio}
              onChangeText={setEditedBio}
              placeholder="Bio"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={4}
            />
            <UserTypeSelection />
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
            {isCurrentUser && (
              <TouchableOpacity style={styles.deleteAccountButton} onPress={() => setIsDeleteConfirmationVisible(true)}>
                <Text style={styles.deleteAccountButtonText}>Delete My Account</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{userState.name}</Text>
            <Text style={styles.username}>@{userState.username}</Text>
            <Text style={styles.location}>{userState.location}</Text>
            <Text style={styles.artType}>{userState.artType}</Text>
            <View style={styles.userTypesContainer}>
              {userState.primaryUserType && (
                <View style={[styles.userTypeChip, styles.primaryUserType]}>
                  <Text style={styles.savedUserTypeText}>{userState.primaryUserType}</Text>
                </View>
              )}
              {userState.secondaryUserType && (
                <View style={[styles.userTypeChip, styles.secondaryUserType]}>
                  <Text style={styles.savedUserTypeText}>{userState.secondaryUserType}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Stats section */}
      <View style={styles.statsContainer}>
        <BlurView intensity={40} style={RNStyleSheet.absoluteFill} tint="dark" />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userProjects.length}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{getUserPosts(userState.id).length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{joinedProjects.length}</Text>
          <Text style={styles.statLabel}>Joined</Text>
        </View>
      </View>

      {/* Tab navigation */}
      <View style={styles.tabContainer}>
        <BlurView intensity={20} style={RNStyleSheet.absoluteFill} tint="dark" />
        {["about", "posts", "projects"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === "about" ? "About Me" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={styles.tabContentContainer}>
        <BlurView intensity={20} style={RNStyleSheet.absoluteFill} tint="dark" />
        {activeTab === "about" && (
          <View style={styles.bioContainer}>
            <Text style={styles.bioTitle}>About Me</Text>
            <Text style={styles.bio}>{userState.bio}</Text>

            <View style={styles.followSection}>
              <TouchableOpacity
                style={styles.collapsibleButton}
                onPress={() => setIsFollowersCollapsed(!isFollowersCollapsed)}
              >
                <Text style={styles.collapsibleButtonText}>
                  Followers ({userState.followers.filter((id) => users.some((u) => u.id === id)).length})
                </Text>
                {isFollowersCollapsed ? (
                  <ChevronDown size={20} color={theme.colors.primary} />
                ) : (
                  <ChevronUp size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              <Collapsible collapsed={isFollowersCollapsed}>
                <View style={styles.followList}>
                  {userState.followers.map((followerId) => {
                    const follower = users.find((u) => u.id === followerId)
                    if (!follower) return null // Skip rendering deleted users
                    return (
                      <TouchableOpacity
                        key={followerId}
                        style={styles.followItem}
                        onPress={() => router.push(`/user/${followerId}`)}
                      >
                        <Text style={styles.followItemText}>{follower.username}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </Collapsible>
            </View>

            <View style={styles.followSection}>
              <TouchableOpacity
                style={styles.collapsibleButton}
                onPress={() => setIsFollowingCollapsed(!isFollowingCollapsed)}
              >
                <Text style={styles.collapsibleButtonText}>
                  Following ({userState.following.filter((id) => users.some((u) => u.id === id)).length})
                </Text>
                {isFollowingCollapsed ? (
                  <ChevronDown size={20} color={theme.colors.primary} />
                ) : (
                  <ChevronUp size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              <Collapsible collapsed={isFollowingCollapsed}>
                <View style={styles.followList}>
                  {userState.following.map((followingId) => {
                    const following = users.find((u) => u.id === followingId)
                    if (!following) return null // Skip rendering deleted users
                    return (
                      <TouchableOpacity
                        key={followingId}
                        style={styles.followItem}
                        onPress={() => router.push(`/user/${followingId}`)}
                      >
                        <Text style={styles.followItemText}>{following.username}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </Collapsible>
            </View>
          </View>
        )}
        {activeTab === "posts" && (
          <View style={styles.postsContainer}>
            {isCurrentUser && (
              <View style={styles.addPostContainer}>
                <View style={styles.addPostInputContainer}>
                  <TextInput
                    style={styles.addPostSubject}
                    placeholder="Subject"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={newPostSubject}
                    onChangeText={setNewPostSubject}
                  />
                  <TextInput
                    style={styles.addPostContent}
                    placeholder="Mark your mind..."
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    value={newPostContent}
                    onChangeText={setNewPostContent}
                  />
                </View>
                <TouchableOpacity
                  style={styles.addPostButton}
                  onPress={() => {
                    if (newPostSubject.trim() || newPostContent.trim()) {
                      addPost(currentUser!.id, newPostContent, newPostSubject)
                      setNewPostContent("")
                      setNewPostSubject("")
                    }
                  }}
                >
                  <Plus color={theme.colors.background} size={20} />
                  <Text style={styles.addPostButtonText}>Add New Post</Text>
                </TouchableOpacity>
              </View>
            )}
            <SectionList
              sections={groupItemsByDateTime(getUserPosts(userState.id))}
              renderItem={renderPostItem}
              renderSectionHeader={({ section: { date } }) => <DaySeparator date={date} />}
              keyExtractor={(item) => item.id}
              stickySectionHeadersEnabled={false}
            />
          </View>
        )}
        {activeTab === "projects" && (
          <View style={styles.projectsContainer}>
            <View style={styles.projectsSection}>
              <TouchableOpacity
                style={styles.collapsibleButton}
                onPress={() => setIsCreatedProjectsCollapsed(!isCreatedProjectsCollapsed)}
              >
                <Text style={styles.collapsibleButtonText}>Created Projects ({userProjects.length})</Text>
                {isCreatedProjectsCollapsed ? (
                  <ChevronDown size={20} color={theme.colors.primary} />
                ) : (
                  <ChevronUp size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              <Collapsible collapsed={isCreatedProjectsCollapsed}>
                <View style={styles.projectsContainer}>
                  {userProjects.map((project) => renderProjectItem(project, true))}
                </View>
              </Collapsible>
            </View>
            <View style={styles.projectsSection}>
              <TouchableOpacity
                style={styles.collapsibleButton}
                onPress={() => setIsJoinedProjectsCollapsed(!isJoinedProjectsCollapsed)}
              >
                <Text style={styles.collapsibleButtonText}>Joined Projects ({joinedProjects.length})</Text>
                {isJoinedProjectsCollapsed ? (
                  <ChevronDown size={20} color={theme.colors.primary} />
                ) : (
                  <ChevronUp size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              <Collapsible collapsed={isJoinedProjectsCollapsed}>
                <View style={styles.projectsContainer}>
                  {joinedProjects.map((project) => renderProjectItem(project, false))}
                </View>
              </Collapsible>
            </View>
            <View style={styles.projectsSection}>
              <TouchableOpacity
                style={styles.collapsibleButton}
                onPress={() => setIsLikedProjectsCollapsed(!isLikedProjectsCollapsed)}
              >
                <Text style={styles.collapsibleButtonText}>Liked Projects ({likedProjects.length})</Text>
                {isLikedProjectsCollapsed ? (
                  <ChevronDown size={20} color={theme.colors.primary} />
                ) : (
                  <ChevronUp size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
              <Collapsible collapsed={isLikedProjectsCollapsed}>
                <View style={styles.projectsContainer}>
                  {likedProjects.map((project) => renderProjectItem(project, false))}
                </View>
              </Collapsible>
            </View>
          </View>
        )}
      </View>
      <ConfirmationDialog
        isVisible={isDeleteConfirmationVisible}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action is permanent and cannot be undone."
        confirmText="Yes, delete my account"
        cancelText="No, go back"
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsDeleteConfirmationVisible(false)}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    marginBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    overflow: "hidden",
  },
  backButtonText: {
    marginLeft: 10,
    color: theme.colors.primary,
    fontSize: 16,
  },
  editButton: {
    position: "absolute",
    top: 40,
    right: 20,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  editButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8,
  },
  editButtonText: {
    marginLeft: 8,
    color: theme.colors.primary,
    fontSize: 16,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarEditButton: {
    position: "absolute",
    bottom: 20,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 5,
    textAlign: "center",
    width: "100%",
  },
  username: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textAlign: "center",
    width: "100%",
  },
  location: {
    fontSize: 16,
    color: theme.colors.tertiary,
    marginBottom: 5,
    textAlign: "center",
    width: "100%",
  },
  artType: {
    fontSize: 16,
    color: theme.colors.primary,
    textAlign: "center",
    width: "100%",
  },
  bioContainer: {
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    borderRadius: 25,
    overflow: "hidden",
  },
  bioTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
  },
  bio: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 15,
  },
  statsContainer: {
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    borderRadius: 25,
    overflow: "hidden",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  editForm: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  editInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    color: theme.colors.text,
    width: "100%",
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "bold",
  },
  avatarUrlInput: {
    width: "100%",
    marginBottom: 15,
  },
  urlInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 10,
    color: theme.colors.text,
    marginBottom: 10,
  },
  avatarUrlButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  uploadButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
  uploadButtonText: {
    color: theme.colors.background,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 102, 102, 0.2)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontWeight: "bold",
  },
  profileInfo: {
    width: "100%",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    marginHorizontal: 20,
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
  tabContentContainer: {
    marginHorizontal: 20,
    borderRadius: 25,
    overflow: "hidden",
  },
  postsContainer: {
    flex: 1,
  },
  postItem: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    position: "relative",
    paddingBottom: 40,
  },
  postSubject: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.primary,
    marginBottom: 5,
  },
  postContent: {
    color: theme.colors.text,
    fontSize: 16,
    marginBottom: 10,
  },
  postFooter: {
    position: "absolute",
    bottom: 10,
    right: 15,
    alignItems: "flex-end",
  },
  postDate: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    position: "absolute",
    bottom: 10,
    left: 15,
    right: 15,
    textAlign: "left",
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  likeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  likeButtonText: {
    color: theme.colors.primary,
  },
  likeCount: {
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  deleteButton: {
    color: theme.colors.error,
    marginBottom: 5,
  },
  addPostContainer: {
    marginTop: 20,
  },
  addPostInput: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 10,
    color: theme.colors.text,
    marginBottom: 10,
  },
  addPostButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  addPostButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  projectsContainer: {
    padding: 20,
  },
  projectsSection: {
    marginBottom: 20,
  },
  projectItem: {
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  projectDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  projectTypeContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  projectType: {
    fontSize: 12,
    color: theme.colors.primary,
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
  leaveProjectButton: {
    backgroundColor: theme.colors.error,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  leaveProjectButtonText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: "bold",
  },
  addPostInputContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    marginBottom: 10,
  },
  addPostSubject: {
    color: theme.colors.text,
    fontWeight: "bold",
    fontSize: 16,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  addPostContent: {
    color: theme.colors.text,
    fontSize: 14,
    padding: 10,
    minHeight: 100,
    textAlignVertical: "top",
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
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 15,
    width: 120,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  followButtonText: {
    color: theme.colors.background,
    fontWeight: "bold",
    fontSize: 16,
  },
  followingButtonText: {
    color: theme.colors.primary,
  },
  followSection: {
    marginTop: 20,
  },
  followList: {
    marginTop: 10,
  },
  followItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    marginBottom: 8,
  },
  followItemText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  deleteAccountButton: {
    alignSelf: "flex-end",
    marginTop: 10,
  },
  deleteAccountButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    fontFamily: theme.fonts.regular,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  userTypeContainer: {
    marginTop: 20,
  },
  userTypeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 10,
  },
  userTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  userTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryUserType: {
    backgroundColor: "yellow",
  },
  secondaryUserType: {
    backgroundColor: "purple",
  },
  userTypeText: {
    color: theme.colors.primary, // Default color for editing state
    fontSize: 14,
  },
  savedUserTypeText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold",
  },
  customUserTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  customUserTypeInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 10,
    color: theme.colors.text,
    marginRight: 10,
  },
  addCustomUserTypeButton: {
    padding: 5,
  },
  userType: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  userTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
    gap: 10,
  },
})

export default UserPage

