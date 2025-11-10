# MCP Server Setup Guide for Survey Aggregator

This guide will help you set up recommended MCP (Model Context Protocol) servers to enhance your development workflow.

## 🎯 Recommended MCP Servers

### 1. **File System MCP** ⭐ **MOST IMPORTANT**
- **Purpose**: Direct file system access for CSV processing, file operations
- **Benefits**: 
  - Read/write CSV files directly
  - Inspect sample data files
  - Generate test data
  - Modify configuration files

### 2. **Git MCP** ⭐ **HIGHLY RECOMMENDED**
- **Purpose**: Version control operations
- **Benefits**:
  - View commit history
  - Check what changed
  - Create commits automatically
  - Manage branches

### 3. **GitHub MCP** (if using GitHub)
- **Purpose**: GitHub repository integration
- **Benefits**:
  - Create pull requests
  - Manage branches
  - Search code
  - View issues

### 4. **Browser Tools MCP** (Already Available)
- **Status**: ✅ Already configured
- **Note**: This is the browser extension you're currently using

## 📋 Installation Steps

### Method 1: One-Click Installation (Recommended)

1. **Open Cursor Settings**:
   - Press `Ctrl+,` (or `Cmd+,` on Mac)
   - Navigate to `Features` > `MCP`

2. **Browse Available Servers**:
   - Look for "File System MCP" and "Git MCP"
   - Click "Add to Cursor" for each server you want

3. **Authorize Access** (if required):
   - Some servers may require authentication
   - Follow the prompts to authorize

### Method 2: Manual Configuration

If one-click installation isn't available, you can manually configure MCP servers:

1. **Open Cursor Settings**:
   - Press `Ctrl+,`
   - Navigate to `Features` > `MCP`
   - Click "+ Add New MCP Server"

2. **Configure File System MCP**:
   - **Name**: `filesystem`
   - **Command**: `npx`
   - **Arguments**: `-y @modelcontextprotocol/server-filesystem`
   - **Environment Variables**: (none required)
   - Click **Save**

3. **Configure Git MCP** (Optional):
   - **Name**: `git`
   - **Command**: `npx`
   - **Arguments**: `-y @modelcontextprotocol/server-git`
   - **Environment Variables**: (none required)
   - Click **Save**

4. **Configure GitHub MCP** (Optional, if using GitHub):
   - **Name**: `github`
   - **Command**: `npx`
   - **Arguments**: `-y @modelcontextprotocol/server-github`
   - **Environment Variables**:
     - `GITHUB_PERSONAL_ACCESS_TOKEN`: Your GitHub token
     - (Get token from: GitHub Settings > Developer settings > Personal access tokens)
   - Click **Save**

## 🔧 Verification

After installation, you can verify MCP servers are working by:

1. **Check MCP Status**:
   - Go to `Cursor Settings` > `Features` > `MCP`
   - You should see your installed servers listed

2. **Test in Chat**:
   - Ask me to "read a CSV file" (tests File System MCP)
   - Ask me to "check git status" (tests Git MCP)

## 🚨 Security Notes

- **File System MCP**: Only grants access to files within your project directory
- **Git MCP**: Only performs git operations, no external access
- **GitHub MCP**: Requires a personal access token with appropriate permissions

## 📝 Next Steps

Once MCPs are installed:
1. I'll be able to read/write CSV files directly
2. I can check git status and create commits
3. I can interact with GitHub (if configured)
4. Development workflow will be significantly enhanced

## ❓ Troubleshooting

If MCP servers don't appear:
1. Restart Cursor
2. Check that Node.js is installed (`node --version`)
3. Verify npm is available (`npm --version`)
4. Check Cursor's MCP logs in Settings > Features > MCP

---

**Note**: The Browser Tools MCP is already configured and working. The File System and Git MCPs are the most important additions for your workflow.

