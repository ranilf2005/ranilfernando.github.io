---
title: "AI/LLM-Driven Network Automation with Natural Language (Deep Dive)"
date: 2025-11-27
draft: false
description: "From Copilot chat to real Cisco devices using MCP, pyATS, and CML — a practical architecture and lab guide."
tags:
  - AI
  - LLM
  - Network Automation
  - MCP
  - pyATS
  - Cisco
  - DevNet
---

# AI/LLM-Driven Network Automation with Natural Language

> From Copilot AI/LLM Chat to Real Cisco Devices Using VS Code, MCP, CML & pyATS

## Introduction: The Old Way vs. The New Way

For decades, the command-line interface has been the unforgiving rite of passage for network engineers. We've all been there: staring at a blinking cursor, navigating steep learning curves, feeling the pressure to avoid a single typo that could trigger an outage. The traditional way is powerful, but it's also a significant source of cognitive load and a barrier for those early in their careers.

But what if you could bypass the complex syntax and simply tell the network what you need? What if you could manage, configure, and troubleshoot your infrastructure just by having a conversation with an AI assistant, using plain English?

This is no longer a "what if." We recently connected GitHub Copilot to a live network environment, and the results were more profound than we expected. This post breaks down the four most powerful revelations from that experiment — discoveries that point to a new blueprint for network operations.

## 1. Your New Command Line is a Conversation

The most immediate and transformative revelation is that the chat window has become the new CLI. Instead of memorizing exact commands and manually connecting to devices, engineers can now use simple, natural language prompts within a familiar tool like VS Code to execute network tasks.

Consider the old way: SSH into a device, remember the precise command syntax, type it perfectly, and then parse the raw text output. The new way is a simple request. A prompt like *"Use the Cisco pyATS tools to run show and configuration commands in Cisco devices."* accomplishes the same goal with a single sentence. The AI, guided by the underlying system, handles the connection and execution, returning clean, readable output directly into the chat window.

This is a revolutionary shift. It dramatically reduces cognitive load, allowing engineers to focus on the strategic problem they're solving, not the mechanics of a specific command. This conversational approach lowers the barrier to entry for junior team members, accelerates troubleshooting for seniors, and makes network interaction fundamentally more intuitive for everyone.

But how can a simple chat prompt safely trigger a real network command? The answer isn't AI magic — it's a clever and robust architecture.

## 2. The Secret Sauce: It's Not Magic, It's a Protocol

The link between a conversational AI and live network hardware is forged by a critical communication layer: the **Multi-context Protocol (MCP)**. This protocol acts as the secure bridge that makes this entire interaction reliable and safe.

Think of MCP as an AI's universal remote control. The AI assistant and VS Code act as the remote (the client). This remote doesn't need to know the complex internal workings of your TV (the network device); it just knows there are specific buttons on the remote (the "tools") that have been pre-approved for it to press. An MCP server running on a machine on your network exposes these "buttons" — like `show_command` or `health_check` — and the AI simply tells the server which one to push on the user's behalf.

The true innovation isn't just the AI; it's the standardized communication protocol that allows the AI to safely discover and use pre-approved, real-world tools without being directly connected to the infrastructure.

## 3. AI Doesn't Replace Your Tools — It Unleashes Them

A common fear is that AI will replace the powerful, battle-tested automation frameworks we rely on. Our experiment proved the opposite is true. This new model doesn't replace your tools; it unleashes their power by making them accessible to everyone.

The strategic insight from this lab is the emergence of a reusable, three-layer architectural pattern for secure AI integration. The execution flow is clear and controlled:

```text
Copilot Chat → Your MCP Server (Python) → pyATS/Unicon → SSH → CML Router
```

This architecture provides distinct layers of responsibility:

1. **The Interface Layer (Copilot):** A conversational front-end that democratizes access and translates human intent into a structured request.
2. **The Control Layer (MCP):** A secure "API gateway" that acts as the critical control boundary. It receives requests from the AI and maps them only to a curated list of allowed functions.
3. **The Execution Layer (pyATS):** The robust, industry-proven engine that performs the actual network operations — connecting, executing commands, and parsing output.

