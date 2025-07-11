#!/usr/bin/env python3
"""
Task Status Synchronization Script

This script synchronizes task statuses between:
1. Individual task files in /tasks/active and /tasks/backlog
2. The main STATUS.md file
"""

import os
import re
from datetime import datetime
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent
TASKS_DIR = PROJECT_ROOT / 'tasks'
STATUS_FILE = PROJECT_ROOT / 'STATUS.md'

# Status mapping between task files and STATUS.md
STATUS_MAPPING = {
    'pending': '⏳ Pending',
    'in progress': '🔄 In Progress',
    'done': '✅ Completed',
    'blocked': '⛔ Blocked'
}

def read_task_file(task_file):
    """Read a task file and extract its metadata."""
    metadata = {}
    with open(task_file, 'r') as f:
        for line in f:
            if line.startswith('#'):
                if ':' in line:
                    key, value = line[1:].split(':', 1)
                    metadata[key.strip().lower()] = value.strip()
    return metadata

def update_status_file():
    """Update the STATUS.md file based on task files."""
    # Read current STATUS.md
    with open(STATUS_FILE, 'r') as f:
        status_lines = f.readlines()
    
    # Find the task table section
    task_table_start = next(i for i, line in enumerate(status_lines) 
                          if '## 📋 Task Overview' in line)
    task_table_end = next(i for i, line in enumerate(status_lines[task_table_start:], task_table_start) 
                         if line.startswith('## 🚀 Current Focus'))
    
    # Get all task files
    task_files = list((TASKS_DIR / 'active').glob('*.md')) + list((TASKS_DIR / 'backlog').glob('*.md'))
    
    # Process each task file
    tasks = []
    for task_file in task_files:
        try:
            task_data = read_task_file(task_file)
            if not task_data:
                continue
                
            # Map to STATUS.md format
            status = STATUS_MAPPING.get(task_data.get('status', 'pending').lower(), '⏳ Pending')
            priority = task_data.get('priority', 'medium').capitalize()
            
            tasks.append({
                'title': task_data.get('title', 'Untitled Task'),
                'status': status,
                'priority': priority,
                'notes': task_data.get('details', '')[:50] + '...' if 'details' in task_data else ''
            })
        except Exception as e:
            print(f"Error processing {task_file}: {e}")
    
    # Generate new task table
    new_table = [
        '## 📋 Task Overview\n',
        '| Task | Status | Priority | Notes |\n',
        '|------|--------|----------|-------|\n'
    ]
    
    for task in sorted(tasks, key=lambda x: (x['priority'] != 'High', x['priority'] != 'Medium', x['title'])):
        new_table.append(f"| {task['title']} | {task['status']} | {task['priority']} | {task['notes']} |\n")
    
    # Replace the task table section
    updated_status = status_lines[:task_table_start + 1] + new_table + status_lines[task_table_end:]
    
    # Update the last updated timestamp
    for i, line in enumerate(updated_status):
        if line.startswith('Last Updated:'):
            updated_status[i] = f"Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M %Z')}\n"
            break
    
    # Write the updated file
    with open(STATUS_FILE, 'w') as f:
        f.writelines(updated_status)

def main():
    print("Updating STATUS.md based on task files...")
    update_status_file()
    print("STATUS.md has been updated.")

if __name__ == "__main__":
    main()
