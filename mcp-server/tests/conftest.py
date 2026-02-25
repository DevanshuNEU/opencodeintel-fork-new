"""Shared test configuration.

Adds the mcp-server root to sys.path so tests can import modules directly.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
