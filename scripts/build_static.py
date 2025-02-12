import os
import shutil
import json
from pathlib import Path

def build_static():
    """Build static files for GitHub Pages deployment"""
    # Create build directory
    build_dir = Path('build')
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()

    # Copy static assets
    shutil.copytree('static', build_dir / 'static')

    # Copy data files
    data_dir = build_dir / 'data'
    data_dir.mkdir(exist_ok=True)
    if os.path.exists('data/processed_ingredients.json'):
        shutil.copy2('data/processed_ingredients.json', data_dir / 'processed_ingredients.json')

    # Create index.html with proper paths
    with open('templates/index.html', 'r') as f:
        content = f.read()
    
    # Replace Flask url_for with static paths
    content = content.replace("{{ url_for('static', filename='", '')
    content = content.replace("') }}", '')
    
    # Write modified index.html
    with open(build_dir / 'index.html', 'w') as f:
        f.write(content)

if __name__ == '__main__':
    build_static()
    print("Static files built successfully in ./build directory") 