<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It is a breeze. Simply tell Lumen the URIs it should respond to
| and give it the Closure to call when that URI is requested.
|
*/
$router->addRoute('GET',       '/',            ['uses' => 'TaskController@showTasks']);
$router->addRoute('POST',      '/task',        ['uses' => 'TaskController@createTask']);
$router->addRoute('GET',       '/task',        ['uses' => 'TaskController@getTasks']);
$router->addRoute('DELETE',    '/task/{id}',   ['uses' => 'TaskController@deleteTask']);
$router->addRoute('POST',      '/task/{id}',   ['uses' => 'TaskController@updateTask']);
