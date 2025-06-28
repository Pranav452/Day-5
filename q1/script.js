class LLMCalculator {
    constructor() {
        this.models = {
            'llama-7b': { params: 7, layers: 32, hiddenSize: 4096 },
            'llama-13b': { params: 13, layers: 40, hiddenSize: 5120 },
            'llama-70b': { params: 70, layers: 80, hiddenSize: 8192 },
            'mixtral-8x7b': { params: 56, layers: 32, hiddenSize: 4096, isMoE: true, activeParams: 14 },
            'gpt-4': { params: 1700, layers: 120, hiddenSize: 12288, isMoE: true, activeParams: 400 }
        };

        this.hardwareSpecs = {
            't4-16gb': { vram: 16, bandwidth: 320, price: 0.526, cores: 2560, power: 70 },
            'a100-40gb': { vram: 40, bandwidth: 1555, price: 2.06, cores: 6912, power: 400 },
            'a100-80gb': { vram: 80, bandwidth: 1935, price: 3.21, cores: 6912, power: 400 },
            'h100-80gb': { vram: 80, bandwidth: 3350, price: 4.13, cores: 14592, power: 700 },
            'rtx4090-24gb': { vram: 24, bandwidth: 1008, price: 1.28, cores: 16384, power: 450 }
        };

        this.quantizationMultipliers = {
            'fp32': 4,
            'fp16': 2,
            'int8': 1,
            'int4': 0.5
        };

        this.batchSizeValues = [1, 8, 16, 32, 64, 128];
        this.sequenceLengthValues = [512, 2048, 4096, 8192, 16384, 32768, 65536];
        this.concurrentUsersValues = [1, 4, 8, 16, 32, 64];

        this.initializeEventListeners();
        this.updateCalculation();
    }

    initializeEventListeners() {
        // Model selection
        document.getElementById('model-select').addEventListener('change', (e) => {
            const customParams = document.getElementById('custom-params');
            if (e.target.value === 'custom') {
                customParams.style.display = 'block';
            } else {
                customParams.style.display = 'none';
            }
            this.updateCalculation();
        });

        // Custom parameters
        document.getElementById('custom-params-input').addEventListener('input', () => {
            this.updateCalculation();
        });

        // Hardware selection
        document.getElementById('gpu-select').addEventListener('change', (e) => {
            const customVram = document.getElementById('custom-vram');
            if (e.target.value === 'custom') {
                customVram.style.display = 'block';
            } else {
                customVram.style.display = 'none';
            }
            this.updateCalculation();
        });

        // Sliders with value updates
        this.setupSlider('batch-size', 'batch-size-value', this.batchSizeValues);
        this.setupSlider('sequence-length', 'sequence-length-value', this.sequenceLengthValues, (val) => {
            return val >= 1000 ? `${(val/1000).toFixed(0)}K` : val.toString();
        });
        this.setupSlider('concurrent-users', 'concurrent-users-value', this.concurrentUsersValues);

        // Other inputs
        const updateInputs = [
            'inference-quantization', 'kv-cache-quantization', 'num-gpus',
            'custom-vram-input', 'enable-offloading', 'deployment-mode'
        ];
        
        updateInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateCalculation());
                element.addEventListener('input', () => this.updateCalculation());
            }
        });

        // Use case tabs
        document.querySelectorAll('.use-case-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.use-case-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.use-case').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.case).classList.add('active');
            });
        });
    }

    setupSlider(sliderId, valueId, values, formatter = null) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);
        
        slider.addEventListener('input', (e) => {
            const value = values[parseInt(e.target.value)];
            const displayValue = formatter ? formatter(value) : value.toLocaleString();
            valueDisplay.textContent = displayValue;
            this.updateCalculation();
        });
        
        // Initialize display
        const initialValue = values[parseInt(slider.value)];
        const displayValue = formatter ? formatter(initialValue) : initialValue.toLocaleString();
        valueDisplay.textContent = displayValue;
    }

    getCurrentConfig() {
        const modelSelect = document.getElementById('model-select').value;
        let model;
        
        if (modelSelect === 'custom') {
            const customParams = parseFloat(document.getElementById('custom-params-input').value) || 7;
            model = { 
                params: customParams, 
                layers: Math.ceil(customParams * 4), 
                hiddenSize: Math.ceil(customParams * 500) 
            };
        } else {
            model = this.models[modelSelect];
        }

        const gpuSelect = document.getElementById('gpu-select').value;
        let hardware;
        
        if (gpuSelect === 'custom') {
            const customVram = parseFloat(document.getElementById('custom-vram-input').value) || 24;
            hardware = { vram: customVram, bandwidth: 1000, price: 2.0, cores: 5000, power: 300 };
        } else {
            hardware = this.hardwareSpecs[gpuSelect];
        }

        return {
            model,
            hardware,
            inferenceQuantization: document.getElementById('inference-quantization').value,
            kvCacheQuantization: document.getElementById('kv-cache-quantization').value,
            numGpus: parseInt(document.getElementById('num-gpus').value) || 1,
            batchSize: this.batchSizeValues[parseInt(document.getElementById('batch-size').value)],
            sequenceLength: this.sequenceLengthValues[parseInt(document.getElementById('sequence-length').value)],
            concurrentUsers: this.concurrentUsersValues[parseInt(document.getElementById('concurrent-users').value)],
            enableOffloading: document.getElementById('enable-offloading').checked,
            deploymentMode: document.getElementById('deployment-mode').value
        };
    }

    calculateMemoryUsage(config) {
        if (!config.model || !config.hardware) {
            return { modelMemory: 0, kvCache: 0, activations: 0, overhead: 0, total: 0 };
        }

        const { model, inferenceQuantization, kvCacheQuantization, batchSize, sequenceLength, numGpus, concurrentUsers } = config;
        
        // Model weights memory (active parameters for MoE models)
        const activeParams = model.isMoE ? model.activeParams : model.params;
        const modelMemory = (activeParams * this.quantizationMultipliers[inferenceQuantization]) / numGpus;
        
        // KV Cache memory calculation
        // Formula: 2 * precision * layers * hidden_size * sequence_length * batch_size * concurrent_users
        const kvCachePerToken = 2 * this.quantizationMultipliers[kvCacheQuantization] * model.layers * model.hiddenSize;
        const kvCache = (kvCachePerToken * sequenceLength * batchSize * concurrentUsers) / (1024 * 1024 * 1024);
        
        // Activations memory (temporary computations)
        const activations = (batchSize * sequenceLength * model.hiddenSize * 4) / (1024 * 1024 * 1024);
        
        // Framework overhead (PyTorch, CUDA context, etc.)
        const overheadFactor = config.enableOffloading ? 0.15 : 0.20;
        const overhead = (modelMemory + kvCache + activations) * overheadFactor;
        
        const total = modelMemory + kvCache + activations + overhead;
        
        return { modelMemory, kvCache, activations, overhead, total };
    }

    calculatePerformance(config) {
        if (!config.model || !config.hardware) {
            return { generationSpeed: 0, totalThroughput: 0, latencyPerRequest: 0 };
        }

        const { model, hardware, batchSize, sequenceLength, numGpus, inferenceQuantization } = config;
        
        // Memory-bound performance estimation
        const activeParams = model.isMoE ? model.activeParams : model.params;
        const bytesPerToken = activeParams * this.quantizationMultipliers[inferenceQuantization];
        
        // Theoretical max tokens/second based on memory bandwidth
        const memoryBandwidthTotal = hardware.bandwidth * numGpus;
        const theoreticalTokensPerSec = memoryBandwidthTotal / bytesPerToken;
        
        // Efficiency factors
        // Batch size efficiency (diminishing returns)
        const batchEfficiency = Math.min(1.0, Math.log2(batchSize + 1) / 4);
        
        // Model size efficiency (larger models are less efficient)
        const modelEfficiency = Math.max(0.3, 1.0 - (model.params - 7) / 100);
        
        // Quantization efficiency boost
        const quantEfficiency = {
            'fp32': 0.8, 'fp16': 0.9, 'int8': 0.95, 'int4': 0.85
        }[inferenceQuantization] || 0.9;
        
        // Multi-GPU efficiency (communication overhead)
        const multiGpuEfficiency = Math.pow(0.95, numGpus - 1);
        
        // Calculate effective performance
        const effectiveTokensPerSec = theoreticalTokensPerSec * batchEfficiency * 
                                    modelEfficiency * quantEfficiency * multiGpuEfficiency;
        
        // Generation speed per request
        const generationSpeed = effectiveTokensPerSec / batchSize;
        
        // Total throughput
        const totalThroughput = effectiveTokensPerSec * config.concurrentUsers;
        
        // Prefill latency (quadratic complexity in sequence length)
        const prefillLatency = (sequenceLength * sequenceLength) / (hardware.cores * numGpus * 1000000);
        const decodeLatency = 1 / generationSpeed;
        const latencyPerRequest = prefillLatency + decodeLatency;
        
        return { generationSpeed, totalThroughput, latencyPerRequest };
    }

    calculateCost(config, performance) {
        if (!config.hardware) return 0;

        const { hardware, deploymentMode, numGpus } = config;
        
        switch (deploymentMode) {
            case 'local':
                // Amortized hardware cost + power
                const hourlyHardwareCost = (hardware.price * numGpus / (24 * 365 * 3)); // 3-year amortization
                const powerCostPerHour = (hardware.power * numGpus * 0.12) / 1000; // $0.12/kWh
                const totalHourlyCost = hourlyHardwareCost + powerCostPerHour;
                return totalHourlyCost * performance.latencyPerRequest / 3600;
                
            case 'cloud':
                return hardware.price * numGpus * performance.latencyPerRequest / 3600;
                
            case 'hosted':
                // API pricing approximation based on tokens
                const inputTokens = 100; // Average input length
                const outputTokens = 50; // Average response length
                const inputCost = (inputTokens / 1000000) * 5; // $5 per million input tokens
                const outputCost = (outputTokens / 1000000) * 15; // $15 per million output tokens
                return inputCost + outputCost;
                
            default:
                return 0;
        }
    }

    getHardwareCompatibility(memoryUsage, config) {
        if (!config.hardware) return 'Unknown';

        const totalVram = config.hardware.vram * config.numGpus;
        const usagePercentage = (memoryUsage.total / totalVram) * 100;
        
        if (usagePercentage <= 70) {
            return `<span class="status-indicator status-ready"></span>Compatible`;
        } else if (usagePercentage <= 90) {
            return `<span class="status-indicator status-warning"></span>Tight Fit`;
        } else if (usagePercentage <= 100) {
            return `<span class="status-indicator status-warning"></span>Requires Optimization`;
        } else {
            return `<span class="status-indicator status-error"></span>Insufficient Memory`;
        }
    }

    getRecommendations(config, memoryUsage, performance) {
        let recommendations = [];
        
        if (!config.model) {
            return '<p>Select a model to see recommendations.</p>';
        }

        const totalVram = config.hardware ? config.hardware.vram * config.numGpus : 0;
        const usagePercentage = totalVram > 0 ? (memoryUsage.total / totalVram) * 100 : 0;
        
        if (usagePercentage > 90) {
            recommendations.push('• Consider using more aggressive quantization (INT8 or INT4)');
            recommendations.push('• Reduce batch size or sequence length');
            recommendations.push('• Enable CPU/RAM offloading');
            recommendations.push('• Consider using multiple GPUs');
        }
        
        if (performance.generationSpeed < 5) {
            recommendations.push('• Consider a GPU with higher memory bandwidth');
            recommendations.push('• Reduce model size or use a fine-tuned smaller model');
        }
        
        if (config.batchSize === 1 && config.concurrentUsers > 1) {
            recommendations.push('• Increase batch size to improve throughput');
        }
        
        if (config.model.params > 70 && config.numGpus === 1) {
            recommendations.push('• Large models require multiple GPUs for optimal performance');
        }
        
        if (config.deploymentMode === 'hosted' && performance.totalThroughput > 1000) {
            recommendations.push('• Consider local deployment for high-throughput scenarios');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('• Current configuration looks optimal');
            recommendations.push('• Consider testing with real workloads to validate performance');
        }
        
        return recommendations.map(rec => `<p>${rec}</p>`).join('');
    }

    updateCalculation() {
        const config = this.getCurrentConfig();
        const memoryUsage = this.calculateMemoryUsage(config);
        const performance = this.calculatePerformance(config);
        const costPerRequest = this.calculateCost(config, performance);
        
        this.updateDisplay(config, memoryUsage, performance, costPerRequest);
    }

    updateDisplay(config, memoryUsage, performance, costPerRequest) {
        // VRAM Usage
        const totalVram = config.hardware ? config.hardware.vram * config.numGpus : 1;
        const usagePercentage = Math.min(100, (memoryUsage.total / totalVram) * 100);
        
        document.getElementById('vram-usage').textContent = `${usagePercentage.toFixed(1)}%`;
        document.getElementById('vram-used').textContent = `${memoryUsage.total.toFixed(1)} GB`;
        document.getElementById('vram-total').textContent = `${totalVram} GB`;
        
        const vramFill = document.getElementById('vram-fill');
        vramFill.style.width = `${usagePercentage}%`;
        vramFill.className = 'vram-fill';
        if (usagePercentage > 90) {
            vramFill.classList.add('danger');
        } else if (usagePercentage > 70) {
            vramFill.classList.add('warning');
        }

        // Performance Metrics
        document.getElementById('generation-speed').textContent = 
            performance.generationSpeed > 0 ? `${performance.generationSpeed.toFixed(1)} tokens/sec` : '...';
        
        document.getElementById('total-throughput').textContent = 
            performance.totalThroughput > 0 ? `${performance.totalThroughput.toFixed(1)} tokens/sec` : '...';
        
        document.getElementById('latency-per-request').textContent = 
            performance.latencyPerRequest > 0 ? `${(performance.latencyPerRequest * 1000).toFixed(0)}ms` : '...';
        
        document.getElementById('cost-per-request').textContent = 
            costPerRequest > 0 ? `$${costPerRequest.toFixed(6)}` : '...';
        
        document.getElementById('hardware-compatibility').innerHTML = 
            this.getHardwareCompatibility(memoryUsage, config);

        // Simulation Info
        const simulationInfo = document.getElementById('simulation-info');
        if (config.model && config.hardware) {
            const modelName = document.getElementById('model-select').value === 'custom' ? 
                `Custom ${config.model.params}B` : 
                document.getElementById('model-select').selectedOptions[0]?.text || 'Unknown Model';
            
            const hardwareName = document.getElementById('gpu-select').value === 'custom' ?
                `Custom ${config.hardware.vram}GB GPU` :
                document.getElementById('gpu-select').selectedOptions[0]?.text || 'Unknown GPU';
            
            simulationInfo.innerHTML = `
                <p><strong>${modelName}</strong> (${config.inferenceQuantization.toUpperCase()} Weights / ${config.kvCacheQuantization.toUpperCase()} KV Cache) on <strong>${hardwareName}</strong></p>
                <p>Input sequence length: ${config.sequenceLength.toLocaleString()} tokens</p>
                <p>Batch size: ${config.batchSize}, Concurrent users: ${config.concurrentUsers}</p>
                <p>Memory breakdown: Model ${memoryUsage.modelMemory.toFixed(1)}GB + KV Cache ${memoryUsage.kvCache.toFixed(1)}GB + Activations ${memoryUsage.activations.toFixed(1)}GB + Overhead ${memoryUsage.overhead.toFixed(1)}GB</p>
            `;
        } else {
            simulationInfo.innerHTML = '<p>Configure model and hardware to enable simulation</p>';
        }

        // Recommendations
        document.getElementById('recommendations-content').innerHTML = 
            this.getRecommendations(config, memoryUsage, performance);
    }
}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LLMCalculator();
}); 