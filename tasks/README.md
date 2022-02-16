[Home](../README.md) | **[Tasks](README.md)** | [Build/Deployment](../build/README.md)

# RFCx Core API - Tasks

## Introduction

Core Tasks are background processes that listen to message queues for events and perform (potentially long-running) tasks when an event occurs. The motivation for tasks is to avoid blocking http requests to the API. Use cases:
- Send notifications to rangers when a chainsaw alert is created
- Create a thumbnail image when a new image is uploaded
- Find all the enabled classifiers for a stream and queue for processing when a segment is added to a stream

## Running locally

1. Use `docker-compose up -d` to start the local SQS server (as well as the database).
2. Ensure the env_vars are set for `MESSAGE_QUEUE_*` (`ENDPOINT` should be localhost or your docker machine IP).
3. Run `npm run dev:tasks` to start the Tasks server (with hot-reloading).

## Adding a new task

1. Define an event name in `event-names.js`
2. Publish to `MessageQueue.default()` when the event occurs
3. Create a new folder in the current directory for the task. Write a task handler to run when the event occurs.
4. Import the _event name_ and the _task handler_ in `listen.js` and add to the list of `tasks`.

