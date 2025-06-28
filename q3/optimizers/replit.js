class ReplitOptimizer {
    constructor(toolConfig) {
        this.config = toolConfig;
        this.name = "Replit AI";
    }

    optimize(prompt, analysis) {
        let optimizedPrompt = this.makeBeginnerfriendly(prompt, analysis);
        optimizedPrompt = this.addStepByStep(optimizedPrompt, analysis);
        optimizedPrompt = this.includeSetupInstructions(optimizedPrompt, analysis);

        return {
            original: prompt,
            optimized: optimizedPrompt,
            optimizations: this.getOptimizations(prompt, optimizedPrompt),
            score: this.calculateScore(prompt, optimizedPrompt, analysis),
            toolSpecificTips: this.getReplitTips(analysis)
        };
    }

    makeBeginnerfriendly(prompt, analysis) {
        return `Create a beginner-friendly tutorial for: ${prompt}

Please explain each concept and provide simple examples.
Assume minimal prior programming knowledge.

Task: ${prompt}`;
    }

    addStepByStep(prompt, analysis) {
        if (!prompt.includes('step') && !prompt.includes('tutorial')) {
            return `${prompt}

Please break this down into clear steps:
1. Setup and prerequisites
2. Basic implementation
3. Testing the solution
4. Common mistakes to avoid
5. Next steps for improvement`;
        }
        return prompt;
    }

    includeSetupInstructions(prompt, analysis) {
        const language = analysis.codeContext?.language || 'javascript';
        return `${prompt}

Setup instructions for ${language}:
- Required tools and dependencies
- Project initialization
- Basic file structure
- How to run and test the code`;
    }

    calculateScore(original, optimized, analysis) {
        let score = 0;
        
        if (optimized.includes('beginner') || optimized.includes('tutorial')) score += 30;
        if (optimized.includes('step')) score += 25;
        if (optimized.includes('setup') || optimized.includes('prerequisites')) score += 20;
        if (optimized.includes('explain') || optimized.includes('simple')) score += 15;
        if (optimized.includes('mistakes') || optimized.includes('avoid')) score += 10;
        
        return Math.min(score, 100);
    }

    getOptimizations(original, optimized) {
        return [
            {
                type: 'Enhanced for beginner-friendly learning',
                impact: 'high'
            },
            {
                type: 'Added step-by-step tutorial structure',
                impact: 'high'
            }
        ];
    }

    getReplitTips(analysis) {
        return [
            'Use tutorial-style explanations',
            'Include setup and prerequisites',
            'Break complex tasks into simple steps',
            'Provide practical examples and exercises'
        ];
    }
}

module.exports = ReplitOptimizer; 