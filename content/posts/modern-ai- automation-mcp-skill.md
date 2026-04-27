---
title: "Modern AI Automation: MCP vs SKILL.md / agent.md (OpenCode)"
date: 2026-04-27
draft: false
description: "A practical comparison of Model Context Protocol (MCP) and SKILL.md / agent.md prompt-based agents for network and security automation engineers."
tags:
  - AI
  - LLM
  - MCP
  - OpenCode
  - Automation
  - Cisco
  - DevNet
  - NetDevOps
---

# 🤖 Modern AI Automation: MCP vs SKILL.md / agent.md (OpenCode)

> A practical comparison for network & security automation engineers.

## 🎯 Introduction

As AI and Large Language Models (LLMs) evolve, the way we integrate them into real-world automation workflows is rapidly changing.

Two emerging patterns are gaining traction:

- **Model Context Protocol (MCP)** → Tool-driven, structured AI integration.
- **SKILL.md / agent.md (OpenCode-style agents)** → Prompt-driven, instruction-based AI behavior.

If you're building AI-driven automation platforms (e.g., pyATS + Cisco + APIs + LLMs), choosing the right approach is critical for:

- Scalability
- Cost (token usage)
- Reliability
- Maintainability

In this blog, I'll break down:

- What MCP and SKILL.md are
- Key differences
- Token usage implications
- When to use each
- Real-world architecture guidance

## 🧠 What is MCP (Model Context Protocol)?

**Model Context Protocol (MCP)** is a structured way to connect LLMs to real tools and systems.

Instead of prompting the model to "figure things out," you expose tools like:

- Python functions
- APIs (Cisco FMC, SD-WAN, DNA-C)
- Automation frameworks (pyATS)

### 🔧 How MCP Works

1. User sends a natural language request.
2. LLM interprets intent.
3. MCP routes the request to a tool/function.
4. Tool executes (Python/API).
5. Result is returned to the user.

## 🧠 What is SKILL.md / agent.md (OpenCode Style)?

This is a **prompt-engineering-based** approach.

You define:

- Instructions
- Behavior
- Context
- Examples

…inside files like:

- `SKILL.md`
- `agent.md`

### 🔧 How It Works

1. LLM receives:
   - Prompt
   - Instructions (`SKILL.md`)
   - Context
2. LLM generates output directly.
3. No strict tool execution layer.

> It's more flexible, but less structured.

## ⚖️ MCP vs SKILL.md — Core Comparison

| Feature      | MCP                     | SKILL.md / agent.md            |
| ------------ | ----------------------- | ------------------------------ |
| Architecture | Tool-based              | Prompt-based                   |
| Execution    | Real tools (Python/API) | LLM-generated                  |
| Reliability  | High                    | Medium                         |
| Flexibility  | Medium                  | High                           |
| Debugging    | Easier                  | Harder                         |
| Determinism  | Strong                  | Weak                           |
| Security     | Controlled              | Risk of hallucination          |
| Best Use     | Production systems      | Prototyping / lightweight tasks |

## 💰 Token Usage Comparison (CRITICAL)

This is where things get very important for real-world deployments.

### 🔹 SKILL.md / agent.md Token Usage

Each request includes:

- Full prompt
- Instructions
- Context
- Examples

Typical token consumption:

> **2,000 – 10,000 tokens per request**

❗ Problems:

- Expensive
- Slower
- Repetitive context

### 🔹 MCP Token Usage

MCP minimizes token usage by:

- Sending only intent
- Offloading execution to tools

Typical token consumption:

> **200 – 1,000 tokens per request**

✅ Benefits:

- Lower cost
- Faster execution
- Scalable

## 📊 Visualizing the Difference

### SKILL.md Approach

```text
User Request
   ↓
LLM (Prompt + Context + Instructions)
   ↓
Generated Output
```

> Heavy token usage every time.

### MCP Approach

```text
User Request
   ↓
LLM (Intent only)
   ↓
Tool Call (Python/API)
   ↓
Execution Result
```

> Minimal tokens, real execution.

## 🧪 Real-World Example

**Scenario:** *"Check firewall health and fix critical issues."*

### 🔹 SKILL.md Approach

LLM must:

- Parse logs
- Generate logic
- Suggest fixes

❗ Risks:

- Hallucination
- Inconsistent output

### 🔹 MCP Approach

LLM:

- Calls `run_pyats_health_check()`
- Calls `fix_firewall_policy()`

Result:

- Accurate
- Repeatable
- Production-ready

## ⚠️ Key Limitations

### ❌ SKILL.md / agent.md

- High token cost
- Non-deterministic
- Hard to debug
- Risk of incorrect outputs

### ❌ MCP

- Requires backend development
- Needs tool integration
- Slightly more complex setup

## 🧠 When to Use What?

### ✅ Use MCP when:

- Building production systems
- Integrating with Cisco APIs (FMC, SD-WAN)
- Using pyATS / automation frameworks
- Cost optimization matters
- Accuracy is critical

### ✅ Use SKILL.md when:

- Rapid prototyping
- Knowledge-based tasks
- Documentation generation
- Simple workflows

## 🏗️ Recommended Architecture (Best Practice)

For modern AI automation systems, use a **hybrid approach**:

```text
LLM (Chat Interface)
   ↓
MCP (Tool Orchestration Layer)
   ↓
Python / APIs / pyATS / Cisco Platforms
```

Optional:

- `SKILL.md` for the guidance layer
- MCP for execution

## 🚀 My Recommendation (From Real Experience)

Based on real-world automation (Cisco + AI + MCP):

> **MCP is the future for production AI systems.**

Why?

- Lower token cost
- Higher reliability
- Better integration
- Scalable architecture

## 🔥 Key Takeaways

- **SKILL.md** = flexible but expensive and less reliable
- **MCP** = structured, scalable, and production-ready
- **Token efficiency** is a major deciding factor
- **Hybrid approach** = best of both worlds

## 🏁 Conclusion

As AI evolves, the shift is clear:

> From prompt engineering → to structured AI systems.

If you're building:

- Network automation platforms
- Security automation (FMC, FTD, SIEM)
- AI-driven operations

…then **MCP should be your foundation**.
