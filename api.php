<?php
header('Content-Type: application/json');

// Path to our JSON file
$jsonFile = 'tasks.json';

// Helper function to read tasks with error handling
function readTasks() {
    global $jsonFile;
    
    // Create file if it doesn't exist
    if (!file_exists($jsonFile)) {
        $emptyData = json_encode([], JSON_PRETTY_PRINT);
        if (file_put_contents($jsonFile, $emptyData) === false) {
            error_log("Failed to create tasks.json file");
            return [];
        }
        return [];
    }
    
    // Check if file is readable
    if (!is_readable($jsonFile)) {
        error_log("tasks.json file is not readable");
        return [];
    }
    
    $data = file_get_contents($jsonFile);
    
    // Check if file read failed
    if ($data === false) {
        error_log("Failed to read tasks.json file");
        return [];
    }
    
    // Handle empty file
    if (trim($data) === '') {
        $emptyData = json_encode([], JSON_PRETTY_PRINT);
        file_put_contents($jsonFile, $emptyData);
        return [];
    }
    
    $decoded = json_decode($data, true);
    
    // Check for JSON decode errors
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON decode error: " . json_last_error_msg());
        // Backup corrupted file
        $backupFile = $jsonFile . '.backup.' . date('Y-m-d-H-i-s');
        copy($jsonFile, $backupFile);
        error_log("Corrupted file backed up to: " . $backupFile);
        
        // Reset to empty array
        $emptyData = json_encode([], JSON_PRETTY_PRINT);
        file_put_contents($jsonFile, $emptyData);
        return [];
    }
    
    return $decoded ?: [];
}

