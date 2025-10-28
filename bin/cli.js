#!/usr/bin/env node

/**
 * AI Collaboration System - CLI Tool
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const command = process.argv[2];
const workspaceDir = path.join(process.cwd(), '.ai-workspace');

function showHelp() {
  console.log(`
AI Collaboration System - CLI

Usage: ai-collab <command> [options]

Commands:
  init              Initialize the system in current project
  start             Start the watcher
  stop              Stop the watcher (creates STOP file)
  resume            Resume the watcher (removes STOP file)
  status            Show current status
  create-task       Create a new task
  logs              View execution logs
  help              Show this help

Examples:
  ai-collab init
  ai-collab start
  ai-collab create-task --title "Add login page" --assignedTo copilot
  ai-collab logs --tail 20
`);
}

function checkWorkspace() {
  if (!fs.existsSync(workspaceDir)) {
    console.error('❌ Error: .ai-workspace not found');
    console.error('   Run: ai-collab init');
    process.exit(1);
  }
}

function startWatcher() {
  checkWorkspace();
  console.log('🚀 Starting AI Collaboration System...');
  const watcherPath = path.join(workspaceDir, 'auto-watcher.js');
  const child = spawn('node', [watcherPath], {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  child.on('error', (error) => {
    console.error('❌ Failed to start watcher:', error.message);
    process.exit(1);
  });
}

function stopWatcher() {
  checkWorkspace();
  const stopFile = path.join(workspaceDir, 'STOP');
  fs.writeFileSync(stopFile, '');
  console.log('⏸️  Watcher paused (STOP file created)');
  console.log('   Resume with: ai-collab resume');
}

function resumeWatcher() {
  checkWorkspace();
  const stopFile = path.join(workspaceDir, 'STOP');
  if (fs.existsSync(stopFile)) {
    fs.unlinkSync(stopFile);
    console.log('▶️  Watcher resumed (STOP file removed)');
  } else {
    console.log('ℹ️  Watcher is not paused');
  }
}

function showStatus() {
  checkWorkspace();
  const tasksFile = path.join(workspaceDir, 'tasks.json');
  const outputFile = path.join(workspaceDir, 'claude-output.json');
  const stopFile = path.join(workspaceDir, 'STOP');

  const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
  const outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

  const paused = fs.existsSync(stopFile);
  const pending = tasksData.tasks.filter(t => t.status === 'pending').length;
  const inProgress = tasksData.tasks.filter(t => t.status === 'in-progress').length;
  const completed = tasksData.tasks.filter(t => t.status === 'completed').length;
  const verified = tasksData.tasks.filter(t => t.status === 'verified').length;

  console.log('\n📊 AI Collaboration System Status\n');
  console.log(`Watcher: ${paused ? '⏸️  PAUSED' : '▶️  RUNNING'}`);
  console.log(`Last Update: ${outputData.lastUpdated}`);
  console.log(`Current Status: ${outputData.status}`);
  if (outputData.currentTask) {
    console.log(`Current Task: ${outputData.currentTask}`);
  }
  console.log('\nTasks:');
  console.log(`  ⏳ Pending: ${pending}`);
  console.log(`  🔄 In Progress: ${inProgress}`);
  console.log(`  ✅ Completed: ${completed}`);
  console.log(`  ✓  Verified: ${verified}`);
  console.log(`  📝 Total: ${tasksData.tasks.length}\n`);
}

function createTask() {
  checkWorkspace();
  const args = process.argv.slice(3);

  let title = '';
  let description = '';
  let assignedTo = 'copilot';
  let priority = 'medium';
  let files = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--description' && args[i + 1]) {
      description = args[i + 1];
      i++;
    } else if (args[i] === '--assignedTo' && args[i + 1]) {
      assignedTo = args[i + 1];
      i++;
    } else if (args[i] === '--priority' && args[i + 1]) {
      priority = args[i + 1];
      i++;
    } else if (args[i] === '--files' && args[i + 1]) {
      files = args[i + 1].split(',');
      i++;
    }
  }

  if (!title) {
    console.error('❌ Error: --title is required');
    process.exit(1);
  }

  const tasksFile = path.join(workspaceDir, 'tasks.json');
  const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

  const newTaskId = tasksData.metadata.lastTaskId + 1;
  const taskIdStr = `task-${String(newTaskId).padStart(3, '0')}`;

  const newTask = {
    id: taskIdStr,
    title,
    description: description || title,
    assignedTo,
    status: 'pending',
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dependencies: [],
    files,
    context: '',
    result: null
  };

  tasksData.tasks.push(newTask);
  tasksData.metadata.lastTaskId = newTaskId;

  fs.writeFileSync(tasksFile, JSON.stringify(tasksData, null, 2));

  console.log(`✅ Created ${taskIdStr}: ${title}`);
  console.log(`   Assigned to: ${assignedTo}`);
  console.log(`   Priority: ${priority}`);
  if (files.length > 0) {
    console.log(`   Files: ${files.join(', ')}`);
  }
}

function showLogs() {
  checkWorkspace();
  const outputFile = path.join(workspaceDir, 'claude-output.json');
  const outputData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

  const args = process.argv.slice(3);
  let tail = 10;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tail' && args[i + 1]) {
      tail = parseInt(args[i + 1]);
      i++;
    }
  }

  const messages = outputData.messages.slice(-tail);

  console.log(`\n📋 Last ${messages.length} log entries:\n`);
  messages.forEach(msg => {
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const icon = msg.type === 'error' ? '❌' : msg.type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${time}] ${icon} ${msg.message}`);
    if (msg.taskId) {
      console.log(`           Task: ${msg.taskId}`);
    }
  });
  console.log();
}

// Main command router
switch (command) {
  case 'init':
    require('./init.js');
    break;
  case 'start':
    startWatcher();
    break;
  case 'stop':
    stopWatcher();
    break;
  case 'resume':
    resumeWatcher();
    break;
  case 'status':
    showStatus();
    break;
  case 'create-task':
    createTask();
    break;
  case 'logs':
    showLogs();
    break;
  case 'help':
  case undefined:
    showHelp();
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
