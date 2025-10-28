# AI Collaboration System

**🔄 BIDIRECTIONAL autonomous AI collaboration - Claude Code + GitHub Copilot working together**

A file-based task queue system that enables Claude Code and GitHub Copilot to work together autonomously on your codebase with **mutual code review** and iterative improvements. Both AIs can execute tasks AND review each other's work!

## Features

- 🔄 **Bidirectional Collaboration** - Both AIs execute AND review each other's work
- 🤖 **Autonomous Execution** - Copilot executes tasks automatically without manual intervention
- 🔍 **Dual Code Review** - Claude reviews Copilot's work, Copilot reviews Claude's work
- ♻️ **Iterative Improvement** - Auto-creates follow-up tasks until BOTH AIs approve the code
- 📋 **Task Queue System** - Simple JSON-based task queue for coordination
- 🛡️ **Quality Assurance** - Catches syntax errors, missing imports, and code quality issues
- ⚙️ **Configurable** - Adjust review strictness and workflow to your needs
- 🚫 **Loop Prevention** - Built-in safeguards against infinite task loops

## How It Works

**Copilot Flow:**
```
You create task → Copilot executes → Claude reviews →
  ✅ Approved → Done!
  ⚠️ Issues → Creates fix tasks → Copilot fixes → Review again
```

**Claude Flow:**
```
You create task → Claude executes → Copilot reviews →
  ✅ Approved → Done!
  ⚠️ Issues → Creates fix tasks → Claude fixes → Review again
```

**Both AIs collaborate and iterate until the code meets quality standards! ✅**

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

### Task Assignment (Bidirectional)

- `assignedTo: "copilot"` - Copilot executes automatically → **Claude reviews**
- `assignedTo: "claude"` - You execute via Claude Code CLI → **Copilot reviews**
- `assignedTo: "any"` - Either AI can handle it

**Key Point:** Regardless of who executes, the OTHER AI will review! This creates a bidirectional quality assurance system.

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
    "maxFollowUpTasks": 5,
    "delayBeforeReview": 2000
  },
  "claudeReviewer": {
    "enabled": true,
    "reviewCopilotTasks": true,
    "createFollowUpTasks": true
  },
  "copilotReviewer": {
    "enabled": true,
    "reviewClaudeTasks": true,
    "createFollowUpTasks": true,
    "detailedReview": true
  },
  "watcher": {
    "interval": 2000,
    "enableAutoReview": true,
    "enableBidirectionalReview": true
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

## 🔄 Bidirectional Workflow

### How Bidirectional Review Works

1. **Copilot executes** → **Claude reviews** → **Copilot fixes** → **Repeat until approved**
2. **Claude executes** → **Copilot reviews** → **Claude fixes** → **Repeat until approved**

### Example: Claude Task with Copilot Review

**Step 1:** Create a task for Claude:
```json
{
  "id": "task-001",
  "title": "Implement user authentication",
  "description": "Create JWT-based authentication with login/logout",
  "assignedTo": "claude",
  "status": "pending",
  "files": ["lib/auth.ts"]
}
```

**Step 2:** Execute the task using Claude Code CLI

**Step 3:** Mark the task as completed in `tasks.json`:
```json
{
  "id": "task-001",
  "status": "completed",
  "result": "Authentication implemented with JWT tokens"
}
```

**Step 4:** Copilot automatically reviews Claude's work!
- ✅ If approved: Task marked as `verified`
- ⚠️ If issues found: Copilot creates follow-up tasks for Claude to fix

**Step 5:** Fix any issues and repeat until Copilot approves

### Example: Copilot Task with Claude Review

**Step 1:** Create a task for Copilot:
```json
{
  "id": "task-002",
  "title": "Create login form component",
  "description": "Build a React login form with email and password",
  "assignedTo": "copilot",
  "status": "pending",
  "files": ["components/LoginForm.tsx"]
}
```

**Step 2:** Copilot automatically executes the task

**Step 3:** Claude automatically reviews Copilot's work!
- ✅ If approved: Task marked as `verified`
- ⚠️ If issues found: Claude creates follow-up tasks for Copilot to fix

**Step 4:** Copilot automatically fixes issues until Claude approves

### Benefits of Bidirectional Review

- 📊 **Double Quality Check** - Two different AI perspectives on every piece of code
- 🔍 **Complementary Strengths** - Claude catches what Copilot misses and vice versa
- 🎯 **Reduced Errors** - Higher confidence in code quality
- 🔄 **Continuous Improvement** - Both AIs learn from each other's feedback
- ⚡ **Flexible Workflow** - Choose the best AI for each specific task

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
│   ├── auto-watcher.js         # Main orchestrator (bidirectional)
│   ├── copilot-agent.js        # Copilot execution wrapper
│   ├── claude-reviewer.js      # Claude reviews Copilot's work
│   ├── copilot-reviewer.js     # Copilot reviews Claude's work (NEW!)
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

Reviews Copilot's completed tasks:

```javascript
const ClaudeReviewer = require('.ai-workspace/claude-reviewer');
const reviewer = new ClaudeReviewer(workingDir, tasksFile);

const review = await reviewer.reviewTask(task);
console.log(review.approved); // true/false
console.log(review.issues);   // Array of issues found
console.log(review.suggestions); // Array of suggestions
```

### CopilotReviewer (NEW!)

Reviews Claude's completed tasks:

```javascript
const CopilotReviewer = require('.ai-workspace/copilot-reviewer');
const reviewer = new CopilotReviewer(workingDir, tasksFile);

const review = await reviewer.reviewTask(task);
console.log(review.approved); // true/false
console.log(review.issues);   // Array of issues found
console.log(review.suggestions); // Array of suggestions
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
