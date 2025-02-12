from recipe_scrapers import scrape_html
import requests
import json
import os
from typing import Dict, List, Any
from datetime import datetime

class RecipeScraper:
    def __init__(self, output_dir: str = 'data'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        # Headers to mimic a browser request
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def scrape_recipe(self, url: str, category: str = None) -> Dict[str, Any]:
        """
        Scrape a recipe from a given URL
        """
        try:
            # Fetch the HTML content with headers
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()  # Raise an error for bad status codes
            html = response.text
            
            print(f"Fetching recipe from: {url}")
            
            # Use scrape_html instead of scrape_me
            scraper = scrape_html(html, org_url=url)
            
            recipe_data = {
                'title': scraper.title(),
                'total_time': scraper.total_time(),
                'ingredients': scraper.ingredients(),
                'instructions': scraper.instructions(),
                'image': scraper.image(),
                'host': scraper.host(),
                'nutrients': scraper.nutrients(),
                'category': category,
                'scraped_at': datetime.now().isoformat(),
                'url': url
            }
            
            print(f"Successfully scraped recipe: {recipe_data['title']}")
            return recipe_data
            
        except requests.exceptions.RequestException as e:
            print(f"Network error while scraping {url}: {str(e)}")
            return None
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            return None

    def save_recipe(self, recipe_data: Dict[str, Any], filename: str = None) -> str:
        """
        Save recipe data to JSON file
        """
        if recipe_data is None:
            return None
            
        if filename is None:
            category_prefix = recipe_data.get('category', '').lower().replace(' ', '_')
            if category_prefix:
                filename = f"{category_prefix}_{recipe_data['title'].lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            else:
                filename = f"{recipe_data['title'].lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(recipe_data, f, indent=2, ensure_ascii=False)
            print(f"Saved recipe to: {filepath}")
            return filepath
        except Exception as e:
            print(f"Error saving recipe to {filepath}: {str(e)}")
            return None

    def scrape_and_save(self, recipe_urls: Dict[str, List[str]]) -> Dict[str, List[str]]:
        """
        Scrape multiple recipes and save them, organized by category
        """
        saved_files = {}
        
        for category, urls in recipe_urls.items():
            print(f"\nScraping {category} recipes...")
            saved_files[category] = []
            
            for url in urls:
                recipe_data = self.scrape_recipe(url, category)
                if recipe_data:
                    filepath = self.save_recipe(recipe_data)
                    if filepath:
                        saved_files[category].append(filepath)
                        
        return saved_files

if __name__ == "__main__":
    # Example usage with categorized recipes
    scraper = RecipeScraper()
    
    recipe_urls = {
        "Italian": [
            "https://www.bbcgoodfood.com/recipes/classic-lasagne-0",
            "https://www.bbcgoodfood.com/recipes/pizza-margherita-4-easy-steps",
            "https://www.bbcgoodfood.com/recipes/proper-spaghetti-meatballs"
        ],
        "Asian": [
            "https://www.bbcgoodfood.com/recipes/chicken-chow-mein",
            "https://www.bbcgoodfood.com/recipes/easy-teriyaki-chicken",
            "https://www.bbcgoodfood.com/recipes/thai-green-curry",
            "https://www.bbcgoodfood.com/recipes/next-level-fried-rice"
        ],
        "Mediterranean": [
            "https://www.bbcgoodfood.com/recipes/greek-salad",
            "https://www.bbcgoodfood.com/recipes/authentic-falafels",
            "https://www.bbcgoodfood.com/recipes/grilled-aubergine-tabbouleh"
        ],
        "Mexican": [
            "https://www.bbcgoodfood.com/recipes/chilli-con-carne-recipe",
            "https://www.bbcgoodfood.com/recipes/easy-guacamole",
            "https://www.bbcgoodfood.com/recipes/black-bean-tacos"
        ],
        "Breakfast": [
            "https://www.bbcgoodfood.com/recipes/perfect-pancakes-recipe",
            "https://www.bbcgoodfood.com/recipes/best-scrambled-eggs-recipe",
            "https://www.bbcgoodfood.com/recipes/overnight-oats"
        ],
        "Healthy": [
            "https://www.bbcgoodfood.com/recipes/quinoa-feta-salad",
            "https://www.bbcgoodfood.com/recipes/chicken-satay-salad",
            "https://www.bbcgoodfood.com/recipes/moroccan-chickpea-soup"
        ],
        "Vegetarian": [
            "https://www.bbcgoodfood.com/recipes/spinach-sweet-potato-lentil-dhal",
            "https://www.bbcgoodfood.com/recipes/veggie-fajitas",
            "https://www.bbcgoodfood.com/recipes/roasted-vegetable-lasagne"
        ],
        "Desserts": [
            "https://www.bbcgoodfood.com/recipes/next-level-tiramisu",
            "https://www.bbcgoodfood.com/recipes/best-ever-chocolate-brownies-recipe",
            "https://www.bbcgoodfood.com/recipes/classic-chocolate-mousse",
            "https://www.bbcgoodfood.com/recipes/lemon-drizzle-cake"
        ]
    }
    
    saved_files = scraper.scrape_and_save(recipe_urls)
    
    print("\nSummary of scraped recipes:")
    total_recipes = 0
    for category, files in saved_files.items():
        print(f"{category}: {len(files)} recipes")
        total_recipes += len(files)
    print(f"\nTotal: {total_recipes} recipes saved to {scraper.output_dir}")
    
    # Print sources summary
    print("\nRecipes by source:")
    sources = {}
    for category, file_list in saved_files.items():
        for filepath in file_list:
            with open(filepath, 'r') as f:
                recipe = json.load(f)
                source = recipe['host']
                sources[source] = sources.get(source, 0) + 1
    
    for source, count in sources.items():
        print(f"{source}: {count} recipes") 