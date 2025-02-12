import json
import os
import re
from typing import Dict, List, Any
from collections import defaultdict
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

class IngredientProcessor:
    def __init__(self, data_dir: str = 'data'):
        self.data_dir = data_dir
        self.recipes = []
        self.ingredients_data = defaultdict(lambda: {
            'count': 0,
            'recipes': [],
            'categories': set(),
            'common_quantities': defaultdict(int),
            'common_units': defaultdict(int)
        })
        
        # Download required NLTK data
        nltk.download('punkt')
        nltk.download('stopwords')
        nltk.download('wordnet')
        nltk.download('averaged_perceptron_tagger')
        
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        
        # Common cooking units
        self.units = {
            'g', 'kg', 'oz', 'lb', 'ml', 'l', 'cup', 'cups', 'tbsp', 'tsp', 
            'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'pinch', 
            'handful', 'piece', 'pieces', 'slice', 'slices'
        }
        
        # Ingredient categories
        self.categories = {
            'proteins': {'chicken', 'beef', 'pork', 'fish', 'shrimp', 'tofu', 'egg', 'eggs'},
            'vegetables': {'onion', 'garlic', 'tomato', 'carrot', 'pepper', 'spinach', 'potato'},
            'fruits': {'apple', 'banana', 'lemon', 'orange', 'berry', 'berries'},
            'grains': {'rice', 'pasta', 'flour', 'bread', 'oat', 'oats', 'quinoa'},
            'dairy': {'milk', 'cheese', 'cream', 'butter', 'yogurt'},
            'spices': {'salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'nutmeg'},
            'herbs': {'basil', 'parsley', 'cilantro', 'thyme', 'rosemary', 'mint'},
            'legumes': {'bean', 'beans', 'lentil', 'lentils', 'chickpea', 'chickpeas'},
            'nuts': {'almond', 'almonds', 'walnut', 'walnuts', 'pecan', 'pecans'},
            'liquids': {'water', 'oil', 'stock', 'wine', 'vinegar'}
        }

    def load_recipes(self) -> None:
        """Load all recipe JSON files from the data directory"""
        for filename in os.listdir(self.data_dir):
            if filename.endswith('.json'):
                with open(os.path.join(self.data_dir, filename), 'r') as f:
                    recipe = json.load(f)
                    self.recipes.append(recipe)

    def extract_quantity_and_unit(self, ingredient: str) -> tuple:
        """Extract quantity and unit from ingredient string"""
        # Match common quantity patterns (numbers, fractions)
        quantity_pattern = r'(\d+(?:/\d+)?|\d*\.\d+|\d+)'
        quantities = re.findall(quantity_pattern, ingredient.lower())
        
        # Convert fractions to decimal
        cleaned_quantities = []
        for q in quantities:
            if '/' in q:
                num, denom = map(float, q.split('/'))
                cleaned_quantities.append(str(num/denom))
            else:
                cleaned_quantities.append(q)
        
        # Find units
        words = word_tokenize(ingredient.lower())
        found_units = [word for word in words if word in self.units]
        
        return cleaned_quantities, found_units

    def categorize_ingredient(self, ingredient: str) -> List[str]:
        """Categorize an ingredient into predefined categories"""
        ingredient_words = set(word_tokenize(ingredient.lower()))
        categories = []
        
        for category, terms in self.categories.items():
            if any(term in ingredient_words for term in terms):
                categories.append(category)
        
        return categories if categories else ['other']

    def process_ingredients(self) -> None:
        """Process all ingredients from loaded recipes"""
        for recipe in self.recipes:
            recipe_title = recipe['title']
            recipe_category = recipe.get('category', 'uncategorized')
            
            for ingredient in recipe['ingredients']:
                # Normalize ingredient text
                ingredient_text = ingredient.lower()
                
                # Extract quantities and units
                quantities, units = self.extract_quantity_and_unit(ingredient_text)
                
                # Categorize ingredient
                categories = self.categorize_ingredient(ingredient_text)
                
                # Remove quantities, units, and stop words to get the main ingredient
                words = word_tokenize(ingredient_text)
                main_ingredient = ' '.join([
                    self.lemmatizer.lemmatize(word.lower()) 
                    for word in words 
                    if word.lower() not in self.stop_words 
                    and word not in self.units 
                    and not re.match(r'^\d+(?:/\d+)?$', word)
                ])
                
                # Update ingredients data
                self.ingredients_data[main_ingredient]['count'] += 1
                self.ingredients_data[main_ingredient]['recipes'].append({
                    'title': recipe_title,
                    'category': recipe_category
                })
                self.ingredients_data[main_ingredient]['categories'].update(categories)
                
                for quantity in quantities:
                    self.ingredients_data[main_ingredient]['common_quantities'][quantity] += 1
                for unit in units:
                    self.ingredients_data[main_ingredient]['common_units'][unit] += 1

    def get_ingredient_stats(self) -> Dict[str, Any]:
        """Get statistics about ingredients"""
        stats = {
            'total_ingredients': len(self.ingredients_data),
            'total_recipes': len(self.recipes),
            'ingredients_by_category': defaultdict(int),
            'most_common_ingredients': [],
            'most_common_units': defaultdict(int),
            'category_distribution': defaultdict(int)
        }
        
        # Process ingredients
        for ingredient, data in self.ingredients_data.items():
            # Count ingredients by category
            for category in data['categories']:
                stats['ingredients_by_category'][category] += 1
            
            # Most common ingredients
            stats['most_common_ingredients'].append({
                'ingredient': ingredient,
                'count': data['count'],
                'categories': list(data['categories'])
            })
            
            # Most common units
            for unit, count in data['common_units'].items():
                stats['most_common_units'][unit] += count
        
        # Sort most common ingredients
        stats['most_common_ingredients'].sort(key=lambda x: x['count'], reverse=True)
        
        return stats

    def save_processed_data(self, output_file: str = 'processed_ingredients.json') -> None:
        """Save processed ingredient data to JSON file"""
        output_path = os.path.join(self.data_dir, output_file)
        
        # Convert sets to lists for JSON serialization
        serializable_data = {}
        for ingredient, data in self.ingredients_data.items():
            serializable_data[ingredient] = {
                'count': data['count'],
                'recipes': data['recipes'],
                'categories': list(data['categories']),
                'common_quantities': dict(data['common_quantities']),
                'common_units': dict(data['common_units'])
            }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                'ingredients': serializable_data,
                'stats': self.get_ingredient_stats()
            }, f, indent=2, ensure_ascii=False)
        
        print(f"Processed data saved to {output_path}")

if __name__ == "__main__":
    # Process ingredients
    processor = IngredientProcessor()
    processor.load_recipes()
    processor.process_ingredients()
    processor.save_processed_data()
    
    # Print some basic statistics
    stats = processor.get_ingredient_stats()
    print(f"\nIngredient Statistics:")
    print(f"Total unique ingredients: {stats['total_ingredients']}")
    print(f"Total recipes: {stats['total_recipes']}")
    print("\nMost common ingredients:")
    for ing in stats['most_common_ingredients'][:10]:
        print(f"- {ing['ingredient']}: {ing['count']} recipes")
    print("\nIngredients by category:")
    for category, count in stats['ingredients_by_category'].items():
        print(f"- {category}: {count} ingredients") 