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

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  loadTasks();
  setupEventListeners();
});

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
    const taskName = document.getElementById("taskName").value;
    const taskDescription = document.getElementById("taskDescription").value;
    const taskPriority = document.getElementById("taskPriority").value;
    const selectedDays = document
      .getElementById("selectedDays")
      .value.split(",");
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

    // Send AJAX request to create task
    $.ajax({
      url: "api.php",
      type: "POST",
      data: {
        action: "create",
        task: JSON.stringify(taskData),
      },
      success: function (response) {
        if (response.success) {
          showSuccess("Task created successfully");
          loadTasks();

          // Reset form and close modal
          document.getElementById("taskForm").reset();
          document
            .querySelectorAll(".day-option")
            .forEach((opt) => opt.classList.remove("active"));
          document.getElementById("taskPriority").value = "3";
          document.getElementById("taskCategory").value = "work";

          bootstrap.Modal.getInstance(
            document.getElementById("addTaskModal")
          ).hide();
        } else {
          showError("Error creating task: " + response.message);
        }
      },
      error: function (xhr, status, error) {
        showError("Error creating task: " + error);
      },
    });
  });

  // Update task
  updateTaskBtn.addEventListener("click", function () {
    const taskId = parseInt(document.getElementById("editTaskId").value);
    const taskName = document.getElementById("editTaskName").value;
    const taskDescription = document.getElementById(
      "editTaskDescription"
    ).value;
    const taskPriority = document.getElementById("editTaskPriority").value;
    const selectedDays = document
      .getElementById("editSelectedDays")
      .value.split(",");
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

    // Send AJAX request to update task
    $.ajax({
      url: "api.php",
      type: "POST",
      data: {
        action: "update",
        task: JSON.stringify(taskData),
      },
      success: function (response) {
        if (response.success) {
          showSuccess("Task updated successfully");
          loadTasks();
          if (currentDay !== "all") {
            updateStats(response.stats);
          }
          bootstrap.Modal.getInstance(
            document.getElementById("editTaskModal")
          ).hide();
        } else {
          showError("Error updating task: " + response.message);
        }
      },
      error: function (xhr, status, error) {
        showError("Error updating task: " + error);
      },
    });
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
  const icons = {
    work: "fa-briefcase",
    personal: "fa-user",
    other: "fa-question",
  };
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

// Load tasks from server
function loadTasks() {
  $.ajax({
    url: "api.php",
    type: "GET",
    data: {
      action: "get",
      day: currentDay,
    },
    dataType: "json",
    success: function (response) {
      if (response.success) {
        renderTasks(response.tasks);
        updateTaskSummary(response.tasks.length);
        if (currentDay !== "all") {
          updateStats(response.stats);
        }
      } else {
        tasksList.innerHTML =
          '<div class="empty-message">Error loading tasks</div>';
        updateTaskSummary(0);
      }
    },
    error: function (xhr, status, error) {
      tasksList.innerHTML =
        '<div class="empty-message">Error loading tasks</div>';
      updateTaskSummary(0);
      showError("Failed to load tasks: " + error);
    },
  });
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
      <div class="list-group-item task-item mt-3 d-flex justify-content-between align-items-center border ${
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
  pendingTasksStat.textContent = stats.pending;
  completionPercent.textContent = `${stats.completionPercentage}%`;
  pointsDisplay.textContent = `${stats.completedPoints}/${stats.totalPoints}`;
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
  $.ajax({
    url: "api.php",
    type: "POST",
    data: {
      action: "toggle",
      id: taskId,
      day: currentDay,
    },
    success: function (response) {
      if (response.success) {
        loadTasks();
      } else {
        console.error("Error updating task: " + response.message);
      }
    },
    error: function (xhr, status, error) {
      console.error("Error updating task: " + error);
    },
  });
}

// Delete task
function deleteTask(taskId) {
  confirmAction("This will permanently delete the task.").then((result) => {
    if (result.isConfirmed) {
      $.ajax({
        url: "api.php",
        type: "POST",
        data: {
          action: "delete",
          id: taskId,
        },
        success: function (response) {
          if (response.success) {
            showSuccess("Task deleted successfully");
            loadTasks();
          } else {
            showError("Error deleting task: " + response.message);
          }
        },
        error: function (xhr, status, error) {
          showError("Error deleting task: " + error);
        },
      });
    }
  });
}

// Open edit modal with task data
function openEditModal(taskId) {
  // Fetch task details
  $.ajax({
    url: "api.php",
    type: "GET",
    data: {
      action: "get_task",
      id: taskId,
    },
    success: function (response) {
      if (response.success) {
        const task = response.task;

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
          if (task.days.includes(opt.getAttribute("data-day"))) {
            opt.classList.add("active");
          }
        });

        document.getElementById("editSelectedDays").value = task.days.join(",");

        // Set up day selection event listeners
        document.querySelectorAll(".edit-day-option").forEach((option) => {
          option.addEventListener("click", function () {
            this.classList.toggle("active");
            const selected = Array.from(
              document.querySelectorAll(".edit-day-option.active")
            ).map((opt) => opt.getAttribute("data-day"));
            document.getElementById("editSelectedDays").value =
              selected.join(",");
          });
        });

        // Show modal
        const editModal = new bootstrap.Modal(
          document.getElementById("editTaskModal")
        );
        editModal.show();
      } else {
        showError("Error loading task: " + response.message);
      }
    },
    error: function (xhr, status, error) {
      showError("Error loading task: " + error);
    },
  });
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
    confirmButtonColor: "#6c5ce7",
    cancelButtonColor: "#495057",
    confirmButtonText: "Yes, proceed",
    background: "#252525",
    color: "#e0e0e0",
  });
}
