class ClaudeOptimizer {
    constructor(toolConfig) {
        this.config = toolConfig;
        this.name = "Claude (Anthropic)";
    }

    optimize(prompt, analysis) {
        let optimizedPrompt = this.addAnalyticalStructure(prompt, analysis);
        optimizedPrompt = this.enhanceForExplanation(optimizedPrompt, analysis);
        optimizedPrompt = this.addComprehensiveContext(optimizedPrompt, analysis);

        return {
            original: prompt,
            optimized: optimizedPrompt,
            optimizations: this.getOptimizations(prompt, optimizedPrompt),
            score: this.calculateScore(prompt, optimizedPrompt, analysis),
            toolSpecificTips: this.getClaudeTips(analysis)
        };
    }

    addAnalyticalStructure(prompt, analysis) {
        if (analysis.intent === 'code_review' || analysis.intent === 'learning') {
            return `Please provide a comprehensive analysis of: ${prompt}

Structure your response with:
1. Initial assessment and understanding
2. Detailed breakdown of components/logic
3. Strengths and potential improvements
4. Best practices and recommendations
5. Example implementation or fixes
6. Learning takeaways and next steps

Task: ${prompt}`;
        }
        return prompt;
    }

    enhanceForExplanation(prompt, analysis) {
        if (!prompt.includes('explain') && !prompt.includes('analyze')) {
            return `${prompt}

Please provide detailed explanations for:
- Design decisions and rationale
- Code structure and organization
- Potential edge cases and considerations
- Performance and security implications
- Alternative approaches and trade-offs`;
        }
        return prompt;
    }

    addComprehensiveContext(prompt, analysis) {
        const contextElements = [];
        
        if (analysis.complexity === 'complex') {
            contextElements.push('architectural considerations');
            contextElements.push('scalability implications');
            contextElements.push('maintainability factors');
        }
        
        if (analysis.domain) {
            contextElements.push(`${analysis.domain.join(', ')} best practices`);
        }
        
        if (contextElements.length > 0) {
            return `Context for analysis: ${contextElements.join(', ')}

${prompt}

Please consider the full context and provide comprehensive insights.`;
        }
        
        return prompt;
    }

    calculateScore(original, optimized, analysis) {
        let score = 0;
        
        if (optimized.includes('analyze') || optimized.includes('explain')) score += 25;
        if (optimized.includes('comprehensive') || optimized.includes('detailed')) score += 20;
        if (optimized.includes('trade-offs') || optimized.includes('considerations')) score += 20;
        if (optimized.includes('Structure your response')) score += 15;
        if (optimized.includes('best practices')) score += 10;
        if (optimized.length > original.length * 2) score += 10;
        
        return Math.min(score, 100);
    }

    getOptimizations(original, optimized) {
        const opts = [];
        
        if (optimized.includes('Structure your response') && !original.includes('Structure')) {
            opts.push({
                type: 'Added analytical structure for comprehensive response',
                impact: 'high'
            });
        }
        
        if (optimized.includes('explain') && !original.includes('explain')) {
            opts.push({
                type: 'Enhanced for detailed explanations',
                impact: 'medium'
            });
        }
        
        return opts;
    }

    getClaudeTips(analysis) {
        return [
            'Request detailed explanations and rationale',
            'Ask for multiple approaches and trade-offs',
            'Include context about constraints and requirements',
            'Structure requests for comprehensive analysis'
        ];
    }
}

module.exports = ClaudeOptimizer; 