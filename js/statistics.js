// Firebase imports and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
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
const charts = {
  weeklyCompletion: null,
  tasksByDay: null,
  tasksByCategory: null,
  points: null,
  priorityCompletion: null,
};

// Initialize the app
document.addEventListener("DOMContentLoaded", function () {
  setupTasksListener();
  setupSidebarToggle();
});

// Listen for real-time updates
function setupTasksListener() {
  const tasksRef = ref(db, "tasks");
  onValue(
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

      // Calculate statistics and render charts
      const stats = calculateStatistics(tasks);
      renderCharts(stats);
    },
    (error) => {
      console.error("Error listening to tasks:", error);
      showError("Error loading task data");
    }
  );
}

// Calculate statistics from tasks
function calculateStatistics(tasks) {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const categories = ["religious", "learn", "health", "work", "other"];
  const priorities = [1, 2, 3, 4, 5];

  // Initialize stats objects
  const stats = {
    weeklyCompletion: {
      total: Array(7).fill(0),
      completed: Array(7).fill(0),
      percentage: Array(7).fill(0),
    },
    tasksByDay: Array(7).fill(0),
    tasksByCategory: Array(5).fill(0),
    pointsByDay: {
      total: Array(7).fill(0),
      completed: Array(7).fill(0),
    },
    priorityCompletion: {
      total: Array(5).fill(0),
      completed: Array(5).fill(0),
      percentage: Array(5).fill(0),
    },
  };

  // Process each task
  tasks.forEach((task) => {
    // Count tasks by day
    task.days.forEach((day) => {
      const dayIndex = days.indexOf(day);
      if (dayIndex >= 0) {
        stats.tasksByDay[dayIndex]++;

        // Count completed tasks by day
        if (task.completed && task.completed[day]) {
          stats.weeklyCompletion.completed[dayIndex]++;
        }
        stats.weeklyCompletion.total[dayIndex]++;

        // Calculate points by day
        stats.pointsByDay.total[dayIndex] += task.points || 0;
        if (task.completed && task.completed[day]) {
          stats.pointsByDay.completed[dayIndex] += task.points || 0;
        }
      }
    });

    // Count tasks by category
    const catIndex = categories.indexOf(task.category);
    if (catIndex >= 0) {
      stats.tasksByCategory[catIndex]++;
    }

    // Count tasks by priority
    const priIndex = priorities.indexOf(task.priority);
    if (priIndex >= 0) {
      stats.priorityCompletion.total[priIndex]++;

      // Count completed tasks by priority (any day)
      const isCompleted = Object.values(task.completed || {}).some((v) => v);
      if (isCompleted) {
        stats.priorityCompletion.completed[priIndex]++;
      }
    }
  });

  // Calculate percentages
  for (let i = 0; i < 7; i++) {
    stats.weeklyCompletion.percentage[i] =
      stats.weeklyCompletion.total[i] > 0
        ? Math.round(
            (stats.weeklyCompletion.completed[i] /
              stats.weeklyCompletion.total[i]) *
              100
          )
        : 0;
  }

  for (let i = 0; i < 5; i++) {
    stats.priorityCompletion.percentage[i] =
      stats.priorityCompletion.total[i] > 0
        ? Math.round(
            (stats.priorityCompletion.completed[i] /
              stats.priorityCompletion.total[i]) *
              100
          )
        : 0;
  }

  return stats;
}

// Render all charts
function renderCharts(stats) {
  renderWeeklyCompletionChart(stats);
  renderTasksByDayChart(stats);
  renderTasksByCategoryChart(stats);
  renderPointsChart(stats);
  renderPriorityCompletionChart(stats);
}

