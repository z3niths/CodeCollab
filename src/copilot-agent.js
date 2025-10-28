#!/usr/bin/env node

/**
 * GitHub Copilot Agent Integration
 * Uses the standalone `copilot` CLI to execute tasks autonomously
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class CopilotAgent {
  constructor(options = {}) {
    // Try to find copilot command - handle Windows paths
    const possiblePaths = [
      'copilot',
      '/c/Program Files/nodejs/copilot',
      'C:\\Program Files\\nodejs\\copilot.cmd',
      process.env.COPILOT_PATH
    ].filter(Boolean);

    this.copilotPath = possiblePaths[0]; // Will be validated in checkAvailable
    this.possiblePaths = possiblePaths;
    this.allowAllTools = options.allowAllTools !== false;
    this.allowAllPaths = options.allowAllPaths !== false;
    this.workingDir = options.workingDir || process.cwd();
  }

  /**
   * Check if copilot CLI is available
   */
  async checkAvailable() {
    // Try each possible path until one works
    for (const testPath of this.possiblePaths) {
      try {
        const result = await this._tryPath(testPath);
        if (result.available) {
          this.copilotPath = testPath; // Use the working path
          return result;
        }
      } catch (error) {
        // Try next path
        continue;
      }
    }

    return {
      available: false,
      error: 'copilot command not found in any standard location. Tried: ' + this.possiblePaths.join(', ')
    };
  }

  /**
   * Try a specific path for copilot
   */
  async _tryPath(testPath) {
    return new Promise((resolve) => {
      const child = spawn(testPath, ['--version'], {
        stdio: 'pipe',
        shell: true // Use shell on Windows
      });

      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ available: true, version: output.trim(), path: testPath });
        } else {
          resolve({ available: false, error: 'command failed' });
        }
      });

      child.on('error', (error) => {
        resolve({ available: false, error: error.message });
      });
    });
  }

  /**
   * Execute a task using Copilot
   * @param {string} prompt - What to ask Copilot to do
   * @param {object} options - Additional options
   * @returns {Promise<object>} - Result with output and files changed
   */
  async executeTask(prompt, options = {}) {
    return new Promise((resolve, reject) => {
      // Escape quotes in the prompt for shell execution
      const escapedPrompt = prompt.replace(/"/g, '\\"');

      // Build command as a string for shell execution
      let command = `${this.copilotPath} -p "${escapedPrompt}"`;

      // Add automation flags
      if (this.allowAllTools) {
        command += ' --allow-all-tools';
      }

      if (this.allowAllPaths) {
        command += ' --allow-all-paths';
      }

      // CRITICAL: Even with --allow-all-tools, we need EXPLICIT tool permissions
      // --allow-all-tools = "no confirmation needed"
      // But we still need to explicitly allow which tools CAN be used
      command += " --allow-tool 'write'";   // File create/edit permission
      command += " --allow-tool 'shell'";   // Shell command permission (mkdir, etc)
      command += " --allow-tool 'read'";    // File read permission

      // Add working directory to allowed directories to prevent "outside allowed directories" prompts
      command += ` --add-dir "${this.workingDir}"`;

      // Add specific directory if provided
      if (options.directory) {
        command += ` --add-dir "${options.directory}"`;
      }

      // Add specific allowed tools only if explicitly provided
      if (options.allowedTools && options.allowedTools.length > 0) {
        options.allowedTools.forEach(tool => {
          command += ` --allow-tool "${tool}"`;
        });
      }

      console.log(`\n🤖 Copilot executing: "${prompt.substring(0, 80)}..."`);
      console.log(`   Working directory: ${this.workingDir}`);
      console.log(`   Command: ${command.substring(0, 100)}...`);

      const child = spawn(command, [], {
        cwd: this.workingDir,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true // Use shell for Windows compatibility
      });

      let stdout = '';
      let stderr = '';
      let filesChanged = [];
      let linesAdded = 0;
      let linesRemoved = 0;

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        process.stdout.write(text);

        // Parse file changes from output
        const fileMatch = text.match(/✓ (Create|Edit|Update) (.+?) \(([+-]\d+)\)/);
        if (fileMatch) {
          filesChanged.push({
            action: fileMatch[1],
            file: fileMatch[2],
            changes: fileMatch[3]
          });
        }

        // Parse line counts
        const lineMatch = text.match(/(\d+) lines added, (\d+) lines removed/);
        if (lineMatch) {
          linesAdded = parseInt(lineMatch[1]);
          linesRemoved = parseInt(lineMatch[2]);
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        process.stderr.write(text);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: stdout,
            filesChanged,
            linesAdded,
            linesRemoved,
            summary: this._extractSummary(stdout)
          });
        } else {
          reject({
            success: false,
            error: stderr || 'Copilot execution failed',
            output: stdout,
            code
          });
        }
      });

      child.on('error', (error) => {
        reject({
          success: false,
          error: error.message
        });
      });

      // Close stdin immediately (non-interactive)
      child.stdin.end();
    });
  }

  /**
   * Execute a task from the task queue format
   */
  async executeFromTask(task) {
    let prompt = task.description || task.title;

    // Add context
    if (task.context) {
      prompt += `\n\nContext: ${task.context}`;
    }

    // Add file information
    if (task.files && task.files.length > 0) {
      prompt += `\n\nFiles to work on: ${task.files.join(', ')}`;
    }

    // Don't pass directory option - let Copilot work from project root
    // The allowAllPaths flag already gives it full access

    try {
      const result = await this.executeTask(prompt, {});
      return {
        success: true,
        taskId: task.id,
        ...result
      };
    } catch (error) {
      return {
        success: false,
        taskId: task.id,
        error: error.error || error.message,
        output: error.output || ''
      };
    }
  }

  /**
   * Extract summary from Copilot output
   */
  _extractSummary(output) {
    const lines = output.split('\n');
    const summaryLines = [];
    let inSummary = false;

    for (const line of lines) {
      // Look for file change indicators
      if (line.includes('✓ Create') || line.includes('✓ Edit') || line.includes('✓ Update')) {
        summaryLines.push(line.trim());
      }

      // Look for final summary
      if (line.includes('Total code changes:')) {
        summaryLines.push(line.trim());
      }
    }

    return summaryLines.join('\n') || 'Task completed';
  }
}

