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
            // Check if we're running locally (development) or on GitHub Pages (production)
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const url = isLocal ? '/api/recipes' : 'data/processed_ingredients.json';
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            this.renderCurrentView();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data: ' + error.message);
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
                { value: 'heatmap', text: 'Ingredient Heatmap' },
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
            case 'heatmap':
                this.renderIngredientHeatmap();
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

    renderIngredientHeatmap() {
        // Adjust margins for rotated labels
        const localMargin = {
            top: config.margin.top,
            right: config.margin.right,
            bottom: config.margin.bottom + 60,  // More space for bottom labels
            left: config.margin.left + 100      // More space for left labels
        };

        // Get top ingredients with their categories
        const topIngredients = this.data.stats.most_common_ingredients
            .slice(0, 15)  // Show top 15 ingredients
            .map(d => ({
                name: d.ingredient,
                count: d.count,
                categories: d.categories
            }));

        // Create relationship matrix based on shared categories and recipes
        const matrix = [];
        topIngredients.forEach((ing1, i) => {
            matrix[i] = new Array(topIngredients.length).fill(0);
            topIngredients.forEach((ing2, j) => {
                if (i !== j) {
                    // Calculate relationship score based on:
                    // 1. Number of shared categories
                    const sharedCategories = ing1.categories.filter(cat => 
                        ing2.categories.includes(cat)).length;
                    
                    // 2. Co-occurrence in recipes
                    const ing1Recipes = new Set(
                        this.data.ingredients[ing1.name].recipes.map(r => r.title)
                    );
                    const ing2Recipes = new Set(
                        this.data.ingredients[ing2.name].recipes.map(r => r.title)
                    );
                    const sharedRecipes = [...ing1Recipes].filter(recipe => 
                        ing2Recipes.has(recipe)).length;
                    
                    // Combine scores (weighted average)
                    matrix[i][j] = (sharedCategories * 2 + sharedRecipes) / 3;
                }
            });
        });

        // Update title
        d3.select('.chart-title').text('Ingredient Relationships Heatmap');

        // Set up scales with adjusted dimensions
        const chartWidth = config.width - localMargin.left - localMargin.right;
        const chartHeight = config.height - localMargin.top - localMargin.bottom;

        const x = d3.scaleBand()
            .domain(topIngredients.map(d => d.name))
            .range([0, chartWidth])
            .padding(0.1);

        const y = d3.scaleBand()
            .domain(topIngredients.map(d => d.name))
            .range([0, chartHeight])
            .padding(0.1);

        // Create color scale
        const color = d3.scaleSequential()
            .interpolator(d3.interpolateYlOrRd)
            .domain([0, d3.max(matrix, row => d3.max(row))]);

        // Add cells
        const cells = this.chart.selectAll('.heatmap-cell')
            .data(matrix.flatMap((row, i) => 
                row.map((value, j) => ({
                    value,
                    ing1: topIngredients[i],
                    ing2: topIngredients[j]
                }))
            ))
            .enter()
            .append('rect')
            .attr('class', 'heatmap-cell')
            .attr('x', d => x(d.ing2.name))
            .attr('y', d => y(d.ing1.name))
            .attr('width', x.bandwidth())
            .attr('height', y.bandwidth())
            .style('fill', d => color(d.value));

        // Add tooltip interaction
        cells.on('mouseover', (event, d) => {
            // Debug logging
            console.log('Hovering over cell:', d);
            console.log('Ingredient 1:', d.ing1);
            console.log('Ingredient 2:', d.ing2);
            console.log('Mouse position:', { x: event.clientX, y: event.clientY });

            // Remove any existing tooltips
            d3.selectAll('.tooltip').remove();

            const tooltip = d3.select('body')  // Attach to body instead of #main-viz
                .append('div')
                .attr('class', 'tooltip')
                .style('position', 'fixed')  // Use fixed positioning
                .style('left', (event.clientX + 10) + 'px')
                .style('top', (event.clientY + 10) + 'px')
                .style('background', 'white')
                .style('padding', '12px')
                .style('border', '2px solid #ff0000')  // Red border for debugging
                .style('border-radius', '4px')
                .style('pointer-events', 'none')
                .style('font-size', '12px')
                .style('z-index', '9999')
                .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)')
                .style('max-width', '300px')
                .style('display', 'block')
                .style('opacity', '1');

            const sharedCategories = d.ing1.categories.filter(cat => 
                d.ing2.categories.includes(cat));

            const ing1Data = this.data.ingredients[d.ing1.name];
            const ing2Data = this.data.ingredients[d.ing2.name];

            // Safely get recipes
            const ing1Recipes = ing1Data ? new Set(ing1Data.recipes.map(r => r.title)) : new Set();
            const ing2Recipes = ing2Data ? new Set(ing2Data.recipes.map(r => r.title)) : new Set();
            const sharedRecipes = [...ing1Recipes].filter(recipe => ing2Recipes.has(recipe));

            // Get the most common units for each ingredient (with safety checks)
            const getTopUnits = (ingData) => {
                if (!ingData || !ingData.common_units) return [];
                return Object.entries(ingData.common_units || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([unit, count]) => `${unit} (${count}x)`);
            };

            // Format the tooltip content with more details
            let tooltipContent = `
                <div class="tooltip-content">
                    <div class="tooltip-header">
                        <strong>${d.ing1.name}</strong> + <strong>${d.ing2.name}</strong>
                    </div>
                    <div class="tooltip-body">
                        <div class="tooltip-section">
                            <span class="tooltip-label">Relationship Score:</span> 
                            ${d.value.toFixed(2)}
                        </div>
                        <div class="tooltip-section">
                            <span class="tooltip-label">Individual Counts:</span><br>
                            • ${d.ing1.name}: ${d.ing1.count} recipes<br>
                            • ${d.ing2.name}: ${d.ing2.count} recipes
                        </div>
                        ${sharedCategories.length ? `
                        <div class="tooltip-section">
                            <span class="tooltip-label">Shared Categories:</span><br>
                            ${sharedCategories.map(cat => `• ${cat}`).join('<br>')}
                        </div>
                        ` : ''}
                        ${sharedRecipes.length ? `
                        <div class="tooltip-section">
                            <span class="tooltip-label">Co-occur in ${sharedRecipes.length} recipes:</span><br>
                            ${sharedRecipes.slice(0, 3).map(recipe => `• ${recipe}`).join('<br>')}
                            ${sharedRecipes.length > 3 ? '<br>• ...' : ''}
                        </div>
                        ` : ''}
                        <div class="tooltip-section">
                            <span class="tooltip-label">Common Units:</span><br>
                            • ${d.ing1.name}: ${getTopUnits(ing1Data).join(', ') || 'N/A'}<br>
                            • ${d.ing2.name}: ${getTopUnits(ing2Data).join(', ') || 'N/A'}
                        </div>
                    </div>
                </div>
            `;

            tooltip.html(tooltipContent);

            // Adjust position if tooltip would go off screen
            const tooltipNode = tooltip.node();
            const tooltipRect = tooltipNode.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let left = event.clientX + 10;
            let top = event.clientY + 10;

            if (left + tooltipRect.width > viewportWidth) {
                left = event.clientX - tooltipRect.width - 10;
            }
            if (top + tooltipRect.height > viewportHeight) {
                top = event.clientY - tooltipRect.height - 10;
            }

            tooltip
                .style('left', left + 'px')
                .style('top', top + 'px');

            console.log('Tooltip dimensions:', {
                width: tooltipRect.width,
                height: tooltipRect.height,
                left: left,
                top: top
            });
        })
        .on('mouseout', () => {
            d3.selectAll('.tooltip').remove();
        });

        // Add axes with improved labels
        // Bottom axis
        this.chart.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('font-size', '10px')
            .attr('dx', '-0.8em')
            .attr('dy', '0.8em');

        // Left axis
        this.chart.append('g')
            .call(d3.axisLeft(y))
            .selectAll('text')
            .style('text-anchor', 'end')
            .style('font-size', '10px')
            .attr('dx', '-0.5em')
            .attr('dy', '-0.5em')
            .attr('transform', 'rotate(-45)');

        // Update chart position to accommodate new margins
        this.chart.attr('transform', `translate(${localMargin.left},${localMargin.top})`);

        // Add legend
        const legendWidth = 100;
        const legendHeight = 20;
        const legendScale = d3.scaleLinear()
            .domain(color.domain())
            .range([0, legendWidth]);

        const legend = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${config.width - legendWidth - 20}, 20)`);

        const legendGradient = legend.append('defs')
            .append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%')
            .attr('y1', '0%')
            .attr('y2', '0%');

        legendGradient.selectAll('stop')
            .data(d3.ticks(0, d3.max(matrix, row => d3.max(row)), 10))
            .enter()
            .append('stop')
            .attr('offset', d => (d / d3.max(matrix, row => d3.max(row)) * 100) + '%')
            .attr('stop-color', d => color(d));

        legend.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)');

        legend.append('text')
            .attr('x', 0)
            .attr('y', legendHeight + 15)
            .text('Low Relationship');

        legend.append('text')
            .attr('x', legendWidth)
            .attr('y', legendHeight + 15)
            .attr('text-anchor', 'end')
            .text('High Relationship');
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