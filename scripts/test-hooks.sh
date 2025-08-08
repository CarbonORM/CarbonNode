#!/bin/bash

# Test if Git hooks are properly configured
echo "Testing Git hooks configuration..."

# Check if Git is using the custom hooks path
HOOKS_PATH=$(git config core.hooksPath)
if [ "$HOOKS_PATH" == ".githooks" ]; then
  echo "✅ Git is correctly configured to use hooks from .githooks directory"
else
  echo "❌ Git is not using the .githooks directory. Current hooksPath: $HOOKS_PATH"
  echo "Running: git config core.hooksPath .githooks"
  git config core.hooksPath .githooks
  echo "Hooks path is now set to: $(git config core.hooksPath)"
fi

# Check if the hook files are executable
if [ -x ".githooks/pre-push" ]; then
  echo "✅ pre-push hook is executable"
else
  echo "❌ pre-push hook is not executable"
  echo "Running: chmod +x .githooks/pre-push"
  chmod +x .githooks/pre-commit
fi

if [ -x ".githooks/post-push" ]; then
  echo "✅ post-push hook is executable"
else
  echo "❌ post-push hook is not executable"
  echo "Running: chmod +x .githooks/post-push"
  chmod +x .githooks/post-push
fi

echo "Git hooks configuration test completed."