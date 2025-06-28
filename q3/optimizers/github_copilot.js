class GitHubCopilotOptimizer {
    constructor(toolConfig) {
        this.config = toolConfig;
        this.name = "GitHub Copilot";
        this.transformationRules = this.initializeRules();
    }

    initializeRules() {
        return {
            codeGeneration: [
                {
                    condition: (analysis) => analysis.intent === 'code_generation',
                    transform: (prompt, analysis) => this.addFunctionSignature(prompt, analysis),
                    explanation: "Added clear function signature for better code completion"
                },
                {
                    condition: (analysis) => analysis.complexity === 'simple',
                    transform: (prompt, analysis) => this.addCommentContext(prompt, analysis),
                    explanation: "Added descriptive comments to guide code generation"
                },
                {
                    condition: (analysis) => analysis.domain && analysis.domain.includes('web'),
                    transform: (prompt, analysis) => this.addWebContext(prompt, analysis),
                    explanation: "Enhanced with web development context"
                }
            ],
            debugging: [
                {
                    condition: (analysis) => analysis.intent === 'debugging',
                    transform: (prompt, analysis) => this.addErrorContext(prompt, analysis),
                    explanation: "Added structured error context for better debugging assistance"
                },
                {
                    condition: (analysis) => prompt.includes('error') || prompt.includes('bug'),
                    transform: (prompt, analysis) => this.addExpectedBehavior(prompt, analysis),
                    explanation: "Clarified expected vs actual behavior"
                }
            ],
            refactoring: [
                {
                    condition: (analysis) => analysis.intent === 'refactoring',
                    transform: (prompt, analysis) => this.addRefactoringGoals(prompt, analysis),
                    explanation: "Specified clear refactoring objectives"
                }
            ]
        };
    }

    optimize(prompt, analysis) {
        let optimizedPrompt = prompt;
        const appliedOptimizations = [];

        // Apply intent-specific transformations
        const relevantRules = this.transformationRules[analysis.intent] || [];
        
        for (const rule of relevantRules) {
            if (rule.condition(analysis)) {
                const transformedPrompt = rule.transform(optimizedPrompt, analysis);
                if (transformedPrompt !== optimizedPrompt) {
                    optimizedPrompt = transformedPrompt;
                    appliedOptimizations.push({
                        type: rule.explanation,
                        before: prompt,
                        after: optimizedPrompt,
                        impact: this.assessImpact(rule, analysis)
                    });
                }
            }
        }

        // Apply general optimizations
        optimizedPrompt = this.applyGeneralOptimizations(optimizedPrompt, analysis);

        return {
            original: prompt,
            optimized: optimizedPrompt,
            optimizations: appliedOptimizations,
            score: this.calculateOptimizationScore(prompt, optimizedPrompt, analysis),
            toolSpecificTips: this.getToolSpecificTips(analysis)
        };
    }

    addFunctionSignature(prompt, analysis) {
        // Extract function name and parameters if not already present
        const functionNameMatch = prompt.match(/function\s+(\w+)/i) || 
                                prompt.match(/(\w+)\s*function/i) ||
                                prompt.match(/create\s+(\w+)/i);
        
        if (!functionNameMatch && analysis.codeContext) {
            const language = analysis.codeContext.language || 'javascript';
            
            if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
                return `// Function to ${prompt.toLowerCase().replace(/create|build|make/, '').trim()}
function ${this.generateFunctionName(prompt)}(${this.generateParameters(prompt, analysis)}) {
    // ${prompt}
}`;
            } else if (language.toLowerCase() === 'python') {
                return `def ${this.generateFunctionName(prompt)}(${this.generateParameters(prompt, analysis)}):
    """${prompt}"""
    # Implementation here
    pass`;
            }
        }
        
        return prompt;
    }

    addCommentContext(prompt, analysis) {
        if (!prompt.includes('//') && !prompt.includes('#') && !prompt.includes('/*')) {
            const language = analysis.codeContext?.language || 'javascript';
            const commentStyle = this.getCommentStyle(language);
            
            return `${commentStyle} ${prompt}
${commentStyle} Expected output: ${this.generateExpectedOutput(prompt, analysis)}
${commentStyle} Requirements: ${this.extractRequirements(prompt)}

${prompt}`;
        }
        return prompt;
    }

    addWebContext(prompt, analysis) {
        if (analysis.domain && analysis.domain.includes('web')) {
            const webKeywords = ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular'];
            const foundKeywords = webKeywords.filter(keyword => 
                prompt.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (foundKeywords.length > 0) {
                return `// Web development task using ${foundKeywords.join(', ')}
// Browser compatibility: Modern browsers (ES6+)
// ${prompt}`;
            }
        }
        return prompt;
    }

    addErrorContext(prompt, analysis) {
        if (analysis.intent === 'debugging' && !prompt.includes('Error:') && !prompt.includes('Expected:')) {
            return `// Debug the following issue:
// Problem: ${prompt}
// Error: [Include actual error message here]
// Expected behavior: [Describe what should happen]
// Current behavior: [Describe what actually happens]

${prompt}`;
        }
        return prompt;
    }

    addExpectedBehavior(prompt, analysis) {
        if (!prompt.includes('expected') && !prompt.includes('should')) {
            return `${prompt}

// Expected behavior: [Describe what the code should do]
// Actual behavior: [Describe what's currently happening]
// Steps to reproduce: [List steps to trigger the issue]`;
        }
        return prompt;
    }

    addRefactoringGoals(prompt, analysis) {
        if (analysis.intent === 'refactoring' && !prompt.includes('goal') && !prompt.includes('improve')) {
            return `// Refactoring objective: ${prompt}
// Goals:
// - Improve readability
// - Enhance maintainability
// - Optimize performance
// - Follow best practices

${prompt}`;
        }
        return prompt;
    }

    applyGeneralOptimizations(prompt, analysis) {
        let optimized = prompt;

        // Add type hints for TypeScript/JavaScript
        if (analysis.codeContext?.language === 'typescript' && !prompt.includes(':')) {
            optimized = this.addTypeHints(optimized, analysis);
        }

        // Ensure optimal length for Copilot
        if (optimized.length > this.config.maxPromptLength) {
            optimized = this.truncatePrompt(optimized, this.config.maxPromptLength);
        }

        // Add usage examples if missing
        if (!optimized.includes('example') && analysis.complexity !== 'simple') {
            optimized += '\n\n// Example usage:\n// ' + this.generateUsageExample(optimized, analysis);
        }

        return optimized;
    }

    generateFunctionName(prompt) {
        const words = prompt.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .filter(word => word.length > 2 && !['the', 'and', 'for', 'to'].includes(word));
        
        if (words.length === 0) return 'handleTask';
        
        const functionName = words[0] + words.slice(1).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
        
        return functionName;
    }

    generateParameters(prompt, analysis) {
        const commonParams = {
            'array': 'arr',
            'list': 'items',
            'data': 'data',
            'user': 'user',
            'string': 'str',
            'number': 'num',
            'object': 'obj'
        };

        const foundParams = Object.keys(commonParams).filter(param =>
            prompt.toLowerCase().includes(param)
        );

        if (foundParams.length > 0) {
            return foundParams.map(param => commonParams[param]).join(', ');
        }

        return 'input';
    }

    generateExpectedOutput(prompt, analysis) {
        if (prompt.includes('function')) return 'Function implementation';
        if (prompt.includes('component')) return 'React/Vue component';
        if (prompt.includes('class')) return 'Class definition';
        if (prompt.includes('api')) return 'API endpoint implementation';
        return 'Working code solution';
    }

    extractRequirements(prompt) {
        const requirements = [];
        
        if (prompt.includes('secure')) requirements.push('Security compliance');
        if (prompt.includes('fast') || prompt.includes('performance')) requirements.push('High performance');
        if (prompt.includes('responsive')) requirements.push('Responsive design');
        if (prompt.includes('accessible')) requirements.push('Accessibility compliance');
        
        return requirements.length > 0 ? requirements.join(', ') : 'Clean, maintainable code';
    }

    getCommentStyle(language) {
        const styles = {
            'javascript': '//',
            'typescript': '//',
            'python': '#',
            'java': '//',
            'c++': '//',
            'c': '//',
            'go': '//',
            'rust': '//',
            'php': '//',
            'ruby': '#',
            'shell': '#'
        };
        return styles[language.toLowerCase()] || '//';
    }

    addTypeHints(prompt, analysis) {
        // Add basic TypeScript type hints
        return prompt.replace(
            /function\s+(\w+)\s*\(([^)]*)\)/g,
            (match, funcName, params) => {
                const typedParams = params.split(',').map(param => {
                    const trimmed = param.trim();
                    if (trimmed && !trimmed.includes(':')) {
                        return `${trimmed}: any`;
                    }
                    return trimmed;
                }).join(', ');
                return `function ${funcName}(${typedParams}): any`;
            }
        );
    }

    truncatePrompt(prompt, maxLength) {
        if (prompt.length <= maxLength) return prompt;
        
        const lines = prompt.split('\n');
        let truncated = '';
        
        for (const line of lines) {
            if (truncated.length + line.length + 1 <= maxLength - 50) {
                truncated += line + '\n';
            } else {
                break;
            }
        }
        
        return truncated + '\n// ... (truncated for optimal length)';
    }

    generateUsageExample(prompt, analysis) {
        const functionName = this.generateFunctionName(prompt);
        const language = analysis.codeContext?.language || 'javascript';
        
        if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'typescript') {
            return `const result = ${functionName}(exampleInput);`;
        } else if (language.toLowerCase() === 'python') {
            return `result = ${functionName}(example_input)`;
        }
        
        return `${functionName}(example);`;
    }

    calculateOptimizationScore(original, optimized, analysis) {
        let score = 0;
        
        // Length optimization (closer to optimal length = higher score)
        const optimalLength = this.config.optimalPromptLength;
        const lengthRatio = Math.min(optimized.length / optimalLength, 2);
        score += (2 - lengthRatio) * 25;
        
        // Context richness
        const contextKeywords = ['function', 'example', 'expected', 'error', 'goal'];
        const contextCount = contextKeywords.filter(keyword => 
            optimized.toLowerCase().includes(keyword)
        ).length;
        score += (contextCount / contextKeywords.length) * 25;
        
        // Tool-specific optimizations
        if (optimized.includes('//') || optimized.includes('#')) score += 15;
        if (optimized.includes('function') || optimized.includes('def')) score += 15;
        if (optimized.includes('example')) score += 10;
        if (optimized.includes('Expected:') || optimized.includes('Error:')) score += 10;
        
        return Math.min(Math.round(score), 100);
    }

    assessImpact(rule, analysis) {
        const impacts = {
            'Added clear function signature for better code completion': 'high',
            'Added descriptive comments to guide code generation': 'medium',
            'Enhanced with web development context': 'medium',
            'Added structured error context for better debugging assistance': 'high',
            'Clarified expected vs actual behavior': 'high',
            'Specified clear refactoring objectives': 'medium'
        };
        
        return impacts[rule.explanation] || 'low';
    }

    getToolSpecificTips(analysis) {
        const tips = [
            "Use descriptive function names and parameter names",
            "Include type hints for better IntelliSense support",
            "Add comments explaining the intended behavior",
            "Provide usage examples in comments"
        ];

        if (analysis.intent === 'debugging') {
            tips.push("Include error messages and expected behavior");
            tips.push("Provide minimal reproducible code examples");
        }

        if (analysis.complexity === 'complex') {
            tips.push("Break complex tasks into smaller, focused prompts");
            tips.push("Include architectural context and constraints");
        }

        return tips.slice(0, 4); // Return top 4 tips
    }
}

module.exports = GitHubCopilotOptimizer; 