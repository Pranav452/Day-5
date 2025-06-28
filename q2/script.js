// AI Coding Agent Recommendation System
class AgentRecommender {
    constructor() {
        this.agents = [];
        this.taskKeywords = {
            domains: {
                "web development": ["website", "frontend", "backend", "react", "angular", "vue", "html", "css", "javascript", "web", "browser"],
                "mobile development": ["app", "mobile", "ios", "android", "flutter", "react native", "native"],
                "data science": ["data", "analysis", "machine learning", "pandas", "numpy", "visualization", "statistics", "ml", "ai"],
                "backend": ["server", "api", "database", "nodejs", "python", "java", "microservice", "rest"],
                "devops": ["deployment", "docker", "kubernetes", "ci/cd", "infrastructure", "cloud", "aws", "azure"],
                "game development": ["game", "unity", "unreal", "pygame", "gaming"],
                "enterprise": ["enterprise", "corporate", "large scale", "team", "organization"]
            },
            complexity: {
                "beginner": ["simple", "basic", "learning", "tutorial", "first time", "new", "beginner", "easy"],
                "intermediate": ["moderate", "some experience", "familiar with", "intermediate"],
                "advanced": ["complex", "enterprise", "optimization", "performance", "advanced", "expert"]
            },
            features: {
                "realTime": ["live", "real-time", "instant", "immediate", "fast"],
                "offline": ["offline", "no internet", "local"],
                "teamSupport": ["team", "collaboration", "multiple developers", "group"],
                "codeGeneration": ["generate", "create", "write code", "autocomplete"],
                "debugging": ["debug", "fix", "error", "bug"],
                "documentation": ["document", "explain", "comment", "understand"]
            }
        };
        
        this.weights = {
            domainMatch: 0.30,
            complexityMatch: 0.25,
            featureRelevance: 0.25,
            accessibility: 0.20
        };

        this.init();
    }

    async init() {
        await this.loadAgents();
        this.setupEventListeners();
        this.displayAllAgents();
    }

    async loadAgents() {
        try {
            const response = await fetch('agents-db.json');
            const data = await response.json();
            this.agents = data.agents;
        } catch (error) {
            console.error('Error loading agents database:', error);
        }
    }

    setupEventListeners() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const taskDescription = document.getElementById('task-description');
        const exampleCards = document.querySelectorAll('.example-card');

        analyzeBtn.addEventListener('click', () => this.analyzeTask());
        
