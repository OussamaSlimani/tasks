<?php
header('Content-Type: application/json');

// Path to our JSON file
$jsonFile = 'tasks.json';

// Helper function to read tasks
function readTasks() {
    global $jsonFile;
    if (!file_exists($jsonFile)) {
        return [];
    }
    $data = file_get_contents($jsonFile);
    return json_decode($data, true) ?: [];
}

// Helper function to save tasks
function saveTasks($tasks) {
    global $jsonFile;
    file_put_contents($jsonFile, json_encode($tasks, JSON_PRETTY_PRINT));
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
                    return in_array($day, $task['days']);
                });
                
                // Calculate stats
                $totalTasks = count($filteredTasks);
                $completedTasks = count(array_filter($filteredTasks, function($task) use ($day) {
                    return isset($task['completed'][$day]) && $task['completed'][$day];
                }));
                $pendingTasks = $totalTasks - $completedTasks;
                
                $totalPoints = array_reduce($filteredTasks, function($sum, $task) {
                    return $sum + $task['points'];
                }, 0);
                
                $completedPoints = array_reduce(array_filter($filteredTasks, function($task) use ($day) {
                    return isset($task['completed'][$day]) && $task['completed'][$day];
                }), function($sum, $task) {
                    return $sum + $task['points'];
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
            $id = $_GET['id'] ?? 0;
            $tasks = readTasks();
            $task = null;
            
            foreach ($tasks as $t) {
                if ($t['id'] == $id) {
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
            $taskData = json_decode($_POST['task'], true);
            $tasks = readTasks();
            
            // Generate new ID
            $newId = empty($tasks) ? 1 : max(array_column($tasks, 'id')) + 1;
            
            // Initialize completion status for each day
            $completedStatus = [];
            foreach ($taskData['days'] as $day) {
                $completedStatus[$day] = false;
            }
            
            $newTask = [
                'id' => $newId,
                'name' => $taskData['name'],
                'description' => $taskData['description'] ?? '',
                'points' => $taskData['points'],
                'days' => $taskData['days'],
                'priority' => $taskData['priority'],
                'category' => $taskData['category'],
                'completed' => $completedStatus
            ];
            
            $tasks[] = $newTask;
            saveTasks($tasks);
            
            $response = ['success' => true, 'task' => $newTask];
            break;
            
        case 'update':
            // Update an existing task
            $taskData = json_decode($_POST['task'], true);
            $tasks = readTasks();
            $updated = false;
            
            foreach ($tasks as &$task) {
                if ($task['id'] == $taskData['id']) {
                    // Preserve completion status for existing days
                    $newCompleted = [];
                    $newDays = $taskData['days'];
                    
                    foreach ($newDays as $day) {
                        if (isset($task['completed'][$day])) {
                            // Keep existing completion status
                            $newCompleted[$day] = $task['completed'][$day];
                        } else {
                            // New day - default to incomplete
                            $newCompleted[$day] = false;
                        }
                    }
                    
                    $task['name'] = $taskData['name'];
                    $task['description'] = $taskData['description'] ?? '';
                    $task['points'] = $taskData['points'];
                    $task['days'] = $newDays;
                    $task['priority'] = $taskData['priority'];
                    $task['category'] = $taskData['category'];
                    $task['completed'] = $newCompleted;
                    $updated = true;
                    break;
                }
            }
            
            if ($updated) {
                saveTasks($tasks);
                $response = ['success' => true];
            } else {
                $response = ['success' => false, 'message' => 'Task not found'];
            }
            break;
            
        case 'toggle':
            // Toggle task completion status for specific day
            $id = $_POST['id'] ?? 0;
            $day = $_POST['day'] ?? '';
            $tasks = readTasks();
            $toggled = false;
            
            foreach ($tasks as &$task) {
                if ($task['id'] == $id) {
                    if (isset($task['completed'][$day])) {
                        $task['completed'][$day] = !$task['completed'][$day];
                        $toggled = true;
                    }
                    break;
                }
            }
            
            if ($toggled) {
                saveTasks($tasks);
                $response = ['success' => true];
            } else {
                $response = ['success' => false, 'message' => 'Task not found or day invalid'];
            }
            break;
            
        case 'delete':
            // Delete a task
            $id = $_POST['id'] ?? 0;
            $tasks = readTasks();
            $initialCount = count($tasks);
            
            $tasks = array_filter($tasks, function($task) use ($id) {
                return $task['id'] != $id;
            });
            
            if (count($tasks) < $initialCount) {
                saveTasks(array_values($tasks));
                $response = ['success' => true];
            } else {
                $response = ['success' => false, 'message' => 'Task not found'];
            }
            break;
            
        default:
            $response = ['success' => false, 'message' => 'Invalid action'];
            break;
    }
} catch (Exception $e) {
    $response = ['success' => false, 'message' => $e->getMessage()];
}

echo json_encode($response);
?>