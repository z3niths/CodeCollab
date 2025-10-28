#!/usr/bin/env node

/**
 * Claude Code Review Agent
 * Reviews Copilot's completed tasks and creates follow-up tasks if needed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ClaudeReviewer {
  constructor(workingDir, tasksFile) {
    this.workingDir = workingDir;
    this.tasksFile = tasksFile;
  }

  /**
   * Review a completed Copilot task
   * @param {object} task - The completed task to review
   * @returns {object} - Review result with approval status and issues found
   */
  async reviewTask(task) {
    console.log(`\n📋 [CLAUDE REVIEWER] Reviewing Task: ${task.id}`);
    console.log(`   Title: ${task.title}`);

    const review = {
      taskId: task.id,
      approved: false,
      issues: [],
      suggestions: [],
      followUpTasks: [],
      summary: ''
    };

    try {
      // Step 1: Check if files were actually modified
      const filesChanged = await this.getChangedFiles();

      if (filesChanged.length === 0) {
        review.issues.push('No files were modified - task may have failed silently');
        review.approved = false;
        review.summary = 'No file changes detected';
        return review;
      }

      console.log(`   📄 Files changed: ${filesChanged.join(', ')}`);

      // Step 2: Check for syntax/compile errors
      const syntaxCheck = await this.checkSyntax(task.files);
      if (!syntaxCheck.passed) {
        review.issues.push(...syntaxCheck.errors);
        review.followUpTasks.push({
          title: `Fix syntax errors in ${task.files[0]}`,
          description: `Fix the following errors:\n${syntaxCheck.errors.join('\n')}`,
          priority: 'high'
        });
      }

      // Step 3: Review the actual code changes
      const codeReview = await this.reviewCodeChanges(task.files);
      review.issues.push(...codeReview.issues);
      review.suggestions.push(...codeReview.suggestions);

      // Step 4: Check if task requirements were met
      const requirementCheck = await this.checkRequirements(task);
      if (!requirementCheck.met) {
        review.issues.push(...requirementCheck.missing);
        review.followUpTasks.push({
          title: `Complete remaining requirements for ${task.title}`,
          description: `Missing: ${requirementCheck.missing.join(', ')}`,
          priority: 'medium'
        });
      }

      // Step 5: Determine approval
      review.approved = review.issues.length === 0;
      review.summary = review.approved
        ? '✅ Code review passed - looks good!'
        : `⚠️ Found ${review.issues.length} issue(s) - follow-up needed`;

      console.log(`   ${review.summary}`);

      if (review.issues.length > 0) {
        console.log(`   Issues found:`);
        review.issues.forEach(issue => console.log(`     - ${issue}`));
      }

      if (review.suggestions.length > 0) {
        console.log(`   Suggestions:`);
        review.suggestions.forEach(sug => console.log(`     - ${sug}`));
      }

    } catch (error) {
      review.issues.push(`Review error: ${error.message}`);
      review.approved = false;
      review.summary = `Review failed: ${error.message}`;
    }

    return review;
  }

  /**
   * Get list of changed files from git (both modified AND new files)
   */
  async getChangedFiles() {
    try {
      // Get modified files
      const modified = execSync('git diff --name-only', {
        cwd: this.workingDir,
        encoding: 'utf8'
      });

      // Get new untracked files
      const untracked = execSync('git ls-files --others --exclude-standard', {
        cwd: this.workingDir,
        encoding: 'utf8'
      });

      const allFiles = [
        ...modified.trim().split('\n').filter(f => f),
        ...untracked.trim().split('\n').filter(f => f)
      ];

      return [...new Set(allFiles)]; // Remove duplicates
    } catch (error) {
      return [];
    }
  }

  /**
   * Check for syntax/TypeScript errors
   */
  async checkSyntax(files) {
    const result = { passed: true, errors: [] };

    for (const file of files) {
      const filePath = path.join(this.workingDir, file);

      if (!fs.existsSync(filePath)) {
        result.passed = false;
        result.errors.push(`File ${file} does not exist`);
        continue;
      }

      // For TypeScript files, do basic syntax check
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');

          // Check for basic syntax issues
          if (content.includes('undefined')) {
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (line.includes('undefined') && !line.includes('!== undefined') && !line.includes('=== undefined')) {
                result.errors.push(`Line ${idx + 1}: Potential undefined value`);
              }
            });
          }

          // Check for missing imports (common issue)
          const hasImports = content.includes('import');
          const hasReactUsage = content.includes('React') || content.includes('useState') || content.includes('useEffect');

          if (hasReactUsage && !content.includes('from "react"') && !content.includes("from 'react'")) {
            result.errors.push('Missing React import');
            result.passed = false;
          }

        } catch (error) {
          result.passed = false;
          result.errors.push(`Cannot read file ${file}: ${error.message}`);
        }
      }
    }

    return result;
  }

  /**
   * Review code changes for quality
   */
  async reviewCodeChanges(files) {
    const result = { issues: [], suggestions: [] };

    for (const file of files) {
      const filePath = path.join(this.workingDir, file);

      if (!fs.existsSync(filePath)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        // Check for console.logs (should be removed in production)
        if (content.includes('console.log')) {
          result.suggestions.push(`${file}: Contains console.log statements`);
        }

        // Check for TODO comments
        if (content.includes('TODO') || content.includes('FIXME')) {
          result.suggestions.push(`${file}: Contains TODO/FIXME comments`);
        }

        // Check for proper TypeScript typing
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          if (content.includes(': any')) {
            result.suggestions.push(`${file}: Uses 'any' type - consider more specific types`);
          }
        }

        // Check for proper exports
        if (content.includes('export default function') && content.includes('Page')) {
          // Good - Next.js page component
        } else if (file.includes('page.tsx') && !content.includes('export default')) {
          result.issues.push(`${file}: Next.js page missing default export`);
        }

      } catch (error) {
        result.issues.push(`Cannot analyze ${file}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Check if task requirements were met based on description
   */
  async checkRequirements(task) {
    const result = { met: true, missing: [] };

    // Parse requirements from task description
    const description = task.description.toLowerCase();

    // Check if files exist
    for (const file of task.files) {
      const filePath = path.join(this.workingDir, file);
      if (!fs.existsSync(filePath)) {
        result.met = false;
        result.missing.push(`File ${file} was not created`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8').toLowerCase();

      // Check for specific requirements mentioned in description
      if (description.includes('typescript') && !file.endsWith('.ts') && !file.endsWith('.tsx')) {
        result.met = false;
        result.missing.push('Should use TypeScript');
      }

      if (description.includes('export') && !content.includes('export')) {
        result.met = false;
        result.missing.push('Missing exports');
      }

      if (description.includes('function') && !content.includes('function') && !content.includes('=>')) {
        result.met = false;
        result.missing.push('No function found');
      }

      // Check for specific keywords from task
      const keywords = ['dashboard', 'component', 'page', 'card', 'header'];
      keywords.forEach(keyword => {
        if (description.includes(keyword) && !content.includes(keyword)) {
          result.missing.push(`Missing ${keyword} mentioned in requirements`);
        }
      });
    }

    return result;
  }

  /**
   * Create follow-up tasks based on review
   */
  createFollowUpTasks(review, originalTask) {
    const tasks = [];
    const tasksData = JSON.parse(fs.readFileSync(this.tasksFile, 'utf8'));
    let nextTaskId = tasksData.metadata.lastTaskId + 1;

    // SAFEGUARD: Check if we're in an infinite loop
    // Count how many follow-up tasks already exist with same file
    const sameFileTaskCount = tasksData.tasks.filter(t =>
      t.files && originalTask.files &&
      t.files[0] === originalTask.files[0] &&
      t.status !== 'verified' &&
      (t.title.includes('Fix syntax errors') || t.title.includes('Complete remaining requirements'))
    ).length;

    if (sameFileTaskCount >= 5) {
      console.log(`\n   ⚠️  INFINITE LOOP DETECTED: ${sameFileTaskCount} failed attempts for ${originalTask.files[0]}`);
      console.log(`   ⚠️  Stopping follow-up task creation to prevent runaway loop`);
      console.log(`   ⚠️  Manual intervention needed - check if Copilot has permission issues`);
      return [];
    }

    review.followUpTasks.forEach(followUp => {
      const task = {
        id: `task-${String(nextTaskId).padStart(3, '0')}`,
        title: followUp.title,
        description: followUp.description,
        assignedTo: 'copilot',
        status: 'pending',
        priority: followUp.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dependencies: [originalTask.id],
        files: originalTask.files,
        context: `Follow-up from ${originalTask.id}: ${review.summary}`,
        result: null
      };

      tasks.push(task);
      nextTaskId++;
    });

    if (tasks.length > 0) {
      tasksData.tasks.push(...tasks);
      tasksData.metadata.lastTaskId = nextTaskId - 1;
      fs.writeFileSync(this.tasksFile, JSON.stringify(tasksData, null, 2));

      console.log(`\n   📝 Created ${tasks.length} follow-up task(s):`);
      tasks.forEach(t => console.log(`      - ${t.id}: ${t.title}`));
    }

    return tasks;
  }

  /**
   * Update task status based on review
   */
  updateTaskStatus(taskId, review) {
    const tasksData = JSON.parse(fs.readFileSync(this.tasksFile, 'utf8'));
    const task = tasksData.tasks.find(t => t.id === taskId);

    if (!task) return;

    if (review.approved) {
      task.status = 'verified';
      task.reviewResult = 'approved';
    } else {
      task.status = 'completed'; // Keep as completed, but with review notes
      task.reviewResult = 'needs-improvement';
    }

    task.reviewNotes = review.summary;
    task.reviewIssues = review.issues;
    task.reviewSuggestions = review.suggestions;
    task.updatedAt = new Date().toISOString();

    fs.writeFileSync(this.tasksFile, JSON.stringify(tasksData, null, 2));
  }
}

module.exports = ClaudeReviewer;
