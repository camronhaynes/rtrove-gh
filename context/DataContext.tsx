"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Session } from "@supabase/supabase-js"
import type { Project, Chat, Commitment } from "../src/utils/types"

type User = {
  id: string
  username: string
  name: string
  avatar: string
  artType: string
  contributions: number
  projectsJoined: number
  location: string
  createdAt: string
  following: string[]
  followers: string[]
  bio: string
  posts: string[]
}

// New types for forum posts and comments
type ForumPost = {
  id: string
  projectId: string
  title: string
  content: string
  userId: string
  username: string
  timestamp: number
  comments: ForumComment[]
}

type ForumComment = {
  id: string
  postId: string
  content: string
  userId: string
  username: string
  timestamp: number
  parentId: string | null
  isOP: boolean
  isProjectCreator: boolean
}

type Post = {
  id: string
  userId: string
  projectId: string
  content: string
  subject: string
  createdAt: number
  likes: string[]
  comments?: {
    id: string
    postId: string
    content: string
    userId: string
    username: string
    timestamp: number
    isProjectCreator: boolean
    isOP: boolean
  }[]
}

interface FolderView {
  id: string
  name: string
  filters: {
    timeRange: string
    username: string
    projectType: string
  }
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
}

interface DataContextType extends AuthState {
  session: Session | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  users: User[]
  projects: Project[]
  posts: Post[]
  currentUser: User | null
  saveProject: (userId: string, projectId: string) => Promise<void>
  getSavedProjects: (userId: string) => Promise<string[]>
  updateProject: (project: Project) => Promise<void>
  updateUserProfile: (userId: string, userData: Partial<User>) => Promise<void>
  getAllUsers: () => Promise<User[]>
  getCreatedUsers: () => Promise<User[]>
  followUser: (followerId: string, followingId: string) => Promise<void>
  unfollowUser: (followerId: string, unfollowingId: string) => Promise<void>
  toggleLike: (userId: string, projectId: string) => Promise<void>
  getLikes: (projectId: string) => Promise<string[]>
  addPost: (userId: string, content: string, subject: string, projectId: string) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  likePost: (postId: string, userId: string) => Promise<void>
  unlikePost: (postId: string, userId: string) => Promise<void>
  getUserPosts: (userId: string) => Post[]
  getProjectPosts: (projectId: string) => Post[]
  addProject: (project: Omit<Project, "id" | "likes">) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  likeProject: (userId: string, projectId: string) => Promise<void>
  unlikeProject: (userId: string, projectId: string) => Promise<void>
  getLikedProjects: (userId: string) => Project[]
  getUserCreatedProjects: (userId: string) => Promise<Project[]>
  getProjectById: (projectId: string) => Promise<Project | null>
  toggleProjectParticipation: (projectId: string, userId: string) => Promise<void>
  folderViews: FolderView[]
  createFolderView: (folderView: FolderView) => Promise<void>
  deleteFolderView: (folderViewId: string) => Promise<void>
  updateFolderView: (folderView: FolderView) => Promise<void>
  editProject: (projectId: string, updatedProjectData: Partial<Project>) => Promise<Project>
  addChat: (projectId: string, userId: string, content: string) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  getProjectChats: (projectId: string) => Promise<Chat[]>
  // New forum-related functions
  getForumPosts: (projectId: string) => Promise<ForumPost[]>
  addForumPost: (projectId: string, title: string, content: string, userId: string, username: string) => Promise<void>
  updateForumPost: (postId: string, updatedData: Partial<ForumPost>) => Promise<void>
  deleteForumPost: (postId: string) => Promise<void>
  addForumComment: (
    projectId: string,
    postId: string,
    content: string,
    userId: string,
    username: string,
    parentId: string | null,
  ) => Promise<void>
  updateForumComment: (commentId: string, updatedContent: string) => Promise<void>
  deleteForumComment: (commentId: string) => Promise<void>
  addUserPostComment: (postId: string, content: string, userId: string, username: string) => Promise<void>
  deleteUserPostComment: (postId: string, commentId: string) => Promise<void>
  deleteUserProfile: (userId: string) => Promise<void>
  setProjectFundraisingGoal: (projectId: string, goal: number) => Promise<void>
  getProjectFundraisingGoal: (projectId: string) => Promise<number | null>
  addUserContribution: (projectId: string, userId: string, amount: number) => Promise<void>
  getUserTotalContribution: (projectId: string, userId: string) => Promise<number>
  getProjectTotalContributions: (projectId: string) => Promise<number>
  getProjectCommitments: (projectId: string) => Promise<Commitment[]>
}

