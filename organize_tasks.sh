#!/bin/bash

# Create a mapping of task files to their target directories based on status
for task_file in files/docs/tasks/task_*.txt; do
    # Extract task ID
    task_id=$(basename "$task_file" | grep -oE '[0-9]+')
    
    # Check if the task is marked as done
    if grep -q "Status: done" "$task_file"; then
        # Move completed tasks to the completed directory
        mv "$task_file" "tasks/completed/task_${task_id}.md"
    else
        # Move active tasks to the active directory
        mv "$task_file" "tasks/active/task_${task_id}.md"
    fi
done

# Move the tasks.json file to the tasks directory
mv "files/docs/tasks/tasks.json" "tasks/"

# Move the version control documentation
mv "files/docs/tasks/Version_controls" "docs/architecture/version_controls.md"
