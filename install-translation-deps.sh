#!/bin/bash

# Install npm dependencies
npm install openai formidable

# Install Python dependencies (for gTTS)
pip install gtts

# Install system dependencies (if needed)
if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y python3-pip
elif command -v yum &> /dev/null; then
    sudo yum install -y python3-pip
fi 