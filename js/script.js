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
      alert("Please fill all required fields");
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
          alert("Error creating task: " + response.message);
        }
      },
      error: function (xhr, status, error) {
        alert("Error creating task: " + error);
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
      alert("Please fill all required fields");
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
          loadTasks();
          if (currentDay !== "all") {
            updateStats(response.stats);
          }
          bootstrap.Modal.getInstance(
            document.getElementById("editTaskModal")
          ).hide();
        } else {
          alert("Error updating task: " + response.message);
        }
      },
      error: function (xhr, status, error) {
        alert("Error updating task: " + error);
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
    1: "bg-danger",
    2: "bg-warning",
    3: "bg-info",
    4: "bg-success",
    5: "bg-secondary",
  };
  return classes[priority] || "bg-info";
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
        if (currentDay !== "all") {
          updateStats(response.stats);
        }
      } else {
        tasksList.innerHTML =
          '<div class="empty-message">Error loading tasks</div>';
      }
    },
    error: function (xhr, status, error) {
      tasksList.innerHTML =
        '<div class="empty-message">Error loading tasks</div>';
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
    // Check if task is completed for the current day (if viewing a specific day)
    const isCompleted =
      currentDay !== "all" && task.completed && task.completed[currentDay];

    // Task item HTML
    html += `
            <div class="list-group-item task-item priority-${
              task.priority
            } d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-3">
                    <span style="${
                      isCompleted
                        ? "text-decoration: line-through; color: #6c757d;"
                        : ""
                    }">
                        ${task.name}
                    </span>
                    <span class="badge ${getPriorityBadgeClass(task.priority)}">
                        ${getPriorityLabel(task.priority)}
                    </span>
                    <span class="badge ${
                      task.category === "work"
                        ? "bg-primary"
                        : task.category === "personal"
                        ? "bg-success"
                        : "bg-secondary"
                    }">
                        ${
                          task.category.charAt(0).toUpperCase() +
                          task.category.slice(1)
                        }
                    </span>
        `;

    // Days (only shown in "All Tasks" view)
    if (currentDay === "all") {
      html += '<div class="ms-3 d-flex gap-1">';
      task.days.forEach((day) => {
        const dayCompleted = (task.completed && task.completed[day]) || false;
        html += `<span class="badge day-badge ${
          dayCompleted ? "bg-success" : "bg-light text-dark"
        }">${day.substring(0, 3)}</span>`;
      });
      html += "</div>";
    }

    // Task actions
    html += '</div><div class="d-flex gap-2">';

    // Show description button if there's a description (only in day views)
    if (
      currentDay !== "all" &&
      task.description &&
      task.description.trim() !== ""
    ) {
      html += `
                <button class="description-btn has-description" onclick="showDescription('${escapeHtml(
                  task.description
                )}')" title="View Description">
                    <i class="fas fa-eye"></i>
                </button>
            `;
    } else if (currentDay !== "all") {
      html += `
                <button class="description-btn" title="No Description" disabled>
                    <i class="fas fa-eye"></i>
                </button>
            `;
    }

    if (currentDay !== "all") {
      // Complete button in day-specific views
      html += `
                <button class="btn btn-sm ${
                  isCompleted ? "btn-outline-secondary" : "btn-outline-success"
                }" 
                        onclick="toggleTaskComplete(${task.id})" 
                        title="${
                          isCompleted ? "Mark Incomplete" : "Mark Complete"
                        }">
                    <i class="fas ${isCompleted ? "fa-undo" : "fa-check"}"></i>
                </button>
            `;
    } else {
      // Edit and delete buttons (shown only in all tasks view)
      html += `
                <button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${task.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteTask(${task.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            `;
    }

    html += "</div></div>";
  });

  tasksList.innerHTML = html;
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
        alert("Error updating task: " + response.message);
      }
    },
    error: function (xhr, status, error) {
      alert("Error updating task: " + error);
    },
  });
}

// Delete task
function deleteTask(taskId) {
  if (confirm("Are you sure you want to delete this task?")) {
    $.ajax({
      url: "api.php",
      type: "POST",
      data: {
        action: "delete",
        id: taskId,
      },
      success: function (response) {
        if (response.success) {
          loadTasks();
        } else {
          alert("Error deleting task: " + response.message);
        }
      },
      error: function (xhr, status, error) {
        alert("Error deleting task: " + error);
      },
    });
  }
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
        alert("Error loading task: " + response.message);
      }
    },
    error: function (xhr, status, error) {
      alert("Error loading task: " + error);
    },
  });
}
