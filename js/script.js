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

// Request queue to prevent concurrent operations
let requestQueue = [];
let isProcessingQueue = false;

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  loadTasks();
  setupEventListeners();
});

// Queue management for API requests
function queueRequest(requestFunction) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn: requestFunction, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { fn, resolve, reject } = requestQueue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  }

  isProcessingQueue = false;
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

      loadTasks();
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
  saveTaskBtn.addEventListener("click", function () {
    const taskName = document.getElementById("taskName").value?.trim();
    const taskDescription = document
      .getElementById("taskDescription")
      .value?.trim();
    const taskPriority = document.getElementById("taskPriority").value;
    const selectedDaysValue = document.getElementById("selectedDays").value;
    const selectedDays = selectedDaysValue ? selectedDaysValue.split(",") : [];
    const category = document.getElementById("taskCategory").value;

    // Validation
    if (!taskName) {
      showError("Task name is required");
      return;
    }

    if (selectedDays.length === 0) {
      showError("Please select at least one day");
      return;
    }

    // Disable button to prevent double submission
    saveTaskBtn.disabled = true;

    // Create task data object
    const taskData = {
      name: taskName,
      description: taskDescription || "",
      priority: parseInt(taskPriority),
      days: selectedDays,
      category: category,
      points: calculatePointsFromPriority(parseInt(taskPriority)),
    };

    // Queue the request
    queueRequest(() => createTask(taskData))
      .then(() => {
        showSuccess("Task created successfully");
        loadTasks();
        resetCreateForm();
        bootstrap.Modal.getInstance(
          document.getElementById("addTaskModal")
        ).hide();
      })
      .catch((error) => {
        showError("Error creating task: " + error.message);
      })
      .finally(() => {
        saveTaskBtn.disabled = false;
      });
  });

  // Update task
  updateTaskBtn.addEventListener("click", function () {
    const taskId = parseInt(document.getElementById("editTaskId").value);
    const taskName = document.getElementById("editTaskName").value?.trim();
    const taskDescription = document
      .getElementById("editTaskDescription")
      .value?.trim();
    const taskPriority = document.getElementById("editTaskPriority").value;
    const selectedDaysValue = document.getElementById("editSelectedDays").value;
    const selectedDays = selectedDaysValue ? selectedDaysValue.split(",") : [];
    const category = document.getElementById("editTaskCategory").value;

    if (!taskName || selectedDays.length === 0) {
      showError("Please fill all required fields");
      return;
    }

    updateTaskBtn.disabled = true;

    // Create task data object
    const taskData = {
      id: taskId,
      name: taskName,
      description: taskDescription || "",
      priority: parseInt(taskPriority),
      days: selectedDays,
      category: category,
      points: calculatePointsFromPriority(parseInt(taskPriority)),
    };

    queueRequest(() => updateTask(taskData))
      .then(() => {
        showSuccess("Task updated successfully");
        loadTasks();
        bootstrap.Modal.getInstance(
          document.getElementById("editTaskModal")
        ).hide();
      })
      .catch((error) => {
        showError("Error updating task: " + error.message);
      })
      .finally(() => {
        updateTaskBtn.disabled = false;
      });
  });
}

// API Functions with proper error handling
function createTask(taskData) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "api.php",
      type: "POST",
      data: {
        action: "create",
        task: JSON.stringify(taskData),
      },
      timeout: 10000, // 10 second timeout
      success: function (response) {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || "Unknown error occurred"));
        }
      },
      error: function (xhr, status, error) {
        let errorMessage = "Network error occurred";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        } else if (status === "timeout") {
          errorMessage = "Request timed out";
        } else if (error) {
          errorMessage = error;
        }
        reject(new Error(errorMessage));
      },
    });
  });
}

function updateTask(taskData) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "api.php",
      type: "POST",
      data: {
        action: "update",
        task: JSON.stringify(taskData),
      },
      timeout: 10000,
      success: function (response) {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || "Unknown error occurred"));
        }
      },
      error: function (xhr, status, error) {
        let errorMessage = "Network error occurred";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        } else if (status === "timeout") {
          errorMessage = "Request timed out";
        } else if (error) {
          errorMessage = error;
        }
        reject(new Error(errorMessage));
      },
    });
  });
}

