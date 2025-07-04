#!/bin/bash

npm install

echo "Installing Python dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r ./python/requirements.txt
