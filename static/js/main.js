// Main visualization class
class RecipeViz {
    constructor() {
        this.svg = null;
        this.data = null;
        this.width = 800;
        this.height = 600;
        this.margin = { top: 20, right: 20, bottom: 30, left: 40 };
        this.initialize();
    }

    initialize() {
        // Create SVG container
        this.svg = d3.select('#main-viz')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

        // Add loading indicator
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .text('Loading data...');

        // Load initial data
        this.loadData();
    }

    async loadData() {
        try {
            const response = await fetch('/api/recipes');
            this.data = await response.json();
            this.updateVisualization();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data');
        }
    }

    updateVisualization() {
        // This will be implemented based on the specific visualization type
        // For now, just clear the loading message
        this.svg.selectAll('text').remove();
    }

    showError(message) {
        this.svg.selectAll('*').remove();
        this.svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .attr('fill', 'red')
            .text(message);
    }
}

// Initialize visualization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.recipeViz = new RecipeViz();
}); 