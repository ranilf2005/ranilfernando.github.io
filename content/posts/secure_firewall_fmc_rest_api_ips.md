---
title: "Cisco Secure Firewall Automation: FMC REST API for IPS (Beginner Lab)"
date: 2025-08-02
draft: false
description: "A brand-new, beginner-friendly lab for automating Cisco Secure Firewall IPS via the FMC REST API — auth, domains, intrusion policies, intrusion rules, alert destinations, and the Snort2 vs Snort3 limitations you need to know about."
tags:
  - Cisco
  - Secure Firewall
  - FMC
  - IPS
  - Snort 3
  - REST API
  - Python
  - Automation
  - Security
---

# Cisco Secure Firewall Automation: FMC REST API for IPS

> A brand-new, beginner-friendly lab focused **only** on the Cisco Secure Firewall **FMC REST API for IPS** — auth, intrusion policies, intrusion rules, and alert destinations, with working Python scripts you can copy and run.

## Scope and a Few Important Notes Up Front

The FMC REST API configuration endpoints clearly support **intrusion policies** and **intrusion rules** with `GET`, `POST`, and `PUT` operations. Cisco's current FMC quick-start documentation lists `GET / GETALL / POST / PUT intrusionpolicies` and `GET / GETALL / POST / PUT intrusionrules` in recent releases.

A few things to keep in mind:

