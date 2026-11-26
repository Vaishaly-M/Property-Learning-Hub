<?php

use App\Http\Controllers\Api\Chat\ChatController;
use Illuminate\Support\Facades\Route;

Route::get('/chats', [ChatController::class, 'index'])->middleware('permission:chat.view');
Route::get('/chats/contacts', [ChatController::class, 'contacts'])->middleware('permission:chat.view');
Route::post('/chats', [ChatController::class, 'store']);
Route::get('/chats/{id}', [ChatController::class, 'show'])->middleware('permission:chat.view');
Route::put('/chats/{id}', [ChatController::class, 'update'])->middleware('permission:group_chat.edit');
Route::delete('/chats/{id}', [ChatController::class, 'destroy'])->middleware('permission:group_chat.delete');

Route::get('/chats/{id}/messages', [ChatController::class, 'messages'])->middleware('permission:chat.view');
Route::post('/chats/{id}/messages', [ChatController::class, 'sendMessage'])->middleware('permission:chat.send');
Route::post('/chats/{id}/typing', [ChatController::class, 'typing'])->middleware('permission:chat.send');

Route::put('/messages/{messageId}', [ChatController::class, 'updateMessage'])->middleware('permission:chat.send');
Route::delete('/messages/{messageId}', [ChatController::class, 'deleteMessage'])->middleware('permission:chat.delete');
Route::post('/messages/{messageId}/read', [ChatController::class, 'markMessageRead'])->middleware('permission:chat.receive');

Route::post('/groups/{id}/members', [ChatController::class, 'addMember'])->middleware('permission:group_chat.add_member');
Route::delete('/groups/{groupId}/members/{userId}', [ChatController::class, 'removeMember'])->middleware('permission:group_chat.remove_member');

Route::get('/chat/attachments/{attachmentId}/download', [ChatController::class, 'downloadAttachment'])
    ->middleware('permission:chat.file.download');

Route::get('/chat/notifications', [ChatController::class, 'notifications'])
    ->middleware('permission:chat.notification.view');
