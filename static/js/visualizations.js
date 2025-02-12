// Visualization configurations
const config = {
    width: 800,
    height: 600,
    margin: { top: 40, right: 40, bottom: 60, left: 60 },
    colors: d3.schemeCategory10
};

// Main visualization class
class RecipeVisualizer {
    constructor() {
        this.data = null;
        this.currentView = 'categories';
        this.initializeUI();
    }

    async loadData() {
        try {
            // Get base URL from base tag or default to ''
            const baseTag = document.querySelector('base');
            const basePath = baseTag ? baseTag.href : '';
            
            const response = await fetch(`${basePath}data/processed_ingredients.json`);
            this.data = await response.json();
            this.renderCurrentView();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data');
        }
    }

    initializeUI() {
        // Create visualization containers
        this.createContainers();
        
        // Add view selection controls
        const controls = d3.select('.filters')
            .append('div')
            .attr('class', 'view-controls');
        
        controls.append('label')
            .attr('class', 'form-label')
            .attr('for', 'view-selector')
            .text('Select Visualization');
        
        controls.append('select')
            .attr('id', 'view-selector')
            .attr('class', 'form-select mb-3')
            .on('change', () => {
                this.currentView = d3.select('#view-selector').property('value');
                this.renderCurrentView();
            })
            .selectAll('option')
            .data([
                { value: 'categories', text: 'Ingredient Categories' },
                { value: 'common', text: 'Most Common Ingredients' },
                { value: 'network', text: 'Recipe Connections' }
            ])
            .enter()
            .append('option')
            .attr('value', d => d.value)
            .text(d => d.text);

        // Remove loading indicator from previous version
        d3.select('.loading').remove();
        
        // Add loading indicator
        const loadingDiv = d3.select('#main-viz')
            .append('div')
            .attr('class', 'loading')
            .style('display', 'none');  // Hide initially
            
        loadingDiv.append('div')
            .attr('class', 'spinner-border text-primary')
            .attr('role', 'status')
            .append('span')
            .attr('class', 'visually-hidden')
            .text('Loading...');
    }

    createContainers() {
        // Clear existing content
        d3.select('#main-viz').html('');
        
        // Create SVG container
        this.svg = d3.select('#main-viz')
            .append('svg')
            .attr('width', config.width)
            .attr('height', config.height);
        
        // Add a group for the visualization
        this.chart = this.svg.append('g')
            .attr('transform', `translate(${config.margin.left},${config.margin.top})`);
        
        // Add title
        this.svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', config.width / 2)
            .attr('y', 25)
            .attr('text-anchor', 'middle')
            .style('font-size', '1.2em')
            .style('font-weight', 'bold');
    }

    renderCurrentView() {
        if (!this.data) return;
        
        // Clear previous visualization
        this.chart.html('');
        
        switch (this.currentView) {
            case 'categories':
                this.renderCategoryDistribution();
                break;
            case 'common':
                this.renderCommonIngredients();
                break;
            case 'network':
                this.renderRecipeNetwork();
                break;
        }
    }

    renderCategoryDistribution() {
        const stats = this.data.stats;
        const categories = Object.entries(stats.ingredients_by_category)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
        
        // Update title
        d3.select('.chart-title').text('Ingredients by Category');
        
        // Set up scales
        const chartWidth = config.width - config.margin.left - config.margin.right;
        const chartHeight = config.height - config.margin.top - config.margin.bottom;
        
        const x = d3.scaleBand()
            .domain(categories.map(d => d.category))
            .range([0, chartWidth])
            .padding(0.1);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(categories, d => d.count)])
            .range([chartHeight, 0]);
        
        // Add bars
        this.chart.selectAll('.bar')
            .data(categories)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.category))
            .attr('y', d => y(d.count))
            .attr('width', x.bandwidth())
            .attr('height', d => chartHeight - y(d.count))
            .attr('fill', (d, i) => config.colors[i % config.colors.length]);
        
        // Add axes
        this.chart.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end');
        
        this.chart.append('g')
            .call(d3.axisLeft(y));
        
        // Add labels
        this.chart.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -40)
            .attr('x', -chartHeight / 2)
            .attr('text-anchor', 'middle')
            .text('Number of Ingredients');
    }

    renderCommonIngredients() {
        const stats = this.data.stats;
        const ingredients = stats.most_common_ingredients
            .slice(0, 15)  // Show top 15 ingredients
            .sort((a, b) => a.count - b.count);  // Sort ascending for horizontal bars
        
        // Update title
        d3.select('.chart-title').text('Most Common Ingredients');
        
        // Set up scales
        const chartWidth = config.width - config.margin.left - config.margin.right;
        const chartHeight = config.height - config.margin.top - config.margin.bottom;
        
        const x = d3.scaleLinear()
            .domain([0, d3.max(ingredients, d => d.count)])
            .range([0, chartWidth]);
        
        const y = d3.scaleBand()
            .domain(ingredients.map(d => d.ingredient))
            .range([chartHeight, 0])
            .padding(0.1);
        
        // Add bars
        this.chart.selectAll('.bar')
            .data(ingredients)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => y(d.ingredient))
            .attr('width', d => x(d.count))
            .attr('height', y.bandwidth())
            .attr('fill', (d, i) => config.colors[i % config.colors.length]);
        
        // Add axes
        this.chart.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x));
        
        this.chart.append('g')
            .call(d3.axisLeft(y));
        
        // Add labels
        this.chart.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + 40)
            .attr('text-anchor', 'middle')
            .text('Number of Recipes');
    }

    renderRecipeNetwork() {
        // Update title
        d3.select('.chart-title').text('Recipe-Ingredient Connections');
        
        // Create nodes for recipes and ingredients
        const nodes = [];
        const links = [];
        const recipes = new Set();
        const ingredients = new Set();
        
        // Process data to create network
        Object.entries(this.data.ingredients).forEach(([ingredient, data]) => {
            ingredients.add(ingredient);
            data.recipes.forEach(recipe => {
                recipes.add(recipe.title);
                links.push({
                    source: ingredient,
                    target: recipe.title,
                    value: 1
                });
            });
        });
        
        // Create nodes array
        recipes.forEach(recipe => {
            nodes.push({ id: recipe, type: 'recipe' });
        });
        ingredients.forEach(ingredient => {
            nodes.push({ id: ingredient, type: 'ingredient' });
        });
        
        // Create force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id))
            .force('charge', d3.forceManyBody().strength(-50))
            .force('center', d3.forceCenter(config.width / 2, config.height / 2));
        
        // Add links
        const link = this.chart.append('g')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .style('stroke', '#999')
            .style('stroke-opacity', 0.6);
        
        // Add nodes
        const node = this.chart.append('g')
            .selectAll('circle')
            .data(nodes)
            .enter()
            .append('circle')
            .attr('r', 5)
            .style('fill', d => d.type === 'recipe' ? config.colors[0] : config.colors[1]);
        
        // Add node labels
        const label = this.chart.append('g')
            .selectAll('text')
            .data(nodes)
            .enter()
            .append('text')
            .text(d => d.id)
            .style('font-size', '8px')
            .style('text-anchor', 'middle')
            .style('dominant-baseline', 'middle');
        
        // Update positions
        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            
            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });
    }

    showError(message) {
        this.chart.selectAll('*').remove();
        d3.select('#main-viz')
            .append('div')
            .attr('class', 'alert alert-danger')
            .attr('role', 'alert')
            .text(message);
    }
}

// Initialize visualization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new RecipeVisualizer();
    visualizer.loadData();
}); 