// CLI interface
if (require.main === module) {
  const copilot = new CopilotAgent({
    workingDir: process.cwd()
  });

  const command = process.argv[2];
  const arg = process.argv.slice(3).join(' ');

  (async () => {
    switch (command) {
      case 'check':
        console.log('Checking Copilot availability...');
        const status = await copilot.checkAvailable();
        if (status.available) {
          console.log(`✅ Copilot is available!`);
          console.log(`   Version: ${status.version}`);
        } else {
          console.log('❌ Copilot is not available:');
          console.log(`   ${status.error}`);
          process.exit(1);
        }
        break;

      case 'execute':
        if (!arg) {
          console.log('Usage: node copilot-agent.js execute "<prompt>"');
          process.exit(1);
        }
        try {
          const result = await copilot.executeTask(arg);
          console.log('\n✅ Copilot execution completed!');
          console.log(`   Files changed: ${result.filesChanged.length}`);
          console.log(`   Lines added: ${result.linesAdded}`);
          console.log(`   Lines removed: ${result.linesRemoved}`);
        } catch (error) {
          console.log('\n❌ Copilot execution failed:');
          console.log(`   ${error.error}`);
          process.exit(1);
        }
        break;

      case 'test':
        console.log('Testing Copilot with a simple task...');
        try {
          const result = await copilot.executeTask('Create a file called test.txt with the text "Hello from Copilot"');
          console.log('\n✅ Test passed!');
          console.log('   Copilot can execute tasks autonomously');
          // Clean up
          if (fs.existsSync('test.txt')) {
            fs.unlinkSync('test.txt');
            console.log('   Test file cleaned up');
          }
        } catch (error) {
          console.log('\n❌ Test failed:');
          console.log(`   ${error.error}`);
          process.exit(1);
        }
        break;

      default:
        console.log('Copilot Agent Integration\n');
        console.log('Commands:');
        console.log('  check                - Check if Copilot is available');
        console.log('  execute "<prompt>"   - Execute a task with Copilot');
        console.log('  test                 - Run a test execution');
        console.log('');
        console.log('Examples:');
        console.log('  node copilot-agent.js check');
        console.log('  node copilot-agent.js execute "create a hello world function"');
        console.log('  node copilot-agent.js test');
    }
  })().catch(error => {
    console.error('Error:', error.message || error.error);
    process.exit(1);
  });
}

module.exports = CopilotAgent;
