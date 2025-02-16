import type React from "react"
import { useState, useEffect } from "react"
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native"
import { X, Clock, Folder, User, Tag, MessageCircle, Check } from "lucide-react-native"
import { theme } from "../src/styles/theme"
import { useData } from "../context/DataContext"

interface CreateFolderViewModalProps {
  isVisible: boolean
  onClose: () => void
  onCreateFolder: (folderName: string, filters: FolderFilters) => void
}

interface FolderFilters {
  timeRange: {
    startDate: string
    endDate: string
  }
  username: string[]
  projectType: string[]
  tags: string[]
  includeProjects: boolean
  includePosts: boolean
}

interface UserData {
  id: string
  username: string
}

const PROJECT_TYPES = ["Live", "Community", "Songs", "Album", "Production", "Distribution", "Merch", "Collab"]

const formatDate = (text: string) => {
  const numbers = text.replace(/\D/g, "")
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
}

const CustomCheckbox = ({ checked, onToggle, label }) => (
  <TouchableOpacity style={styles.checkboxWrapper} onPress={onToggle}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Check size={16} color={theme.colors.background} />}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
)

export const CreateFolderViewModal: React.FC<CreateFolderViewModalProps> = ({ isVisible, onClose, onCreateFolder }) => {
  const { getAllUsers } = useData()
  const [folderName, setFolderName] = useState("")
  const [filters, setFilters] = useState<FolderFilters>({
    timeRange: {
      startDate: "",
      endDate: "",
    },
    username: [],
    projectType: [],
    tags: [],
    includeProjects: true,
    includePosts: false,
  })
  const [users, setUsers] = useState<UserData[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([])
  const [filteredProjectTypes, setFilteredProjectTypes] = useState<string[]>(PROJECT_TYPES)
  const [isUsernameDropdownVisible, setIsUsernameDropdownVisible] = useState(false)
  const [isProjectTypeDropdownVisible, setIsProjectTypeDropdownVisible] = useState(false)
  const [usernameInputValue, setUsernameInputValue] = useState("")
  const [projectTypeInputValue, setProjectTypeInputValue] = useState("")
  const [tagsInputValue, setTagsInputValue] = useState("")

  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await getAllUsers()
      const sortedUsers = allUsers.sort((a, b) => a.username.localeCompare(b.username))
      setUsers(sortedUsers)
      setFilteredUsers(sortedUsers)
    }
    fetchUsers()
  }, [getAllUsers])

  useEffect(() => {
    setUsernameInputValue(filters.username.join(", "))
  }, [filters.username])

  useEffect(() => {
    setProjectTypeInputValue(filters.projectType.join(", "))
  }, [filters.projectType])

  useEffect(() => {
    setTagsInputValue(filters.tags.join(", "))
  }, [filters.tags])

  const handleCreateFolder = () => {
    if (folderName.trim()) {
      const newFilters = {
        timeRange: filters.timeRange,
        username: filters.username.length > 0 ? filters.username : [],
        projectType: filters.projectType.length > 0 ? filters.projectType : [],
        tags: filters.tags.length > 0 ? filters.tags : [],
        includeProjects: filters.includeProjects,
        includePosts: filters.includePosts,
      }
      onCreateFolder(folderName, newFilters)
      setFolderName("")
      setFilters({
        timeRange: { startDate: "", endDate: "" },
        username: [],
        projectType: [],
        tags: [],
        includeProjects: true,
        includePosts: false,
      })
      onClose()
    }
  }

  const handleUsernameChange = (text: string) => {
    setUsernameInputValue(text)
    const usernames = text.split(",").map((item) => item.trim())
    setFilters((prev) => ({ ...prev, username: usernames.filter(Boolean) }))
    const lastUsername = usernames[usernames.length - 1]
    const filtered = users.filter((user) => user.username.toLowerCase().startsWith(lastUsername.toLowerCase()))
    setFilteredUsers(filtered)
  }

  const handleProjectTypeChange = (text: string) => {
    setProjectTypeInputValue(text)
    const types = text.split(",").map((item) => item.trim())
    setFilters((prev) => ({ ...prev, projectType: types.filter(Boolean) }))
    const lastType = types[types.length - 1]
    const filtered = PROJECT_TYPES.filter((type) => type.toLowerCase().startsWith(lastType.toLowerCase()))
    setFilteredProjectTypes(filtered)
  }

  const handleTagsChange = (text: string) => {
    setTagsInputValue(text)
    const tags = text.split(",").map((item) => item.trim())
    setFilters((prev) => ({ ...prev, tags: tags.filter(Boolean) }))
  }

  const handleUsernameSelect = (username: string) => {
    const newUsernames = [...filters.username, username]
    const uniqueUsernames = Array.from(new Set(newUsernames))
    setFilters((prev) => ({ ...prev, username: uniqueUsernames }))
    setIsUsernameDropdownVisible(false)
  }

  const handleProjectTypeSelect = (projectType: string) => {
    const newProjectTypes = [...filters.projectType, projectType]
    const uniqueProjectTypes = Array.from(new Set(newProjectTypes))
    setFilters((prev) => ({ ...prev, projectType: uniqueProjectTypes }))
    setIsProjectTypeDropdownVisible(false)
  }

  const renderUserItem = ({ item }: { item: UserData }) => (
    <TouchableOpacity style={styles.dropdownItem} onPress={() => handleUsernameSelect(item.username)}>
      <Text style={styles.dropdownItemText}>{item.username}</Text>
    </TouchableOpacity>
  )

  const renderProjectTypeItem = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.dropdownItem} onPress={() => handleProjectTypeSelect(item)}>
      <Text style={styles.dropdownItemText}>{item}</Text>
    </TouchableOpacity>
  )

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Create Folder View</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color={theme.colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Folder Name"
            value={folderName}
            onChangeText={setFolderName}
            placeholderTextColor={theme.colors.textSecondary}
          />

          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <View style={styles.iconContainer}>
                <Clock color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.timeRangeContainer}>
                <TextInput
                  style={styles.timeRangeInput}
                  placeholder="Start Date (MM/DD/YYYY)"
                  value={filters.timeRange.startDate}
                  onChangeText={(text) =>
                    setFilters((prev) => ({
                      ...prev,
                      timeRange: {
                        ...prev.timeRange,
                        startDate: formatDate(text),
                      },
                    }))
                  }
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <TextInput
                  style={styles.timeRangeInput}
                  placeholder="End Date (MM/DD/YYYY)"
                  value={filters.timeRange.endDate}
                  onChangeText={(text) =>
                    setFilters((prev) => ({
                      ...prev,
                      timeRange: {
                        ...prev.timeRange,
                        endDate: formatDate(text),
                      },
                    }))
                  }
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.iconContainer}>
                <Folder color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Project Type(s)"
                  value={projectTypeInputValue}
                  onChangeText={handleProjectTypeChange}
                  onFocus={() => setIsProjectTypeDropdownVisible(true)}
                  onBlur={() => setTimeout(() => setIsProjectTypeDropdownVisible(false), 200)}
                  placeholderTextColor={theme.colors.textSecondary}
                />
                {isProjectTypeDropdownVisible && (
                  <FlatList
                    data={filteredProjectTypes}
                    renderItem={renderProjectTypeItem}
                    keyExtractor={(item) => item}
                    style={styles.dropdown}
                    keyboardShouldPersistTaps="handled"
                  />
                )}
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.iconContainer}>
                <User color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Username"
                  value={usernameInputValue}
                  onChangeText={handleUsernameChange}
                  onFocus={() => setIsUsernameDropdownVisible(true)}
                  onBlur={() => setTimeout(() => setIsUsernameDropdownVisible(false), 200)}
                  placeholderTextColor={theme.colors.textSecondary}
                />
                {isUsernameDropdownVisible && (
                  <FlatList
                    data={filteredUsers}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id}
                    style={styles.dropdown}
                    keyboardShouldPersistTaps="handled"
                  />
                )}
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.iconContainer}>
                <Tag color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Tags"
                  value={tagsInputValue}
                  onChangeText={handleTagsChange}
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.iconContainer}>
                <MessageCircle color={theme.colors.primary} size={20} />
              </View>
              <View style={styles.checkboxContainer}>
                <CustomCheckbox
                  checked={filters.includeProjects}
                  onToggle={() => setFilters((prev) => ({ ...prev, includeProjects: !prev.includeProjects }))}
                  label="Include Projects"
                />
                <CustomCheckbox
                  checked={filters.includePosts}
                  onToggle={() => setFilters((prev) => ({ ...prev, includePosts: !prev.includePosts }))}
                  label="Include Posts"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.createButton} onPress={handleCreateFolder}>
            <Folder color={theme.colors.background} size={20} />
            <Text style={styles.createButtonText}>Create Folder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 0,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    color: theme.colors.text,
    height: 40,
  },
  filtersContainer: {
    gap: 12,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 20,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    padding: 10,
    color: theme.colors.text,
    height: 40,
  },
  inputContainer: {
    flex: 1,
  },
  timeRangeContainer: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  timeRangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    padding: 10,
    color: theme.colors.text,
    height: 40,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  createButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  dropdown: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: theme.colors.background,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  checkboxContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 20,
  },
  checkboxWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkboxLabel: {
    color: theme.colors.text,
    fontSize: 14,
  },
})
