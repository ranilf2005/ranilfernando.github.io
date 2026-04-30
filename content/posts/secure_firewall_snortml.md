---
title: "Testing Cisco Secure Firewall SnortML: ML-Based SQL & Command Injection Detection"
date: 2026-02-11
draft: false
description: "An end-to-end lab guide for validating the SnortML (GID 411) machine-learning inspector on Cisco Secure Firewall — from FMC policy configuration to firing real SQL and command injection payloads from Kali."
tags:
  - Cisco
  - Secure Firewall
  - FMC
  - FTD
  - SnortML
  - Snort 3
  - IPS
  - Machine Learning
  - Security
  - Kali Linux
---

# Testing Cisco Secure Firewall SnortML: ML-Based SQL & Command Injection Detection

> An end-to-end lab walkthrough of the **SnortML** inspector on Cisco Secure Firewall — what it is, how to enable it, and how to prove it actually catches SQL injection and command injection attacks in your own environment.

## Introduction

Cisco's **SnortML** is a machine-learning-based exploit detection inspector that ships with Snort 3 in Cisco Secure Firewall. Instead of relying purely on static signatures, SnortML uses ML models to flag suspicious payloads — most notably **SQL injection** and **command injection** — including variants that classic rules tend to miss.

This post is a hands-on guide based on the official Cisco documentation, [SnortML: Machine Learning-based Exploit Detection](https://blogs.cisco.com/security/snortml-machine-learning-based-exploit-detection). I'll walk through the lab topology, FMC configuration, traffic generation from Kali, and how to confirm SnortML is actually firing.

## 1. Lab Environment

| Component | Details |
| --- | --- |
| **Firewall** | Cisco Secure Firewall (FMC + FTD), version **7.7 or later** |
| **Inside attacker** | Kali Linux on inside LAN — `198.18.6.6` |
| **Outside target** | Kali Linux on outside / Internet side — `198.18.2.11` |
| **Topology** | Inside Kali → FTD inside interface → FTD outside interface → Outside Kali |

The outside Kali hosts a vulnerable HTTP service. The inside Kali plays the attacker firing SQLi and command-injection payloads through the firewall.

## 2. Cisco Secure Firewall Configuration

### Step 1 — Enable the SnortML Inspector

1. In FMC, navigate to **Policies → Intrusion**.
2. Select the **Network Analysis Policy (Snort 3 Version)** you want to configure.
3. Confirm the `snort_ml` inspector is **enabled** — it is on by default in the **Maximum Detection** policy.
4. If it's disabled, edit the inspector configuration JSON and set:

   ```json
   {
     "enabled": true
   }
   ```

5. Save the policy and apply it to the relevant **access control rule**.
6. Deploy the updated access control policy to your FTD.

### Step 2 — Verify SnortML Rule Activation

1. Go to **Events & Logs → Intrusions → Events**.
2. Filter for events where the message field contains `snort_ml`.
3. If you see events here after generating test traffic, SnortML is active and inspecting flows.

> SnortML rules are identified by **GID 411** and message prefix **`(snort_ml)`**.

## 3. Web Server Setup on the Outside Kali

You need something to attack. The simplest option is a Python HTTP server on the outside Kali:

```bash
# On the outside Kali (198.18.2.11)
python3 -m http.server 80
```

This serves the current directory over HTTP on port 80. Make sure your firewall access policy permits inbound HTTP (TCP/80) from the inside Kali to the outside Kali so the traffic actually reaches the server (and gets inspected by SnortML on the way).

For a more realistic target, use a deliberately vulnerable app like **WebGoat**, **DVWA**, or any test page that accepts query-string input.

## 4. Testing SQL Injection Detection

### Step 1 — Send SQLi payloads from inside Kali

From the inside Kali, hit the outside web server with classic SQL-injection patterns:

```bash
# Classic auth-bypass
curl "http://198.18.2.11/vulnerable_page.php?username=' OR 1=1 -- "

# UNION-based extraction
curl "http://198.18.2.11/vulnerable_page.php?id=1' UNION SELECT username,password FROM users -- "

# Time-based blind
curl "http://198.18.2.11/vulnerable_page.php?id=1' AND SLEEP(5) -- "
```

You can also use **`sqlmap`** for a much broader sweep:

```bash
sqlmap -u "http://198.18.2.11/vulnerable_page.php?id=1" --batch --level=2 --risk=2
```

### Step 2 — Confirm detection in FMC

In FMC, go to **Events & Logs → Intrusions → Events** and filter by `snort_ml`. You should see events like:

- **GID/SID:** `411:1`
- **Message:** `(snort_ml) ...`
- **Classification:** machine-learning detected exploit attempt
- **Source / Destination:** inside Kali → outside Kali

If your rule action is set to **Block**, the traffic should be dropped and you'll see a corresponding block event.

## 5. Testing Command Injection Detection

### Step 1 — Send command-injection payloads

```bash
# Classic shell-metacharacter injections
curl "http://198.18.2.11/vulnerable_page.php?cmd=whoami"
curl "http://198.18.2.11/vulnerable_page.php?cmd=;ls"
curl "http://198.18.2.11/vulnerable_page.php?cmd=;sleep+10"
curl "http://198.18.2.11/vulnerable_page.php?cmd=|cat+/etc/passwd"

# Reflected XSS-style payload (often co-occurs with cmdi testing)
curl "http://198.18.2.11/vulnerable_page.php?q=<script>alert('Hacked!')</script>"
```

### Step 2 — Verify detection

Back in FMC, refresh **Intrusions → Events** and filter on `snort_ml`. You should see decoded payloads in the event details and the GID 411 signature firing on the command-injection attempts.

## 6. Verification & Monitoring Checklist

- ✅ FMC **Events & Logs → Intrusions → Events** shows entries with `snort_ml` in the message field.
- ✅ Events have **GID 411** with the `(snort_ml)` prefix.
- ✅ Event details show the decoded HTTP payload that triggered the model.
- ✅ If your rule action is **Block**, the offending request is dropped (the inside `curl` will hang or fail).
- ✅ If your rule action is **Alert**, requests succeed but events are still logged.

## 7. Optional — Raw SQL for a Real Backend

If you've wired the test page to an actual database, you can validate the injection paths from the DB side too:

```sql
-- Classic auth bypass
SELECT * FROM users WHERE username = '' OR 1=1 -- ';
```

This isn't required for SnortML to detect — it inspects the HTTP payload, not the DB response — but it confirms your test app is genuinely vulnerable.

## 8. Quick Reference — Commands & Actions

| Purpose | Command / Action |
| --- | --- |
| Start HTTP server (outside Kali) | `python3 -m http.server 80` |
| SQL injection test (curl) | `curl "http://<outside-ip>/vulnerable_page.php?username=' OR 1=1 -- "` |
| Command injection test (curl) | `curl "http://<outside-ip>/vulnerable_page.php?cmd=whoami"` |
| Broader SQLi sweep | `sqlmap -u "http://<outside-ip>/vulnerable_page.php?id=1" --batch` |
| Enable SnortML inspector | Set `"enabled": true` in `snort_ml` JSON in FMC Intrusion Policy |
| View SnortML events | FMC → **Events & Logs → Intrusions → Events** → filter `snort_ml` |

## 9. Why You Need the Maximum Detection Policy

Here's the gotcha that trips up most engineers the first time they test SnortML:

> The SnortML rule (**GID 411**) is **enabled by default only under the Maximum Detection** intrusion policy. In **Balanced** and **Security** policies, it is **disabled by default** and must be manually enabled.

Key points from the Cisco documentation:

- The SnortML inspector rule (**GID 411**) is a machine-learning-based exploit detection rule designed to detect threats such as **SQL injection** and **command injection**.
- It's enabled by default **only in Maximum Detection** because it can be performance-intensive.
- In **Balanced** or **Security** base policies, the rule is **disabled by default**.
- To enable it in those policies, you must **override the rule action** to `Block` or `Alert` in the intrusion policy configuration.
- The SnortML rule is identified by message prefix `(snort_ml)` and **GID 411, SID 1**.
- Maximum Detection includes a wider rule set — including ML-based detection — which is why it's the "find everything, performance be damned" tier.
- Balanced and Security policies include fewer / disabled rules to keep throughput up.

### Summary

- **SnortML (GID 411) is enabled by default _only_ in Maximum Detection.**
- **Balanced** and **Security** policies disable this rule by default.
- A **manual override** is required to enable SnortML in non-Maximum policies.
- **Maximum Detection** gives you the most comprehensive detection, SnortML included.
- This design lets admins balance security vs. performance per environment.

If you ran the lab above against a Balanced or Security policy and saw zero `snort_ml` events — this is almost certainly why.

## References

- [SnortML: Machine Learning-based Exploit Detection — Cisco Blogs](https://blogs.cisco.com/security/snortml-machine-learning-based-exploit-detection)
- [Snort 3 Inspector Reference — SnortML (Cisco Secure Firewall Management Center)](https://www.cisco.com/c/en/us/td/docs/security/secure-firewall/management-center/snort/770/snort3-inspector-reference/m-snortml.html)
- [Cisco Secure Firewall Management Center documentation](https://www.cisco.com/c/en/us/support/security/defense-center/series.html)

## Closing Thoughts

SnortML is one of the more interesting additions to Snort 3 — it's a real ML model running inline, catching obfuscated SQLi and command-injection variants that would slip past traditional regex-style signatures. The catch is that it's **off by default** unless you're on **Maximum Detection**, so most people who say "we tried SnortML and it didn't trigger" simply never had it enabled.

Spin up the lab, fire a few `curl` payloads, and watch the GID 411 events light up in FMC. Once you've seen it work end-to-end, the next step is tuning rule actions (**Alert** vs **Block**) and integrating those events into your SIEM / SOAR pipeline.
