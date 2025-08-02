<?php
// Start session and initialize tasks if not exists
session_start();

// Path to our JSON file
$jsonFile = 'tasks.json';

// Create tasks.json if it doesn't exist
if (!file_exists($jsonFile)) {
    file_put_contents($jsonFile, json_encode([]));
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Manager</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/style.css">
</head>

<body data-bs-theme="dark">
    <div class="container-fluid g-0">
        <div class="row flex-nowrap">
            <!-- Sidebar -->
            <div class="col-md-3 col-lg-2 sidebar p-0 bg-dark">
                <div class="d-flex flex-column p-3 h-100">
                    <div class="sidebar-header mb-4">
                        <h4 class="text-center mb-3">
                           Task Manager
                        </h4>
                    </div>
                    <ul class="nav nav-pills flex-column mb-auto">
                        <li class="nav-item day-tab active" id="manageTasksTab">
                            <a href="#" class="nav-link d-flex align-items-center">
                                <i class="fas fa-list-check me-2"></i>
                                <span>All Tasks</span>
                            </a>
                        </li>
                        <li class="nav-item day-tab" data-day="monday">
                            <a href="#" class="nav-link d-flex align-items-center">
                                <i class="fas fa-calendar-day me-2"></i>
                                <span>Monday</span>
                            </a>
                        </li>
                        <li class="nav-item day-tab" data-day="tuesday">
                            <a href="#" class="nav-link d-flex align-items-center">
                                <i class="fas fa-calendar-day me-2"></i>
                                <span>Tuesday</span>
                            </a>
                        </li>
                        <li class="nav-item day-tab" data-day="wednesday">
                            <a href="#" class="nav-link d-flex align-items-center">
                                <i class="fas fa-calendar-day me-2"></i>
                                <span>Wednesday</span>
                            </a>
                        </li>
                        <li class="nav-item day-tab" data-day="thursday">
                            <a href="#" class="nav-link d-flex align-items-center">
                                <i class="fas fa-calendar-day me-2"></i>
                                <span>Thursday</span>
                            </a>
                        </li>
                        <li class="nav-item day-tab" data-day="friday">
                            <a href="#" class="nav-link d-flex align-items-center">
                                <i class="fas fa-calendar-day me-2"></i>
                                <span>Friday</span>
                            </a>
                        </li>
                        <li class="nav-item day-tab" data-day="saturday">
                            <a href="#" class="nav-link d-flex align-items-center">
                                <i class="fas fa-calendar-day me-2"></i>
                                <span>Saturday</span>
                            </a>
                        </li>
                        <li class="nav-item day-tab" data-day="sunday">
                            <a href="#" class="nav-link d-flex align-items-center">
                                <i class="fas fa-calendar-day me-2"></i>
                                <span>Sunday</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Main Content -->
            <div class="col-md-9 col-lg-10 ms-sm-auto px-md-4 py-4 main-content">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 id="currentDayTitle" class="mb-0">
                            <span id="dayGreeting"></span> All Tasks
                        </h2>
                        <small class="text-muted" id="taskSummary">Loading tasks...</small>
                    </div>
                    <button class="btn btn-primary" id="createTaskBtn" data-bs-toggle="modal"
                        data-bs-target="#addTaskModal">
                        <i class="fas fa-plus me-2"></i>Create Task
                    </button>
                </div>

                <!-- Stats Section -->
                <div class="row justify-content-center mb-4 d-none" id="statsSection">
                    <div class="col-lg-4 col-md-6 mb-4">
                        <div class="card h-100 bg-dark-gradient">
                            <div class="card-body text-center">
                                <div class="stat-icon mb-3">
                                    <i class="fas fa-clock text-warning"></i>
                                </div>
                                <h5 class="card-title">Pending Tasks</h5>
                                <p class="display-6 mb-0" id="pendingTasksStat">0</p>
                                <small class="text-muted">Tasks remaining</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-md-6 mb-4">
                        <div class="card h-100 bg-dark-gradient">
                            <div class="card-body text-center">
                                <div class="stat-icon mb-3">
                                    <i class="fas fa-percent text-info"></i>
                                </div>
                                <h5 class="card-title">Completion Rate</h5>
                                <p class="display-6 mb-0" id="completionPercent">0%</p>
                                <small class="text-muted">of daily goals</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4 col-md-6 mb-4">
                        <div class="card h-100 bg-dark-gradient">
                            <div class="card-body text-center">
                                <div class="stat-icon mb-3">
                                    <i class="fas fa-star text-success"></i>
                                </div>
                                <h5 class="card-title">Points Earned</h5>
                                <p class="display-6 mb-0" id="pointsDisplay">0/0</p>
                                <small class="text-muted">points today</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tasks List -->
                <div class="list-group" id="tasksList">
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>


    <!-- Add Task Modal -->
    <div class="modal fade" id="addTaskModal" tabindex="-1" aria-labelledby="addTaskModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="addTaskModalLabel">Create New Task</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="taskForm">
                        <div class="mb-3">
                            <label for="taskName" class="form-label">Task Name</label>
                            <input type="text" class="form-control" id="taskName" placeholder="Enter task name" required>
                        </div>

                        <div class="mb-3">
                            <label for="taskDescription" class="form-label">Description (Optional)</label>
                            <textarea class="form-control" id="taskDescription" rows="3" placeholder="Enter task description"></textarea>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-4 mb-3 mb-md-0">
                                <label for="taskPriority" class="form-label">Priority</label>
                                <select class="form-select" id="taskPriority" required>
                                    <option value="1">1 - Critical</option>
                                    <option value="2">2 - High</option>
                                    <option value="3" selected>3 - Medium</option>
                                    <option value="4">4 - Low</option>
                                    <option value="5">5 - Minimal</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label for="taskCategory" class="form-label">Category</label>
                                <select class="form-select" id="taskCategory" required>
                                    <option value="work" selected>Work</option>
                                    <option value="personal">Personal</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Days</label>
                            <div class="d-flex flex-wrap gap-2">
                                <button type="button" class="btn btn-outline-primary day-option" data-day="monday">Monday</button>
                                <button type="button" class="btn btn-outline-primary day-option" data-day="tuesday">Tuesday</button>
                                <button type="button" class="btn btn-outline-primary day-option" data-day="wednesday">Wednesday</button>
                                <button type="button" class="btn btn-outline-primary day-option" data-day="thursday">Thursday</button>
                                <button type="button" class="btn btn-outline-primary day-option" data-day="friday">Friday</button>
                                <button type="button" class="btn btn-outline-primary day-option" data-day="saturday">Saturday</button>
                                <button type="button" class="btn btn-outline-primary day-option" data-day="sunday">Sunday</button>
                            </div>
                            <input type="hidden" id="selectedDays" name="selectedDays">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveTaskBtn">Save Task</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Task Modal -->
    <div class="modal fade" id="editTaskModal" tabindex="-1" aria-labelledby="editTaskModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="editTaskModalLabel">Edit Task</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="editTaskForm">
                        <input type="hidden" id="editTaskId">
                        <div class="mb-3">
                            <label for="editTaskName" class="form-label">Task Name</label>
                            <input type="text" class="form-control" id="editTaskName" required>
                        </div>

                        <div class="mb-3">
                            <label for="editTaskDescription" class="form-label">Description</label>
                            <textarea class="form-control" id="editTaskDescription" rows="3"></textarea>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-4 mb-3 mb-md-0">
                                <label for="editTaskPriority" class="form-label">Priority</label>
                                <select class="form-select" id="editTaskPriority" required>
                                    <option value="1">1 - Critical</option>
                                    <option value="2">2 - High</option>
                                    <option value="3">3 - Medium</option>
                                    <option value="4">4 - Low</option>
                                    <option value="5">5 - Minimal</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label for="editTaskCategory" class="form-label">Category</label>
                                <select class="form-select" id="editTaskCategory" required>
                                    <option value="work">Work</option>
                                    <option value="personal">Personal</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">Days</label>
                            <div class="d-flex flex-wrap gap-2" id="editDaysContainer">
                                <button type="button" class="btn btn-outline-primary edit-day-option" data-day="monday">Monday</button>
                                <button type="button" class="btn btn-outline-primary edit-day-option" data-day="tuesday">Tuesday</button>
                                <button type="button" class="btn btn-outline-primary edit-day-option" data-day="wednesday">Wednesday</button>
                                <button type="button" class="btn btn-outline-primary edit-day-option" data-day="thursday">Thursday</button>
                                <button type="button" class="btn btn-outline-primary edit-day-option" data-day="friday">Friday</button>
                                <button type="button" class="btn btn-outline-primary edit-day-option" data-day="saturday">Saturday</button>
                                <button type="button" class="btn btn-outline-primary edit-day-option" data-day="sunday">Sunday</button>
                            </div>
                            <input type="hidden" id="editSelectedDays" name="editSelectedDays">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="updateTaskBtn">Update Task</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Description View Modal -->
    <div class="modal fade" id="descriptionModal" tabindex="-1" aria-labelledby="descriptionModalLabel" aria-hidden="true">
        <div class="modal-dialog  modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="descriptionModalLabel">Task Description</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p id="descriptionContent"></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- jQuery for AJAX -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- sweetalert -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <!-- Custom JS -->
    <script src="js/script.js"></script>
</body>
</html>