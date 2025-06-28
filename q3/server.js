const express = require('express');
const path = require('path');
const fs = require('fs');

// Import optimizer modules
const GitHubCopilotOptimizer = require('./optimizers/github_copilot');
const CursorOptimizer = require('./optimizers/cursor');
const ClaudeOptimizer = require('./optimizers/claude');
const ReplitOptimizer = require('./optimizers/replit');

class PromptOptimizerServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.toolAnalysis = this.loadToolAnalysis();
        this.optimizers = this.initializeOptimizers();
        this.setupMiddleware();
        this.setupRoutes();
    }

    loadToolAnalysis() {
        try {
            const data = fs.readFileSync('./tool_analysis.json', 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading tool analysis:', error);
            return { tools: [], intentCategories: [], complexityLevels: [] };
        }
    }

    initializeOptimizers() {
        const optimizers = new Map();
        
        this.toolAnalysis.tools.forEach(tool => {
            switch (tool.id) {
                case 'github-copilot':
                    optimizers.set(tool.id, new GitHubCopilotOptimizer(tool));
                    break;
                case 'cursor':
                    optimizers.set(tool.id, new CursorOptimizer(tool));
                    break;
                case 'claude-dev':
                    optimizers.set(tool.id, new ClaudeOptimizer(tool));
                    break;
                case 'replit-ai':
                    optimizers.set(tool.id, new ReplitOptimizer(tool));
                    break;
                default:
                    // Create generic optimizer for other tools
                    optimizers.set(tool.id, new GenericOptimizer(tool));
            }
        });

        return optimizers;
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });
    }

    setupRoutes() {
        // Serve main page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });

        // Get available tools
        this.app.get('/api/tools', (req, res) => {
            const tools = this.toolAnalysis.tools.map(tool => ({
                id: tool.id,
                name: tool.name,
                description: tool.description,
                strengths: tool.strengths,
                weaknesses: tool.weaknesses
            }));
            res.json({ tools });
        });

        // Analyze prompt
        this.app.post('/api/analyze', (req, res) => {
            try {
                const { prompt } = req.body;
                
                if (!prompt || prompt.trim().length === 0) {
                    return res.status(400).json({ error: 'Prompt is required' });
                }

                const analysis = this.analyzePrompt(prompt);
                res.json({ analysis });
            } catch (error) {
                console.error('Analysis error:', error);
                res.status(500).json({ error: 'Analysis failed' });
            }
        });

        // Optimize prompt for specific tool
        this.app.post('/api/optimize', (req, res) => {
            try {
                const { prompt, toolId, analysis } = req.body;
                
                if (!prompt || !toolId) {
                    return res.status(400).json({ error: 'Prompt and tool ID are required' });
                }

                const optimizer = this.optimizers.get(toolId);
                if (!optimizer) {
                    return res.status(404).json({ error: 'Tool not found' });
                }

                const promptAnalysis = analysis || this.analyzePrompt(prompt);
                const result = optimizer.optimize(prompt, promptAnalysis);
                
                res.json({ 
                    result,
                    toolInfo: this.toolAnalysis.tools.find(t => t.id === toolId)
                });
            } catch (error) {
                console.error('Optimization error:', error);
                res.status(500).json({ error: 'Optimization failed' });
            }
        });

        // Batch optimize for all tools
        this.app.post('/api/optimize-all', (req, res) => {
            try {
                const { prompt } = req.body;
                
                if (!prompt) {
                    return res.status(400).json({ error: 'Prompt is required' });
                }

                const analysis = this.analyzePrompt(prompt);
                const results = new Map();

                this.optimizers.forEach((optimizer, toolId) => {
                    const result = optimizer.optimize(prompt, analysis);
                    results.set(toolId, {
                        ...result,
                        toolName: optimizer.name
                    });
                });

                res.json({ 
                    results: Object.fromEntries(results),
                    analysis 
                });
            } catch (error) {
                console.error('Batch optimization error:', error);
                res.status(500).json({ error: 'Batch optimization failed' });
            }
        });
    }

    analyzePrompt(prompt) {
        const analysis = {
            intent: this.detectIntent(prompt),
            complexity: this.assessComplexity(prompt),
            domain: this.identifyDomain(prompt),
            codeContext: this.extractCodeContext(prompt),
            requirements: this.extractRequirements(prompt),
            originalLength: prompt.length
        };

        return analysis;
    }

    detectIntent(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        
        for (const category of this.toolAnalysis.intentCategories) {
            const keywordMatches = category.keywords.filter(keyword => 
                lowerPrompt.includes(keyword)
            ).length;
            
            if (keywordMatches > 0) {
                return category.id;
            }
        }
        
        return 'code_generation'; // default
    }

    assessComplexity(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        const complexityIndicators = {
            simple: ['simple', 'basic', 'easy', 'quick', 'small'],
            moderate: ['component', 'function', 'api', 'interface'],
            complex: ['system', 'architecture', 'enterprise', 'scalable', 'performance', 'security']
        };

        let maxScore = 0;
        let detectedComplexity = 'simple';

        Object.entries(complexityIndicators).forEach(([level, indicators]) => {
            const score = indicators.filter(indicator => lowerPrompt.includes(indicator)).length;
            if (score > maxScore) {
                maxScore = score;
                detectedComplexity = level;
            }
        });

        return detectedComplexity;
    }

    identifyDomain(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        const domains = [];

        const domainKeywords = {
            'web': ['web', 'html', 'css', 'javascript', 'react', 'vue', 'angular', 'frontend'],
            'backend': ['api', 'server', 'backend', 'database', 'nodejs', 'express'],
            'mobile': ['mobile', 'app', 'ios', 'android', 'react native', 'flutter'],
            'data': ['data', 'analysis', 'pandas', 'numpy', 'machine learning', 'ml'],
            'devops': ['docker', 'kubernetes', 'deployment', 'ci/cd', 'aws', 'cloud']
        };

        Object.entries(domainKeywords).forEach(([domain, keywords]) => {
            if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
                domains.push(domain);
            }
        });

        return domains.length > 0 ? domains : ['general'];
    }

    extractCodeContext(prompt) {
        const context = {
            language: this.detectLanguage(prompt),
            framework: this.detectFramework(prompt),
            hasCode: /```|`/.test(prompt)
        };

        return context;
    }

    detectLanguage(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        const languages = {
            'javascript': ['javascript', 'js', 'node', 'react', 'vue'],
            'typescript': ['typescript', 'ts'],
            'python': ['python', 'py', 'django', 'flask', 'pandas'],
            'java': ['java', 'spring'],
            'go': ['golang', 'go'],
            'rust': ['rust'],
            'php': ['php', 'laravel'],
            'ruby': ['ruby', 'rails']
        };

        for (const [lang, keywords] of Object.entries(languages)) {
            if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
                return lang;
            }
        }

        return 'javascript'; // default
    }

    detectFramework(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        const frameworks = ['react', 'vue', 'angular', 'express', 'django', 'flask', 'spring', 'rails'];
        
        for (const framework of frameworks) {
            if (lowerPrompt.includes(framework)) {
                return framework;
            }
        }

        return null;
    }

    extractRequirements(prompt) {
        const requirements = [];
        const lowerPrompt = prompt.toLowerCase();

        const requirementKeywords = {
            'performance': ['fast', 'performance', 'optimize', 'speed'],
            'security': ['secure', 'security', 'auth', 'protection'],
            'accessibility': ['accessible', 'a11y', 'accessibility'],
            'responsive': ['responsive', 'mobile', 'tablet'],
            'testing': ['test', 'testing', 'unit test', 'integration']
        };

        Object.entries(requirementKeywords).forEach(([req, keywords]) => {
            if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
                requirements.push(req);
            }
        });

        return requirements;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`Prompt Optimizer Server running on port ${this.port}`);
            console.log(`Available optimizers: ${Array.from(this.optimizers.keys()).join(', ')}`);
        });
    }
}

