#!/bin/bash
# FarmPal Installer Script
# Installs Ollama with Qwen 3.5 2B model for local-first AI

set -e

echo "========================================"
echo "  FarmPal Installer"
echo "========================================"
echo ""

# Check for existing Ollama installation
if command -v ollama &> /dev/null; then
    echo "✓ Ollama is already installed"
    OLLAMA_VERSION=$(ollama --version)
    echo "  Version: $OLLAMA_VERSION"
else
    echo "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    
    # Wait for Ollama to be ready
    echo "Waiting for Ollama to start..."
    sleep 2
    
    # Verify installation
    if ! command -v ollama &> /dev/null; then
        echo "ERROR: Ollama installation failed"
        exit 1
    fi
fi

echo ""
echo "Pulling Qwen 3.5 2B model (this may take a few minutes)..."
echo "  Model: qwen3.5:2b"
echo "  This is a vision model with excellent tool-calling capabilities"
echo ""

# Pull the model
ollama pull qwen3.5:2b

echo ""
echo "Verifying model installation..."
if ollama list | grep -q "qwen3.5:2b"; then
    echo "✓ Qwen 3.5 2B installed successfully"
else
    echo "ERROR: Model installation failed"
    exit 1
fi

echo ""
echo "========================================"
echo "  Installation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env if not already done"
echo "2. Set LLM_PROVIDER=ollama in your .env"
echo "3. Set OLLAMA_MODEL=qwen3.5:2b in your .env"
echo "4. Start FarmPal with: npm run dev"
echo ""
echo "Optional: Install additional models for different tasks:"
echo "  ollama pull llama3.2        # General purpose"
echo "  ollama pull codellama:7b      # Code generation"
echo ""
