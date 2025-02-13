"use client"

import { useState, useCallback, useMemo } from "react"
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  ActivityIndicator,
  Modal,
  SectionList,
} from "react-native"
import { useRouter } from "expo-router"
import { Search, Plus, Trash2, Clock, Tag } from "lucide-react-native"
import { BlurView } from "expo-blur"
import { SafeAreaView } from "react-native-safe-area-context"
import { theme } from "../../src/styles/theme"
import { useData } from "../../context/DataContext"
import AddProjectForm from "../../components/AddProjectForm"
import { ConfirmationDialog } from "../../components/ConfirmationDialog"

const PROJECT_TYPES = [
  "All",
  "Live",
  "Community",
  "Songs",
  "Album",
  "Production",
  "Distribution",
  "Merch",
  "Collab",
] as const

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
    .map(([date, data]) => ({
      date,
      data: data as any[],
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export default function CreatorsScreen() {
  const { projects, isAuthenticated, isLoading, currentUser, deleteProject } = useData()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [showAddProjectForm, setShowAddProjectForm] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const router = useRouter()

  const filteredProjects = useMemo(() => {
    if (!projects) return []
    return projects
      .filter(
        (project) =>
          (!selectedType || selectedType === "All" || project.primaryType === selectedType) &&
          (project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            project.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [projects, searchQuery, selectedType])

  const groupedProjects = useMemo(() => groupItemsByDate(filteredProjects), [filteredProjects])

  const handleDeleteProject = useCallback((projectId: string) => {
    setProjectToDelete(projectId)
    setShowDeleteConfirmation(true)
  }, [])

  const confirmDeleteProject = useCallback(async () => {
    if (projectToDelete) {
      try {
        await deleteProject(projectToDelete)
      } catch (error) {
        console.error("Error deleting project:", error)
        // Handle error (e.g., show an error message to the user)
      }
    }
    setShowDeleteConfirmation(false)
    setProjectToDelete(null)
  }, [deleteProject, projectToDelete])

  const DaySeparator = ({ date }: { date: string }) => (
    <View style={styles.daySeparatorContainer}>
      <View style={styles.daySeparatorLine} />
      <Text style={styles.daySeparatorText}>{date}</Text>
      <View style={styles.daySeparatorLine} />
    </View>
  )

  const renderProjectItem = useCallback(
    ({ item }) => (
      <TouchableOpacity style={styles.projectItem} onPress={() => router.push(`/project/${item.id}`)}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
        <Text style={styles.projectTitle}>{item.title}</Text>
        <Text style={styles.projectCreator}>by {item.creator}</Text>
        <Text style={styles.projectDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.projectMetadata}>
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, index) => (
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
          <View style={styles.dateContainer}>
            <Clock size={12} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
        {currentUser && currentUser.id === item.creatorId && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteProject(item.id)}>
            <Trash2 color={theme.colors.error} size={20} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    ),
    [router, currentUser, handleDeleteProject],
  )

  return (
    <SafeAreaView style={styles.container}>
      <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Search color={theme.colors.textSecondary} size={20} style={styles.searchIcon} />
        </View>
      </View>
      <SectionList
        sections={groupedProjects}
        renderItem={renderProjectItem}
        renderSectionHeader={({ section: { date } }) => <DaySeparator date={date} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <FlatList
              horizontal
              data={PROJECT_TYPES}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.typeChip, selectedType === item && styles.selectedType]}
                  onPress={() => setSelectedType(item)}
                >
                  <Text style={styles.typeText}>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              style={styles.typeFilter}
            />
            {isAuthenticated && (
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddProjectForm(true)}>
                <Plus color={theme.colors.background} size={24} />
                <Text style={styles.addButtonText}>NEW PROJECT</Text>
              </TouchableOpacity>
            )}
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <Text style={styles.emptyListText}>No projects found</Text>
          )
        }
      />
      <Modal visible={showAddProjectForm} transparent={true} animationType="fade">
        <AddProjectForm onClose={() => setShowAddProjectForm(false)} />
      </Modal>
      <ConfirmationDialog
        isVisible={showDeleteConfirmation}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={confirmDeleteProject}
        onCancel={() => {
          setShowDeleteConfirmation(false)
          setProjectToDelete(null)
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 16,
  },
  searchIcon: {
    marginLeft: 10,
  },
  typeFilter: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  typeChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  selectedType: {
    backgroundColor: theme.colors.primary,
  },
  typeText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 20,
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
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    marginBottom: 20,
    padding: 15,
    borderRadius: 25,
  },
  addButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  emptyListText: {
    textAlign: "center",
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
  },
  deleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
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
})