This pattern gives you the conversational ease of the "new way" without sacrificing the reliability of the "old way's" best tools. The AI is never given a raw shell. Instead, we build a safe vocabulary for it by exposing specific functions like `show_command`, `apply_config`, and even more abstract tasks like `health_check`. This last function is key; it allows an engineer to ask for a "basic health check," and the system can run a whole batch of pre-defined verification commands in the background. This is the first step toward true intent-based operations driven by natural language.

## 4. This Blueprint Makes Automation Accessible to Everyone

This entire experiment was designed for a specific persona defined in our lab notes: a *"junior network and security engineer who doesn't have much software development experience."* The resulting blueprint achieves a profound goal: the **democratization of network automation**.

This integrated stack — VS Code, Copilot, MCP, and pyATS — dramatically lowers the barrier to entry. Junior engineers can become productive on day one, contributing to network operations and building confidence without needing to be Python scripting experts. The strategic implication is that organizations can now onboard new talent faster and bridge the persistent skills gap between network engineering and software development.

This is more than just a lab curiosity; it is a blueprint for a modern NetOps team. It empowers engineers by reducing the need for rote memorization, enables safer automation through a controlled execution model, and ultimately makes the entire organization more agile.

## Conclusion: What Will You Ask Your Network?

The fusion of conversational AI, secure control protocols, and robust automation frameworks isn't just an incremental improvement — it represents a fundamental shift in how we interact with technology. This lab proves that network management can be conversational, inherently safe, and accessible to a broader range of engineers than ever before.

This architectural pattern provides a critical blueprint not just for networking, but for any operational domain that still relies on a complex command-line interface, from cloud infrastructure to security platforms. We are at the beginning of a new paradigm where our primary interface to complex systems will be a conversation. The focus will shift from *how* to execute a task to *what* outcome we want to achieve.

> Now that you can simply ask, what's the first question you would ask your network?

---

# Lab Guide: Build It Yourself

Below is a working, beginner-friendly blueprint to achieve what you want:

- VS Code + Copilot Chat (on Ubuntu 25.04, IP `192.168.30.50`)
- MCP server running locally on Ubuntu (so Copilot can call "tools")
- Tools will use pyATS/Genie/Unicon to connect to your CML router (`iosv-0` at `192.168.30.181`) over SSH
- You'll be able to ask Copilot in natural language like:
  - *"Get show ip interface brief from iosv-0"*
  - *"Configure hostname and save config"*

This approach matches how VS Code supports MCP servers (local stdio transport) and how MCP is intended to expose tool functions to the AI assistant.

## 0) Target Architecture (Simple + Reliable)

```text
Copilot Chat (VS Code) → Your MCP Server (Python) → pyATS/Unicon → SSH → CML Router
```

VS Code MCP support is GA from VS Code 1.102+ and supports stdio transport for local servers.

---

## 1) Ubuntu Prerequisites (Do This First)

### 1.1 Install Base Packages

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip openssh-client git
```

### 1.2 Verify You Can SSH to the Router

```bash
ssh cisco@192.168.30.181
```

### 1.3 Use SSH Keys (Recommended)

```bash
ssh-keygen -t ed25519 -C "pyats-lab"
ssh-copy-id cisco@192.168.30.181
```

Test passwordless login:

```bash
ssh cisco@192.168.30.181
```

---

## 2) Install & Configure pyATS on Ubuntu (Clean + Repeatable)

Cisco's public docs show you can install via pip, and recommend `pyats[library]` (Genie) or `pyats[full]`.

### 2.1 Create a Workspace

```bash
mkdir -p ~/lab/pyats-mcp && cd ~/lab/pyats-mcp
```

### 2.2 Create/Activate Your venv (`pyats-env`)

```bash
python3 -m venv ~/.venvs/pyats-env
source ~/.venvs/pyats-env/bin/activate
python -m pip install --upgrade pip
```

### 2.3 Install pyATS + Genie (Recommended Minimum)

```bash
pip install "pyats[library]"
```

Optional "everything" install:

```bash
pip install "pyats[full]"
```

### 2.4 Verify Install

```bash
pyats version check
```

---

## 3) Create Your pyATS Testbed for `iosv-0`

Create this folder structure:

```text
~/lab/pyats-mcp/
├── testbed/
│   └── testbed.yaml
└── mcp_server/
    └── server.py
