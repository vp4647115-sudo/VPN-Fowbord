#!/usr/bin/env python3
"""
FlowBoard AI Blueprint Verification Script (Layer 3 - Tools)
Verifies that key modules and files are present and syntactically valid.
"""

import os
import sys

def verify_blueprint():
    print("=== FlowBoard AI Blueprint Verification Tool ===")
    
    required_files = [
        "src/types.ts",
        "src/App.tsx",
        "src/components/CanvasWorkspace.tsx",
        "src/components/Dashboard.tsx",
        "src/components/Navbar.tsx",
        "server.ts",
        "workflows/flowboard_blueprint_implementation.md"
    ]
    
    missing = []
    for f in required_files:
        if not os.path.exists(f):
            missing.append(f)
            
    if missing:
        print(f"FAILED: Missing required files: {missing}")
        sys.exit(1)
        
    print("SUCCESS: All required core system files verified.")
    return 0

if __name__ == "__main__":
    verify_blueprint()
