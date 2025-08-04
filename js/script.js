// Firebase imports and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  off,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCsSYhTAcfBzzOpuhySNaT2hnUG8EPKMHM",
  authDomain: "task-manager-6175b.firebaseapp.com",
  databaseURL:
    "https://task-manager-6175b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "task-manager-6175b",
  storageBucket: "task-manager-6175b.firebasestorage.app",
  messagingSenderId: "639877056545",
  appId: "1:639877056545:web:24275ae41e44986fb4bb60",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM elements
const tasksList = document.getElementById("tasksList");
const dayTabs = document.querySelectorAll(".day-tab");
const currentDayTitle = document.getElementById("currentDayTitle");
const manageTasksTab = document.getElementById("manageTasksTab");
const createTaskBtn = document.getElementById("createTaskBtn");
const statsSection = document.getElementById("statsSection");
const pendingTasksStat = document.getElementById("pendingTasksStat");
const completionPercent = document.getElementById("completionPercent");
const pointsDisplay = document.getElementById("pointsDisplay");
const dayOptions = document.querySelectorAll(".day-option");
const saveTaskBtn = document.getElementById("saveTaskBtn");
const updateTaskBtn = document.getElementById("updateTaskBtn");

// Current day filter (default to 'all')
let currentDay = "all";
let tasksListener = null;

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  loadTasks();
  setupEventListeners();
});

// Firebase CRUD Operations

// Create a new task
async function createTask(taskData) {
  try {
    const tasksRef = ref(db, "tasks");
    const newTaskRef = push(tasksRef);

    // Initialize completion status for each day
    const completedStatus = {};
    taskData.days.forEach((day) => {
      completedStatus[day] = false;
    });

    const newTask = {
      id: newTaskRef.key,
      name: taskData.name,
      description: taskData.description || "",
      points: taskData.points,
      days: taskData.days,
      priority: taskData.priority,
      category: taskData.category,
      completed: completedStatus,
      timestamp: Date.now(),
    };

    await set(newTaskRef, newTask);
    console.log("Task created successfully with ID:", newTaskRef.key);
    return { success: true, task: newTask };
  } catch (error) {
    console.error("Error creating task:", error);
    return { success: false, message: error.message };
  }
}

