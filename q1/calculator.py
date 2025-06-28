#!/usr/bin/env python3
"""
LLM Inference Calculator Backend
Comprehensive calculations for LLM inference costs, latency, and memory usage.
"""

import math
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class ModelConfig:
    params: float  # Parameters in billions
    layers: int
    hidden_size: int
    is_moe: bool = False
    active_params: Optional[float] = None
    
    def __post_init__(self):
        if self.active_params is None:
            self.active_params = self.params

@dataclass
class HardwareConfig:
    vram: int  # VRAM in GB
    bandwidth: int  # Memory bandwidth in GB/s
    price: float  # Cost per hour
    cores: int  # Number of compute cores
    power_watts: int = 400

class LLMInferenceCalculator:
    def __init__(self):
        self.models = {
            'llama-7b': ModelConfig(7, 32, 4096),
            'llama-13b': ModelConfig(13, 40, 5120),
            'llama-70b': ModelConfig(70, 80, 8192),
            'mixtral-8x7b': ModelConfig(56, 32, 4096, is_moe=True, active_params=14),
            'gpt-4': ModelConfig(1700, 120, 12288, is_moe=True, active_params=400),
        }
        
        self.hardware = {
            't4-16gb': HardwareConfig(16, 320, 0.526, 2560, 70),
            'a100-40gb': HardwareConfig(40, 1555, 2.06, 6912, 400),
            'a100-80gb': HardwareConfig(80, 1935, 3.21, 6912, 400),
            'h100-80gb': HardwareConfig(80, 3350, 4.13, 14592, 700),
            'rtx4090-24gb': HardwareConfig(24, 1008, 1.28, 16384, 450),
        }
        
        self.quantization_multipliers = {
            'fp32': 4, 'fp16': 2, 'int8': 1, 'int4': 0.5
        }
    
    def calculate_memory_usage(self, model_name: str, hardware_name: str, **kwargs):
        model = self.models[model_name]
        hardware = self.hardware[hardware_name]
        
        inference_quant = kwargs.get('inference_quantization', 'fp16')
        kv_cache_quant = kwargs.get('kv_cache_quantization', 'fp16')
        batch_size = kwargs.get('batch_size', 1)
        sequence_length = kwargs.get('sequence_length', 2048)
        num_gpus = kwargs.get('num_gpus', 1)
        concurrent_users = kwargs.get('concurrent_users', 1)
        enable_offloading = kwargs.get('enable_offloading', False)
        
        # Model memory
        active_params = model.active_params if model.is_moe else model.params
        model_memory = (active_params * self.quantization_multipliers[inference_quant]) / num_gpus
        
        # KV Cache
        kv_cache_per_token = (2 * self.quantization_multipliers[kv_cache_quant] * 
                             model.layers * model.hidden_size)
        kv_cache = (kv_cache_per_token * sequence_length * batch_size * concurrent_users) / (1024**3)
        
        # Activations
        activations = (batch_size * sequence_length * model.hidden_size * 4) / (1024**3)
        
        # Overhead
        overhead_factor = 0.15 if enable_offloading else 0.20
        overhead = (model_memory + kv_cache + activations) * overhead_factor
        
        total = model_memory + kv_cache + activations + overhead
        
        return {
            'model_memory': model_memory,
            'kv_cache': kv_cache,
            'activations': activations,
            'overhead': overhead,
            'total': total
        }
    
    def calculate_performance(self, model_name: str, hardware_name: str, **kwargs):
        model = self.models[model_name]
        hardware = self.hardware[hardware_name]
        
        batch_size = kwargs.get('batch_size', 1)
        sequence_length = kwargs.get('sequence_length', 2048)
        num_gpus = kwargs.get('num_gpus', 1)
        inference_quant = kwargs.get('inference_quantization', 'fp16')
        concurrent_users = kwargs.get('concurrent_users', 1)
        
        # Memory-bound performance
        active_params = model.active_params if model.is_moe else model.params
        bytes_per_token = active_params * self.quantization_multipliers[inference_quant]
        
        memory_bandwidth_total = hardware.bandwidth * num_gpus
        theoretical_tokens_per_sec = memory_bandwidth_total / bytes_per_token
        
        # Efficiency factors
        batch_efficiency = min(1.0, math.log2(batch_size + 1) / 4)
        model_efficiency = max(0.3, 1.0 - (model.params - 7) / 100)
        quant_efficiency = {'fp32': 0.8, 'fp16': 0.9, 'int8': 0.95, 'int4': 0.85}[inference_quant]
        multi_gpu_efficiency = 0.95 ** (num_gpus - 1)
        
        effective_tokens_per_sec = (theoretical_tokens_per_sec * batch_efficiency * 
                                  model_efficiency * quant_efficiency * multi_gpu_efficiency)
        
        generation_speed = effective_tokens_per_sec / batch_size
        total_throughput = effective_tokens_per_sec * concurrent_users
        
        # Latency calculation
        prefill_latency = (sequence_length ** 2) / (hardware.cores * num_gpus * 1_000_000)
        decode_latency = 50 / generation_speed  # Assume 50 output tokens
        latency_per_request = prefill_latency + decode_latency
        
        return {
            'generation_speed': generation_speed,
            'total_throughput': total_throughput,
            'latency_per_request': latency_per_request
        }
    
    def calculate_cost(self, hardware_name: str, performance: Dict, deployment_mode: str = 'local', num_gpus: int = 1):
        hardware = self.hardware[hardware_name]
        latency = performance['latency_per_request']
        
        if deployment_mode == 'local':
            hourly_hardware_cost = (hardware.price * num_gpus) / (24 * 365 * 3)
            hourly_power_cost = (hardware.power_watts * num_gpus * 0.12) / 1000
            total_hourly_cost = hourly_hardware_cost + hourly_power_cost
            return total_hourly_cost * latency / 3600
            
        elif deployment_mode == 'cloud':
            return hardware.price * num_gpus * latency / 3600
            
        elif deployment_mode == 'hosted':
            return 0.0015  # Simplified API cost
            
        return 0
    
    def analyze_configuration(self, model_name: str, hardware_name: str, **kwargs):
        memory_usage = self.calculate_memory_usage(model_name, hardware_name, **kwargs)
        performance = self.calculate_performance(model_name, hardware_name, **kwargs)
        cost = self.calculate_cost(hardware_name, performance, 
                                 kwargs.get('deployment_mode', 'local'),
                                 kwargs.get('num_gpus', 1))
        
        # Hardware compatibility
        total_vram = self.hardware[hardware_name].vram * kwargs.get('num_gpus', 1)
        usage_percentage = (memory_usage['total'] / total_vram) * 100
        
        if usage_percentage <= 70:
            compatibility = 'Compatible'
        elif usage_percentage <= 90:
            compatibility = 'Tight Fit'
        elif usage_percentage <= 100:
            compatibility = 'Requires Optimization'
        else:
            compatibility = 'Insufficient Memory'
        
        return {
            'memory_usage': memory_usage,
            'performance': performance,
            'cost_per_request': cost,
            'compatibility': compatibility,
            'vram_usage_percentage': usage_percentage
        }

if __name__ == "__main__":
    calc = LLMInferenceCalculator()
    
    # Example usage
    result = calc.analyze_configuration(
        'llama-7b', 'a100-40gb',
        batch_size=8, sequence_length=2048, concurrent_users=4
    )
    
    print("LLM Inference Analysis:")
    print(f"Memory Usage: {result['memory_usage']['total']:.1f} GB")
    print(f"Generation Speed: {result['performance']['generation_speed']:.1f} tokens/sec")
    print(f"Cost per Request: ${result['cost_per_request']:.6f}")
    print(f"Compatibility: {result['compatibility']}")