const STORAGE_KEYS = {
  USERS: "rtrove_v2_users",
  CURRENT_USER: "rtrove_v2_current_user",
  PROJECTS: "rtrove_v2_projects",
  SAVED_PROJECTS: "rtrove_v2_saved_projects",
  LIKES: "rtrove_v2_likes",
  POSTS: "rtrove_v2_posts",
  FOLDER_VIEWS: "rtrove_v2_folder_views",
  CHATS: "rtrove_v2_chats",
  FORUM_POSTS: "rtrove_v2_forum_posts",
  FUNDRAISING_GOALS: "rtrove_v2_fundraising_goals",
  USER_CONTRIBUTIONS: "rtrove_v2_user_contributions",
  PROJECT_COMMITMENTS: "rtrove_v2_project_commitments",
} as const

const DataContext = createContext<DataContextType | null>(null)

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  })
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [folderViews, setFolderViews] = useState<FolderView[]>([])
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [fundraisingGoals, setFundraisingGoals] = useState<Record<string, number>>({})
  const [userContributions, setUserContributions] = useState<Record<string, number>>({})
  const [projectCommitments, setProjectCommitments] = useState<Record<string, Commitment[]>>({})

  useEffect(() => {
    initializeData()
  }, [])

  const initializeData = async () => {
    try {
      await loadStoredUser()
      await loadUsers()
      await loadProjects()
      await loadPosts()
      await loadFolderViews()
      await loadChats()
      await loadForumPosts()
      await loadFundraisingData()
    } catch (error) {
      console.error("Error initializing data:", error)
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER)
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setCurrentUser(parsedUser)
        setState({
          isAuthenticated: true,
          user: parsedUser,
          isLoading: false,
        })
      } else {
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error("Error loading stored user:", error)
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const loadUsers = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEYS.USERS)
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers))
      }
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const loadProjects = async () => {
    try {
      const storedProjects = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS)
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects))
      }
    } catch (error) {
      console.error("Error loading projects:", error)
    }
  }

  const loadPosts = async () => {
    try {
      const storedPosts = await AsyncStorage.getItem(STORAGE_KEYS.POSTS)
      if (storedPosts) {
        setPosts(JSON.parse(storedPosts))
      }
    } catch (error) {
      console.error("Error loading posts:", error)
    }
  }

  const loadFolderViews = async () => {
    try {
      const storedFolderViews = await AsyncStorage.getItem(STORAGE_KEYS.FOLDER_VIEWS)
      if (storedFolderViews) {
        setFolderViews(JSON.parse(storedFolderViews))
      }
    } catch (error) {
      console.error("Error loading folder views:", error)
    }
  }

  const loadChats = async () => {
    try {
      const storedChats = await AsyncStorage.getItem(STORAGE_KEYS.CHATS)
      if (storedChats) {
        setChats(JSON.parse(storedChats))
      }
    } catch (error) {
      console.error("Error loading chats:", error)
    }
  }

  const loadForumPosts = async () => {
    try {
      const storedForumPosts = await AsyncStorage.getItem(STORAGE_KEYS.FORUM_POSTS)
      if (storedForumPosts) {
        setForumPosts(JSON.parse(storedForumPosts))
      }
    } catch (error) {
      console.error("Error loading forum posts:", error)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const user = users.find((u) => u.username === username)
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user))
        setCurrentUser(user)
        setState({
          isAuthenticated: true,
          user: user,
          isLoading: false,
        })
      } else {
        throw new Error("User not found")
      }
    } catch (error) {
      console.error("Error during login:", error)
      throw new Error("Login failed")
    }
  }

  const register = async (username: string, password: string) => {
    try {
      if (users.some((u) => u.username === username)) {
        throw new Error("Username already exists")
      }
      const newUser: User = {
        id: Date.now().toString(),
        username,
        name: username,
        avatar: `https://picsum.photos/seed/${username}/200`,
        artType: "New Artist",
        contributions: 0,
        projectsJoined: 0,
        location: "Unknown",
        createdAt: new Date().toISOString(),
        following: [],
        followers: [],
        bio: "",
        posts: [],
      }

      const updatedUsers = [...users, newUser]
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers))
      setUsers(updatedUsers)

      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser))
      setCurrentUser(newUser)
      setState({
        isAuthenticated: true,
        user: newUser,
        isLoading: false,
      })
    } catch (error) {
      console.error("Error during registration:", error)
      throw new Error("Registration failed")
    }
  }

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
      setCurrentUser(null)
      setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      })
    } catch (error) {
      console.error("Error during logout:", error)
      throw new Error("Logout failed")
    }
  }

  const updateUserProfile = async (userId: string, userData: Partial<User>) => {
    try {
      const updatedUsers = users.map((u) => (u.id === userId ? { ...u, ...userData } : u))
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers))
      setUsers(updatedUsers)

      if (currentUser?.id === userId) {
        const updatedUser = { ...currentUser, ...userData }
        setCurrentUser(updatedUser)
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser))
      }
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw new Error("Failed to update user profile")
    }
  }

  const saveProject = async (userId: string, projectId: string) => {
    try {
      const savedProjects = await getSavedProjects(userId)
      if (!savedProjects.includes(projectId)) {
        await AsyncStorage.setItem(
          `${STORAGE_KEYS.SAVED_PROJECTS}_${userId}`,
          JSON.stringify([...savedProjects, projectId]),
        )
      }
    } catch (error) {
      console.error("Error saving project:", error)
      throw new Error("Failed to save project")
    }
  }

  const getSavedProjects = async (userId: string) => {
    try {
      const savedProjects = await AsyncStorage.getItem(`${STORAGE_KEYS.SAVED_PROJECTS}_${userId}`)
      return savedProjects ? JSON.parse(savedProjects) : []
    } catch (error) {
      console.error("Error getting saved projects:", error)
      throw new Error("Failed to get saved projects")
    }
  }

  const updateProject = async (project: Project) => {
    try {
      const updatedProjects = projects.map((p) => (p.id === project.id ? project : p))
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))
      setProjects(updatedProjects)
    } catch (error) {
      console.error("Error updating project:", error)
      throw new Error("Failed to update project")
    }
  }

  const getAllUsers = async () => {
    try {
      return users
    } catch (error) {
      console.error("Error getting all users:", error)
      throw new Error("Failed to get all users")
    }
  }

  const getCreatedUsers = async () => {
    try {
      return users
    } catch (error) {
      console.error("Error getting created users:", error)
      throw new Error("Failed to get created users")
    }
  }

  const followUser = async (followerId: string, followingId: string) => {
    try {
      const updatedUsers = users.map((user) => {
        if (user.id === followerId) {
          return {
            ...user,
            following: [...(user.following || []), followingId],
          }
        }
        if (user.id === followingId) {
          return {
            ...user,
            followers: [...(user.followers || []), followerId],
          }
        }
        return user
      })

      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers))
      setUsers(updatedUsers)

      // Update currentUser if they're the follower
      if (currentUser?.id === followerId) {
        const updatedCurrentUser = updatedUsers.find((u) => u.id === followerId)
        if (updatedCurrentUser) {
          setCurrentUser(updatedCurrentUser)
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrentUser))
        }
      }
    } catch (error) {
      console.error("Error following user:", error)
      throw new Error("Failed to follow user")
    }
  }

  const unfollowUser = async (followerId: string, unfollowingId: string) => {
    try {
      const updatedUsers = users.map((user) => {
        if (user.id === followerId) {
          return {
            ...user,
            following: (user.following || []).filter((id) => id !== unfollowingId),
          }
        }
        if (user.id === unfollowingId) {
          return {
            ...user,
            followers: (user.followers || []).filter((id) => id !== followerId),
          }
        }
        return user
      })

      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers))
      setUsers(updatedUsers)

      // Update currentUser if they're the unfollower
      if (currentUser?.id === followerId) {
        const updatedCurrentUser = updatedUsers.find((u) => u.id === followerId)
        if (updatedCurrentUser) {
          setCurrentUser(updatedCurrentUser)
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrentUser))
        }
      }
    } catch (error) {
      console.error("Error unfollowing user:", error)
      throw new Error("Failed to unfollow user")
    }
  }

  const toggleLike = async (userId: string, projectId: string) => {
    try {
      const likes = await getLikes(projectId)
      const updatedLikes = likes.includes(userId) ? likes.filter((id) => id !== userId) : [...likes, userId]
      await AsyncStorage.setItem(`${STORAGE_KEYS.LIKES}_${projectId}`, JSON.stringify(updatedLikes))
    } catch (error) {
      console.error("Error toggling like:", error)
      throw new Error("Failed to toggle like")
    }
  }

  const getLikes = async (projectId: string) => {
    try {
      const likes = await AsyncStorage.getItem(`${STORAGE_KEYS.LIKES}_${projectId}`)
      return likes ? JSON.parse(likes) : []
    } catch (error) {
      console.error("Error getting likes:", error)
      throw new Error("Failed to get likes")
    }
  }

  const addPost = async (userId: string, content: string, subject: string, projectId: string) => {
    try {
      const newPost: Post = {
        id: Date.now().toString(),
        userId,
        projectId,
        content,
        subject,
        createdAt: Date.now(),
        likes: [],
        comments: [],
      }
      if (content.trim() || subject.trim()) {
        const updatedPosts = [...posts, newPost]
        setPosts(updatedPosts)
        await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts))

        const updatedUsers = users.map((user) =>
          user.id === userId ? { ...user, posts: [...(user.posts || []), newPost.id] } : user,
        )
        setUsers(updatedUsers)
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers))
      }
    } catch (error) {
      console.error("Error adding post:", error)
      throw new Error("Failed to add post")
    }
  }

  const deletePost = async (postId: string) => {
    try {
      const updatedPosts = posts.filter((post) => post.id !== postId)
      setPosts(updatedPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts))

      const postToDelete = posts.find((post) => post.id === postId)
      if (postToDelete) {
        const updatedUsers = users.map((user) =>
          user.id === postToDelete.userId ? { ...user, posts: user.posts.filter((id) => id !== postId) } : user,
        )
        setUsers(updatedUsers)
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers))
      }
    } catch (error) {
      console.error("Error deleting post:", error)
      throw new Error("Failed to delete post")
    }
  }

  const likePost = async (postId: string, userId: string) => {
    try {
      const updatedPosts = posts.map((post) =>
        post.id === postId ? { ...post, likes: [...post.likes, userId] } : post,
      )
      setPosts(updatedPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts))
    } catch (error) {
      console.error("Error liking post:", error)
      throw new Error("Failed to like post")
    }
  }

  const unlikePost = async (postId: string, userId: string) => {
    try {
      const updatedPosts = posts.map((post) =>
        post.id === postId ? { ...post, likes: post.likes.filter((id) => id !== userId) } : post,
      )
      setPosts(updatedPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts))
    } catch (error) {
      console.error("Error unliking post:", error)
      throw new Error("Failed to unlike post")
    }
  }

  const getUserPosts = (userId: string) => {
    return posts.filter((post) => post.userId === userId)
  }

  const getProjectPosts = (projectId: string) => {
    return posts.filter((post) => post.projectId === projectId)
  }

  const addProject = async (newProject: Omit<Project, "id" | "likes">) => {
    try {
      const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const projectWithId: Project = { ...newProject, id: projectId, likes: [] }

      const updatedProjects = [...projects, projectWithId]
      setProjects(updatedProjects)

      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))

      if (currentUser) {
        const userProjects = (await AsyncStorage.getItem(`${STORAGE_KEYS.PROJECTS}_${currentUser.id}`)) || "[]"
        const parsedUserProjects = JSON.parse(userProjects)
        const updatedUserProjects = [...parsedUserProjects, projectId]
        await AsyncStorage.setItem(`${STORAGE_KEYS.PROJECTS}_${currentUser.id}`, JSON.stringify(updatedUserProjects))
      }
    } catch (error) {
      console.error("Error adding project:", error)
      throw new Error("Failed to add project")
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      const updatedProjects = projects.filter((project) => project.id !== projectId)
      setProjects(updatedProjects)
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))

      if (currentUser) {
        const userProjects = (await AsyncStorage.getItem(`${STORAGE_KEYS.PROJECTS}_${currentUser.id}`)) || "[]"
        const parsedUserProjects = JSON.parse(userProjects)
        const updatedUserProjects = parsedUserProjects.filter((id: string) => id !== projectId)
        await AsyncStorage.setItem(`${STORAGE_KEYS.PROJECTS}_${currentUser.id}`, JSON.stringify(updatedUserProjects))
      }
    } catch (error) {
      console.error("Error deleting project:", error)
      throw new Error("Failed to delete project")
    }
  }

  const likeProject = async (userId: string, projectId: string) => {
    try {
      const updatedProjects = projects.map((project) =>
        project.id === projectId ? { ...project, likes: [...project.likes, userId] } : project,
      )
      setProjects(updatedProjects)
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))
    } catch (error) {
      console.error("Error liking project:", error)
      throw new Error("Failed to like project")
    }
  }

  const unlikeProject = async (userId: string, projectId: string) => {
    try {
      const updatedProjects = projects.map((project) =>
        project.id === projectId ? { ...project, likes: project.likes.filter((id) => id !== userId) } : project,
      )
      setProjects(updatedProjects)
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))
    } catch (error) {
      console.error("Error unliking project:", error)
      throw new Error("Failed to unlike project")
    }
  }

  const getLikedProjects = (userId: string) => {
    return projects.filter((project) => project.likes.includes(userId))
  }

  const getUserCreatedProjects = async (userId: string): Promise<Project[]> => {
    try {
      const allProjects = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS)
      if (allProjects) {
        const parsedProjects: Project[] = JSON.parse(allProjects)
        return parsedProjects.filter((project) => project.creatorId === userId)
      }
      return []
    } catch (error) {
      console.error("Error getting user created projects:", error)
      throw new Error("Failed to get user created projects")
    }
  }

  const getProjectById = async (projectId: string): Promise<Project | null> => {
    try {
      const project = projects.find((p) => p.id === projectId)
      return project || null
    } catch (error) {
      console.error("Error getting project by ID:", error)
      throw new Error("Failed to get project")
    }
  }

  const toggleProjectParticipation = async (projectId: string, userId: string) => {
    try {
      const updatedProjects = projects.map((project) => {
        if (project.id === projectId) {
          const isParticipant = project.collaborators.includes(userId)
          const updatedCollaborators = isParticipant
            ? project.collaborators.filter((id) => id !== userId)
            : [...project.collaborators, userId]
          return { ...project, collaborators: updatedCollaborators }
        }
        return project
      })
      setProjects(updatedProjects)
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))

      // Update user's projectsJoined count
      const updatedUsers = users.map((user) => {
        if (user.id === userId) {
          const projectsJoined = updatedProjects.filter((p) => p.collaborators.includes(userId)).length
          return { ...user, projectsJoined }
        }
        return user
      })
      setUsers(updatedUsers)
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers))

      if (currentUser && currentUser.id === userId) {
        const updatedCurrentUser = updatedUsers.find((u) => u.id === userId)
        if (updatedCurrentUser) {
          setCurrentUser(updatedCurrentUser)
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedCurrentUser))
        }
      }
    } catch (error) {
      console.error("Error toggling project participation:", error)
      throw new Error("Failed to toggle project participation")
    }
  }

  const createFolderView = async (folderView: FolderView) => {
    try {
      const updatedFolderViews = [...folderViews, folderView]
      setFolderViews(updatedFolderViews)
      await AsyncStorage.setItem(STORAGE_KEYS.FOLDER_VIEWS, JSON.stringify(updatedFolderViews))
    } catch (error) {
      console.error("Error creating folder view:", error)
      throw new Error("Failed to create folder view")
    }
  }

  const deleteFolderView = async (folderViewId: string) => {
    try {
      const updatedFolderViews = folderViews.filter((view) => view.id !== folderViewId)
      setFolderViews(updatedFolderViews)
      await AsyncStorage.setItem(STORAGE_KEYS.FOLDER_VIEWS, JSON.stringify(updatedFolderViews))
    } catch (error) {
      console.error("Error deleting folder view:", error)
      throw new Error("Failed to delete folder view")
    }
  }

  const updateFolderView = async (updatedFolderView: FolderView) => {
    try {
      const updatedFolderViews = folderViews.map((view) =>
        view.id === updatedFolderView.id ? updatedFolderView : view,
      )
      setFolderViews(updatedFolderViews)
      await AsyncStorage.setItem(STORAGE_KEYS.FOLDER_VIEWS, JSON.stringify(updatedFolderViews))
    } catch (error) {
      console.error("Error updating folder view:", error)
      throw new Error("Failed to update folder view")
    }
  }

  const editProject = async (projectId: string, updatedProjectData: Partial<Project>): Promise<Project> => {
    try {
      const projectIndex = projects.findIndex((p) => p.id === projectId)
      if (projectIndex === -1) {
        throw new Error("Project not found")
      }

      const existingProject = projects[projectIndex]
      const updatedProject = {
        ...existingProject,
        ...updatedProjectData,
        files: [...(existingProject.files || []), ...(updatedProjectData.files || [])],
      }

      const updatedProjects = [...projects]
      updatedProjects[projectIndex] = updatedProject

      setProjects(updatedProjects)
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))

      // If the project creator is the current user, update their projects list
      if (currentUser && updatedProject.creatorId === currentUser.id) {
        const userProjects = (await AsyncStorage.getItem(`${STORAGE_KEYS.PROJECTS}_${currentUser.id}`)) || "[]"
        const parsedUserProjects = JSON.parse(userProjects)
        if (!parsedUserProjects.includes(projectId)) {
          const updatedUserProjects = [...parsedUserProjects, projectId]
          await AsyncStorage.setItem(`${STORAGE_KEYS.PROJECTS}_${currentUser.id}`, JSON.stringify(updatedUserProjects))
        }
      }

      return updatedProject
    } catch (error) {
      console.error("Error editing project:", error)
      throw new Error("Failed to edit project")
    }
  }

  const addChat = async (projectId: string, userId: string, content: string) => {
    try {
      const newChat: Chat = {
        id: Date.now().toString(),
        projectId,
        userId,
        content,
        createdAt: Date.now(),
      }
      const updatedChats = [...chats, newChat]
      setChats(updatedChats)
      await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updatedChats))
    } catch (error) {
      console.error("Error adding chat:", error)
      throw new Error("Failed to add chat")
    }
  }

  const deleteChat = async (chatId: string) => {
    try {
      const updatedChats = chats.filter((chat) => chat.id !== chatId)
      setChats(updatedChats)
      await AsyncStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(updatedChats))
    } catch (error) {
      console.error("Error deleting chat:", error)
      throw new Error("Failed to delete chat")
    }
  }

  const getProjectChats = async (projectId: string): Promise<Chat[]> => {
    try {
      return chats.filter((chat) => chat.projectId === projectId)
    } catch (error) {
      console.error("Error getting project chats:", error)
      throw new Error("Failed to get project chats")
    }
  }

  // New forum-related functions
  const getForumPosts = async (projectId: string): Promise<ForumPost[]> => {
    try {
      return forumPosts.filter((post) => post.projectId === projectId)
    } catch (error) {
      console.error("Error getting forum posts:", error)
      throw new Error("Failed to get forum posts")
    }
  }

  const addForumPost = async (
    projectId: string,
    title: string,
    content: string,
    userId: string,
    username: string,
  ): Promise<void> => {
    try {
      const newPost: ForumPost = {
        id: Date.now().toString(),
        projectId,
        title,
        content,
        userId,
        username,
        timestamp: Date.now(),
        comments: [],
      }
      const updatedForumPosts = [...forumPosts, newPost]
      setForumPosts(updatedForumPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(updatedForumPosts))
    } catch (error) {
      console.error("Error adding forum post:", error)
      throw new Error("Failed to add forum post")
    }
  }

  const updateForumPost = async (postId: string, updatedData: Partial<ForumPost>): Promise<void> => {
    try {
      const updatedForumPosts = forumPosts.map((post) => (post.id === postId ? { ...post, ...updatedData } : post))
      setForumPosts(updatedForumPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(updatedForumPosts))
    } catch (error) {
      console.error("Error updating forum post:", error)
      throw new Error("Failed to update forum post")
    }
  }

  const deleteForumPost = async (postId: string): Promise<void> => {
    try {
      const updatedForumPosts = forumPosts.filter((post) => post.id !== postId)
      setForumPosts(updatedForumPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(updatedForumPosts))
    } catch (error) {
      console.error("Error deleting forum post:", error)
      throw new Error("Failed to delete forum post")
    }
  }

  const addForumComment = async (
    projectId: string,
    postId: string,
    content: string,
    userId: string,
    username: string,
    parentId: string | null,
  ): Promise<void> => {
    try {
      const project = projects.find((p) => p.id === projectId)
      const post = forumPosts.find((p) => p.id === postId)

      if (!post) {
        throw new Error("Forum post not found")
      }

      const newComment: ForumComment = {
        id: Date.now().toString(),
        postId,
        content,
        userId,
        username,
        timestamp: Date.now(),
        parentId,
        isOP: userId === post.userId,
        isProjectCreator: project ? userId === project.creatorId : false,
      }

      const updatedForumPosts = forumPosts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p,
      )

      setForumPosts(updatedForumPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(updatedForumPosts))
    } catch (error) {
      console.error("Error adding forum comment:", error)
      throw new Error("Failed to add forum comment")
    }
  }

  const updateForumComment = async (commentId: string, updatedContent: string): Promise<void> => {
    try {
      const updatedForumPosts = forumPosts.map((post) => ({
        ...post,
        comments: post.comments.map((comment) =>
          comment.id === commentId ? { ...comment, content: updatedContent } : comment,
        ),
      }))
      setForumPosts(updatedForumPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(updatedForumPosts))
    } catch (error) {
      console.error("Error updating forum comment:", error)
      throw new Error("Failed to update forum comment")
    }
  }

  const deleteForumComment = async (commentId: string): Promise<void> => {
    try {
      const updatedForumPosts = forumPosts.map((post) => ({
        ...post,
        comments: post.comments.filter((comment) => comment.id !== commentId),
      }))
      setForumPosts(updatedForumPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.FORUM_POSTS, JSON.stringify(updatedForumPosts))
    } catch (error) {
      console.error("Error deleting forum comment:", error)
      throw new Error("Failed to delete forum comment")
    }
  }

  const addUserPostComment = async (postId: string, content: string, userId: string, username: string) => {
    try {
      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          const newComment = {
            id: Date.now().toString(),
            postId,
            content,
            userId,
            username,
            timestamp: Date.now(),
            isProjectCreator: false,
            isOP: userId === post.userId,
          }
          return {
            ...post,
            comments: [...(post.comments || []), newComment],
          }
        }
        return post
      })

      setPosts(updatedPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts))
    } catch (error) {
      console.error("Error adding comment:", error)
      throw new Error("Failed to add comment")
    }
  }

  const deleteUserPostComment = async (postId: string, commentId: string) => {
    try {
      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: (post.comments || []).filter((comment) => comment.id !== commentId),
          }
        }
        return post
      })

      setPosts(updatedPosts)
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts))
    } catch (error) {
      console.error("Error deleting comment:", error)
      throw new Error("Failed to delete comment")
    }
  }

  const deleteUserProfile = async (userId: string) => {
    try {
      // First, get all the user's data before deletion
      const userToDelete = users.find((user) => user.id === userId)
      if (!userToDelete) throw new Error("User not found")

      // Update all other users' following/followers arrays
      const updatedUsers = users
        .filter((user) => user.id !== userId) // Remove the deleted user
        .map((user) => ({
          ...user,
          // Remove the deleted user from following arrays
          following: (user.following || []).filter((id) => id !== userId),
          // Remove the deleted user from followers arrays
          followers: (user.followers || []).filter((id) => id !== userId),
        }))

      // Update projects: remove user from collaborators and remove their created projects
      const updatedProjects = projects
        .filter((project) => project.creatorId !== userId) // Remove user's created projects
        .map((project) => ({
          ...project,
          collaborators: project.collaborators.filter((id) => id !== userId),
          likes: project.likes.filter((id) => id !== userId),
        }))

      // Update posts: remove user's posts and their likes/comments from other posts
      const updatedPosts = posts
        .filter((post) => post.userId !== userId) // Remove user's posts
        .map((post) => ({
          ...post,
          likes: post.likes.filter((id) => id !== userId),
          comments: post.comments?.filter((comment) => comment.userId !== userId) || [],
        }))

      // Save all updates
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers))
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects))
      await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(updatedPosts))

      // Update state
      setUsers(updatedUsers)
      setProjects(updatedProjects)
      setPosts(updatedPosts)

      // Clean up user's stored data
      await AsyncStorage.removeItem(`${STORAGE_KEYS.SAVED_PROJECTS}_${userId}`)
      await AsyncStorage.removeItem(`${STORAGE_KEYS.PROJECTS}_${userId}`)

      // Handle current user logout if they're the one being deleted
      if (currentUser?.id === userId) {
        setCurrentUser(null)
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
        setState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
      }

      console.log("User profile and related data deleted successfully")
    } catch (error) {
      console.error("Error deleting user profile:", error)
      throw new Error("Failed to delete user profile")
    }
  }

  const loadFundraisingData = async () => {
    try {
      const storedGoals = await AsyncStorage.getItem(STORAGE_KEYS.FUNDRAISING_GOALS)
      if (storedGoals) {
        setFundraisingGoals(JSON.parse(storedGoals))
      }

      const storedContributions = await AsyncStorage.getItem(STORAGE_KEYS.USER_CONTRIBUTIONS)
      if (storedContributions) {
        setUserContributions(JSON.parse(storedContributions))
      }

      const storedCommitments = await AsyncStorage.getItem(STORAGE_KEYS.PROJECT_COMMITMENTS)
      if (storedCommitments) {
        setProjectCommitments(JSON.parse(storedCommitments))
      }
    } catch (error) {
      console.error("Error loading fundraising data:", error)
    }
  }

  const setProjectFundraisingGoal = async (projectId: string, goal: number) => {
    try {
      const updatedGoals = { ...fundraisingGoals, [projectId]: goal }
      setFundraisingGoals(updatedGoals)
      await AsyncStorage.setItem(STORAGE_KEYS.FUNDRAISING_GOALS, JSON.stringify(updatedGoals))

      // Update the project in the local state
      setProjects((prevProjects) => prevProjects.map((p) => (p.id === projectId ? { ...p, fundraisingGoal: goal } : p)))
    } catch (error) {
      console.error("Error setting project fundraising goal:", error)
      throw new Error("Failed to set project fundraising goal")
    }
  }

  const getProjectFundraisingGoal = async (projectId: string): Promise<number | null> => {
    return fundraisingGoals[projectId] || null
  }

  const addUserContribution = async (projectId: string, userId: string, amount: number) => {
    try {
      const key = `${projectId}_${userId}`
      const currentAmount = userContributions[key] || 0
      const updatedContributions = { ...userContributions, [key]: currentAmount + amount }
      setUserContributions(updatedContributions)
      await AsyncStorage.setItem(STORAGE_KEYS.USER_CONTRIBUTIONS, JSON.stringify(updatedContributions))

      const newCommitment: Commitment = {
        userId,
        amount,
        timestamp: Date.now(),
      }
      const updatedCommitments = {
        ...projectCommitments,
        [projectId]: [...(projectCommitments[projectId] || []), newCommitment],
      }
      setProjectCommitments(updatedCommitments)
      await AsyncStorage.setItem(STORAGE_KEYS.PROJECT_COMMITMENTS, JSON.stringify(updatedCommitments))

      // Update the project in the local state
      setProjects((prevProjects) =>
        prevProjects.map((p) => {
          if (p.id === projectId) {
            const updatedCommitments = [...(p.commitments || []), newCommitment]
            return { ...p, commitments: updatedCommitments }
          }
          return p
        }),
      )
    } catch (error) {
      console.error("Error adding user contribution:", error)
      throw new Error("Failed to add user contribution")
    }
  }

  const getUserTotalContribution = async (projectId: string, userId: string): Promise<number> => {
    const key = `${projectId}_${userId}`
    return userContributions[key] || 0
  }

  const getProjectTotalContributions = async (projectId: string): Promise<number> => {
    return Object.entries(userContributions)
      .filter(([key]) => key.startsWith(`${projectId}_`))
      .reduce((total, [, amount]) => total + amount, 0)
  }

  const getProjectCommitments = async (projectId: string): Promise<Commitment[]> => {
    return projectCommitments[projectId] || []
  }

  return (
    <DataContext.Provider
      value={{
        session: state.user ? { user: state.user } : null,
        isAuthenticated: state.isAuthenticated,
        login,
        register,
        logout,
        users,
        projects,
        posts,
        currentUser,
        saveProject,
        getSavedProjects,
        updateProject,
        updateUserProfile,
        getAllUsers,
        getCreatedUsers,
        followUser,
        unfollowUser,
        toggleLike,
        getLikes,
        addPost,
        deletePost,
        likePost,
        unlikePost,
        getUserPosts,
        getProjectPosts,
        addProject,
        deleteProject,
        likeProject,
        unlikeProject,
        getLikedProjects,
        getUserCreatedProjects,
        getProjectById,
        toggleProjectParticipation,
        folderViews,
        createFolderView,
        deleteFolderView,
        updateFolderView,
        editProject,
        addChat,
        deleteChat,
        getProjectChats,
        isLoading: state.isLoading,
        // New forum-related functions
        getForumPosts,
        addForumPost,
        updateForumPost,
        deleteForumPost,
        addForumComment,
        updateForumComment,
        deleteForumComment,
        addUserPostComment,
        deleteUserPostComment,
        deleteUserProfile,
        setProjectFundraisingGoal,
        getProjectFundraisingGoal,
        addUserContribution,
        getUserTotalContribution,
        getProjectTotalContributions,
        getProjectCommitments,
      }}
    >
      {!state.isLoading && children}
    </DataContext.Provider>
  )
}

export const useData = () => {
  const context = useContext(DataContext)
  if (context === null) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}

