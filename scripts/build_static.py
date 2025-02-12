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

    # Create and copy data files
    data_dir = build_dir / 'data'
    data_dir.mkdir(exist_ok=True)

    # Ensure data directory exists in source
    if not os.path.exists('data'):
        os.makedirs('data')

    # Create or copy processed_ingredients.json
    source_data = Path('data/processed_ingredients.json')
    if not source_data.exists():
        # Create sample data if it doesn't exist
        sample_data = {
            "ingredients": {
                "garlic": {
                    "count": 15,
                    "recipes": [
                        {"title": "Thai green curry", "category": "Asian"},
                        {"title": "Pasta Arrabbiata", "category": "Italian"}
                    ],
                    "categories": ["spices"],
                    "common_quantities": {"2": 5, "3": 3},
                    "common_units": {"cloves": 8}
                },
                "olive oil": {
                    "count": 12,
                    "recipes": [
                        {"title": "Greek Salad", "category": "Mediterranean"},
                        {"title": "Pasta Arrabbiata", "category": "Italian"}
                    ],
                    "categories": ["liquids"],
                    "common_quantities": {"2": 6, "1": 4},
                    "common_units": {"tablespoon": 10}
                }
            },
            "stats": {
                "total_ingredients": 2,
                "total_recipes": 3,
                "ingredients_by_category": {
                    "spices": 1,
                    "liquids": 1
                },
                "most_common_ingredients": [
                    {
                        "ingredient": "garlic",
                        "count": 15,
                        "categories": ["spices"]
                    },
                    {
                        "ingredient": "olive oil",
                        "count": 12,
                        "categories": ["liquids"]
                    }
                ],
                "most_common_units": {
                    "cloves": 8,
                    "tablespoon": 10
                }
            }
        }
        with open(source_data, 'w') as f:
            json.dump(sample_data, f, indent=2)

    # Copy the data file
    shutil.copy2(source_data, data_dir / 'processed_ingredients.json')

    # Create index.html with proper paths
    with open('templates/index.html', 'r') as f:
        content = f.read()
    
    # Replace Flask url_for with static paths
    content = content.replace("{{ url_for('static', filename='", '/what-food/static/')
    content = content.replace("') }}", '')
    
    # Add base tag for GitHub Pages
    content = content.replace('</head>',
                            '<base href="/what-food/">\n</head>')
    
    # Write modified index.html
    with open(build_dir / 'index.html', 'w') as f:
        f.write(content)

    print(f"Contents of build directory:")
    for root, dirs, files in os.walk(build_dir):
        level = root.replace(str(build_dir), '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            print(f"{subindent}{f}")

if __name__ == '__main__':
    build_static()
    print("Static files built successfully in ./build directory") 