// Helper function to save tasks with atomic write and validation
function saveTasks($tasks) {
    global $jsonFile;
    
    // Validate input
    if (!is_array($tasks)) {
        error_log("saveTasks: Input is not an array");
        return false;
    }
    
    // Validate each task structure
    foreach ($tasks as $task) {
        if (!is_array($task) || !isset($task['id']) || !isset($task['name'])) {
            error_log("saveTasks: Invalid task structure found");
            return false;
        }
    }
    
    $jsonData = json_encode($tasks, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if ($jsonData === false) {
        error_log("saveTasks: JSON encoding failed");
        return false;
    }
    
    // Use atomic write (write to temp file, then rename)
    $tempFile = $jsonFile . '.tmp.' . uniqid();
    
    if (file_put_contents($tempFile, $jsonData, LOCK_EX) === false) {
        error_log("saveTasks: Failed to write temporary file");
        return false;
    }
    
    // Atomic rename
    if (!rename($tempFile, $jsonFile)) {
        error_log("saveTasks: Failed to rename temporary file");
        unlink($tempFile); // Clean up temp file
        return false;
    }
    
    return true;
}

// Get action from request
$action = $_REQUEST['action'] ?? '';

try {
    switch ($action) {
        case 'get':
            // Get tasks for a specific day or all tasks
            $day = $_GET['day'] ?? 'all';
            $tasks = readTasks();
            
            if ($day === 'all') {
                $response = [
                    'success' => true,
                    'tasks' => $tasks,
                    'stats' => null
                ];
            } else {
                // Filter tasks for the specific day
                $filteredTasks = array_filter($tasks, function($task) use ($day) {
                    return isset($task['days']) && is_array($task['days']) && in_array($day, $task['days']);
                });
                
                // Calculate stats
                $totalTasks = count($filteredTasks);
                $completedTasks = count(array_filter($filteredTasks, function($task) use ($day) {
                    return isset($task['completed'][$day]) && $task['completed'][$day];
                }));
                $pendingTasks = $totalTasks - $completedTasks;
                
                $totalPoints = array_reduce($filteredTasks, function($sum, $task) {
                    return $sum + (isset($task['points']) ? (int)$task['points'] : 0);
                }, 0);
                
                $completedPoints = array_reduce(array_filter($filteredTasks, function($task) use ($day) {
                    return isset($task['completed'][$day]) && $task['completed'][$day];
                }), function($sum, $task) {
                    return $sum + (isset($task['points']) ? (int)$task['points'] : 0);
                }, 0);
                
                $completionPercentage = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;
                
                $response = [
                    'success' => true,
                    'tasks' => array_values($filteredTasks),
                    'stats' => [
                        'pending' => $pendingTasks,
                        'completionPercentage' => $completionPercentage,
                        'completedPoints' => $completedPoints,
                        'totalPoints' => $totalPoints
                    ]
                ];
            }
            break;
            
        case 'get_task':
            // Get a single task by ID
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                $response = ['success' => false, 'message' => 'Invalid task ID'];
                break;
            }
            
            $tasks = readTasks();
            $task = null;
            
            foreach ($tasks as $t) {
                if (isset($t['id']) && (int)$t['id'] === $id) {
                    $task = $t;
                    break;
                }
            }
            
            if ($task) {
                $response = ['success' => true, 'task' => $task];
            } else {
                $response = ['success' => false, 'message' => 'Task not found'];
            }
            break;
            
        case 'create':
            // Create a new task
            if (!isset($_POST['task'])) {
                $response = ['success' => false, 'message' => 'No task data provided'];
                break;
            }
            
            $taskData = json_decode($_POST['task'], true);
            if (!$taskData) {
                $response = ['success' => false, 'message' => 'Invalid task data'];
                break;
            }
            
            // Validate required fields
            if (!isset($taskData['name']) || trim($taskData['name']) === '') {
                $response = ['success' => false, 'message' => 'Task name is required'];
                break;
            }
            
            if (!isset($taskData['days']) || !is_array($taskData['days']) || empty($taskData['days'])) {
                $response = ['success' => false, 'message' => 'At least one day must be selected'];
                break;
            }
            
            $tasks = readTasks();
            
            // Generate new ID
            $newId = 1;
            if (!empty($tasks)) {
                $ids = array_column($tasks, 'id');
                $newId = max($ids) + 1;
            }
            
            // Initialize completion status for each day
            $completedStatus = [];
            foreach ($taskData['days'] as $day) {
                $completedStatus[$day] = false;
            }
            
            $newTask = [
                'id' => $newId,
                'name' => trim($taskData['name']),
                'description' => isset($taskData['description']) ? trim($taskData['description']) : '',
                'points' => isset($taskData['points']) ? (int)$taskData['points'] : 10,
                'days' => $taskData['days'],
                'priority' => isset($taskData['priority']) ? (int)$taskData['priority'] : 3,
                'category' => isset($taskData['category']) ? $taskData['category'] : 'work',
                'completed' => $completedStatus
            ];
            
            $tasks[] = $newTask;
            
            if (saveTasks($tasks)) {
                $response = ['success' => true, 'task' => $newTask];
            } else {
                $response = ['success' => false, 'message' => 'Failed to save task'];
            }
            break;
            
        case 'update':
            // Update an existing task
            if (!isset($_POST['task'])) {
                $response = ['success' => false, 'message' => 'No task data provided'];
                break;
            }
            
            $taskData = json_decode($_POST['task'], true);
            if (!$taskData || !isset($taskData['id'])) {
                $response = ['success' => false, 'message' => 'Invalid task data'];
                break;
            }
            
            $taskId = (int)$taskData['id'];
            $tasks = readTasks();
            $updated = false;
            
            foreach ($tasks as &$task) {
                if (isset($task['id']) && (int)$task['id'] === $taskId) {
                    // Preserve completion status for existing days
                    $newCompleted = [];
                    $newDays = isset($taskData['days']) ? $taskData['days'] : $task['days'];
                    
                    foreach ($newDays as $day) {
                        if (isset($task['completed'][$day])) {
                            // Keep existing completion status
                            $newCompleted[$day] = $task['completed'][$day];
                        } else {
                            // New day - default to incomplete
                            $newCompleted[$day] = false;
                        }
                    }
                    
                    $task['name'] = isset($taskData['name']) ? trim($taskData['name']) : $task['name'];
                    $task['description'] = isset($taskData['description']) ? trim($taskData['description']) : $task['description'];
                    $task['points'] = isset($taskData['points']) ? (int)$taskData['points'] : $task['points'];
                    $task['days'] = $newDays;
                    $task['priority'] = isset($taskData['priority']) ? (int)$taskData['priority'] : $task['priority'];
                    $task['category'] = isset($taskData['category']) ? $taskData['category'] : $task['category'];
                    $task['completed'] = $newCompleted;
                    $updated = true;
                    break;
                }
            }
            
            if ($updated) {
                if (saveTasks($tasks)) {
                    $response = ['success' => true];
                } else {
                    $response = ['success' => false, 'message' => 'Failed to save updated task'];
                }
            } else {
                $response = ['success' => false, 'message' => 'Task not found'];
            }
            break;
            
        case 'toggle':
            // Toggle task completion status for specific day
            $id = (int)($_POST['id'] ?? 0);
            $day = $_POST['day'] ?? '';
            
            if ($id <= 0 || $day === '') {
                $response = ['success' => false, 'message' => 'Invalid task ID or day'];
                break;
            }
            
            $tasks = readTasks();
            $toggled = false;
            
            foreach ($tasks as &$task) {
                if (isset($task['id']) && (int)$task['id'] === $id) {
                    if (!isset($task['completed'])) {
                        $task['completed'] = [];
                    }
                    if (isset($task['days']) && in_array($day, $task['days'])) {
                        $task['completed'][$day] = !($task['completed'][$day] ?? false);
                        $toggled = true;
                    }
                    break;
                }
            }
            
            if ($toggled) {
                if (saveTasks($tasks)) {
                    $response = ['success' => true];
                } else {
                    $response = ['success' => false, 'message' => 'Failed to save task status'];
                }
            } else {
                $response = ['success' => false, 'message' => 'Task not found or day invalid'];
            }
            break;
            
        case 'delete':
            // Delete a task
            $id = (int)($_POST['id'] ?? 0);
            
            if ($id <= 0) {
                $response = ['success' => false, 'message' => 'Invalid task ID'];
                break;
            }
            
            $tasks = readTasks();
            $initialCount = count($tasks);
            
            $tasks = array_filter($tasks, function($task) use ($id) {
                return !isset($task['id']) || (int)$task['id'] !== $id;
            });
            
            if (count($tasks) < $initialCount) {
                if (saveTasks(array_values($tasks))) {
                    $response = ['success' => true];
                } else {
                    $response = ['success' => false, 'message' => 'Failed to save after deletion'];
                }
            } else {
                $response = ['success' => false, 'message' => 'Task not found'];
            }
            break;
            
        default:
            $response = ['success' => false, 'message' => 'Invalid action'];
            break;
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    $response = ['success' => false, 'message' => 'Server error occurred'];
}

echo json_encode($response);
?>