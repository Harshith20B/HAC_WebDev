#!/bin/bash

# Standard Node build
npm install

# Setup Python properly
echo "Installing Python dependencies..."
python3 -m pip install --upgrade pip setuptools wheel
python3 -m pip install -r ./python/requirements.txt
