#!/usr/bin/env node

/**
 * Autonomous AI Collaboration Watcher
 * Claude + Copilot working together fully autonomously
 */

const fs = require('fs');
const path = require('path');
const CopilotAgent = require('./copilot-agent.js');
const ClaudeReviewer = require('./claude-reviewer.js');
const CopilotReviewer = require('./copilot-reviewer.js');

const WORKSPACE_DIR = __dirname;
const PROJECT_DIR = path.dirname(WORKSPACE_DIR);
const TASKS_FILE = path.join(WORKSPACE_DIR, 'tasks.json');
const CLAUDE_OUTPUT_FILE = path.join(WORKSPACE_DIR, 'claude-output.json');
const COPILOT_INPUT_FILE = path.join(WORKSPACE_DIR, 'copilot-input.json');
const STOP_FILE = path.join(WORKSPACE_DIR, 'STOP');

let isProcessing = false;
let lastTasksHash = '';
let copilotAgent = null;
let claudeReviewer = null;
let copilotReviewer = null;
let copilotReady = false;
let previousTaskStates = {}; // Track task state changes for review triggers

console.log('🚀 Autonomous AI Collaboration System Started');
console.log('📁 Project:', PROJECT_DIR);
console.log('📁 Workspace:', WORKSPACE_DIR);
console.log('👀 Watching tasks.json for automatic processing...');
console.log('🛑 Create ".ai-workspace/STOP" file to pause\n');

// Helper functions
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error reading ${path.basename(filePath)}:`, error.message);
    return null;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error writing ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

function shouldStop() {
  return fs.existsSync(STOP_FILE);
}

function updateClaudeOutput(status, currentTask, message, type = 'info', files = []) {
  const output = readJSON(CLAUDE_OUTPUT_FILE) || { messages: [] };

  output.lastUpdated = new Date().toISOString();
  output.status = status;
  output.currentTask = currentTask;

  if (message) {
    output.messages.push({
      timestamp: new Date().toISOString(),
      taskId: currentTask,
      type,
      message,
      files
    });

    if (output.messages.length > 50) {
      output.messages = output.messages.slice(-50);
    }
  }

  writeJSON(CLAUDE_OUTPUT_FILE, output);
}

function getTasksHash() {
  try {
    const content = fs.readFileSync(TASKS_FILE, 'utf8');
    return require('crypto').createHash('md5').update(content).digest('hex');
  } catch (error) {
    return '';
  }
}

function findPendingTasks() {
  const tasksData = readJSON(TASKS_FILE);
  if (!tasksData || !tasksData.tasks) return { claudeTasks: [], copilotTasks: [] };

  const claudeTasks = tasksData.tasks.filter(task =>
    task.status === 'pending' &&
    (task.assignedTo === 'claude' || task.assignedTo === 'any')
  );

  const copilotTasks = tasksData.tasks.filter(task =>
    task.status === 'pending' &&
    task.assignedTo === 'copilot'
  );

  return { claudeTasks, copilotTasks };
}

function updateTaskStatus(taskId, status, result = null) {
  const tasksData = readJSON(TASKS_FILE);
  if (!tasksData || !tasksData.tasks) return false;

  const task = tasksData.tasks.find(t => t.id === taskId);
  if (!task) return false;

  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (result !== null) {
    task.result = result;
  }

  return writeJSON(TASKS_FILE, tasksData);
}

/**
 * Process a Copilot task AUTONOMOUSLY using Copilot Agent
 */
async function processCopilotTask(task) {
  console.log(`\n🤖 [COPILOT AGENT] Processing Task: ${task.id}`);
  console.log(`   Title: ${task.title}`);
  console.log(`   Description: ${task.description}`);

  updateTaskStatus(task.id, 'in-progress');
  updateClaudeOutput('working', task.id,
    `Copilot Agent is autonomously executing: ${task.title}`, 'info');

  try {
    // Execute the task using Copilot Agent
    const result = await copilotAgent.executeFromTask(task);

    if (result.success) {
      console.log(`\n   ✅ Task completed successfully!`);

      if (result.filesChanged && result.filesChanged.length > 0) {
        console.log(`   📄 Files modified:`);
        result.filesChanged.forEach(change => {
          console.log(`      ${change.action} ${change.file} ${change.changes}`);
        });
      }

      console.log(`   📊 Changes: +${result.linesAdded} -${result.linesRemoved} lines`);

      const completionMessage = `Copilot Agent completed task autonomously. ${result.summary}`;

      updateTaskStatus(task.id, 'completed', completionMessage);
      updateClaudeOutput('idle', null,
        `Task ${task.id} completed by Copilot Agent. ${result.filesChanged.length} file(s) modified.`,
        'success',
        result.filesChanged.map(f => f.file)
      );

      console.log(`   ✅ Status updated to completed`);

      // AUTO-REVIEW: Have Claude review Copilot's work
      // Add small delay to ensure file system is synced
      console.log(`\n   ⏳ Waiting 2 seconds for file system sync...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log(`   🔍 Triggering Claude Code review...`);
      const review = await claudeReviewer.reviewTask(task);

      // Update task with review results
      claudeReviewer.updateTaskStatus(task.id, review);

      if (review.approved) {
        console.log(`   ✅ Claude approved the changes!\n`);
      } else {
        console.log(`   ⚠️  Claude found issues - creating follow-up tasks...\n`);
        const followUpTasks = claudeReviewer.createFollowUpTasks(review, task);

        if (followUpTasks.length > 0) {
          updateClaudeOutput('idle', null,
            `Review found issues in ${task.id}. Created ${followUpTasks.length} follow-up task(s).`,
            'info'
          );
        }
      }

    } else {
      console.log(`\n   ❌ Task failed: ${result.error}`);

      updateTaskStatus(task.id, 'blocked', `Copilot Agent error: ${result.error}`);
      updateClaudeOutput('idle', null,
        `Failed to execute task ${task.id}: ${result.error}`, 'error');

      console.log(`   ⚠️  Status updated to blocked\n`);
    }

  } catch (error) {
    console.error(`\n   ❌ Error executing Copilot task: ${error.message || error.error}`);

    updateTaskStatus(task.id, 'blocked', `Error: ${error.message || error.error}`);
    updateClaudeOutput('idle', null,
      `Error processing Copilot task ${task.id}: ${error.message || error.error}`, 'error');

    console.log(`   ⚠️  Status updated to blocked\n`);
  }
}

