# Installation Guide

## Method 1: NPM Package (Recommended)

Once published to npm:

```bash
# Global installation
npm install -g @ai-collab/task-system

# Project-specific installation
npm install --save-dev @ai-collab/task-system
```

## Method 2: From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-collab-system.git
cd ai-collab-system

# Link globally
npm link

# Or use directly
node bin/init.js
```

## Method 3: Copy Files Directly

If you want to manually integrate:

1. Copy the `src/` directory to your project as `.ai-workspace/`
2. Run the files directly:
   ```bash
   node .ai-workspace/auto-watcher.js
   ```

## Verification

After installation, verify it works:

```bash
# Check version
ai-collab --version

# Or check Copilot is available
copilot --version
```

## Publishing to NPM (For Maintainers)

```bash
# Build (if needed)
npm run build

# Login to npm
npm login

# Publish
npm publish --access public
```

## Requirements

- **Node.js**: 16.0.0 or higher
- **GitHub Copilot CLI**: Required for autonomous execution
  ```bash
  # Install Copilot CLI
  # Visit: https://github.com/features/copilot

  # Verify
  copilot --version
  ```
- **Git**: Project must be a git repository
- **Claude Code** (optional): For manual task execution via CLI

## Platform Support

- ✅ macOS
- ✅ Linux
- ✅ Windows (Git Bash, WSL, PowerShell)

## Troubleshooting Installation

### Command not found

If `ai-collab` command is not found after global install:

```bash
# Check npm global bin path
npm config get prefix

# Add to PATH if needed
export PATH="$PATH:$(npm config get prefix)/bin"
```

### Permission errors

On macOS/Linux, you may need:

```bash
sudo npm install -g @ai-collab/task-system
```

Or use npx without installation:

```bash
npx @ai-collab/task-system init
```

### Windows PowerShell execution policy

If you get execution policy errors:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Updating

```bash
# Global
npm update -g @ai-collab/task-system

# Project
npm update @ai-collab/task-system
```

## Uninstallation

```bash
# Global
npm uninstall -g @ai-collab/task-system

# Project
npm uninstall @ai-collab/task-system

# Clean up
rm -rf .ai-workspace/
```

## Next Steps

After installation:

1. Read [Quick Start](./QUICKSTART.md)
2. Initialize in your project: `ai-collab init`
3. Start the watcher: `ai-collab start`
4. Create your first task!
