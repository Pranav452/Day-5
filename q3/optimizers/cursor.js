class CursorOptimizer {
    constructor(toolConfig) {
        this.config = toolConfig;
        this.name = "Cursor";
    }

    optimize(prompt, analysis) {
        let optimizedPrompt = this.addFileContext(prompt, analysis);
        optimizedPrompt = this.addArchitecturalContext(optimizedPrompt, analysis);
        optimizedPrompt = this.enhanceForRefactoring(optimizedPrompt, analysis);

        const optimizations = this.getAppliedOptimizations(prompt, optimizedPrompt);
        
        return {
            original: prompt,
            optimized: optimizedPrompt,
            optimizations: optimizations,
            score: this.calculateScore(prompt, optimizedPrompt, analysis),
            toolSpecificTips: this.getCursorTips(analysis)
        };
    }

    addFileContext(prompt, analysis) {
        if (!prompt.includes('File:') && !prompt.includes('In ')) {
            const language = analysis.codeContext?.language || 'javascript';
            const ext = this.getFileExtension(language);
            
            return `In src/components/Component${ext}, ${prompt}

// Current file structure:
// src/
//   components/
//     Component${ext}
//   utils/
//   types/

${prompt}`;
        }
        return prompt;
    }

    addArchitecturalContext(prompt, analysis) {
        if (analysis.complexity === 'complex' && !prompt.includes('architecture')) {
            return `// Project architecture context:
// - ${this.getArchitecturalPattern(analysis)}
// - Dependencies: ${this.inferDependencies(analysis)}
// - Integration points: ${this.getIntegrationPoints(analysis)}

${prompt}`;
        }
        return prompt;
    }

    enhanceForRefactoring(prompt, analysis) {
        if (analysis.intent === 'refactoring' || prompt.includes('refactor')) {
            return `// Large-scale refactoring task:
// Current implementation: ${prompt}
// Target improvements:
// - Code organization
// - Performance optimization
// - Maintainability enhancement
// - Type safety improvements

${prompt}

// Please consider cross-file impacts and provide migration strategy.`;
        }
        return prompt;
    }

    getFileExtension(language) {
        const extensions = {
            'javascript': '.js',
            'typescript': '.ts',
            'python': '.py',
            'java': '.java',
            'go': '.go',
            'rust': '.rs'
        };
        return extensions[language.toLowerCase()] || '.js';
    }

    getArchitecturalPattern(analysis) {
        if (analysis.domain?.includes('web')) return 'Component-based architecture (React/Vue)';
        if (analysis.domain?.includes('backend')) return 'Microservices/API-first architecture';
        if (analysis.domain?.includes('mobile')) return 'MVVM/Clean Architecture';
        return 'Modular architecture';
    }

    inferDependencies(analysis) {
        const deps = [];
        if (analysis.domain?.includes('web')) deps.push('React', 'TypeScript');
        if (analysis.domain?.includes('backend')) deps.push('Express', 'Database ORM');
        if (analysis.domain?.includes('data')) deps.push('pandas', 'numpy');
        return deps.length > 0 ? deps.join(', ') : 'Standard libraries';
    }

    getIntegrationPoints(analysis) {
        if (analysis.domain?.includes('web')) return 'API endpoints, State management, Component props';
        if (analysis.domain?.includes('backend')) return 'Database, External APIs, Authentication';
        return 'Module interfaces, Data flow';
    }

    calculateScore(original, optimized, analysis) {
        let score = 0;
        
        if (optimized.includes('File:') || optimized.includes('src/')) score += 30;
        if (optimized.includes('architecture')) score += 25;
        if (optimized.includes('dependencies') || optimized.includes('integration')) score += 20;
        if (optimized.length > original.length * 1.5) score += 15;
        if (optimized.includes('migration') || optimized.includes('cross-file')) score += 10;
        
        return Math.min(score, 100);
    }

    getAppliedOptimizations(original, optimized) {
        const optimizations = [];
        
        if (optimized.includes('File:') && !original.includes('File:')) {
            optimizations.push({
                type: 'Added file context and project structure',
                impact: 'high'
            });
        }
        
        if (optimized.includes('architecture') && !original.includes('architecture')) {
            optimizations.push({
                type: 'Enhanced with architectural context',
                impact: 'high'
            });
        }
        
        return optimizations;
    }

    getCursorTips(analysis) {
        return [
            'Reference specific files and line numbers',
            'Include project structure context',
            'Mention related components and dependencies',
            'Use architectural patterns and design principles'
        ];
    }
}

module.exports = CursorOptimizer; 