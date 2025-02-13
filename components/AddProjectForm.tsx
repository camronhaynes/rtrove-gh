import type React from "react"
import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native"
import { useData } from "../context/DataContext"
import { theme } from "../src/styles/theme"
import { BlurView } from "expo-blur"
import { X, Check } from "lucide-react-native"

const PROJECT_TYPES = ["Live", "Community", "Songs", "Album", "Production", "Distribution", "Merch", "Collab"]

interface AddProjectFormProps {
  onClose: () => void
}

const AddProjectForm: React.FC<AddProjectFormProps> = ({ onClose }) => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [tags, setTags] = useState("")
  const { addProject, currentUser } = useData()

  const toggleProjectType = (type: string) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const handleSubmit = async () => {
    if (title && description && selectedTypes.length > 0 && currentUser) {
      const newProject = {
        title,
        description,
        primaryType: selectedTypes[0],
        additionalTypes: selectedTypes.slice(1),
        tags: tags.split(",").map((tag) => tag.trim()),
        creator: currentUser.username,
        creatorId: currentUser.id,
        createdAt: new Date().toISOString(),
        likes: [],
        collaborators: [],
      }

      try {
        await addProject(newProject)
        onClose()
      } catch (error) {
        console.error("Error adding project:", error)
        // Handle error (e.g., show an error message to the user)
      }
    }
  }

  return (
    <View style={styles.modalContainer}>
      <BlurView intensity={80} style={styles.blurContainer} tint="dark">
        <View style={styles.formContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color={theme.colors.text} size={24} />
          </TouchableOpacity>

          <Text style={styles.title}>Create New Project</Text>

          <View style={styles.inputsContainer}>
            <TextInput
              style={styles.input}
              placeholder="Project Title"
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Project Description"
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Project Types (Select Multiple):</Text>
            <View style={styles.typeGrid}>
              {PROJECT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeChip, selectedTypes.includes(type) && styles.selectedType]}
                  onPress={() => toggleProjectType(type)}
                >
                  <View style={styles.typeContent}>
                    {selectedTypes.includes(type) && (
                      <Check size={16} color={theme.colors.background} style={styles.checkIcon} />
                    )}
                    <Text style={[styles.typeText, selectedTypes.includes(type) && styles.selectedTypeText]}>
                      {type}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Tags (comma-separated)"
              placeholderTextColor={theme.colors.textSecondary}
              value={tags}
              onChangeText={setTags}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!title || !description || selectedTypes.length === 0) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!title || !description || selectedTypes.length === 0}
            >
              <Text style={styles.submitButtonText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </View>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  blurContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    width: "90%",
    maxWidth: 500,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 16,
    padding: 24,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 24,
    textAlign: "center",
  },
  inputsContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  label: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  selectedType: {
    backgroundColor: theme.colors.primary,
  },
  typeText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  selectedTypeText: {
    color: theme.colors.background,
  },
  checkIcon: {
    marginRight: 4,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default AddProjectForm