- **Auth is token-based.** Access tokens are valid for up to **30 minutes** and can be refreshed up to **3 times**.
- **"Alerts" can mean two different things** in FMC:
  - **Live intrusion events** → use **eStreamer** (Cisco's streaming interface for intrusion events).
  - **Alert destination objects** like syslog or SNMP alerts → those are **separate FMC REST objects** (`syslogalerts`, `snmpalerts`).
- The REST configuration guides focus on **policy/configuration objects**, while eStreamer is the real path for streaming intrusion data and events.

So the clean beginner plan is:

1. Use REST API to **read** current IPS policies and rules.
2. Use REST API to **create** a new intrusion policy and **tune** rule entries.
3. Treat **live intrusion alerts/events** as a separate follow-on using **eStreamer**.

## What You'll Build

A self-contained Python project on Ubuntu:

```text
ips-rest-lab/
├── .env
├── requirements.txt
├── outputs/
│   ├── logs/
│   └── reports/
└── scripts/
    ├── common.py
    ├── 01_test_auth.py
    ├── 02_get_domains.py
    ├── 03_get_intrusion_policies.py
    ├── 04_get_intrusion_rules.py
    ├── 05_create_intrusion_policy.py
    ├── 06_update_intrusion_rule.py
    └── 07_get_alert_destinations.py
```

This layout keeps **authentication in one reusable file** and each test in its own script, which makes it easier for beginners to follow and troubleshoot.

## Software to Install

On your Ubuntu box:

```bash
mkdir -p ~/lab/ips-rest-lab/{scripts,outputs/logs,outputs/reports}
cd ~/lab/ips-rest-lab
python3 -m venv venv
source venv/bin/activate
```

Create `requirements.txt`:

```text
requests
python-dotenv
```

Install:

```bash
pip install -r requirements.txt
```

You can also use `curl` for quick tests, but Python is much easier once you want repeatable scripts.

## Create Your `.env` File

Create `.env` in the project root:

```bash
FMC_HOST=https://192.168.30.184
FMC_USERNAME=admin
FMC_PASSWORD=yourpassword
VERIFY_SSL=false
DOMAIN_UUID=
INTRUSION_POLICY_ID=
```

What each variable means:

| Variable | Purpose |
| --- | --- |
| `FMC_HOST` | Your FMC URL |
| `FMC_USERNAME` | REST API username |
| `FMC_PASSWORD` | REST API password |
| `VERIFY_SSL` | `false` is fine for lab self-signed certs |
| `DOMAIN_UUID` | Discovered by **script 02** |
| `INTRUSION_POLICY_ID` | Discovered by **script 03** |

> Cisco's REST API runs over HTTPS on port 443 and uses the same auth/permission model as FMC. Token generation and refresh are handled through the platform auth endpoints. FMC also enforces **rate limits** — typically up to **120 GET requests per minute** from one IP, and only **one non-GET request at a time** per device/server context, depending on release.

## Step 1 — Build the Reusable REST Helper

Create `scripts/common.py`:

```python
import os
import json
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
REPORT_DIR = BASE_DIR / "outputs" / "reports"
LOG_DIR = BASE_DIR / "outputs" / "logs"
REPORT_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

FMC_HOST = os.getenv("FMC_HOST", "").rstrip("/")
FMC_USERNAME = os.getenv("FMC_USERNAME", "")
FMC_PASSWORD = os.getenv("FMC_PASSWORD", "")
VERIFY_SSL = os.getenv("VERIFY_SSL", "false").lower() == "true"


class FMCClient:
    def __init__(self):
        self.host = FMC_HOST
        self.username = FMC_USERNAME
        self.password = FMC_PASSWORD
        self.verify_ssl = VERIFY_SSL
        self.access_token = None
        self.refresh_token = None

    def authenticate(self):
        url = f"{self.host}/api/fmc_platform/v1/auth/generatetoken"
        response = requests.post(
            url,
            auth=(self.username, self.password),
            verify=self.verify_ssl,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        self.access_token = response.headers.get("X-auth-access-token")
        self.refresh_token = response.headers.get("X-auth-refresh-token")
        if not self.access_token:
            raise RuntimeError("No X-auth-access-token received from FMC")
        return {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
        }

    def headers(self):
        if not self.access_token:
            self.authenticate()
        return {
            "Content-Type": "application/json",
            "X-auth-access-token": self.access_token,
        }

    def get(self, endpoint, params=None):
        url = f"{self.host}{endpoint}"
        response = requests.get(
            url,
            headers=self.headers(),
            params=params,
            verify=self.verify_ssl,
        )
        response.raise_for_status()
        return response.json()

    def post(self, endpoint, payload):
        url = f"{self.host}{endpoint}"
        response = requests.post(
            url,
            headers=self.headers(),
            json=payload,
            verify=self.verify_ssl,
        )
        if not response.ok:
            print("POST failed")
            print("URL:", url)
            print("Payload:", json.dumps(payload, indent=2))
            print("Response:", response.text)
            response.raise_for_status()
        return response.json() if response.text else {}

    def put(self, endpoint, payload):
        url = f"{self.host}{endpoint}"
        response = requests.put(
            url,
            headers=self.headers(),
            json=payload,
            verify=self.verify_ssl,
        )
        if not response.ok:
            print("PUT failed")
            print("URL:", url)
            print("Payload:", json.dumps(payload, indent=2))
            print("Response:", response.text)
            response.raise_for_status()
        return response.json() if response.text else {}

    @staticmethod
    def save_json(filename, data):
        path = REPORT_DIR / filename
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Saved: {path}")
```

## Step 2 — Test Authentication Only

Create `scripts/01_test_auth.py`:

```python
from common import FMCClient

client = FMCClient()
tokens = client.authenticate()

print("Authentication successful")
print("Access token received:", bool(tokens["access_token"]))
print("Refresh token received:", bool(tokens["refresh_token"]))
```

Run it:

```bash
cd ~/lab/ips-rest-lab
source venv/bin/activate
python3 scripts/01_test_auth.py
```

Expected output:

```text
Authentication successful
Access token received: True
Refresh token received: True
```

If this fails:

- Check FMC IP / hostname.
- Check username / password.
- Check `VERIFY_SSL=false` for lab self-signed certs.

> Cisco documents token generation on `/api/fmc_platform/v1/auth/generatetoken` and token refresh on `/api/fmc_platform/v1/auth/refreshtoken`.

## Step 3 — Get Your FMC Domains

Create `scripts/02_get_domains.py`:

```python
from common import FMCClient

client = FMCClient()
data = client.get("/api/fmc_platform/v1/info/domain")
client.save_json("domains.json", data)

items = data.get("items", [])
if not items:
    print("No domains found")
else:
    for item in items:
        print(f"Name: {item.get('name')}  UUID: {item.get('uuid')}")
```

Run it:

```bash
python3 scripts/02_get_domains.py
```

Expected output:

```text
Name: Global  UUID: e276abec-e0f2-11e3-8169-6d9ed49b625f
```

Then copy that UUID into `.env`:

```bash
DOMAIN_UUID=e276abec-e0f2-11e3-8169-6d9ed49b625f
```

> Cisco's FMC quick-start lists `GET domain` and `GETALL domain` under system information services.

## Step 4 — List Current Intrusion Policies

Create `scripts/03_get_intrusion_policies.py`:

```python
import os
from dotenv import load_dotenv
from common import FMCClient

load_dotenv()
domain_uuid = os.getenv("DOMAIN_UUID")
if not domain_uuid:
    raise RuntimeError("DOMAIN_UUID is empty in .env")

client = FMCClient()
endpoint = f"/api/fmc_config/v1/domain/{domain_uuid}/policy/intrusionpolicies"
data = client.get(endpoint)
client.save_json("intrusion_policies.json", data)

items = data.get("items", [])
if not items:
    print("No intrusion policies found")
else:
    for item in items:
        print(f"Name: {item.get('name')}  ID: {item.get('id')}  Type: {item.get('type')}")
```

Run it:

```bash
python3 scripts/03_get_intrusion_policies.py
```

You'll get a list of intrusion policies and their IDs. Pick one and put its ID into `.env`:

```bash
INTRUSION_POLICY_ID=<paste-policy-id-here>
```

> Cisco's FMC REST quick-start lists `GET / GETALL / POST / PUT intrusionpolicies` in current releases.

## Step 5 — Get Current IPS Rules from One Intrusion Policy

Create `scripts/04_get_intrusion_rules.py`:

```python
import os
from dotenv import load_dotenv
from common import FMCClient

load_dotenv()
domain_uuid = os.getenv("DOMAIN_UUID")
policy_id = os.getenv("INTRUSION_POLICY_ID")
if not domain_uuid or not policy_id:
    raise RuntimeError("DOMAIN_UUID or INTRUSION_POLICY_ID is empty in .env")

client = FMCClient()
endpoint = (
    f"/api/fmc_config/v1/domain/{domain_uuid}"
    f"/policy/intrusionpolicies/{policy_id}/intrusionrules"
)
data = client.get(endpoint)
client.save_json("intrusion_rules.json", data)

items = data.get("items", [])
print(f"Total rules returned in this page: {len(items)}")
for item in items[:20]:
    print(
        f"ID: {item.get('id')} | Name: {item.get('name')} | "
        f"GID: {item.get('gid')} | SID: {item.get('sid')} | "
        f"Action: {item.get('action')}"
    )
```

Run it:

```bash
python3 scripts/04_get_intrusion_rules.py
```

This retrieves the current rule entries for that intrusion policy. Cisco documents `GET intrusionrules` as retrieving the per-policy behavior of intrusion rules associated with the selected intrusion policy; if no rule ID is specified, it returns the list of rules associated with that policy.

## Step 6 — Create a New Intrusion Policy

For beginners, this is the **safest "create" operation** to start with. It's much cleaner than immediately trying to create or override individual rules.

Create `scripts/05_create_intrusion_policy.py`:

```python
import os
from dotenv import load_dotenv
from common import FMCClient

load_dotenv()
domain_uuid = os.getenv("DOMAIN_UUID")
if not domain_uuid:
    raise RuntimeError("DOMAIN_UUID is empty in .env")

client = FMCClient()
payload = {
    "name": "REST_API_IPS_POLICY_01",
    "type": "IntrusionPolicy",
    "description": "Created from beginner REST API lab",
    "inspectionMode": "PREVENTION",
}

endpoint = f"/api/fmc_config/v1/domain/{domain_uuid}/policy/intrusionpolicies"
data = client.post(endpoint, payload)
client.save_json("created_intrusion_policy.json", data)

print("Created intrusion policy:")
print(f"Name: {data.get('name')}")
print(f"ID: {data.get('id')}")
```

Run it:

```bash
python3 scripts/05_create_intrusion_policy.py
```

Expected result:

- A new intrusion policy appears in FMC.
- `outputs/reports/created_intrusion_policy.json` is saved.

> Cisco's API catalogs list `POST intrusionpolicies`, and the Cisco Firewall Manager API documentation shows the expected object shape for creating an intrusion policy, including `name`, `type`, and `inspectionMode`.

## Step 7 — Create or Tune an IPS Rule in That Policy

This is the trickiest part because the payload can vary by release and by whether you're creating a **new per-policy rule override** versus updating an **existing rule entry**. Cisco documents both `POST intrusionrules` and `PUT intrusionrules`, but the safest beginner workflow is:

1. **GET** the intrusion rules from the target policy.
2. **Pick** one rule entry from the response.
3. **PUT** a minimal change back to that rule entry.

That's much safer than guessing a fresh `POST` body.

Create `scripts/06_update_intrusion_rule.py`:

```python
import os
from dotenv import load_dotenv
from common import FMCClient

load_dotenv()
domain_uuid = os.getenv("DOMAIN_UUID")
policy_id = os.getenv("INTRUSION_POLICY_ID")
if not domain_uuid or not policy_id:
    raise RuntimeError("DOMAIN_UUID or INTRUSION_POLICY_ID is empty in .env")

client = FMCClient()

# STEP 1: get current rules
list_endpoint = (
    f"/api/fmc_config/v1/domain/{domain_uuid}"
    f"/policy/intrusionpolicies/{policy_id}/intrusionrules"
)
rules = client.get(list_endpoint)
items = rules.get("items", [])
if not items:
    raise RuntimeError("No intrusion rules returned for this policy")

# STEP 2: pick one existing rule entry for safe testing
rule = items[0]
rule_id = rule["id"]

# STEP 3: build a minimal update payload from the existing object
# Remove read-only fields that FMC commonly rejects on PUT
for field in ["links", "metadata"]:
    rule.pop(field, None)

# Example test change: set action to ALERT if available in your environment.
# If your FMC uses different action enums, first inspect the GET output.
rule["action"] = "ALERT"

put_endpoint = (
    f"/api/fmc_config/v1/domain/{domain_uuid}"
    f"/policy/intrusionpolicies/{policy_id}/intrusionrules/{rule_id}"
)
updated = client.put(put_endpoint, rule)
client.save_json("updated_intrusion_rule.json", updated)

print("Updated intrusion rule:")
print(f"ID: {updated.get('id')}")
print(f"Name: {updated.get('name')}")
print(f"Action: {updated.get('action')}")
```

Run it:

```bash
python3 scripts/06_update_intrusion_rule.py
```

### Why this is the safest first test

You're not inventing a brand-new payload — you're:

- Reading a real rule from your own FMC.
- Removing obvious read-only fields.
- Changing one property.
- Sending it back with `PUT`.

That's the easiest beginner pattern for policy objects.

## Step 8 — If You Specifically Want to Test `POST intrusionrules`

Do this **only after PUT works**.

The safe process is:

1. Create a new intrusion policy.
2. Manually add one override in the GUI.
3. Retrieve it with `GET intrusionrules`.
4. Copy that exact JSON shape.
5. Build your `POST` payload to match it.

That avoids guessing field names. Cisco's quick-start confirms the endpoint exists, but the exact accepted payload can vary by release.

## Step 9 — What About "Alerts"?

There are two distinct meanings — and they need different APIs.

### If you mean alert destination objects

FMC has REST objects for alert configurations like **syslog alerts** and **SNMP alerts**. Cisco's 7.4 quick-start lists `GET syslogalerts` and `GET snmpalerts`.

Create `scripts/07_get_alert_destinations.py`:

```python
import os
from dotenv import load_dotenv
from common import FMCClient

load_dotenv()
domain_uuid = os.getenv("DOMAIN_UUID")
if not domain_uuid:
    raise RuntimeError("DOMAIN_UUID is empty in .env")

client = FMCClient()
endpoints = {
    "syslog_alerts.json": f"/api/fmc_config/v1/domain/{domain_uuid}/object/syslogalerts",
    "snmp_alerts.json":   f"/api/fmc_config/v1/domain/{domain_uuid}/object/snmpalerts",
}

for name, endpoint in endpoints.items():
    try:
        data = client.get(endpoint)
        client.save_json(name, data)
        print(f"Fetched {name}")
    except Exception as exc:
        print(f"Could not fetch {name}: {exc}")
```

Run it:

```bash
python3 scripts/07_get_alert_destinations.py
```

### If you mean live IPS alerts or intrusion events

Use **eStreamer**, not this REST config workflow. Cisco's eStreamer guides explicitly say it streams **intrusion events** and other event data from Management Center to external applications.

## Beginner Testing Plan

Run these in order.

| # | Script | Pass condition |
| --- | --- | --- |
| 1 | `01_test_auth.py` | Token received, no HTTP 401/403 |
| 2 | `02_get_domains.py` | Domain UUID displayed, `domains.json` created |
| 3 | `03_get_intrusion_policies.py` | One or more intrusion policies shown, `intrusion_policies.json` created |
| 4 | `04_get_intrusion_rules.py` | Rule list shown, `intrusion_rules.json` created |
| 5 | `05_create_intrusion_policy.py` | New policy ID returned and visible in FMC GUI |
| 6 | `06_update_intrusion_rule.py` | One rule updated, `updated_intrusion_rule.json` created, change visible in GUI |
| 7 | `07_get_alert_destinations.py` | `syslog_alerts.json` and/or `snmp_alerts.json` saved (if those objects exist) |

## What to Verify in the FMC GUI

After **Test 5**:

- Go to **Policies → Intrusion**.
- Confirm `REST_API_IPS_POLICY_01` exists.

After **Test 6**:

- Open the target intrusion policy.
- Locate the modified rule.
- Confirm the changed action.

## Common Errors and What They Mean

| Error | Meaning |
| --- | --- |
| **401 Unauthorized** | Wrong username/password, or token expired. Tokens are short-lived — refresh or regenerate. |
| **403 Forbidden** | Your FMC account lacks permission for intrusion-policy changes. Check user role permissions. |
| **400 Bad Request** | Payload shape is wrong. Use the GET-then-PUT pattern and strip read-only fields like `links` and `metadata`. |
| **429 Too Many Requests** | You hit FMC rate limits. Slow down — Cisco caps GETs and serializes writes. |

## Beginner Pro Tip

For `PUT intrusionrules`, **always**:

1. `GET` the exact object first.
2. Remove `links` and `metadata`.
3. Change only one field.
4. `PUT` it back.

This is dramatically safer than writing a payload from memory.

## Quick `curl` Token Test

If you want to sanity-check authentication before scripting:

```bash
curl -k -u admin:yourpassword -X POST \
  "https://192.168.30.184/api/fmc_platform/v1/auth/generatetoken" \
  -D headers.txt
```

Then inspect the token headers:

```bash
cat headers.txt
```

Look for `X-auth-access-token` and `X-auth-refresh-token` in the response headers.

## Where to Start

If you only run three things today, run these:

```bash
python3 scripts/01_test_auth.py
python3 scripts/02_get_domains.py
python3 scripts/03_get_intrusion_policies.py
```

Once those work, move on to rules and policy creation.

---

# My Test Results — Real-World Findings

After running this lab against a real FMC, I ran into a few important limitations that aren't always obvious from the docs.

## Cisco Secure Firewall IPS / Snort 2 REST API Limitation

> You **cannot** use the REST API to view, edit, add, or delete **local Snort 2 IPS rules** on Cisco Secure Firewall Management Center (FMC) version **7.4.2**.

The REST API for intrusion-rule management in FMC is designed to work with **Snort 3 rules only**. The documented REST endpoints for intrusion rules — for example `GET / PUT / POST / DELETE` on `/api/fmc_config/v1/domain/{domainUUID}/object/intrusionrules` — explicitly refer to **Snort 3 intrusion rules and rule groups**. There are **no REST endpoints** for managing Snort 2 local IPS rules.

In summary:

- The FMC REST API supports retrieving and modifying **Snort 3** intrusion rules and rule groups.
- **Snort 2 local IPS rules are not accessible or manageable** through the FMC REST API.
- This means Snort 2 local rules must be managed through the **FMC GUI** or other supported interfaces.

This is consistent with the REST API documentation and the focus on Snort 3 for intrusion-rule management in FMC 7.x versions.

**Reference**

- [Secure Firewall Management Center REST API Quick Start Guide, Version 7.1 — Objects in the REST API](https://www.cisco.com/c/en/us/td/docs/security/firepower/710/api/REST/firepower_management_center_rest_api_quick_start_guide_710/Objects_In_The_REST_API.html)

## Why the REST API Doesn't Work with Snort 2

The reason you **can** manage Snort 3 local rules but **cannot** manage Snort 2 local rules via REST comes down to Cisco's architectural and development focus on Snort 3 starting in **FMC 7.0**. Snort 3 is the newer intrusion engine with improved processing speeds and new features, and Cisco designed the REST API specifically to support intrusion-rule management for **Snort 3**.

Key points behind this limitation:

- **Snort 3 is the default inspection engine** for new and reimaged devices from FMC 7.0 onward, and Cisco is actively developing Snort 3 features — including REST API management capabilities. **Snort 2 is planned for deprecation**, and migration to Snort 3 is strongly recommended.
- **REST API endpoints for intrusion rules support Snort 3 rules and rule groups only.** There are no REST endpoints for Snort 2 local IPS rules — those must be managed via the GUI.
- **Snort 2 and Snort 3 have different rule management architectures**, and the REST API was designed to align with the newer Snort 3 architecture, enabling viewing, editing, adding, and deleting Snort 3 local rules via API.
- **Custom local Snort 3 rules** can be created and managed by importing rule files and associating them with rule groups, with unique rule identifiers assigned by the system. **Custom Snort 3 rules cannot be edited directly** — they must be deleted and recreated if changes are needed.
- **Snort 2 local rules lack REST API support** because the API framework and data models were never extended to cover the legacy Snort 2 engine.

In short: the REST API only manages **Snort 3 local rules** because of Cisco's transition to Snort 3 as the primary inspection engine, its modernized architecture, and the planned deprecation of Snort 2.

**References**

- [Configure Custom Local Snort Rules in Snort 3 on FTD — Cisco](https://www.cisco.com/c/en/us/support/docs/security/firepower-ngfw/220682-configure-custom-local-snort-rules-in-sn.html)
- [Secure Firewall Management Center REST API Quick Start Guide, Version 7.6.0 — Objects in the REST API](https://www.cisco.com/c/en/us/td/docs/security/secure-firewall/management-center/api/REST/secure_firewall_management_center_rest_api_quick_start_guide_760/Objects_In_The_REST_API.html)

## Snort 2 → Snort 3 Migration Issues

When migrating Snort 2 rules to Snort 3, errors are common because of differences in **rule syntax** and **inspection behavior** between the two versions.

Key reasons:

- **Different rule syntax.** Snort 3 uses a more uniform, consistent rule syntax with arbitrary whitespace, while Snort 2 syntax is inconsistent and requires line escapes. Snort 3 also introduces new keywords and removes some Snort 2 inconsistencies. The two rule languages are **not directly compatible** — Snort 2 rules can't be used in Snort 3 without conversion or rewriting.
- **Inspection buffers.** Snort 3 inspects normalized flow-data buffers that may not be present or specified in Snort 2 rules. A Snort 2 rule that triggers on raw packet data without specifying a buffer might **not trigger in Snort 3** unless the right buffer (e.g. `http_uri`) and `service` keywords are added.
- **Feature differences.** Some Snort 2 features — like dynamic state and per-rule SNMP alerting — are **not supported** in Snort 3, so rules using those features won't migrate cleanly.
- **Rule comments and management.** Snort 3 saves comments **with the policy** rather than with the rule, and comments are **not migrated** from Snort 2.
- **Conversion utility limitations.** Cisco provides a rule-conversion utility for Snort 2 → Snort 3, but while it handles most rules, **detection behavior may differ**. Manual review and adjustment is recommended to ensure equivalent protection.

Functionally, **Snort 3 is architecturally redesigned** for better performance, enhanced protocol support (including encrypted traffic), and streamlined rule management. Migration to Snort 3 is recommended to take advantage of these improvements.

**Bottom line:** errors during migration are mostly driven by **syntax differences, inspection-model changes, and unsupported features** in Snort 3. Careful conversion and **testing** are essential to maintain equivalent protection.

**References**

- [Cisco Security Cloud Control: Secure Firewall Threat Defense Management — Migrate from Snort 2 to Snort 3](https://docs.defenseorchestrator.com/c-migrate-from-snort-2-to-snort-3.html)
- [Snort 3 Adoption — Cisco](https://secure.cisco.com/secure-firewall/docs/snort-3-adoption)

## Closing Thoughts

The FMC REST API gives you a clean, scriptable way to **read, create, and tune intrusion policies and Snort 3 rules** — but the moment you need legacy **Snort 2** local rules or **live intrusion event streaming**, you have to step outside this API (GUI for Snort 2, eStreamer for events).

Start with the seven scripts above, get auth and `GET` working first, then layer in `POST` and `PUT` carefully — always using the **GET → strip → modify → PUT** pattern. Once you're comfortable, the same building blocks scale up to full CI/CD-driven IPS policy management.