// Get all tasks once
async function getAllTasks() {
  try {
    const tasksRef = ref(db, "tasks");
    const snapshot = await get(tasksRef);

    if (snapshot.exists()) {
      const tasksData = snapshot.val();
      // Convert object to array and add IDs
      const tasks = Object.keys(tasksData).map((key) => ({
        ...tasksData[key],
        id: key,
      }));
      return { success: true, tasks: tasks };
    } else {
      return { success: true, tasks: [] };
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return { success: false, message: error.message };
  }
}

// Get a single task by ID
async function getTask(taskId) {
  try {
    const taskRef = ref(db, `tasks/${taskId}`);
    const snapshot = await get(taskRef);

    if (snapshot.exists()) {
      return { success: true, task: { ...snapshot.val(), id: taskId } };
    } else {
      return { success: false, message: "Task not found" };
    }
  } catch (error) {
    console.error("Error fetching task:", error);
    return { success: false, message: error.message };
  }
}

// Update a task
async function updateTask(taskData) {
  try {
    const taskRef = ref(db, `tasks/${taskData.id}`);

    // Get current task to preserve completion status for existing days
    const currentTaskSnapshot = await get(taskRef);
    if (!currentTaskSnapshot.exists()) {
      return { success: false, message: "Task not found" };
    }

    const currentTask = currentTaskSnapshot.val();
    const newCompleted = {};

    // Preserve completion status for existing days, set false for new days
    taskData.days.forEach((day) => {
      if (currentTask.completed && currentTask.completed[day] !== undefined) {
        newCompleted[day] = currentTask.completed[day];
      } else {
        newCompleted[day] = false;
      }
    });

    const updatedTask = {
      name: taskData.name,
      description: taskData.description || "",
      points: taskData.points,
      days: taskData.days,
      priority: taskData.priority,
      category: taskData.category,
      completed: newCompleted,
      timestamp: currentTask.timestamp || Date.now(),
    };

    await update(taskRef, updatedTask);
    console.log("Task updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error updating task:", error);
    return { success: false, message: error.message };
  }
}

// Toggle task completion status
async function toggleTaskCompletion(taskId, day) {
  try {
    const taskRef = ref(db, `tasks/${taskId}`);
    const snapshot = await get(taskRef);

    if (!snapshot.exists()) {
      return { success: false, message: "Task not found" };
    }

    const task = snapshot.val();
    if (task.completed && task.completed[day] !== undefined) {
      const newStatus = !task.completed[day];
      await update(ref(db, `tasks/${taskId}/completed`), { [day]: newStatus });
      console.log(
        `Task ${taskId} completion status for ${day} updated to ${newStatus}`
      );
      return { success: true };
    } else {
      return { success: false, message: "Invalid day for this task" };
    }
  } catch (error) {
    console.error("Error toggling task completion:", error);
    return { success: false, message: error.message };
  }
}

// Delete a task
async function deleteTask(taskId) {
  try {
    const taskRef = ref(db, `tasks/${taskId}`);
    await remove(taskRef);
    console.log("Task deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, message: error.message };
  }
}

// Listen for real-time updates
function setupTasksListener() {
  // Remove existing listener if any
  if (tasksListener) {
    off(ref(db, "tasks"), "value", tasksListener);
  }

  const tasksRef = ref(db, "tasks");
  tasksListener = onValue(
    tasksRef,
    (snapshot) => {
      let tasks = [];
      if (snapshot.exists()) {
        const tasksData = snapshot.val();
        tasks = Object.keys(tasksData).map((key) => ({
          ...tasksData[key],
          id: key,
        }));
      }

      // Filter and render tasks based on current day
      const filteredTasks = filterTasksByDay(tasks, currentDay);
      const stats = calculateStats(tasks, currentDay);

      renderTasks(filteredTasks);
      updateTaskSummary(filteredTasks.length);

      if (currentDay !== "all") {
        updateStats(stats);
      }
    },
    (error) => {
      console.error("Error listening to tasks:", error);
      tasksList.innerHTML =
        '<div class="empty-message">Error loading tasks</div>';
      updateTaskSummary(0);
    }
  );
}

// Filter tasks by day
function filterTasksByDay(tasks, day) {
  if (day === "all") {
    return tasks;
  }

  return tasks.filter((task) => task.days && task.days.includes(day));
}

// Calculate statistics for a specific day
function calculateStats(tasks, day) {
  if (day === "all") {
    return null;
  }

  const filteredTasks = filterTasksByDay(tasks, day);
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(
    (task) => task.completed && task.completed[day]
  ).length;
  const pendingTasks = totalTasks - completedTasks;

  const totalPoints = filteredTasks.reduce(
    (sum, task) => sum + (task.points || 0),
    0
  );
  const completedPoints = filteredTasks
    .filter((task) => task.completed && task.completed[day])
    .reduce((sum, task) => sum + (task.points || 0), 0);

  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    pending: pendingTasks,
    completionPercentage: completionPercentage,
    completedPoints: completedPoints,
    totalPoints: totalPoints,
  };
}

// Set up event listeners
function setupEventListeners() {
  // Day tabs in sidebar
  dayTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      currentDay = this.getAttribute("data-day") || "all";

      // Update active tab
      dayTabs.forEach((t) => t.querySelector("a").classList.remove("active"));
      this.querySelector("a").classList.add("active");

      // Update title and render tasks
      if (currentDay === "all") {
        currentDayTitle.textContent = "All Tasks";
        createTaskBtn.style.display = "block";
        statsSection.classList.add("d-none");
      } else {
        currentDayTitle.textContent =
          currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
        createTaskBtn.style.display = "none";
        statsSection.classList.remove("d-none");
      }

      // Trigger re-rendering with current tasks
      setupTasksListener();
    });
  });

  // Day selection in create modal
  dayOptions.forEach((option) => {
    option.addEventListener("click", function () {
      this.classList.toggle("active");
      updateSelectedDays();
    });
  });

  // Save new task
  saveTaskBtn.addEventListener("click", async function () {
    const taskName = document.getElementById("taskName").value;
    const taskDescription = document.getElementById("taskDescription").value;
    const taskPriority = document.getElementById("taskPriority").value;
    const selectedDaysValue = document.getElementById("selectedDays").value;
    const selectedDays = selectedDaysValue ? selectedDaysValue.split(",") : [];
    const category = document.getElementById("taskCategory").value;

    if (!taskName || selectedDays.length === 0) {
      showError("Please fill all required fields");
      return;
    }

    // Create task data object
    const taskData = {
      name: taskName,
      description: taskDescription,
      priority: parseInt(taskPriority),
      days: selectedDays,
      category: category,
      points: calculatePointsFromPriority(parseInt(taskPriority)),
    };

    // Create task in Firebase
    const result = await createTask(taskData);

    if (result.success) {
      showSuccess("Task created successfully");

      // Reset form and close modal
      document.getElementById("taskForm").reset();
      document
        .querySelectorAll(".day-option")
        .forEach((opt) => opt.classList.remove("active"));
      document.getElementById("taskPriority").value = "3";
      document.getElementById("taskCategory").value = "work";
      document.getElementById("selectedDays").value = "";

      bootstrap.Modal.getInstance(
        document.getElementById("addTaskModal")
      ).hide();
    } else {
      showError("Error creating task: " + result.message);
    }
  });

  // Update task
  updateTaskBtn.addEventListener("click", async function () {
    const taskId = document.getElementById("editTaskId").value;
    const taskName = document.getElementById("editTaskName").value;
    const taskDescription = document.getElementById(
      "editTaskDescription"
    ).value;
    const taskPriority = document.getElementById("editTaskPriority").value;
    const selectedDaysValue = document.getElementById("editSelectedDays").value;
    const selectedDays = selectedDaysValue ? selectedDaysValue.split(",") : [];
    const category = document.getElementById("editTaskCategory").value;

    if (!taskName || selectedDays.length === 0) {
      showError("Please fill all required fields");
      return;
    }

    // Create task data object
    const taskData = {
      id: taskId,
      name: taskName,
      description: taskDescription,
      priority: parseInt(taskPriority),
      days: selectedDays,
      category: category,
      points: calculatePointsFromPriority(parseInt(taskPriority)),
    };

    // Update task in Firebase
    const result = await updateTask(taskData);

    if (result.success) {
      showSuccess("Task updated successfully");
      bootstrap.Modal.getInstance(
        document.getElementById("editTaskModal")
      ).hide();
    } else {
      showError("Error updating task: " + result.message);
    }
  });
}

