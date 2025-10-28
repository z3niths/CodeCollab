# AI Collaboration System

**Autonomous AI collaboration for your projects - Claude Code + GitHub Copilot working together**

A file-based task queue system that enables Claude Code and GitHub Copilot to work together autonomously on your codebase with automatic code review and iterative improvements.

## Features

- 🤖 **Autonomous Execution** - Copilot executes tasks automatically without manual intervention
- 🔍 **Automatic Code Review** - Claude reviews all Copilot's work and creates fix tasks if needed
- 🔄 **Iterative Improvement** - Auto-creates follow-up tasks until code quality standards are met
- 📋 **Task Queue System** - Simple JSON-based task queue for coordination
- 🛡️ **Quality Assurance** - Catches syntax errors, missing imports, and code quality issues
- ⚙️ **Configurable** - Adjust review strictness and workflow to your needs
- 🚫 **Loop Prevention** - Built-in safeguards against infinite task loops

## How It Works

```
You create task → Copilot executes → Claude reviews →
  ✅ Approved → Done!
  ⚠️ Issues → Creates fix tasks → Copilot fixes → Review again
```

## Requirements

- Node.js 16+
- [GitHub Copilot CLI](https://github.com/features/copilot) installed and authenticated
- [Claude Code](https://claude.com/claude-code) (for code review)
- Git repository (for change detection)

## Installation

```bash
# Install globally
npm install -g @ai-collab/task-system

# Or install in your project
npm install --save-dev @ai-collab/task-system
```

## Quick Start

1. **Initialize in your project:**

```bash
cd your-project
ai-collab init
```

This creates:
- `.ai-workspace/` directory
- `tasks.json` - task queue file
- Configuration files
- Example tasks

2. **Start the watcher:**

```bash
ai-collab start
# or
npm run ai-collab
```

3. **Create tasks for Copilot:**

Edit `.ai-workspace/tasks.json` or use the helper:

```bash
ai-collab create-task --title "Add login page" --assignedTo copilot
```

4. **Watch the magic happen!**

Copilot executes → Claude reviews → Iterates until approved

## Usage

### Creating Tasks

**Via JSON file:**

Edit `.ai-workspace/tasks.json`:

```json
{
  "tasks": [
    {
      "id": "task-001",
      "title": "Build user dashboard",
      "description": "Create a modern dashboard page at app/dashboard/page.tsx...",
      "assignedTo": "copilot",
      "status": "pending",
      "priority": "high",
      "files": ["app/dashboard/page.tsx"]
    }
  ]
}
```

**Via CLI:**

```bash
ai-collab create-task \
  --title "Add authentication" \
  --description "Implement JWT auth with login page" \
  --assignedTo copilot \
  --files "app/lib/auth.ts,app/login/page.tsx"
```

### Task Assignment

- `assignedTo: "copilot"` - Copilot executes automatically
- `assignedTo: "claude"` - Manual execution via Claude Code CLI
- `assignedTo: "any"` - Either AI can handle it

### Task Statuses

- `pending` - Not started
- `in-progress` - Currently being worked on
- `completed` - Done, awaiting review
- `verified` - Approved by Claude review
- `blocked` - Has errors, needs fixing
- `cancelled` - No longer needed

## Configuration

### Review Strictness

Edit `.ai-workspace/config.json`:

```json
{
  "review": {
    "checkSyntax": true,
    "checkQuality": true,
    "failOnConsoleLog": false,
    "requireExports": true,
    "maxFollowUpTasks": 5
  }
}
```

### Custom Review Rules

Create `.ai-workspace/review-rules.js`:

```javascript
module.exports = {
  customChecks: [
    {
      name: "No TODO comments",
      check: (content) => !content.includes("TODO"),
      message: "Remove TODO comments before completion"
    }
  ]
};
```

## Examples

### Example 1: Build a Feature

```json
{
  "id": "task-001",
  "title": "Create user profile page",
  "description": "Build a user profile page with avatar, bio, and settings",
  "assignedTo": "copilot",
  "status": "pending",
  "files": ["app/profile/page.tsx"]
}
```

**Result:**
- Copilot creates the page
- Claude reviews for errors
- If issues found, creates fix tasks
- Copilot fixes issues
- Repeats until approved ✅

### Example 2: Add API Endpoint

```json
{
  "id": "task-002",
  "title": "Add user API endpoint",
  "description": "Create GET /api/users endpoint that returns user list",
  "assignedTo": "copilot",
  "status": "pending",
  "files": ["app/api/users/route.ts"]
}
```

### Example 3: Refactoring

```json
{
  "id": "task-003",
  "title": "Extract auth logic to utility",
  "description": "Move authentication logic from pages to app/lib/auth.ts",
  "assignedTo": "copilot",
  "status": "pending",
  "files": ["app/lib/auth.ts", "app/login/page.tsx"]
}
```

## Advanced Usage

### Pausing the Watcher

Create `.ai-workspace/STOP` file:

```bash
touch .ai-workspace/STOP
```

Remove to resume:

```bash
rm .ai-workspace/STOP
```

### Monitoring

Check status:

```bash
ai-collab status
```

View logs:

```bash
ai-collab logs
```

### Task Dependencies

Tasks can depend on others:

```json
{
  "id": "task-002",
  "title": "Add styling to dashboard",
  "dependencies": ["task-001"],
  "status": "pending"
}
```

Task-002 waits until task-001 is completed.

## Troubleshooting

### Copilot Not Executing Tasks

1. Check Copilot is installed: `copilot --version`
2. Check authentication: `copilot -p "test"`
3. Verify permissions in `.ai-workspace/copilot-agent.js`

### Review False Positives

If Claude flags valid code:
1. Check review notes in `tasks.json`
2. Adjust strictness in config
3. Manually mark as verified if incorrect

### Infinite Task Loops

The system has built-in loop prevention (max 5 attempts). If it triggers:
1. Check Copilot permissions
2. Review the error pattern in task history
3. Manually fix the issue

## File Structure

```
your-project/
├── .ai-workspace/
│   ├── tasks.json              # Task queue
│   ├── auto-watcher.js         # Main orchestrator
│   ├── copilot-agent.js        # Copilot wrapper
│   ├── claude-reviewer.js      # Review agent
│   ├── config.json             # Configuration
│   ├── claude-output.json      # Execution logs
│   └── STOP                    # Pause file (optional)
```

## API

### CopilotAgent

```javascript
const CopilotAgent = require('.ai-workspace/copilot-agent');
const agent = new CopilotAgent({ workingDir: process.cwd() });

await agent.executeTask('Create a hello world function');
```

### ClaudeReviewer

```javascript
const ClaudeReviewer = require('.ai-workspace/claude-reviewer');
const reviewer = new ClaudeReviewer(workingDir, tasksFile);

const review = await reviewer.reviewTask(task);
console.log(review.approved); // true/false
```

## Best Practices

1. **Be Specific** - Write detailed task descriptions
2. **Small Tasks** - Break large features into smaller tasks
3. **Review Suggestions** - Even approved tasks may have suggestions
4. **Monitor First** - Watch a few cycles before leaving it unattended
5. **Git Commits** - Review changes with `git diff` before committing

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

## Links

- [GitHub Repository](https://github.com/yourusername/ai-collab-system)
- [Documentation](https://docs.ai-collab-system.dev)
- [GitHub Copilot](https://github.com/features/copilot)
- [Claude Code](https://claude.com/claude-code)

## Support

- GitHub Issues: [github.com/yourusername/ai-collab-system/issues](https://github.com/yourusername/ai-collab-system/issues)
- Discussions: [github.com/yourusername/ai-collab-system/discussions](https://github.com/yourusername/ai-collab-system/discussions)
