# LLM Inference Research Notes

## Table of Contents
1. [LLM Inference Fundamentals](#llm-inference-fundamentals)
2. [Model Comparisons](#model-comparisons)
3. [Hardware Requirements](#hardware-requirements)
4. [Performance Characteristics](#performance-characteristics)
5. [Cost Analysis](#cost-analysis)
6. [Key Findings](#key-findings)

## LLM Inference Fundamentals

### What is LLM Inference?
LLM inference is the process of using a trained large language model to generate predictions or responses. Unlike training, which teaches the model, inference applies the learned knowledge to new inputs.

### Two-Phase Inference Process

#### 1. Prefill Phase (Prompt Processing)
- **Operation**: Process the entire input prompt in parallel
- **Characteristics**: Compute-bound, high GPU utilization
- **Complexity**: O(n²) where n = sequence length due to attention mechanism
- **Memory Access**: Sequential reading of model parameters

#### 2. Decode Phase (Token Generation)
- **Operation**: Generate tokens one at a time, autoregressively
- **Characteristics**: Memory-bound, lower GPU utilization
- **Complexity**: O(1) per token with KV caching
- **Memory Access**: Repeated parameter loading from VRAM

### Memory Components

#### Model Weights
```
Memory = Parameters × Precision × (1/num_gpus)
```
- **Parameters**: Total or active parameters (for MoE models)
- **Precision**: 4 bytes (FP32), 2 bytes (FP16), 1 byte (INT8), 0.5 bytes (INT4)

#### KV Cache
```
KV Cache = 2 × Precision × Layers × Hidden_Size × Sequence_Length × Batch_Size
```
- **Purpose**: Store attention keys and values to avoid recomputation
- **Growth**: Linear with sequence length and batch size
- **Impact**: Becomes dominant for long sequences

#### Activations
```
Activations = Batch_Size × Sequence_Length × Hidden_Size × 4
```
- **Purpose**: Intermediate computations during forward pass
- **Characteristics**: Temporary memory, freed after computation

#### Framework Overhead
- **PyTorch/CUDA context**: ~15-20% of total memory
- **Gradient buffers**: Not needed for inference
- **Optimizer states**: Not needed for inference

## Model Comparisons

### Llama 2 7B
**Architecture**: Decoder-only transformer
**Parameters**: 7.0 billion
**Layers**: 32
**Hidden Size**: 4,096
**Attention Heads**: 32

**Memory Requirements (FP16)**:
- Model weights: 14 GB
- KV cache (2K context, batch=1): 0.5 GB
- Total (with overhead): ~17.5 GB

**Performance Characteristics**:
- Generation speed: 15-25 tokens/sec (A100)
- Suitable for: Chatbots, small-scale applications
- Hardware: Fits on single A100 40GB

**Use Cases**:
- Real-time chat applications
- Code completion
- Simple Q&A systems

### Llama 2 13B
**Architecture**: Decoder-only transformer
**Parameters**: 13.0 billion
**Layers**: 40
**Hidden Size**: 5,120
**Attention Heads**: 40

**Memory Requirements (FP16)**:
- Model weights: 26 GB
- KV cache (2K context, batch=1): 1.0 GB
- Total (with overhead): ~32 GB

**Performance Characteristics**:
- Generation speed: 10-18 tokens/sec (A100)
- Suitable for: Higher quality responses, reasoning tasks
- Hardware: Requires A100 80GB or multiple smaller GPUs

**Use Cases**:
- Document summarization
- Complex reasoning tasks
- Content generation

### GPT-4 (Estimated)
**Architecture**: Mixture of Experts (MoE) transformer
**Total Parameters**: ~1.7 trillion (estimated)
**Active Parameters**: ~400 billion per token
**Layers**: ~120 (estimated)
**Hidden Size**: ~12,288 (estimated)

**Memory Requirements (FP16)**:
- Model weights: 800+ GB total, ~400 GB active
- KV cache: Massive for long contexts
- Total: Requires multiple H100s with model parallelism

**Performance Characteristics**:
- Generation speed: 50-100 tokens/sec (distributed)
- Latency: 200-500ms to first token
- Hardware: 8-16 H100 GPUs minimum

**Use Cases**:
- Advanced reasoning and analysis
- Complex multi-turn conversations
- Professional content creation

## Hardware Requirements

### Memory Bandwidth Bottleneck
Most LLM inference is **memory-bound**, meaning performance is limited by how fast we can read model parameters from VRAM.

```
Theoretical Max Tokens/Sec = Memory_Bandwidth / Bytes_Per_Token
```

### GPU Comparison

| GPU | VRAM | Bandwidth | Price/Hour | Best For |
|-----|------|-----------|------------|----------|
| T4 | 16GB | 320 GB/s | $0.53 | Small models, budget |
| A100 40GB | 40GB | 1,555 GB/s | $2.06 | Llama 7B, moderate scale |
| A100 80GB | 80GB | 1,935 GB/s | $3.21 | Llama 13B, high performance |
| H100 | 80GB | 3,350 GB/s | $4.13 | Latest models, maximum performance |

### Multi-GPU Scaling
- **Model Parallelism**: Split model across GPUs
- **Tensor Parallelism**: Split individual layers
- **Pipeline Parallelism**: Different layers on different GPUs
- **Communication Overhead**: 5-15% performance loss per additional GPU

## Performance Characteristics

### Latency Components

#### Time to First Token (TTFT)
```
TTFT = Prefill_Time + Model_Loading_Time
```
- **Prefill Time**: O(sequence_length²) / compute_capacity
- **Critical for**: Interactive applications

#### Token Generation Rate
```
Tokens/Sec = Memory_Bandwidth / (Model_Size_Bytes / Efficiency_Factors)
```

#### Efficiency Factors
1. **Batch Size Efficiency**: log₂(batch_size + 1) / 4
2. **Model Size Efficiency**: Larger models have lower efficiency
3. **Quantization Efficiency**: INT8 > FP16 > FP32 for throughput
4. **Multi-GPU Efficiency**: 0.95^(num_gpus - 1)

### Throughput vs Latency Trade-offs

| Configuration | Latency | Throughput | Use Case |
|---------------|---------|------------|----------|
| Batch=1, Users=1 | Low | Low | Interactive chat |
| Batch=8, Users=1 | Medium | Medium | Balanced |
| Batch=32, Users=Many | High | High | Batch processing |

## Cost Analysis

### Deployment Models

#### Local Deployment
**Costs**:
- Hardware amortization (3-year): $2000-$15000/year per GPU
- Power consumption: $500-$1500/year per GPU
- Maintenance and cooling: 10-20% additional

**Pros**: Control, no API limits, data privacy
**Cons**: High upfront cost, maintenance overhead

#### Cloud Deployment
**Costs**:
- A100 80GB: ~$3.20/hour
- H100: ~$4.13/hour
- Data transfer costs

**Pros**: No upfront cost, easy scaling
**Cons**: Ongoing operational costs, potential vendor lock-in

#### Hosted APIs
**Costs**:
- GPT-4: $30-60 per million tokens
- Claude: $15-75 per million tokens
- Typical request: $0.01-$0.10

**Pros**: No infrastructure management, immediate access
**Cons**: Highest per-request cost, less control

### Cost Breakeven Analysis

For high-volume applications (>100K requests/day):
- **Local deployment** becomes cost-effective after 6-12 months
- **Cloud deployment** better for variable workloads
- **Hosted APIs** best for low-volume or experimental use

## Key Findings

### Memory is King
- VRAM capacity determines maximum model size
- Memory bandwidth determines inference speed
- KV cache scales linearly with context length

### Quantization Trade-offs
- **INT8**: 50% memory reduction, <1% quality loss
- **INT4**: 75% memory reduction, 2-5% quality loss
- **Below INT4**: Significant quality degradation

### Batch Size Optimization
- **Small batches** (1-4): Best latency for interactive use
- **Medium batches** (8-16): Balanced throughput/latency
- **Large batches** (32+): Maximum throughput for batch processing

### Model Selection Guidelines
- **7B models**: Real-time applications, resource constraints
- **13B models**: Better quality, moderate resource requirements
- **70B+ models**: Highest quality, significant resource requirements
- **MoE models**: High capability with lower active parameter count

### Hardware Recommendations
- **Budget**: T4 + quantization for small models
- **Balanced**: A100 40GB for most applications
- **Performance**: A100 80GB for larger models
- **Cutting-edge**: H100 for maximum performance

### Future Considerations
- **Longer contexts**: KV cache becomes memory bottleneck
- **Multimodal models**: Additional memory for image/audio processing
- **Speculative decoding**: Potential 2-3x speedup for some workloads
- **Hardware evolution**: New architectures optimized for inference

## References

1. "Attention Is All You Need" - Transformer architecture fundamentals
2. "LLaMA: Open and Efficient Foundation Language Models" - Model architecture details
3. "GPT-4 Technical Report" - Advanced model characteristics
4. NVIDIA technical documentation - Hardware specifications and benchmarks
5. Hugging Face Transformers library - Implementation details and optimizations 