// Helper functions
function getPriorityLabel(priority) {
  const labels = {
    1: "Critical",
    2: "High",
    3: "Medium",
    4: "Low",
    5: "Minimal",
  };
  return labels[priority] || "Medium";
}

function getPriorityBadgeClass(priority) {
  const classes = {
    1: "bg-critical",
    2: "bg-high",
    3: "bg-medium",
    4: "bg-low",
    5: "bg-minimal",
  };
  return classes[priority] || "bg-secondary";
}

function getPriorityBadge(priority) {
  const icons = {
    1: "fa-triangle-exclamation",
    2: "fa-circle-exclamation",
    3: "fa-equals",
    4: "fa-arrow-down",
    5: "fa-arrow-down-long",
  };
  return `<span class="badge ${getPriorityBadgeClass(priority)}">
    <i class="fas ${icons[priority] || "fa-info"}"></i>
    ${getPriorityLabel(priority)}
  </span>`;
}

function getCategoryBadge(category) {
  return `<span class="badge bg-secondary">
    ${capitalize(category)}
  </span>`;
}

function calculatePointsFromPriority(priority) {
  const pointsMap = {
    1: 25, // Critical
    2: 15, // High
    3: 10, // Medium
    4: 5, // Low
    5: 2, // Minimal
  };
  return pointsMap[priority] || 10;
}