```

Create `~/lab/pyats-mcp/testbed/testbed.yaml`:

```yaml
devices:
  iosv-0:
    os: iosxe
    type: router
    credentials:
      default:
        username: cisco
        password: cisco
    connections:
      cli:
        protocol: ssh
        ip: 192.168.30.181
        port: 22
```

If you're using SSH keys, we'll tell Unicon/SSH to use them (below), so you don't have to hard-store passwords.

---

## 4) Quick pyATS Connectivity Test (No MCP Yet)

Create `~/lab/pyats-mcp/test_show.py`:

```python
from pyats.topology import loader

tb = loader.load("testbed/testbed.yaml")
dev = tb.devices["iosv-0"]
dev.connect(log_stdout=False)
print(dev.execute("show ip interface brief"))
dev.disconnect()
```

Run:

```bash
python test_show.py
```

If that works, pyATS + SSH to CML is correct.

---

## 5) Build Your MCP Server (the "Bridge" Copilot Will Use)

VS Code can run MCP servers locally and discover their tools. We'll use the official MCP Python SDK (`mcp`) and its `FastMCP` server.

### 5.1 Install MCP SDK Into the Same venv

```bash
pip install "mcp[cli]"
```

### 5.2 Create the MCP Server File

Create `~/lab/pyats-mcp/mcp_server/server.py`:

```python
import os
from typing import Optional, Literal

from mcp.server.fastmcp import FastMCP
from pyats.topology import loader

mcp = FastMCP("cml-pyats-tools")

TESTBED_PATH = os.environ.get("PYATS_TESTBED", "testbed/testbed.yaml")


def _connect(device_name: str):
    tb = loader.load(TESTBED_PATH)
    if device_name not in tb.devices:
        raise ValueError(f"Unknown device '{device_name}'. Check {TESTBED_PATH}")
    dev = tb.devices[device_name]

    # Safer SSH defaults for lab usage (optional)
    dev.connections["cli"].setdefault(
        "ssh_options",
        "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null",
    )

    dev.connect(log_stdout=False)
    return dev


@mcp.tool()
def show_command(device: str, command: str) -> str:
    """
    Run a SHOW command on a device and return output.
    Example: device="iosv-0", command="show ip interface brief"
    """
    dev = _connect(device)
    try:
        # Basic safety: allow only show commands (you can relax later)
        if not command.strip().lower().startswith("show"):
            raise ValueError("Only 'show ...' commands allowed in show_command().")
        return dev.execute(command)
    finally:
        dev.disconnect()


@mcp.tool()
def apply_config(device: str, config: str, save: bool = False) -> str:
    """
    Apply configuration lines to a device.
    'config' can be multi-line.
    If save=True, will try to write memory.
    """
    dev = _connect(device)
    try:
        out = dev.configure(config)
        if save:
            out += "\n\n--- write memory ---\n"
            out += dev.execute("write memory")
        return out
    finally:
        dev.disconnect()


@mcp.tool()
def health_check(device: str, level: Literal["basic", "detailed"] = "basic") -> str:
    """
    Simple health check example (extend later).
    """
    dev = _connect(device)
    try:
        cmds = [
            "show version",
            "show ip interface brief",
        ]
        if level == "detailed":
            cmds += [
                "show processes cpu | include one minute",
                "show memory statistics",
                "show ip route summary",
            ]
        out = []
        for c in cmds:
            out.append(f"\n===== {c} =====\n{dev.execute(c)}")
        return "\n".join(out)
    finally:
        dev.disconnect()


