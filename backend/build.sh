#!/bin/bash

echo "Installing pyenv..."
curl https://pyenv.run | bash

export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)"
pyenv install 3.11.8
pyenv global 3.11.8

echo "Python version:"
python --version

pip install --upgrade pip setuptools wheel
pip install -r ./python/requirements.txt

npm install
