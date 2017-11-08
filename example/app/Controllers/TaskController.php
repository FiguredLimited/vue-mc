<?php

namespace App\Controllers;

use App\Task;
use Illuminate\Http\Request;
use Laravel\Lumen\Routing\Controller;
use Illuminate\Http\JsonResponse;

class TaskController extends Controller
{
    /**
     * Main view to show the task interface.
     *
     * @return \Illuminate\View\View
     */
    public function showTasks()
    {
        return view('tasks');
    }

    /**
     * Returns all the tasks.
     *
     * @return JsonResponse
     */
    public function getTasks()
    {
        return response()->json(Task::query()->get());
    }

    /**
     * Creates a new task and returns it.
     *
     * @param Request $request
     *
     * @return JsonResponse
     */
    public function createTask(Request $request)
    {
        $this->validate($request, [
            'name' => 'required|string'
        ]);

        $task = new Task([
            'name' => $request->input('name'),
            'done' => false,
        ]);

        $task->save();

        sleep(1);
        return response()->json($task);
    }

    /**
     * Deletes an existing task.
     *
     * @param $taskId
     *
     * @return \Illuminate\Http\Response
     */
    public function deleteTask($taskId)
    {
        $task = Task::query()->where('id', $taskId)->first();

        if (is_null($task)) {
            return response('Could not find task', 404);
        }

        $task->delete();

        sleep(1);
        return response('Deleted successfully');
    }

    /**
     * Updates an existing task.
     *
     * @param Request $request
     * @param $taskId
     *
     * @return JsonResponse
     */
    public function updateTask(Request $request, $taskId)
    {
        $this->validate($request, [
            'name' => 'required|string',
            'done' => 'required|boolean',
        ]);

        $task = Task::query()->where('id', $taskId)->first();

        if (is_null($task)) {
            return response('Could not find task', 404);
        }

        $task->update([
            'name' => $request->get('name'),
            'done' => (bool) $request->get('done'),
        ]);

        sleep(1);
        return response()->json($task);
    }
}