// Reset create form
function resetCreateForm() {
  document.getElementById("taskForm").reset();
  document
    .querySelectorAll(".day-option")
    .forEach((opt) => opt.classList.remove("active"));
  document.getElementById("taskPriority").value = "3";
  document.getElementById("taskCategory").value = "work";
  document.getElementById("selectedDays").value = "";
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

// Load tasks from server with retry logic
function loadTasks(retryCount = 0) {
  const maxRetries = 3;

  $.ajax({
    url: "api.php",
    type: "GET",
    data: {
      action: "get",
      day: currentDay,
    },
    dataType: "json",
    timeout: 10000,
    success: function (response) {
      if (response && response.success) {
        renderTasks(response.tasks || []);
        updateTaskSummary((response.tasks || []).length);
        if (currentDay !== "all" && response.stats) {
          updateStats(response.stats);
        }
      } else {
        tasksList.innerHTML =
          '<div class="empty-message">Error loading tasks: ' +
          (response?.message || "Unknown error") +
          "</div>";
        updateTaskSummary(0);
      }
    },
    error: function (xhr, status, error) {
      if (retryCount < maxRetries) {
        console.log(`Retrying loadTasks (attempt ${retryCount + 1})`);
        setTimeout(() => loadTasks(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      tasksList.innerHTML =
        '<div class="empty-message">Error loading tasks. Please refresh the page.</div>';
      updateTaskSummary(0);

      let errorMessage = "Failed to load tasks";
      if (status === "timeout") {
        errorMessage += ": Request timed out";
      } else if (error) {
        errorMessage += ": " + error;
      }
      console.error(errorMessage);
    },
  });
}

// Render tasks with better error handling
function renderTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    tasksList.innerHTML = '<div class="empty-message">No tasks found</div>';
    return;
  }

  let html = "";

  tasks.forEach((task) => {
    // Validate task structure
    if (!task || !task.id || !task.name) {
      console.warn("Invalid task structure:", task);
      return;
    }

    const isCompleted =
      currentDay !== "all" && task.completed && task.completed[currentDay];

    html += `
      <div class="list-group-item task-item mt-3 d-flex justify-content-between align-items-center border ${
        isCompleted ? "task-completed" : ""
      }">
        <div>
          <div class="mb-2" style="${
            isCompleted ? "text-decoration: line-through; color: #6c757d;" : ""
          }">
            <p class="mb-0" style="font-size: 1.2rem;">${escapeHtml(
              task.name
            )}</p>
          </div>

          <div class="d-flex align-items-center gap-2 mb-2">
            ${getPriorityBadge(task.priority || 3)}
            ${getCategoryBadge(task.category || "work")}
    `;

    if (currentDay === "all" && task.days && Array.isArray(task.days)) {
      html += `<div class="ms-2 d-flex gap-1">`;
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
      html += `</div>`;
    }

    html += `</div></div><div class="d-flex gap-2">`;

    // Description button (day-specific views only)
    if (currentDay !== "all") {
      if (task.description?.trim()) {
        html += `
          <button class="btn btn-sm btn-outline-primary description-btn has-description" onclick="showDescription('${escapeHtml(
            task.description
          )}')" title="View Description">
            <i class="fas fa-eye"></i>
          </button>
        `;
      } else {
        html += `
          <button class="btn btn-sm btn-outline-secondary description-btn" title="No Description" disabled>
            <i class="fas fa-eye"></i>
          </button>
        `;
      }

      // Complete button
      html += `
        <button class="btn btn-sm ${
          isCompleted ? "btn-outline-secondary" : "btn-outline-success"
        }"
                onclick="toggleTaskComplete(${task.id})"
                title="${isCompleted ? "Mark Incomplete" : "Mark Complete"}">
          <i class="fas ${isCompleted ? "fa-undo" : "fa-check"}"></i>
        </button>
      `;
    } else {
      // Edit & Delete (all tasks view only)
      html += `
        <button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${task.id})" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.id})" title="Delete">
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
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
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
  if (!unsafe) return "";
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
    pendingTasksStat.textContent = stats.pending || 0;
    completionPercent.textContent = `${stats.completionPercentage || 0}%`;
    pointsDisplay.textContent = `${stats.completedPoints || 0}/${
      stats.totalPoints || 0
    }`;
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
function toggleTaskComplete(taskId) {
  if (!taskId || currentDay === "all") return;

  queueRequest(() => toggleTask(taskId, currentDay))
    .then(() => {
      loadTasks();
    })
    .catch((error) => {
      console.error("Error updating task:", error);
      showError("Failed to update task status");
    });
}

function toggleTask(taskId, day) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "api.php",
      type: "POST",
      data: {
        action: "toggle",
        id: taskId,
        day: day,
      },
      timeout: 10000,
      success: function (response) {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || "Failed to toggle task"));
        }
      },
      error: function (xhr, status, error) {
        let errorMessage = "Network error occurred";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        } else if (status === "timeout") {
          errorMessage = "Request timed out";
        } else if (error) {
          errorMessage = error;
        }
        reject(new Error(errorMessage));
      },
    });
  });
}

// Delete task with improved error handling
function deleteTask(taskId) {
  if (!taskId) return;

  confirmAction("This will permanently delete the task.").then((result) => {
    if (result.isConfirmed) {
      queueRequest(() => removeTask(taskId))
        .then(() => {
          showSuccess("Task deleted successfully");
          loadTasks();
        })
        .catch((error) => {
          showError("Error deleting task: " + error.message);
        });
    }
  });
}

function removeTask(taskId) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: "api.php",
      type: "POST",
      data: {
        action: "delete",
        id: taskId,
      },
      timeout: 10000,
      success: function (response) {
        if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.message || "Failed to delete task"));
        }
      },
      error: function (xhr, status, error) {
        let errorMessage = "Network error occurred";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = xhr.responseJSON.message;
        } else if (status === "timeout") {
          errorMessage = "Request timed out";
        } else if (error) {
          errorMessage = error;
        }
        reject(new Error(errorMessage));
      },
    });
  });
}

// Open edit modal with task data
function openEditModal(taskId) {
  if (!taskId) return;

  // Fetch task details
  $.ajax({
    url: "api.php",
    type: "GET",
    data: {
      action: "get_task",
      id: taskId,
    },
    timeout: 10000,
    success: function (response) {
      if (response && response.success && response.task) {
        const task = response.task;

        // Populate form fields
        document.getElementById("editTaskId").value = task.id || "";
        document.getElementById("editTaskName").value = task.name || "";
        document.getElementById("editTaskDescription").value =
          task.description || "";
        document.getElementById("editTaskPriority").value = task.priority || 3;
        document.getElementById("editTaskCategory").value =
          task.category || "work";

        // Set days
        document.querySelectorAll(".edit-day-option").forEach((opt) => {
          opt.classList.remove("active");
          if (
            task.days &&
            Array.isArray(task.days) &&
            task.days.includes(opt.getAttribute("data-day"))
          ) {
            opt.classList.add("active");
          }
        });

        document.getElementById("editSelectedDays").value = (
          task.days || []
        ).join(",");

        // Set up day selection event listeners (remove old listeners first)
        document.querySelectorAll(".edit-day-option").forEach((option) => {
          // Remove existing listeners
          option.removeEventListener("click", editDayClickHandler);
          // Add new listener
          option.addEventListener("click", editDayClickHandler);
        });

        // Show modal
        const editModal = new bootstrap.Modal(
          document.getElementById("editTaskModal")
        );
        editModal.show();
      } else {
        showError(
          "Error loading task: " + (response?.message || "Task not found")
        );
      }
    },
    error: function (xhr, status, error) {
      let errorMessage = "Error loading task";
      if (xhr.responseJSON && xhr.responseJSON.message) {
        errorMessage += ": " + xhr.responseJSON.message;
      } else if (status === "timeout") {
        errorMessage += ": Request timed out";
      } else if (error) {
        errorMessage += ": " + error;
      }
      showError(errorMessage);
    },
  });
}

// Separate handler for edit day selection to avoid memory leaks
function editDayClickHandler() {
  this.classList.toggle("active");
  const selected = Array.from(
    document.querySelectorAll(".edit-day-option.active")
  ).map((opt) => opt.getAttribute("data-day"));
  document.getElementById("editSelectedDays").value = selected.join(",");
}

// SweetAlert helpers with better error handling
function showError(message) {
  if (!message) message = "An unknown error occurred";

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
  if (!message) message = "Operation completed successfully";

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
    text: message || "This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#6c5ce7",
    cancelButtonColor: "#495057",
    confirmButtonText: "Yes, proceed",
    background: "#252525",
    color: "#e0e0e0",
  });
}

// Add error recovery mechanisms
window.addEventListener("error", function (e) {
  console.error("JavaScript error:", e.error);
  // Could implement error reporting here
});

window.addEventListener("unhandledrejection", function (e) {
  console.error("Unhandled promise rejection:", e.reason);
  // Could implement error reporting here
});

// Periodic data integrity check (optional)
function verifyDataIntegrity() {
  $.ajax({
    url: "api.php",
    type: "GET",
    data: { action: "get", day: "all" },
    timeout: 5000,
    success: function (response) {
      if (!response || !response.success) {
        console.warn("Data integrity check failed");
        // Could trigger a data recovery process here
      }
    },
    error: function () {
      console.warn("Data integrity check failed - network error");
    },
  });
}

// Run integrity check every 5 minutes (optional - uncomment if needed)
// setInterval(verifyDataIntegrity, 300000);