// Update selected days in create modal
function updateSelectedDays() {
  const selected = Array.from(
    document.querySelectorAll(".day-option.active")
  ).map((opt) => opt.getAttribute("data-day"));
  document.getElementById("selectedDays").value = selected.join(",");
}

// Load tasks from Firebase
function loadTasks() {
  setupTasksListener();
}

// Render tasks
function renderTasks(tasks) {
  if (!tasks || tasks.length === 0) {
    tasksList.innerHTML = '<div class="empty-message">No tasks found</div>';
    return;
  }

  let html = "";

  tasks.forEach((task) => {
    const isCompleted =
      currentDay !== "all" && task.completed && task.completed[currentDay];

    html += `
      <div class="list-group-item task-item m-1 d-flex justify-content-between align-items-center border ${
        isCompleted ? "task-completed" : ""
      }">
        <div>
          <div class="mb-2" style="${
            isCompleted ? "text-decoration: line-through; color: #6c757d;" : ""
          }">
            <p class="mb-0" style="font-size: 1.2rem;">${task.name}</p>
          </div>

          <div class="d-flex align-items-center gap-2 mb-2">
            ${getPriorityBadge(task.priority)}
            ${getCategoryBadge(task.category)}
    `;

    if (currentDay === "all") {
      html += `<div class="ms-2 d-flex gap-1">`;
      if (task.days) {
        task.days.forEach((day) => {
          const dayCompleted = task.completed?.[day] || false;
          html += `
            <span class="badge day-badge ${
              dayCompleted ? "bg-success" : "bg-light text-dark"
            }">
              ${day.substring(0, 3)}
            </span>
          `;
        });
      }
      html += `</div>`;
    }

    html += `</div></div><div class="d-flex gap-2">`;

    // Description button (day-specific views only)
    if (currentDay !== "all") {
      // Show description button only if task has a description
      if (task.description?.trim()) {
        html += `
          <a href="${task.description}" target="_blank" class="btn btn-sm btn-outline-secondary description-btn" title="View Description">
            <i class="fas fa-eye"></i>
          </a>
        `;
      }

      // Complete button
      html += `
        <button class="btn btn-sm ${
          isCompleted ? "btn-outline-secondary" : "btn-outline-success"
        }"
                onclick="toggleTaskComplete('${task.id}')"
                title="${isCompleted ? "Mark Incomplete" : "Mark Complete"}">
          <i class="fas ${isCompleted ? "fa-undo" : "fa-check"}"></i>
        </button>
      `;
    } else {
      // Edit & Delete (all tasks view only)
      html += `
        <button class="btn btn-sm btn-outline-primary" onclick="openEditModal('${task.id}')" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTaskById('${task.id}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      `;
    }

    html += `</div></div>`;
  });

  tasksList.innerHTML = html;
}