if __name__ == "__main__":
    # IMPORTANT for stdio MCP servers: do NOT print() to stdout in real servers.
    # FastMCP handles the protocol over stdout.
    mcp.run()
```

> **Important:** MCP stdio servers must not write normal `print()` logs to stdout or they can break the protocol (so keep logs minimal or use stderr/log files).

### 5.3 Test the MCP Server Manually (Sanity)

Run:

```bash
python mcp_server/server.py
```

It will "wait" because VS Code will be the client; that's expected.

---

## 6) Configure VS Code to Load Your MCP Server

VS Code supports configuring MCP servers in `.vscode/mcp.json`.

Create `~/lab/pyats-mcp/.vscode/mcp.json`:

```json
{
  "servers": {
    "cml-pyats-tools": {
      "type": "stdio",
      "command": "/home/<you>/.venvs/pyats-env/bin/python",
      "args": ["/home/<you>/lab/pyats-mcp/mcp_server/server.py"],
      "env": {
        "PYATS_TESTBED": "/home/<you>/lab/pyats-mcp/testbed/testbed.yaml"
      }
    }
  }
}
```

Now in VS Code:

1. Open folder: `~/lab/pyats-mcp`
2. Ensure you're on VS Code 1.102+
3. Open Copilot Chat
4. Look for MCP tools (VS Code shows tools when servers are connected)

VS Code will prompt you to trust the MCP server (it runs code locally). Only trust your own server.

---

## 7) How to Use Copilot Chat (Natural Language Examples)

Try prompts like:

- *"Use the `cml-pyats-tools` server to run `show ip interface brief` on iosv-0."*
- *"Run a basic `health_check` on iosv-0."*
- *"Configure iosv-0: set hostname to `RANIL-LAB-1` and save."*

Because your MCP server exposes `show_command`, `apply_config`, and `health_check`, Copilot can call them as tools.

---

## 8) Testing Checklist (End-to-End)

**Test A — Tool Discovery**

- Open Copilot Chat
- Confirm it shows your MCP server tools (or can call them)

**Test B — Show Command**

Ask Copilot:

> Run `show_command` on `iosv-0` with `"show version"`.

Expected: router output returned in chat.

**Test C — Safe Config Change**

Ask Copilot:

> Apply config to `iosv-0`:
>
> ```text
> interface loopback123
>  ip address 10.123.123.1 255.255.255.255
> ```
>
> and then verify with `show ip interface brief`.

**Test D — Write Memory**

Ask:

> Apply config to set hostname, `save=True`.

---

## 9) Common Troubleshooting (the Ones That Usually Hit Juniors)

### 1) "Tools Not Showing" in VS Code

- Confirm VS Code version ≥ 1.102
- Confirm `.vscode/mcp.json` is valid JSON
- Use absolute paths
- Make sure venv python exists at that path

### 2) SSH Failures

- Confirm from terminal: `ssh user@192.168.30.181`
- If key auth: ensure `ssh-copy-id` done, and router allows it
- If passwords: confirm credentials in `testbed.yaml`

### 3) "stdout Corruption / MCP Server Disconnects"

- Remove `print()` from server
- Log to a file or stderr if needed (stdio is sensitive)

### 4) pyATS Packages Missing

Ensure you activated the venv before installs:

```bash
source ~/.venvs/pyats-env/bin/activate
pip install "pyats[library]" "mcp[cli]"
```

---

## 10) What You Should Build Next (Once This Works)

1. Add **command allow-lists** (security): only permit safe commands, require confirmation for risky config.
2. Add **multi-device support** (more routers in CML).
3. Add a tool like `run_pyats_job(job_file)` once you start writing full pyATS test suites.
4. Add **"intent-based"** tools like:
   - `get_interfaces()`
   - `check_bgp_neighbors()`
   - `verify_routes(prefixes=...)`
