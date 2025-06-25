#!/usr/bin/env python3
"""
Task Creation Script

Creates a new task file with a standardized format.
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime

def create_task(title, category="Uncategorized", priority="medium", status="pending", description=""):
    """Create a new task file with the given parameters."""
    # Create tasks directory if it doesn't exist
    tasks_dir = Path("tasks/active")
    tasks_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate a task ID based on existing files
    task_id = 1
    for f in tasks_dir.glob("*.md"):
        try:
            num = int(f.stem.split('_')[-1])
            task_id = max(task_id, num + 1)
        except (ValueError, IndexError):
            continue
    
    # Create task filename
    task_file = tasks_dir / f"task_{task_id:03d}.md"
    
    # Create task content
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    content = f"""# Task ID: {task_id}
# Title: {title}
# Status: {status}
# Category: {category}
# Priority: {priority}
# Created: {timestamp}
# Dependencies: None
# Description: {description}

# Details:
Add detailed information about the task here.

# Test Strategy:
Describe how this task will be tested.

# Subtasks:
## 1. First Subtask [pending]
### Description:
### Dependencies:
### Details:
"""
    # Write the task file
    with open(task_file, 'w') as f:
        f.write(content)
    
    print(f"Created task: {task_file}")
    return task_file

def main():
    parser = argparse.ArgumentParser(description='Create a new task')
    parser.add_argument('title', help='Title of the task')
    parser.add_argument('--category', default='Uncategorized', help='Task category')
    parser.add_argument('--priority', default='medium', 
                       choices=['low', 'medium', 'high', 'critical'],
                       help='Task priority')
    parser.add_argument('--status', default='pending',
                       choices=['pending', 'in progress', 'blocked', 'done'],
                       help='Task status')
    parser.add_argument('--description', default='', help='Task description')
    
    args = parser.parse_args()
    
    create_task(
        title=args.title,
        category=args.category,
        priority=args.priority,
        status=args.status,
        description=args.description
    )

if __name__ == "__main__":
    main()
