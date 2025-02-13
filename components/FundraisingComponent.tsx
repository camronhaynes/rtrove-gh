"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from "react-native"
import { DollarSign, Edit2 } from "lucide-react-native"

import { useData } from "../context/DataContext"
import { theme } from "../src/styles/theme"
import type { Project, User, Commitment } from "../src/utils/types"

interface FundraisingComponentProps {
  project: Project
  currentUser: User | null
}

const FundraisingComponent: React.FC<FundraisingComponentProps> = ({ project, currentUser }) => {
  const { editProject, updateProject } = useData()

  const [isEditing, setIsEditing] = useState(false)
  const [fundraisingGoal, setFundraisingGoal] = useState(project.fundraisingGoal?.toString() || "")
  const [commitmentAmount, setCommitmentAmount] = useState("")

  const cumulativeCommitments = useMemo(() => {
    const commitmentMap = new Map<string, number>()
    project.commitments?.forEach((commitment) => {
      const currentTotal = commitmentMap.get(commitment.userId) || 0
      commitmentMap.set(commitment.userId, currentTotal + commitment.amount)
    })
    return Array.from(commitmentMap, ([userId, amount]) => ({
      userId,
      username: project.commitments?.find((c) => c.userId === userId)?.username || "Unknown User",
      amount,
    }))
  }, [project.commitments])

  const totalCommitted = useMemo(
    () => cumulativeCommitments.reduce((sum, commitment) => sum + commitment.amount, 0),
    [cumulativeCommitments],
  )

  const goalAmount = project.fundraisingGoal || 0
  const remaining = Math.max(goalAmount - totalCommitted, 0)
  const progress = goalAmount > 0 ? (totalCommitted / goalAmount) * 100 : 0

  const handleSaveFundraisingGoal = async () => {
    if (project && currentUser && currentUser.id === project.creatorId) {
      try {
        const newGoal = Number.parseFloat(fundraisingGoal) || 0
        const updatedProject = { ...project, fundraisingGoal: newGoal }
        await editProject(project.id, { fundraisingGoal: newGoal })
        updateProject(updatedProject)
        setIsEditing(false)
        Alert.alert("Success", "Fundraising goal updated successfully")
      } catch (error) {
        console.error("Error saving fundraising goal:", error)
        Alert.alert("Error", "Failed to save fundraising goal. Please try again.")
      }
    }
  }

  const handleCommitment = async () => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to make a commitment.")
      return
    }

    const amount = Number.parseFloat(commitmentAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid commitment amount.")
      return
    }

    try {
      const newCommitment: Commitment = {
        userId: currentUser.id,
        username: currentUser.username,
        amount: amount,
        timestamp: Date.now(),
      }

      const updatedCommitments = project.commitments ? [...project.commitments, newCommitment] : [newCommitment]

      const updatedProject = { ...project, commitments: updatedCommitments }
      await editProject(project.id, { commitments: updatedCommitments })
      updateProject(updatedProject)
      setCommitmentAmount("")
      Alert.alert("Success", "Your commitment has been recorded.")
    } catch (error) {
      console.error("Error saving commitment:", error)
      Alert.alert("Error", "Failed to save commitment. Please try again.")
    }
  }

  const renderCommitmentItem = ({ item }: { item: { userId: string; username: string; amount: number } }) => {
    const percentage = (item.amount / totalCommitted) * 100
    return (
      <View style={styles.commitmentItem}>
        <View style={styles.commitmentInfo}>
          <Text style={styles.commitmentName}>{item.username}</Text>
          <Text style={styles.commitmentPercentage}>{percentage.toFixed(1)}%</Text>
        </View>
        <Text style={styles.commitmentAmount}>${item.amount.toFixed(2)}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Fundraising</Text>
      <View style={styles.goalContainer}>
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              value={fundraisingGoal}
              onChangeText={setFundraisingGoal}
              placeholder="Set fundraising goal (in dollars)"
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <TouchableOpacity style={styles.button} onPress={handleSaveFundraisingGoal}>
              <Text style={styles.buttonText}>Save Goal</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.goalDisplay}>
            <Text style={styles.goalText}>Goal: ${goalAmount.toFixed(2)}</Text>
            {currentUser && currentUser.id === project.creatorId && (
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Edit2 size={20} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Committed: ${totalCommitted.toFixed(2)} / Remaining: ${remaining.toFixed(2)}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>
      <View style={styles.commitmentContainer}>
        <Text style={styles.commitmentTitle}>Make a Commitment</Text>
        <View style={styles.commitmentInputContainer}>
          <TextInput
            style={styles.commitmentInput}
            value={commitmentAmount}
            onChangeText={setCommitmentAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <TouchableOpacity style={styles.commitButton} onPress={handleCommitment}>
            <DollarSign size={20} color={theme.colors.background} />
            <Text style={styles.commitButtonText}>Commit</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.commitmentsTitle}>Commitments</Text>
      <FlatList
        data={cumulativeCommitments}
        renderItem={renderCommitmentItem}
        keyExtractor={(item) => item.userId}
        style={styles.commitmentsList}
        ListEmptyComponent={<Text style={styles.emptyText}>No commitments yet.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 24,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 24,
  },
  goalContainer: {
    marginBottom: 24,
    width: "100%",
  },
  goalDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalText: {
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    marginBottom: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  buttonText: {
    color: theme.colors.background,
    fontWeight: "bold",
    fontSize: 16,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  statusContainer: {
    marginBottom: 24,
    width: "100%",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
  },
  statusText: {
    color: theme.colors.text,
    marginBottom: 8,
    fontSize: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.primary,
  },
  commitmentContainer: {
    marginBottom: 24,
    width: "100%",
  },
  commitmentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 12,
  },
  commitmentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  commitmentInput: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 12,
    color: theme.colors.text,
    marginRight: 8,
    fontSize: 16,
  },
  commitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  commitButtonText: {
    color: theme.colors.background,
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  commitmentsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 12,
  },
  commitmentsList: {
    maxHeight: 200,
  },
  commitmentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  commitmentInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  commitmentName: {
    color: theme.colors.text,
    fontSize: 16,
    marginRight: 8,
  },
  commitmentPercentage: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  commitmentAmount: {
    color: theme.colors.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontSize: 16,
    marginTop: 12,
  },
})

export default FundraisingComponent