// Weekly Completion Chart
function renderWeeklyCompletionChart(stats) {
  const ctx = document.getElementById("weeklyCompletionChart").getContext("2d");

  // Destroy previous chart if exists
  if (charts.weeklyCompletion) {
    charts.weeklyCompletion.destroy();
  }

  charts.weeklyCompletion = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      datasets: [
        {
          label: "Completed Tasks",
          data: stats.weeklyCompletion.completed,
          backgroundColor: "rgba(0, 184, 148, 0.7)",
          borderColor: "rgba(0, 184, 148, 1)",
          borderWidth: 1,
        },
        {
          label: "Total Tasks",
          data: stats.weeklyCompletion.total,
          backgroundColor: "rgba(108, 92, 231, 0.3)",
          borderColor: "rgba(108, 92, 231, 1)",
          borderWidth: 1,
          type: "line",
          pointBackgroundColor: "rgba(108, 92, 231, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(108, 92, 231, 1)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Tasks",
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: function (context) {
              const dayIndex = context.dataIndex;
              const percentage = stats.weeklyCompletion.percentage[dayIndex];
              return `Completion: ${percentage}%`;
            },
          },
        },
      },
    },
  });
}

// Tasks by Day Chart
function renderTasksByDayChart(stats) {
  const ctx = document.getElementById("tasksByDayChart").getContext("2d");

  if (charts.tasksByDay) {
    charts.tasksByDay.destroy();
  }

  charts.tasksByDay = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      datasets: [
        {
          data: stats.tasksByDay,
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
            "rgba(255, 159, 64, 0.7)",
            "rgba(199, 199, 199, 0.7)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(199, 199, 199, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Tasks by Category Chart
function renderTasksByCategoryChart(stats) {
  const ctx = document.getElementById("tasksByCategoryChart").getContext("2d");

  if (charts.tasksByCategory) {
    charts.tasksByCategory.destroy();
  }

  charts.tasksByCategory = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Religious", "Learn", "Health", "Work", "Other"],
      datasets: [
        {
          data: stats.tasksByCategory,
          backgroundColor: [
            "rgba(83, 82, 237, 0.7)", // Religious
            "rgba(75, 192, 192, 0.7)", // Learn
            "rgba(255, 99, 132, 0.7)", // Health
            "rgba(255, 206, 86, 0.7)", // Work
            "rgba(153, 102, 255, 0.7)", // Other
          ],
          borderColor: [
            "rgba(83, 82, 237, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(153, 102, 255, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Points Chart
function renderPointsChart(stats) {
  const ctx = document.getElementById("pointsChart").getContext("2d");

  if (charts.points) {
    charts.points.destroy();
  }

  charts.points = new Chart(ctx, {
    type: "line",
    data: {
      labels: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      datasets: [
        {
          label: "Total Points Available",
          data: stats.pointsByDay.total,
          backgroundColor: "rgba(108, 92, 231, 0.2)",
          borderColor: "rgba(108, 92, 231, 1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Points Earned",
          data: stats.pointsByDay.completed,
          backgroundColor: "rgba(0, 184, 148, 0.2)",
          borderColor: "rgba(0, 184, 148, 1)",
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Points",
          },
        },
      },
    },
  });
}

// Priority Completion Chart
function renderPriorityCompletionChart(stats) {
  const ctx = document
    .getElementById("priorityCompletionChart")
    .getContext("2d");

  if (charts.priorityCompletion) {
    charts.priorityCompletion.destroy();
  }

  charts.priorityCompletion = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Critical", "High", "Medium", "Low", "Minimal"],
      datasets: [
        {
          label: "Completion Rate (%)",
          data: stats.priorityCompletion.percentage,
          backgroundColor: [
            "rgba(255, 71, 87, 0.7)",
            "rgba(255, 107, 129, 0.7)",
            "rgba(255, 165, 2, 0.7)",
            "rgba(30, 144, 255, 0.7)",
            "rgba(123, 237, 159, 0.7)",
          ],
          borderColor: [
            "rgba(255, 71, 87, 1)",
            "rgba(255, 107, 129, 1)",
            "rgba(255, 165, 2, 1)",
            "rgba(30, 144, 255, 1)",
            "rgba(123, 237, 159, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: "Completion Rate (%)",
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: function (context) {
              const priIndex = context.dataIndex;
              const completed = stats.priorityCompletion.completed[priIndex];
              const total = stats.priorityCompletion.total[priIndex];
              return `${completed} of ${total} tasks completed`;
            },
          },
        },
      },
    },
  });
}

// SweetAlert helper
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

// Sidebar toggle functionality
function setupSidebarToggle() {
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
}
