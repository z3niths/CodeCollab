# Quick Start Guide

Get up and running with AI Collaboration System in 5 minutes!

## Prerequisites

1. **Install GitHub Copilot CLI:**

   ```bash
   # Check if installed
   copilot --version

   # If not installed, visit:
   # https://github.com/features/copilot
   ```

2. **Ensure you have Claude Code:**

   - Download from https://claude.com/claude-code

3. **Git repository:**
   - Your project should be a git repository

## Installation

```bash
# Option 1: Global installation
npm install -g @z3niths/ai-collab-system

# Option 2: Project installation
cd your-project
npm install --save-dev @z3niths/ai-collab-system
```

## Setup (2 minutes)

### Step 1: Initialize

```bash
cd your-project
ai-collab init
```

This creates `.ai-workspace/` with everything you need.

### Step 2: Start the Watcher

```bash
ai-collab start
```

Or manually:

```bash
node .ai-workspace/auto-watcher.js
```

You should see:

```
🚀 Autonomous AI Collaboration System Started
✅ Copilot Agent is ready for autonomous task execution
✅ Claude Reviewer ready - will auto-review all completed tasks
```

## Your First Task (3 minutes)

### Option 1: Using CLI

```bash
ai-collab create-task \
  --title "Create hello world function" \
  --description "Add a helloWorld() function to src/utils.js that returns 'Hello, World!'" \
  --assignedTo copilot \
  --files "src/utils.js"
```

### Option 2: Edit JSON Directly

Edit `.ai-workspace/tasks.json`:

```json
{
  "tasks": [
    {
      "id": "task-001",
      "title": "Create hello world function",
      "description": "Add a helloWorld() function to src/utils.js that returns 'Hello, World!'",
      "assignedTo": "copilot",
      "status": "pending",
      "priority": "high",
      "files": ["src/utils.js"]
    }
  ],
  "metadata": {
    "lastTaskId": 1
  }
}
```

### Watch the Magic! ✨

In your watcher terminal, you'll see:

```
📝 Tasks file changed, checking for new tasks...
   Found 0 Claude task(s) and 1 Copilot task(s)

🤖 [COPILOT AGENT] Processing Task: task-001
   Title: Create hello world function
   Description: Add a helloWorld() function...

🤖 Copilot executing: "Add a helloWorld() function..."

✓ Edit src\utils.js (+5)

   ✅ Task completed successfully!
   📄 Files modified:
      Edit src\utils.js (+5 -0)
   📊 Changes: +5 -0 lines
   ✅ Status updated to completed

   ⏳ Waiting 2 seconds for file system sync...

   🔍 Triggering Claude Code review...

📋 [CLAUDE REVIEWER] Reviewing Task: task-001
   Title: Create hello world function
   📄 Files changed: src/utils.js

   ✅ Code review passed - looks good!
   ✅ Claude approved the changes!
```

Done! Check your file:

```bash
git diff src/utils.js
```

## Common Use Cases

### Add a New Feature

```bash
ai-collab create-task \
  --title "Build user profile page" \
  --description "Create a user profile page at app/profile/page.tsx with avatar, name, and bio" \
  --assignedTo copilot \
  --files "app/profile/page.tsx" \
  --priority high
```

### Refactor Code

```json
{
  "id": "task-002",
  "title": "Extract utils to separate file",
  "description": "Move utility functions from app.js to utils.js",
  "assignedTo": "copilot",
  "status": "pending",
  "files": ["app.js", "utils.js"]
}
```

### Add API Endpoint

```json
{
  "id": "task-003",
  "title": "Create users API",
  "description": "Add GET /api/users endpoint that returns list of users",
  "assignedTo": "copilot",
  "status": "pending",
  "files": ["api/users/route.ts"]
}
```

## Check Status

```bash
ai-collab status
```

Output:

```
📊 AI Collaboration System Status

Watcher: ▶️  RUNNING
Last Update: 2025-10-27T15:30:00.000Z
Current Status: idle

Tasks:
  ⏳ Pending: 0
  🔄 In Progress: 0
  ✅ Completed: 2
  ✓  Verified: 3
  📝 Total: 5
```

## View Logs

```bash
ai-collab logs --tail 20
```

## Pause/Resume

```bash
# Pause
ai-collab stop

# Resume
ai-collab resume
```

## Next Steps

- Read the full [README](./README.md)
- Learn about [Configuration](./docs/CONFIGURATION.md)
- Check out [Examples](./docs/EXAMPLES.md)
- Understand [Task Format](./docs/TASK-FORMAT.md)

## Troubleshooting

### Copilot not executing?

```bash
# Check Copilot installation
copilot --version

# Test Copilot
copilot -p "Say hello"
```

### Tasks stuck in pending?

1. Check if watcher is running
2. Verify task assignment is "copilot"
3. Check `.ai-workspace/claude-output.json` for errors

### Permission errors?

The system is configured to run with full permissions:

- `--allow-all-tools`
- `--allow-tool 'write'`
- `--allow-tool 'shell'`
- `--allow-tool 'read'`

If you still get errors, check your Copilot version (needs 0.0.300+).

## Support

- 📖 [Full Documentation](./README.md)
- 💬 [GitHub Discussions](https://github.com/yourusername/ai-collab-system/discussions)
- 🐛 [Report Issues](https://github.com/yourusername/ai-collab-system/issues)

Happy collaborating! 🚀
