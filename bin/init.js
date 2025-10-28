#!/usr/bin/env node

/**
 * AI Collaboration System - Initialization Script
 * Sets up the system in a new project
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.cwd();
const workspaceDir = path.join(targetDir, '.ai-workspace');

console.log('🚀 Initializing AI Collaboration System...');
console.log('📁 Target directory:', targetDir);

// Create .ai-workspace directory
if (!fs.existsSync(workspaceDir)) {
  fs.mkdirSync(workspaceDir, { recursive: true });
  console.log('✅ Created .ai-workspace directory');
} else {
  console.log('ℹ️  .ai-workspace directory already exists');
}

// Copy core files
const sourceDir = path.join(__dirname, '..', 'src');
const filesToCopy = [
  'copilot-agent.js',
  'claude-reviewer.js',
  'auto-watcher.js'
];

filesToCopy.forEach(file => {
  const source = path.join(sourceDir, file);
  const target = path.join(workspaceDir, file);

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`✅ Installed ${file}`);
  } else {
    console.error(`❌ Warning: ${file} not found in package`);
  }
});

// Create tasks.json template
const tasksTemplate = {
  tasks: [
    {
      id: 'example-001',
      title: 'Example: Review project structure',
      description: 'This is an example task. Delete it and create your own tasks.',
      assignedTo: 'any',
      status: 'pending',
      priority: 'low',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dependencies: [],
      files: [],
      context: 'Example task to demonstrate the system.',
      result: null
    }
  ],
  metadata: {
    lastTaskId: 1,
    version: '1.0.0'
  }
};

const tasksFile = path.join(workspaceDir, 'tasks.json');
if (!fs.existsSync(tasksFile)) {
  fs.writeFileSync(tasksFile, JSON.stringify(tasksTemplate, null, 2));
  console.log('✅ Created tasks.json');
} else {
  console.log('ℹ️  tasks.json already exists (keeping existing file)');
}

// Create config.json
const configTemplate = {
  review: {
    checkSyntax: true,
    checkQuality: true,
    failOnConsoleLog: false,
    requireExports: true,
    maxFollowUpTasks: 5,
    delayBeforeReview: 2000
  },
  copilot: {
    allowAllTools: true,
    allowAllPaths: true
  },
  watcher: {
    interval: 2000,
    enableAutoReview: true
  }
};

const configFile = path.join(workspaceDir, 'config.json');
if (!fs.existsSync(configFile)) {
  fs.writeFileSync(configFile, JSON.stringify(configTemplate, null, 2));
  console.log('✅ Created config.json');
} else {
  console.log('ℹ️  config.json already exists (keeping existing file)');
}

// Create claude-output.json
const outputTemplate = {
  lastUpdated: new Date().toISOString(),
  status: 'idle',
  currentTask: null,
  messages: []
};

const outputFile = path.join(workspaceDir, 'claude-output.json');
if (!fs.existsSync(outputFile)) {
  fs.writeFileSync(outputFile, JSON.stringify(outputTemplate, null, 2));
  console.log('✅ Created claude-output.json');
}

// Create .gitignore for .ai-workspace
const gitignoreContent = `# AI Collaboration System
claude-output.json
STOP
*.log
`;

const gitignoreFile = path.join(workspaceDir, '.gitignore');
if (!fs.existsSync(gitignoreFile)) {
  fs.writeFileSync(gitignoreFile, gitignoreContent);
  console.log('✅ Created .gitignore');
}

// Create README
const readmeContent = `# AI Collaboration Workspace

This directory contains the AI collaboration system files.

## Files

- \`tasks.json\` - Task queue for Claude and Copilot
- \`auto-watcher.js\` - Main orchestrator (watches tasks and executes)
- \`copilot-agent.js\` - Copilot CLI wrapper
- \`claude-reviewer.js\` - Code review agent
- \`config.json\` - System configuration
- \`claude-output.json\` - Execution logs
- \`STOP\` - Create this file to pause the watcher

## Usage

### Start the watcher:
\`\`\`bash
node .ai-workspace/auto-watcher.js
\`\`\`

### Create a task:
Edit \`tasks.json\` and add a new task object.

### Pause the watcher:
\`\`\`bash
touch .ai-workspace/STOP
\`\`\`

### Resume:
\`\`\`bash
rm .ai-workspace/STOP
\`\`\`

## Documentation

See the main README for full documentation.
`;

const readmeFile = path.join(workspaceDir, 'README.md');
if (!fs.existsSync(readmeFile)) {
  fs.writeFileSync(readmeFile, readmeContent);
  console.log('✅ Created README.md');
}

console.log('\n✨ Initialization complete!\n');
console.log('📋 Next steps:');
console.log('   1. Start the watcher: node .ai-workspace/auto-watcher.js');
console.log('   2. Create tasks in .ai-workspace/tasks.json');
console.log('   3. Watch Copilot and Claude collaborate!\n');
console.log('📚 Documentation: .ai-workspace/README.md\n');
