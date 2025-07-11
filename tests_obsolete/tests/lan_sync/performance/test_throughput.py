"""
Performance tests for the LAN sync module.
"""
import asyncio
import pytest
import time
import json
from datetime import datetime
from typing import Dict, Any, List

# Test data sizes (in KB)
SMALL_PAYLOAD_SIZE = 1      # 1 KB
MEDIUM_PAYLOAD_SIZE = 100    # 100 KB
LARGE_PAYLOAD_SIZE = 1024    # 1 MB
VERY_LARGE_PAYLOAD_SIZE = 10 * 1024  # 10 MB

class TestThroughput:
    """Test throughput and performance characteristics."""
    
    def generate_payload(self, size_kb: int) -> Dict[str, Any]:
        """Generate a test payload of the specified size in KB."""
        # Each character is about 1 byte, so we need size_kb * 1024 characters
        size_bytes = size_kb * 1024
        # Create a payload with a string of the required size
        return {
            "test_id": f"perf_test_{int(time.time())}",
            "timestamp": datetime.utcnow().isoformat(),
            "data": "x" * (size_bytes - 100)  # Leave some room for metadata
        }
    
    async def measure_transfer_time(self, test_client, payload_size_kb: int, num_messages: int = 1) -> float:
        """Measure the time to transfer messages of the given size."""
        payload = self.generate_payload(payload_size_kb)
        total_size_bytes = len(json.dumps(payload).encode('utf-8')) * num_messages
        
        # Authenticate first
        auth_msg = test_client.handler.create_message(
            MessageType.AUTH_REQUEST,
            {"token": "test-token"},
            sign=True
        )
        await test_client.send_message(auth_msg, wait_for_response=True)
        
        start_time = time.time()
        
        # Send messages
        for _ in range(num_messages):
            msg = test_client.handler.create_message(
                MessageType.SYNC_REQUEST,
                payload,
                sign=True
            )
            response = await test_client.send_message(msg, wait_for_response=True)
            assert response.message_type == MessageType.SYNC_RESPONSE
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Calculate throughput
        total_mb = total_size_bytes / (1024 * 1024)  # Convert to MB
        mbps = (total_mb * 8) / total_time  # 8 bits per byte
        
        print(f"\nPerformance - {payload_size_kb}KB x {num_messages} messages:")
        print(f"  Total data: {total_mb:.2f} MB")
        print(f"  Total time: {total_time:.2f} seconds")
        print(f"  Throughput: {mbps:.2f} Mbps")
        print(f"  Messages/sec: {num_messages / total_time:.2f}")
        
        return total_time
    
    @pytest.mark.performance
    async def test_small_message_throughput(self, test_server, test_client):
        """Test throughput with small messages (1KB)."""
        await self.measure_transfer_time(test_client, SMALL_PAYLOAD_SIZE, num_messages=100)
    
    @pytest.mark.performance
    async def test_medium_message_throughput(self, test_server, test_client):
        """Test throughput with medium messages (100KB)."""
        await self.measure_transfer_time(test_client, MEDIUM_PAYLOAD_SIZE, num_messages=10)
    
    @pytest.mark.performance
    @pytest.mark.slow
    async def test_large_message_throughput(self, test_server, test_client):
        """Test throughput with large messages (1MB)."""
        await self.measure_transfer_time(test_client, LARGE_PAYLOAD_SIZE, num_messages=5)
    
    @pytest.mark.performance
    @pytest.mark.slow
    async def test_very_large_message_throughput(self, test_server, test_client):
        """Test throughput with very large messages (10MB)."""
        await self.measure_transfer_time(test_client, VERY_LARGE_PAYLOAD_SIZE, num_messages=1)


class TestConcurrentConnections:
    """Test handling of multiple concurrent connections."""
    
    async def send_messages(self, client_id: int, num_messages: int, payload_size_kb: int):
        """Helper method to send messages from a client."""
        config = LANConfig(
            node_id=f"test-client-{client_id}",
            node_name=f"Test Client {client_id}",
            use_ssl=False
        )
        handler = ProtocolHandler(
            node_id=config.node_id,
            node_name=config.node_name,
            secret_key=os.urandom(32)
        )
        
        client = TCPSyncClient(config, handler)
        await client.connect('127.0.0.1', 5001)
        
        try:
            # Authenticate
            auth_msg = handler.create_message(
                MessageType.AUTH_REQUEST,
                {"token": f"test-token-{client_id}"},
                sign=True
            )
            await client.send_message(auth_msg, wait_for_response=True)
            
            # Send messages
            for i in range(num_messages):
                msg = handler.create_message(
                    MessageType.SYNC_REQUEST,
                    {
                        "client_id": client_id,
                        "message_num": i,
                        "data": "x" * (payload_size_kb * 1024)
                    },
                    sign=True
                )
                response = await client.send_message(msg, wait_for_response=True)
                assert response.message_type == MessageType.SYNC_RESPONSE
                
        finally:
            await client.disconnect()
    
    @pytest.mark.performance
    async def test_multiple_clients(self, test_server):
        """Test handling of multiple concurrent clients."""
        num_clients = 10
        messages_per_client = 5
        
        start_time = time.time()
        
        # Start all clients
        tasks = []
        for i in range(num_clients):
            task = asyncio.create_task(
                self.send_messages(i, messages_per_client, SMALL_PAYLOAD_SIZE)
            )
            tasks.append(task)
        
        # Wait for all clients to finish
        await asyncio.gather(*tasks)
        
        total_time = time.time() - start_time
        total_messages = num_clients * messages_per_client
        
        print(f"\nConcurrent Clients Test ({num_clients} clients, {messages_per_client} msgs each):")
        print(f"  Total messages: {total_messages}")
        print(f"  Total time: {total_time:.2f} seconds")
        print(f"  Messages/sec: {total_messages / total_time:.2f}")
        
        assert total_time < 10  # Should complete in under 10 seconds


class TestMemoryUsage:
    """Test memory usage characteristics."""
    
    @pytest.mark.performance
    @pytest.mark.slow
    async def test_memory_usage_large_payloads(self, test_server, test_client):
        """Test memory usage with large payloads."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / (1024 * 1024)  # MB
        
        # Send several large messages
        payload_size_mb = 10  # 10MB
        num_messages = 5
        
        for i in range(num_messages):
            payload = {"data": "x" * (payload_size_mb * 1024 * 1024)}
            msg = test_client.handler.create_message(
                MessageType.SYNC_REQUEST,
                payload,
                sign=True
            )
            response = await test_client.send_message(msg, wait_for_response=True)
            assert response.message_type == MessageType.SYNC_RESPONSE
            
            # Check memory usage
            current_memory = process.memory_info().rss / (1024 * 1024)  # MB
            memory_increase = current_memory - initial_memory
            
            print(f"After message {i+1}/{num_messages}:")
            print(f"  Memory usage: {current_memory:.2f} MB")
            print(f"  Memory increase: {memory_increase:.2f} MB")
            
            # Memory usage should not grow linearly with each message
            # (i.e., we're not leaking memory)
            assert memory_increase < (payload_size_mb * 2)  # Should be much less than payload size
        
        # After all messages, memory should be freed
        final_memory = process.memory_info().rss / (1024 * 1024)  # MB
        memory_increase = final_memory - initial_memory
        print(f"\nFinal memory increase: {memory_increase:.2f} MB")
        assert memory_increase < 10  # Should be a small amount of memory used