// Generic optimizer for tools without specific implementations
class GenericOptimizer {
    constructor(toolConfig) {
        this.config = toolConfig;
        this.name = toolConfig.name;
    }

    optimize(prompt, analysis) {
        // Basic optimization logic
        let optimizedPrompt = prompt;
        
        // Add context based on tool strengths
        if (this.config.strengths.includes('code completion')) {
            optimizedPrompt = this.enhanceForCompletion(optimizedPrompt);
        }
        
        if (this.config.strengths.includes('debugging')) {
            optimizedPrompt = this.enhanceForDebugging(optimizedPrompt);
        }

        return {
            original: prompt,
            optimized: optimizedPrompt,
            optimizations: [{ type: 'Basic optimization applied', impact: 'medium' }],
            score: 75,
            toolSpecificTips: [`Optimized for ${this.name} strengths: ${this.config.strengths.join(', ')}`]
        };
    }

    enhanceForCompletion(prompt) {
        return `// Code completion task:\n${prompt}\n\n// Please provide implementation:`;
    }

    enhanceForDebugging(prompt) {
        return `// Debug this issue:\n${prompt}\n\n// Expected behavior:\n// Actual behavior:\n// Solution:`;
    }
}

// Start the server
if (require.main === module) {
    const server = new PromptOptimizerServer();
    server.start();
}

module.exports = PromptOptimizerServer; 