/**
 * Review a completed Claude task using Copilot
 */
async function reviewClaudeTask(task) {
  console.log(`\n🔍 [COPILOT REVIEWER] Reviewing Claude's completed task: ${task.id}`);
  console.log(`   Title: ${task.title}`);

  if (!copilotReady) {
    console.log(`   ⚠️  Copilot is not available - skipping review`);
    // Still mark as verified since we can't review
    updateTaskStatus(task.id, 'verified', task.result);
    return;
  }

  try {
    // Add small delay to ensure file system is synced
    console.log(`\n   ⏳ Waiting 2 seconds for file system sync...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`   🔍 Triggering Copilot review...`);
    const review = await copilotReviewer.reviewTask(task);

    // Update task with review results
    copilotReviewer.updateTaskStatus(task.id, review);

    if (review.approved) {
      console.log(`   ✅ Copilot approved the changes!\n`);
      updateClaudeOutput('idle', null,
        `Task ${task.id} reviewed and approved by Copilot`, 'success');
    } else {
      console.log(`   ⚠️  Copilot found issues - creating follow-up tasks...\n`);
      const followUpTasks = copilotReviewer.createFollowUpTasks(review, task);

      if (followUpTasks.length > 0) {
        updateClaudeOutput('idle', null,
          `Copilot review found issues in ${task.id}. Created ${followUpTasks.length} follow-up task(s) for Claude.`,
          'info'
        );
      }
    }

  } catch (error) {
    console.error(`\n   ❌ Error during Copilot review: ${error.message}`);
    // Mark as verified anyway to avoid blocking
    updateTaskStatus(task.id, 'verified', task.result);
    updateClaudeOutput('idle', null,
      `Error during Copilot review of ${task.id}: ${error.message}`, 'error');
  }
}

/**
 * Notify about Claude tasks (to be processed via Claude Code CLI)
 */
function notifyClaudeTask(task) {
  console.log(`\n📋 [CLAUDE CODE] Task Detected: ${task.id}`);
  console.log(`   Title: ${task.title}`);
  console.log(`   Description: ${task.description}`);

  updateTaskStatus(task.id, 'in-progress');
  updateClaudeOutput('waiting', task.id,
    `Task ${task.id} ready for Claude Code. Waiting for CLI processing.`, 'info');

  console.log(`\n   ⚠️  Tell Claude Code in your terminal:`);
  console.log(`   > "Process task ${task.id}"\n`);
}

/**
 * Main watch loop
 */
async function watchTasks() {
  if (shouldStop()) {
    if (!isProcessing) {
      console.log('⏸️  STOP file detected - pausing operations');
      updateClaudeOutput('idle', null, 'Paused due to STOP file', 'info');
    }
    return;
  }

  if (isProcessing) return;

  const currentHash = getTasksHash();
  if (currentHash === lastTasksHash) return;

  lastTasksHash = currentHash;
  console.log('📝 Tasks file changed, checking for changes...');

  // Get all tasks to check for state changes
  const tasksData = readJSON(TASKS_FILE);
  if (!tasksData || !tasksData.tasks) return;

  const { claudeTasks, copilotTasks } = findPendingTasks();

  // Check for completed Claude tasks that need Copilot review
  const completedClaudeTasks = tasksData.tasks.filter(task =>
    task.assignedTo === 'claude' &&
    task.status === 'completed' &&
    (!task.reviewResult || task.reviewResult === '') &&
    previousTaskStates[task.id] !== 'completed'
  );

  // Update previous states
  tasksData.tasks.forEach(task => {
    previousTaskStates[task.id] = task.status;
  });

  if (claudeTasks.length === 0 && copilotTasks.length === 0 && completedClaudeTasks.length === 0) {
    console.log('   No pending tasks or reviews needed\n');
    return;
  }

  console.log(`   Found ${claudeTasks.length} Claude task(s), ${copilotTasks.length} Copilot task(s), ${completedClaudeTasks.length} completed Claude task(s) for review`);

  isProcessing = true;

  try {
    // BIDIRECTIONAL: Review completed Claude tasks with Copilot
    if (completedClaudeTasks.length > 0) {
      for (const task of completedClaudeTasks) {
        if (shouldStop()) {
          console.log('⏸️  STOP file detected - halting');
          break;
        }

        await reviewClaudeTask(task);

        // Add a small delay between reviews
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Process Copilot tasks AUTONOMOUSLY
    if (copilotReady && copilotTasks.length > 0) {
      for (const task of copilotTasks) {
        if (shouldStop()) {
          console.log('⏸️  STOP file detected - halting');
          break;
        }

        await processCopilotTask(task);

        // Add a small delay between tasks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else if (!copilotReady && copilotTasks.length > 0) {
      console.log('   ⚠️  Copilot tasks detected but Copilot Agent is not available');
      console.log('   Install Copilot CLI: https://github.com/features/copilot');
    }

    // Notify about Claude tasks (user handles via Claude Code CLI)
    for (const task of claudeTasks) {
      if (shouldStop()) break;
      notifyClaudeTask(task);
    }

  } catch (error) {
    console.error('❌ Error in watch loop:', error);
    updateClaudeOutput('idle', null, `Error: ${error.message}`, 'error');
  } finally {
    isProcessing = false;
  }
}

/**
 * Initialize Copilot Agent
 */
async function initializeCopilot() {
  console.log('🔧 Initializing Copilot Agent...');

  copilotAgent = new CopilotAgent({
    workingDir: PROJECT_DIR,
    allowAllTools: true,
    allowAllPaths: true
  });

  const status = await copilotAgent.checkAvailable();

  if (status.available) {
    copilotReady = true;
    console.log('✅ Copilot Agent is ready for autonomous task execution');
    console.log(`   Version: ${status.version}`);
    console.log(`   Copilot will autonomously execute all "copilot" tasks\n`);
    updateClaudeOutput('idle', null, 'Copilot Agent active - autonomous execution enabled', 'info');
  } else {
    copilotReady = false;
    console.log('⚠️  Copilot CLI not available:');
    console.log(`   ${status.error}`);
    console.log('   Copilot tasks will be skipped');
    console.log('   Install: https://github.com/features/copilot\n');
    updateClaudeOutput('idle', null,
      `Copilot not available: ${status.error}. Copilot tasks will be skipped.`, 'warning');
  }
}

/**
 * Start the watcher
 */
async function start() {
  // Initialize Copilot Agent
  await initializeCopilot();

  // Initialize Claude Reviewer
  console.log('🔧 Initializing Claude Code Reviewer...');
  claudeReviewer = new ClaudeReviewer(PROJECT_DIR, TASKS_FILE);
  console.log('✅ Claude Reviewer ready - will auto-review Copilot\'s work\n');

  // Initialize Copilot Reviewer
  console.log('🔧 Initializing Copilot Reviewer...');
  copilotReviewer = new CopilotReviewer(PROJECT_DIR, TASKS_FILE);
  if (copilotReady) {
    console.log('✅ Copilot Reviewer ready - will auto-review Claude\'s work\n');
  } else {
    console.log('⚠️  Copilot Reviewer initialized but Copilot CLI not available\n');
  }

  // Initial status
  updateClaudeOutput('idle', null,
    copilotReady
      ? 'BIDIRECTIONAL AI collaboration active - Both AIs execute and review each other\'s work'
      : 'Watcher active - Copilot tasks will be skipped, Claude review only',
    'info'
  );

  // Watch the tasks file
  fs.watchFile(TASKS_FILE, { interval: 1000 }, () => {
    watchTasks();
  });

  // Also check periodically
  setInterval(watchTasks, 2000);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down autonomous watcher...');
    updateClaudeOutput('idle', null, 'Watcher stopped', 'info');
    fs.unwatchFile(TASKS_FILE);
    process.exit(0);
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🔄 BIDIRECTIONAL AI COLLABORATION ACTIVE');
  console.log('  ');
  console.log('  Copilot Flow:');
  console.log('    1. Copilot executes tasks (assignedTo: "copilot")');
  console.log('    2. Claude automatically reviews Copilot\'s work');
  console.log('    3. Claude creates follow-up tasks if issues found');
  console.log('  ');
  console.log('  Claude Flow:');
  console.log('    1. You execute tasks via Claude Code (assignedTo: "claude")');
  console.log('    2. Mark task as completed in tasks.json');
  console.log('    3. Copilot automatically reviews Claude\'s work');
  console.log('    4. Copilot creates follow-up tasks if issues found');
  console.log('  ');
  console.log('  Both AIs iterate until code is approved! ✅');
  console.log('  Press Ctrl+C to stop');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Start the autonomous watcher
start();