// Utility to capitalize first letter
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Show description in modal
function showDescription(description) {
  document.getElementById("descriptionContent").textContent = description;
  const modal = new bootstrap.Modal(
    document.getElementById("descriptionModal")
  );
  modal.show();
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Update statistics for day view
function updateStats(stats) {
  if (stats) {
    pendingTasksStat.textContent = stats.pending;
    completionPercent.textContent = `${stats.completionPercentage}%`;
    pointsDisplay.textContent = `${stats.completedPoints}/${stats.totalPoints}`;
  }
}

// Update task summary
function updateTaskSummary(count) {
  const summary =
    count === 0
      ? "No tasks to display"
      : `${count} task${count > 1 ? "s" : ""} found`;
  document.getElementById("taskSummary").textContent = summary;
}

// Toggle task completion status for specific day
async function toggleTaskComplete(taskId) {
  const result = await toggleTaskCompletion(taskId, currentDay);
  if (!result.success) {
    console.error("Error updating task: " + result.message);
    showError("Error updating task: " + result.message);
  }
}

// Delete task
async function deleteTaskById(taskId) {
  const result = await confirmAction("This will permanently delete the task.");
  if (result.isConfirmed) {
    const deleteResult = await deleteTask(taskId);
    if (deleteResult.success) {
      showSuccess("Task deleted successfully");
    } else {
      showError("Error deleting task: " + deleteResult.message);
    }
  }
}

// Open edit modal with task data
async function openEditModal(taskId) {
  const result = await getTask(taskId);
  if (result.success) {
    const task = result.task;

    // Populate form fields
    document.getElementById("editTaskId").value = task.id;
    document.getElementById("editTaskName").value = task.name;
    document.getElementById("editTaskDescription").value =
      task.description || "";
    document.getElementById("editTaskPriority").value = task.priority;
    document.getElementById("editTaskCategory").value = task.category;

    // Set days
    document.querySelectorAll(".edit-day-option").forEach((opt) => {
      opt.classList.remove("active");
      if (task.days && task.days.includes(opt.getAttribute("data-day"))) {
        opt.classList.add("active");
      }
    });

    document.getElementById("editSelectedDays").value = task.days
      ? task.days.join(",")
      : "";

    // Set up day selection event listeners
    document.querySelectorAll(".edit-day-option").forEach((option) => {
      option.addEventListener("click", function () {
        this.classList.toggle("active");
        const selected = Array.from(
          document.querySelectorAll(".edit-day-option.active")
        ).map((opt) => opt.getAttribute("data-day"));
        document.getElementById("editSelectedDays").value = selected.join(",");
      });
    });

    // Show modal
    const editModal = new bootstrap.Modal(
      document.getElementById("editTaskModal")
    );
    editModal.show();
  } else {
    showError("Error loading task: " + result.message);
  }
}

// SweetAlert helpers
function showError(message) {
  Swal.fire({
    icon: "error",
    title: "Error",
    text: message,
    confirmButtonText: "OK",
    background: "#252525",
    color: "#e0e0e0",
  });
}

function showSuccess(message) {
  Swal.fire({
    icon: "success",
    title: "Success",
    text: message,
    confirmButtonText: "OK",
    background: "#252525",
    color: "#e0e0e0",
    timer: 2000,
    timerProgressBar: true,
  });
}

function confirmAction(message) {
  return Swal.fire({
    title: "Are you sure?",
    text: message,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#1967d2",
    cancelButtonColor: "#495057",
    confirmButtonText: "Yes, proceed",
    background: "#252525",
    color: "#e0e0e0",
  });
}

// Make functions globally available for onclick handlers
window.showDescription = showDescription;
window.toggleTaskComplete = toggleTaskComplete;
window.deleteTaskById = deleteTaskById;
window.openEditModal = openEditModal;

// *************** Mobile sidebar toggle
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebar = document.querySelector(".sidebar");

if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("show");
  });
}

// Close sidebar when clicking outside on mobile
document.addEventListener("click", (e) => {
  if (window.innerWidth <= 992) {
    if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
      sidebar.classList.remove("show");
    }
  }
});

// Show/hide toggle button based on screen size
function handleSidebarToggleVisibility() {
  if (window.innerWidth <= 992) {
    sidebarToggle.classList.remove("d-none");
  } else {
    sidebarToggle.classList.add("d-none");
    sidebar.classList.remove("show");
  }
}

// Initial check
handleSidebarToggleVisibility();

// Add resize listener
window.addEventListener("resize", handleSidebarToggleVisibility);
