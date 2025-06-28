// Adaptive Prompt Optimizer Frontend
class PromptOptimizerApp {
    constructor() {
        this.currentAnalysis = null;
        this.currentResults = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Main action buttons
        document.getElementById('analyze-btn').addEventListener('click', () => this.analyzePrompt());
        document.getElementById('optimize-btn').addEventListener('click', () => this.optimizePrompt());
        document.getElementById('optimize-all-btn').addEventListener('click', () => this.optimizeForAllTools());

        // Tool selection change
        document.getElementById('target-tool').addEventListener('change', (e) => {
            const optimizeBtn = document.getElementById('optimize-btn');
            optimizeBtn.disabled = !e.target.value || !this.currentAnalysis;
        });

        // Copy button
        document.getElementById('copy-optimized').addEventListener('click', () => this.copyOptimizedPrompt());

        // Example cards
        document.querySelectorAll('.example-card').forEach(card => {
            card.addEventListener('click', () => {
                const examplePrompt = card.dataset.prompt;
                document.getElementById('original-prompt').value = examplePrompt;
                this.scrollToInput();
            });
        });

        // Prompt input change
        document.getElementById('original-prompt').addEventListener('input', () => {
            this.resetResults();
        });
    }

    async analyzePrompt() {
        const prompt = document.getElementById('original-prompt').value.trim();
        
        if (!prompt) {
            this.showError('Please enter a prompt to analyze.');
            return;
        }

        this.showLoading('analysis');
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data = await response.json();
            this.currentAnalysis = data.analysis;
            this.displayAnalysis(this.currentAnalysis);
            
            // Enable optimize button if tool is selected
            const selectedTool = document.getElementById('target-tool').value;
            if (selectedTool) {
                document.getElementById('optimize-btn').disabled = false;
            }

        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Failed to analyze prompt. Please try again.');
        } finally {
            this.hideLoading('analysis');
        }
    }

    async optimizePrompt() {
        const prompt = document.getElementById('original-prompt').value.trim();
        const toolId = document.getElementById('target-tool').value;
        
        if (!prompt || !toolId) {
            this.showError('Please enter a prompt and select a target tool.');
            return;
        }

        this.showLoading('optimization');
        this.showResultsSection();

        try {
            const response = await fetch('/api/optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    prompt, 
                    toolId, 
                    analysis: this.currentAnalysis 
                })
            });

            if (!response.ok) {
                throw new Error('Optimization failed');
            }

            const data = await response.json();
            this.displaySingleResult(data.result, data.toolInfo);

        } catch (error) {
            console.error('Optimization error:', error);
            this.showError('Failed to optimize prompt. Please try again.');
        } finally {
            this.hideLoading('optimization');
        }
    }

    async optimizeForAllTools() {
        const prompt = document.getElementById('original-prompt').value.trim();
        
        if (!prompt) {
            this.showError('Please enter a prompt to optimize.');
            return;
        }

        this.showLoading('optimization');
        this.showResultsSection();

        try {
            const response = await fetch('/api/optimize-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error('Batch optimization failed');
            }

            const data = await response.json();
            this.currentResults = data.results;
            this.currentAnalysis = data.analysis;
            
            this.displayAnalysis(this.currentAnalysis);
            this.displayAllResults(data.results);

        } catch (error) {
            console.error('Batch optimization error:', error);
            this.showError('Failed to optimize prompt for all tools. Please try again.');
        } finally {
            this.hideLoading('optimization');
        }
    }

    displayAnalysis(analysis) {
        document.getElementById('detected-intent').textContent = this.formatIntent(analysis.intent);
        document.getElementById('detected-complexity').textContent = this.formatComplexity(analysis.complexity);
        document.getElementById('detected-domain').textContent = this.formatDomain(analysis.domain);
        document.getElementById('detected-language').textContent = this.formatLanguage(analysis.codeContext.language);

        document.getElementById('analysis-section').style.display = 'block';
        
        // Scroll to analysis section
        document.getElementById('analysis-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    displaySingleResult(result, toolInfo) {
        document.getElementById('result-tool-name').textContent = toolInfo.name;
        document.getElementById('optimization-score').textContent = result.score;
        
        document.getElementById('original-display').textContent = result.original;
        document.getElementById('optimized-display').textContent = result.optimized;

        this.displayOptimizations(result.optimizations);
        this.displayToolTips(result.toolSpecificTips);

        document.getElementById('single-result').style.display = 'block';
        document.getElementById('all-results').style.display = 'none';
    }

    displayAllResults(results) {
        const resultsGrid = document.getElementById('results-grid');
        resultsGrid.innerHTML = '';

        // Sort results by score
        const sortedResults = Object.entries(results).sort((a, b) => b[1].score - a[1].score);

        sortedResults.forEach(([toolId, result]) => {
            const resultCard = this.createResultCard(toolId, result);
            resultsGrid.appendChild(resultCard);
        });

        document.getElementById('single-result').style.display = 'none';
        document.getElementById('all-results').style.display = 'block';
    }

    createResultCard(toolId, result) {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        card.innerHTML = `
            <h3>
                ${result.toolName}
                <span class="result-score">${result.score}%</span>
            </h3>
            <div class="result-preview">
                <h4>Optimized Prompt Preview:</h4>
                <div class="prompt-preview">${this.truncateText(result.optimized, 150)}</div>
            </div>
            <div class="result-optimizations">
                <h4>Key Improvements:</h4>
                <ul>
                    ${result.optimizations.slice(0, 3).map(opt => `<li>${opt.type}</li>`).join('')}
                </ul>
            </div>
            <button class="btn-secondary view-details-btn" data-tool-id="${toolId}">
                <i class="fas fa-eye"></i> View Details
            </button>
        `;

        // Add click handler for view details
        card.querySelector('.view-details-btn').addEventListener('click', () => {
            this.showDetailedResult(toolId, result);
        });

        return card;
    }

    showDetailedResult(toolId, result) {
        // Find tool info
        const toolNames = {
            'github-copilot': 'GitHub Copilot',
            'cursor': 'Cursor',
            'claude-dev': 'Claude (Anthropic)',
            'replit-ai': 'Replit AI',
            'amazon-codewhisperer': 'Amazon CodeWhisperer',
            'tabnine': 'Tabnine',
            'chatgpt-coding': 'ChatGPT'
        };

        const toolInfo = { name: toolNames[toolId] || result.toolName };
        this.displaySingleResult(result, toolInfo);
        
        // Scroll to single result
        document.getElementById('single-result').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }

    displayOptimizations(optimizations) {
        const optimizationsList = document.getElementById('optimizations-list');
        optimizationsList.innerHTML = '';

        if (!optimizations || optimizations.length === 0) {
            optimizationsList.innerHTML = '<p>No specific optimizations applied.</p>';
            return;
        }

        optimizations.forEach(optimization => {
            const optimizationItem = document.createElement('div');
            optimizationItem.className = `optimization-item impact-${optimization.impact || 'medium'}`;
            optimizationItem.innerHTML = `
                <strong>${optimization.type}</strong>
                ${optimization.description ? `<br><small>${optimization.description}</small>` : ''}
            `;
            optimizationsList.appendChild(optimizationItem);
        });
    }

    displayToolTips(tips) {
        const tipsList = document.getElementById('tool-tips-list');
        tipsList.innerHTML = '';

        if (!tips || tips.length === 0) {
            tipsList.innerHTML = '<li>No specific tips available.</li>';
            return;
        }

        tips.forEach(tip => {
            const listItem = document.createElement('li');
            listItem.textContent = tip;
            tipsList.appendChild(listItem);
        });
    }

    copyOptimizedPrompt() {
        const optimizedText = document.getElementById('optimized-display').textContent;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(optimizedText).then(() => {
                this.showSuccessMessage('Optimized prompt copied to clipboard!');
            }).catch(() => {
                this.fallbackCopyText(optimizedText);
            });
        } else {
            this.fallbackCopyText(optimizedText);
        }
    }

    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showSuccessMessage('Optimized prompt copied to clipboard!');
        } catch (err) {
            this.showError('Could not copy text. Please copy manually.');
        }
        
        document.body.removeChild(textArea);
    }

    showLoading(type) {
        if (type === 'analysis') {
            // Show analysis loading state if needed
        } else if (type === 'optimization') {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('single-result').style.display = 'none';
            document.getElementById('all-results').style.display = 'none';
        }
    }

    hideLoading(type) {
        if (type === 'optimization') {
            document.getElementById('loading').style.display = 'none';
        }
    }

    showResultsSection() {
        document.getElementById('results-section').style.display = 'block';
        document.getElementById('results-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    resetResults() {
        document.getElementById('analysis-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'none';
        document.getElementById('optimize-btn').disabled = true;
        this.currentAnalysis = null;
        this.currentResults = null;
    }

    scrollToInput() {
        document.getElementById('original-prompt').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        document.getElementById('original-prompt').focus();
    }

    showError(message) {
        // Create and show error toast
        const errorToast = document.createElement('div');
        errorToast.className = 'error-toast';
        errorToast.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        `;
        
        document.body.appendChild(errorToast);
        
        // Add error toast styles if not already added
        if (!document.querySelector('#error-toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'error-toast-styles';
            styles.textContent = `
                .error-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #e74c3c;
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                    animation: slideInRight 0.3s ease;
                }
                
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        setTimeout(() => {
            errorToast.remove();
        }, 5000);
    }

    showSuccessMessage(message) {
        // Create and show success toast
        const successToast = document.createElement('div');
        successToast.className = 'success-toast';
        successToast.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${message}
        `;
        
        document.body.appendChild(successToast);
        
        // Add success toast styles if not already added
        if (!document.querySelector('#success-toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'success-toast-styles';
            styles.textContent = `
                .success-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #27ae60;
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                    animation: slideInRight 0.3s ease;
                }
            `;
            document.head.appendChild(styles);
        }
        
        setTimeout(() => {
            successToast.remove();
        }, 3000);
    }

    // Utility methods
    formatIntent(intent) {
        return intent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatComplexity(complexity) {
        return complexity.charAt(0).toUpperCase() + complexity.slice(1);
    }

    formatDomain(domains) {
        return Array.isArray(domains) ? domains.join(', ') : domains;
    }

    formatLanguage(language) {
        return language ? language.charAt(0).toUpperCase() + language.slice(1) : 'Not detected';
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PromptOptimizerApp();
}); 