import json
import os
from collections import defaultdict
from pathlib import Path

def load_recipes(data_dir):
    """Load all recipe JSON files from the data directory."""
    recipes = []
    for file in Path(data_dir).glob('*.json'):
        if file.name == 'processed_ingredients.json':
            continue  # Skip our output file
        try:
            with open(file, 'r') as f:
                recipe = json.load(f)
                if isinstance(recipe, dict):  # Only process valid recipe objects
                    recipe['filename'] = file.name
                    recipe['category'] = file.stem.split('_')[0]  # Extract category from filename
                    recipes.append(recipe)
        except json.JSONDecodeError:
            print(f"Error loading {file}")
    return recipes

def process_ingredients(recipes):
    """Process ingredients from recipes and count their occurrences."""
    ingredient_data = defaultdict(lambda: {
        'count': 0,
        'recipes': [],
        'categories': set()
    })
    category_counts = defaultdict(int)
    
    for recipe in recipes:
        category = recipe['category']
        ingredients = recipe.get('ingredients', [])
        
        for ingredient in ingredients:
            # Clean up ingredient text
            clean_ingredient = ingredient.lower().strip()
            # Remove quantities and measurements
            clean_ingredient = ' '.join([word for word in clean_ingredient.split() 
                                      if not any(char.isdigit() for char in word)
                                      and word not in ['g', 'ml', 'kg', 'oz', 'tbsp', 'tsp', 'cup', 'cups']])
            if clean_ingredient:  # Only add if there's something left after cleaning
                ingredient_data[clean_ingredient]['count'] += 1
                ingredient_data[clean_ingredient]['recipes'].append({
                    'title': recipe['title'],
                    'category': category
                })
                ingredient_data[clean_ingredient]['categories'].add(category)
                category_counts[category] += 1
    
    return ingredient_data, category_counts

def create_visualization_data(ingredient_data, category_counts):
    """Create the JSON structure needed for the visualization."""
    # Convert sets to lists for JSON serialization
    processed_data = {
        'ingredients': {},
        'stats': {
            'total_ingredients': len(ingredient_data),
            'ingredients_by_category': dict(category_counts),
            'most_common_ingredients': []
        }
    }
    
    for ingredient, data in ingredient_data.items():
        processed_data['ingredients'][ingredient] = {
            'count': data['count'],
            'recipes': data['recipes'],
            'categories': list(data['categories'])
        }
        processed_data['stats']['most_common_ingredients'].append({
            'ingredient': ingredient,
            'count': data['count'],
            'categories': list(data['categories'])
        })
    
    # Sort most common ingredients
    processed_data['stats']['most_common_ingredients'].sort(key=lambda x: x['count'], reverse=True)
    
    return processed_data

def main():
    # Create directories if they don't exist
    os.makedirs('data', exist_ok=True)
    
    # Load and process recipes
    recipes = load_recipes('data')
    print(f"Loaded {len(recipes)} recipes")
    
    # Process ingredients
    ingredient_data, category_counts = process_ingredients(recipes)
    print(f"Found {len(ingredient_data)} unique ingredients")
    
    # Create visualization data
    viz_data = create_visualization_data(ingredient_data, category_counts)
    
    # Save the processed data
    output_file = 'data/processed_ingredients.json'
    with open(output_file, 'w') as f:
        json.dump(viz_data, f, indent=2)
    print(f"Saved processed data to {output_file}")
    
    # Print some statistics
    print("\nIngredients by category:")
    for category, count in category_counts.items():
        print(f"{category}: {count} ingredients")
    
    print("\nTop 10 most common ingredients:")
    for item in viz_data['stats']['most_common_ingredients'][:10]:
        print(f"{item['ingredient']}: {item['count']} occurrences in {item['categories']}")

if __name__ == '__main__':
    main() 