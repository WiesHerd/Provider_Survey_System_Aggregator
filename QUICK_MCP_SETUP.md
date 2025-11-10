# Quick MCP Setup - Copy & Paste Instructions

## 🚀 Fast Setup (5 minutes)

### Step 1: Open Cursor MCP Settings
1. Press `Ctrl+,` (or `Cmd+,` on Mac) to open Settings
2. Navigate to **Features** > **MCP**
3. Click **"+ Add New MCP Server"**

### Step 2: Add File System MCP (Most Important)

**Configuration:**
- **Name**: `filesystem`
- **Command**: `npx`
- **Arguments**: `-y @modelcontextprotocol/server-filesystem`
- **Environment Variables**: (leave empty)

Click **Save**

### Step 3: Verify Installation
1. Restart Cursor
2. Ask me: "Can you read the package.json file?"
3. If I can read it, File System MCP is working! ✅

## 📋 What This Enables

Once File System MCP is installed, I can:
- ✅ Read/write CSV files directly
- ✅ Inspect your sample data files
- ✅ Generate test data
- ✅ Modify configuration files
- ✅ Work with your project files more efficiently

## 🔧 Optional: Git MCP

If you want Git integration:

**Configuration:**
- **Name**: `git`
- **Command**: `npx`
- **Arguments**: `-y @modelcontextprotocol/server-git`
- **Environment Variables**: (leave empty)

This enables me to:
- Check git status
- View commit history
- Create commits (with your approval)

## ❓ Troubleshooting

**If MCP doesn't work:**
1. Make sure Node.js is installed: `node --version`
2. Make sure npm is available: `npm --version`
3. Restart Cursor after adding MCP servers
4. Check MCP status in Settings > Features > MCP

**If you see errors:**
- Check that `npx` is available in your PATH
- Try running `npx -y @modelcontextprotocol/server-filesystem` in terminal to test

---

**That's it!** Once File System MCP is set up, your development workflow will be significantly enhanced.