        exampleCards.forEach(card => {
            card.addEventListener('click', () => {
                const example = card.dataset.example;
                taskDescription.value = example;
                taskDescription.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    analyzeTask() {
        const taskDescription = document.getElementById('task-description').value.trim();
        
        if (!taskDescription) {
            alert('Please enter a task description.');
            return;
        }

        this.showLoading();
        
        setTimeout(() => {
            const taskData = this.parseTask(taskDescription);
            const recommendations = this.generateRecommendations(taskData);
            this.displayRecommendations(recommendations, taskData);
            this.hideLoading();
        }, 1500);
    }

    parseTask(description) {
        const lowerDesc = description.toLowerCase();
        const filterValues = this.getFilterValues();
        
        const taskData = {
            description: description,
            domains: [],
            complexity: [],
            features: [],
            budget: filterValues.budget || null,
            teamSize: filterValues.teamSize || null,
            projectType: filterValues.projectType || null,
            experienceLevel: filterValues.experienceLevel || null
        };

        // Extract domains
        for (const [domain, keywords] of Object.entries(this.taskKeywords.domains)) {
            const score = keywords.reduce((acc, keyword) => {
                return acc + (lowerDesc.includes(keyword) ? 1 : 0);
            }, 0);
            
            if (score > 0 || domain === taskData.projectType) {
                taskData.domains.push({ domain, score: score + (domain === taskData.projectType ? 5 : 0) });
            }
        }

        // Extract complexity
        for (const [complexity, keywords] of Object.entries(this.taskKeywords.complexity)) {
            const score = keywords.reduce((acc, keyword) => {
                return acc + (lowerDesc.includes(keyword) ? 1 : 0);
            }, 0);
            
            if (score > 0 || complexity === taskData.experienceLevel) {
                taskData.complexity.push({ complexity, score: score + (complexity === taskData.experienceLevel ? 3 : 0) });
            }
        }

        // Extract features
        for (const [feature, keywords] of Object.entries(this.taskKeywords.features)) {
            const score = keywords.reduce((acc, keyword) => {
                return acc + (lowerDesc.includes(keyword) ? 1 : 0);
            }, 0);
            
            if (score > 0) {
                taskData.features.push({ feature, score });
            }
        }

        if (taskData.domains.length === 0) {
            taskData.domains.push({ domain: 'web development', score: 1 });
        }
        
        if (taskData.complexity.length === 0) {
            taskData.complexity.push({ complexity: 'intermediate', score: 1 });
        }

        return taskData;
    }

    getFilterValues() {
        return {
            projectType: document.getElementById('project-type').value,
            experienceLevel: document.getElementById('experience-level').value,
            teamSize: document.getElementById('team-size').value,
            budget: document.getElementById('budget').value
        };
    }

    generateRecommendations(taskData) {
        const scoredAgents = this.agents.map(agent => {
            const score = this.calculateAgentScore(agent, taskData);
            return { agent, score, reasons: this.getRecommendationReasons(agent, taskData) };
        });

        return scoredAgents.sort((a, b) => b.score - a.score).slice(0, 10);
    }

    calculateAgentScore(agent, taskData) {
        let score = 0;

        const domainScore = this.calculateDomainMatch(agent, taskData);
        score += domainScore * this.weights.domainMatch;

        const complexityScore = this.calculateComplexityMatch(agent, taskData);
        score += complexityScore * this.weights.complexityMatch;

        const featureScore = this.calculateFeatureScore(agent, taskData);
        score += featureScore * this.weights.featureRelevance;

        const accessibilityScore = this.calculateAccessibilityScore(agent, taskData);
        score += accessibilityScore * this.weights.accessibility;

        return Math.round(score * 100) / 100;
    }

    calculateDomainMatch(agent, taskData) {
        if (!taskData.domains.length) return 0.5;

        let totalScore = 0;
        let maxPossibleScore = 0;

        taskData.domains.forEach(({ domain, score: domainScore }) => {
            maxPossibleScore += domainScore;
            if (agent.domains.includes(domain)) {
                totalScore += domainScore;
            }
        });

        return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
    }

    calculateComplexityMatch(agent, taskData) {
        if (!taskData.complexity.length) return 0.5;

        let totalScore = 0;
        let maxPossibleScore = 0;

        taskData.complexity.forEach(({ complexity, score: complexityScore }) => {
            maxPossibleScore += complexityScore;
            if (agent.complexity.includes(complexity)) {
                totalScore += complexityScore;
            }
        });

        return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
    }

    calculateFeatureScore(agent, taskData) {
        if (!taskData.features.length) return 0.5;

        let totalScore = 0;
        let maxPossibleScore = 0;

        taskData.features.forEach(({ feature, score: featureScore }) => {
            maxPossibleScore += featureScore;
            
            if (feature === 'realTime' && agent.features.realTime) totalScore += featureScore;
            if (feature === 'offline' && agent.features.offline) totalScore += featureScore;
            if (feature === 'teamSupport' && agent.features.teamSupport) totalScore += featureScore;
            if (feature === 'codeGeneration' && agent.features.codeGeneration >= 7) totalScore += featureScore;
            if (feature === 'debugging' && agent.features.debugging >= 7) totalScore += featureScore;
            if (feature === 'documentation' && agent.features.documentation >= 7) totalScore += featureScore;
        });

        return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0.5;
    }

    calculateAccessibilityScore(agent, taskData) {
        let score = 0;

        if (taskData.budget) {
            if (taskData.budget === 'free' && agent.pricing === 'free') score += 0.8;
            else if (taskData.budget === 'freemium' && ['free', 'freemium'].includes(agent.pricing)) score += 0.6;
            else if (taskData.budget === 'paid' && agent.pricing !== 'free') score += 0.4;
            else score += 0.2;
        } else {
            if (agent.pricing === 'free') score += 0.5;
            else if (agent.pricing === 'freemium') score += 0.4;
            else score += 0.3;
        }

        score += (agent.features.learningCurve / 10) * 0.5;

        return Math.min(score, 1);
    }

    getRecommendationReasons(agent, taskData) {
        const reasons = [];

        const matchingDomains = agent.domains.filter(domain => 
            taskData.domains.some(td => td.domain === domain)
        );
        if (matchingDomains.length > 0) {
            reasons.push(`Strong fit for ${matchingDomains.join(', ')}`);
        }

        if (agent.features.codeGeneration >= 8) {
            reasons.push('Excellent code generation capabilities');
        }
        if (agent.features.debugging >= 8) {
            reasons.push('Strong debugging features');
        }
        if (agent.features.learningCurve >= 8) {
            reasons.push('Easy to learn and use');
        }

        if (agent.pricing === 'free') {
            reasons.push('Completely free to use');
        } else if (agent.pricing === 'freemium') {
            reasons.push('Free tier available');
        }

        return reasons.slice(0, 3);
    }

    displayRecommendations(recommendations, taskData) {
        const resultsSection = document.getElementById('results-section');
        const recommendationsGrid = document.getElementById('recommendations-grid');
        
        resultsSection.style.display = 'block';
        recommendationsGrid.innerHTML = '';

        const top3 = recommendations.slice(0, 3);
        top3.forEach((rec, index) => {
            const card = this.createRecommendationCard(rec, index + 1);
            recommendationsGrid.appendChild(card);
        });

        this.updateComparisonTable(top3);
        this.updateAllAgentsSection(recommendations);

        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createRecommendationCard(recommendation, rank) {
        const { agent, score, reasons } = recommendation;
        
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        
        card.innerHTML = `
            <div class="recommendation-rank">${rank}</div>
            <div class="agent-header">
                <div class="agent-logo">
                    <i class="${this.getAgentIcon(agent.id)}"></i>
                </div>
                <div class="agent-info">
                    <h3>${agent.name}</h3>
                    <p>${agent.description}</p>
                </div>
            </div>
            
            <div class="match-score">
                ${Math.round(score * 100)}% Match
            </div>
            
            <div class="strengths">
                <h4>Why This Agent?</h4>
                <ul>
                    ${reasons.map(reason => `<li>${reason}</li>`).join('')}
                </ul>
            </div>
            
            <div class="agent-details">
                <div class="detail-item">
                    <strong>Pricing:</strong> ${agent.cost}
                </div>
                <div class="detail-item">
                    <strong>Setup Time:</strong> ${agent.setupTime}
                </div>
            </div>
            
            <div class="agent-actions">
                <a href="${agent.officialUrl}" target="_blank" class="btn-primary">
                    Visit Website
                </a>
                <button class="btn-secondary" onclick="agentRecommender.showAgentDetails('${agent.id}')">
                    Details
                </button>
            </div>
        `;
        
        return card;
    }

    updateComparisonTable(top3) {
        const table = document.getElementById('comparison-table');
        
        if (top3.length === 0) {
            table.innerHTML = '<tr><td>No recommendations available</td></tr>';
            return;
        }

        const headers = ['Feature', ...top3.map(rec => rec.agent.name)];
        const features = [
            { name: 'Code Generation', key: 'codeGeneration' },
            { name: 'Debugging', key: 'debugging' },
            { name: 'Documentation', key: 'documentation' },
            { name: 'Real-time', key: 'realTime' },
            { name: 'Offline', key: 'offline' },
            { name: 'Team Support', key: 'teamSupport' }
        ];

        let tableHTML = `
            <thead>
                <tr>
                    ${headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
        `;

        features.forEach(feature => {
            tableHTML += '<tr>';
            tableHTML += `<td><strong>${feature.name}</strong></td>`;
            
            top3.forEach(rec => {
                const value = rec.agent.features[feature.key];
                let displayValue = value;
                let scoreClass = 'score-medium';
                
                if (typeof value === 'boolean') {
                    displayValue = value ? '✓' : '✗';
                    scoreClass = value ? 'score-high' : 'score-low';
                } else if (typeof value === 'number') {
                    scoreClass = value >= 7 ? 'score-high' : value >= 5 ? 'score-medium' : 'score-low';
                }
                
                tableHTML += `<td><span class="feature-score ${scoreClass}">${displayValue}</span></td>`;
            });
            
            tableHTML += '</tr>';
        });

        tableHTML += '<tr>';
        tableHTML += '<td><strong>Pricing</strong></td>';
        top3.forEach(rec => {
            tableHTML += `<td>${rec.agent.cost}</td>`;
        });
        tableHTML += '</tr>';

        tableHTML += '</tbody>';
        table.innerHTML = tableHTML;
    }

    updateAllAgentsSection(recommendations) {
        const grid = document.getElementById('all-agents-grid');
        grid.innerHTML = '';

        recommendations.forEach(rec => {
            const miniCard = document.createElement('div');
            miniCard.className = 'agent-mini-card';
            miniCard.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <div style="width: 30px; height: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; margin-right: 0.75rem;">
                        <i class="${this.getAgentIcon(rec.agent.id)}" style="font-size: 0.9rem;"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 1rem;">${rec.agent.name}</h4>
                        <span style="color: #27ae60; font-weight: 600; font-size: 0.8rem;">${Math.round(rec.score * 100)}% match</span>
                    </div>
                </div>
                <p style="font-size: 0.8rem; color: #7f8c8d; margin: 0;">${rec.agent.description.substring(0, 80)}...</p>
                <div style="margin-top: 0.5rem;">
                    <span style="background: #e1e8ed; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.7rem; color: #2c3e50;">${rec.agent.cost}</span>
                </div>
            `;
            
            grid.appendChild(miniCard);
        });
    }

    displayAllAgents() {
        const grid = document.getElementById('all-agents-grid');
        if (!grid || this.agents.length === 0) return;

        const allRecommendations = this.agents.map(agent => ({
            agent,
            score: 0.5,
            reasons: ['Available for comparison']
        }));

        this.updateAllAgentsSection(allRecommendations);
    }

    getAgentIcon(agentId) {
        const iconMap = {
            'github-copilot': 'fab fa-github',
            'cursor': 'fas fa-mouse-pointer',
            'replit-ai': 'fas fa-code',
            'amazon-codewhisperer': 'fab fa-aws',
            'tabnine': 'fas fa-magic',
            'codeium': 'fas fa-rocket',
            'claude-dev': 'fas fa-brain',
            'sourcegraph-cody': 'fas fa-search',
            'chatgpt-coding': 'fas fa-robot',
            'aider': 'fas fa-terminal'
        };
        
        return iconMap[agentId] || 'fas fa-code';
    }

    showAgentDetails(agentId) {
        const agent = this.agents.find(a => a.id === agentId);
        if (!agent) return;

        alert(`${agent.name}\n\n${agent.description}\n\nPricing: ${agent.cost}\nSetup: ${agent.setupTime}\n\nStrengths:\n${agent.strengths.join('\n')}`);
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('recommendations-grid').style.display = 'none';
        document.querySelector('.comparison-section').style.display = 'none';
        document.querySelector('.all-agents-section').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('recommendations-grid').style.display = 'grid';
        document.querySelector('.comparison-section').style.display = 'block';
        document.querySelector('.all-agents-section').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.agentRecommender = new AgentRecommender();
}); 