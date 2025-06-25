#!/usr/bin/env python3
"""
Detailed Status Report Generator

Generates a comprehensive status report with metrics, progress tracking,
and visual indicators for the Trosyn AI project.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path
import matplotlib.pyplot as plt
from collections import defaultdict

# Configuration
PROJECT_ROOT = Path(__file__).parent
TASKS_DIR = PROJECT_ROOT / 'tasks'
REPORT_DIR = PROJECT_ROOT / 'reports'
REPORT_DIR.mkdir(exist_ok=True)

# Status mapping for consistent display
STATUS_EMOJI = {
    'pending': '⏳',
    'in progress': '🔄',
    'done': '✅',
    'blocked': '⛔'
}

def collect_task_data():
    """Collect and process task data from all task files."""
    tasks = []
    
    for status_dir in ['active', 'backlog', 'completed']:
        task_dir = TASKS_DIR / status_dir
        if not task_dir.exists():
            continue
            
        for task_file in task_dir.glob('*.md'):
            task_data = {
                'file': task_file.name,
                'status': status_dir,
                'category': 'Uncategorized',
                'priority': 'medium',
                'last_updated': datetime.fromtimestamp(task_file.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
            }
            
            # Read task metadata
            with open(task_file, 'r') as f:
                for line in f:
                    if line.startswith('#'):
                        if ':' in line:
                            key, value = line[1:].split(':', 1)
                            key = key.strip().lower()
                            value = value.strip()
                            if key in ['title', 'status', 'priority', 'category']:
                                task_data[key] = value
            
            tasks.append(task_data)
    
    return tasks

def generate_metrics(tasks):
    """Generate project metrics from task data."""
    metrics = {
        'total_tasks': len(tasks),
        'by_status': defaultdict(int),
        'by_priority': defaultdict(int),
        'by_category': defaultdict(int)
    }
    
    for task in tasks:
        metrics['by_status'][task['status']] += 1
        metrics['by_priority'][task.get('priority', 'unset')] += 1
        metrics['by_category'][task.get('category', 'Uncategorized')] += 1
    
    return metrics

def generate_report(tasks, metrics):
    """Generate a detailed markdown report."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M %Z')
    
    report = [
        "# Trosyn AI - Detailed Status Report",
        f"*Generated on: {timestamp}*\n",
        "## 📊 Project Metrics",
        f"- **Total Tasks:** {metrics['total_tasks']}",
        "\n### By Status"
    ]
    
    # Add status breakdown
    for status, count in metrics['by_status'].items():
        emoji = STATUS_EMOJI.get(status.lower().replace(' ', ''), '')
        report.append(f"- {emoji} {status.title()}: {count}")
    
    # Add priority breakdown
    report.extend(["\n### By Priority"])
    for priority, count in sorted(metrics['by_priority'].items()):
        report.append(f"- {priority.title()}: {count}")
    
    # Add category breakdown
    report.extend(["\n### By Category"])
    for category, count in sorted(metrics['by_category'].items()):
        report.append(f"- {category}: {count}")
    
    # Add task list
    report.extend(["\n## 📋 Task List", "| Status | Priority | Category | Task | Last Updated |", "|--------|----------|----------|------|--------------|"])
    
    for task in sorted(tasks, key=lambda x: (x['status'] != 'done', x.get('priority', 'z'), x.get('title', ''))):
        status_emoji = STATUS_EMOJI.get(task['status'].lower().replace(' ', ''), '')
        report.append(
            f"| {status_emoji} {task['status'].title()} | "
            f"{task.get('priority', 'medium').title()} | "
            f"{task.get('category', 'Uncategorized')} | "
            f"{task.get('title', 'Untitled')} | "
            f"{task.get('last_updated', 'N/A')} |"
        )
    
    return '\n'.join(report)

def generate_charts(metrics, output_dir):
    """Generate visual charts for the report."""
    # Status pie chart
    plt.figure(figsize=(10, 5))
    plt.subplot(1, 2, 1)
    plt.pie(
        metrics['by_status'].values(),
        labels=[f"{k} ({v})" for k, v in metrics['by_status'].items()],
        autopct='%1.1f%%',
        startangle=90
    )
    plt.title('Tasks by Status')
    
    # Priority bar chart
    plt.subplot(1, 2, 2)
    priorities = sorted(metrics['by_priority'].items())
    plt.bar(
        [p[0] for p in priorities],
        [p[1] for p in priorities]
    )
    plt.title('Tasks by Priority')
    plt.xticks(rotation=45)
    
    # Save the figure
    plt.tight_layout()
    chart_path = output_dir / 'status_charts.png'
    plt.savefig(chart_path)
    plt.close()
    
    return chart_path

def main():
    """Main function to generate the status report."""
    print("Generating detailed status report...")
    
    # Collect and process task data
    tasks = collect_task_data()
    metrics = generate_metrics(tasks)
    
    # Generate markdown report
    report = generate_report(tasks, metrics)
    
    # Generate charts
    chart_path = generate_charts(metrics, REPORT_DIR)
    
    # Write the report to a file
    report_path = REPORT_DIR / 'status_report.md'
    with open(report_path, 'w') as f:
        f.write(report)
    
    # Add chart to report
    with open(report_path, 'a') as f:
        f.write(f"\n## 📈 Visualizations\n")
        f.write(f"![Task Status]({chart_path.relative_to(PROJECT_ROOT)})")
    
    print(f"Report generated: {report_path}")
    print(f"Charts saved to: {chart_path}")

if __name__ == "__main__":
    main()
