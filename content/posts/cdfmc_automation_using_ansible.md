---
title: "Automating Cisco Cloud-Delivered FMC (cdFMC) with Ansible"
date: 2026-04-29
draft: false
description: "A practical, end-to-end walkthrough for connecting to Cisco's Cloud-Delivered Firewall Management Center (cdFMC) using REST APIs and Ansible — from generating an API token to running your first playbook."
tags:
  - Cisco
  - cdFMC
  - FMC
  - Ansible
  - Automation
  - REST API
  - Firewall
  - Security
---

# Automating Cisco Cloud-Delivered FMC (cdFMC) with Ansible

> From a fresh Cisco Security Cloud account to a working Ansible playbook that talks to your Cloud-Delivered Firewall Management Center.

## Introduction

Cisco's **Cloud-Delivered Firewall Management Center (cdFMC)** brings the familiar FMC management experience to the cloud — no on-prem appliance, no manual upgrades, and a clean REST API surface that's perfect for automation.

In this post, I'll walk through exactly how I set up cdFMC API access from scratch, validated connectivity with `curl`, and then wired the same workflow into Ansible using the `cisco.fmcansible` collection. By the end, you'll have a minimal but production-style project layout you can build on.

## Prerequisites

Before you start, make sure you have:

- A Cisco **Security Cloud (SSC)** account with access to your firewall tenant.
- Python 3.9+ installed on your workstation or jump host.
- Basic familiarity with `curl`, virtual environments, and Ansible playbooks.
- At least one device (FTD / FMC) onboarded to your cdFMC tenant.

## Step 1 — Log in to Cisco Security Cloud

Log in to your Cisco SSC account at [https://security.cisco.com/](https://security.cisco.com/), then select your organization tenant and choose **Firewall**.


## Step 2 — Generate an API Token

The cdFMC REST API uses a long-lived **bearer token** instead of username/password authentication. Cisco's official guide is here:

- [Generate an API Token](https://docs.manage.security.cisco.com/t-generatean-api-token.html#!c-api-tokens.html)

To generate one:

1. Navigate to **Settings → User Management** (or **Administration → API User Management**, depending on your workflow).
2. Under the desired account, select **Generate API Token**.
3. **Copy and securely store the token** — you won't be able to view it again.

This token must be included in the `Authorization` header of every REST API call.

### Best practices

- Use **separate accounts** for API and UI access. Don't reuse the same credentials.
- Assign **only the privileges the API user needs** — least privilege wins.
- **Validate and sanitize** every JSON payload returned by the server before acting on it.
- Treat the token like a password: store it in a secret manager or `.env` file, never in source control.

### Reference: Connecting with a client

Cisco's quick-start guide for the REST API client is worth bookmarking:

- [cdFMC REST API Quick Start — Connecting With A Client](https://www.cisco.com/c/en/us/td/docs/security/cdo/cloud-delivered-firewall-management-center-in-cdo/API/cloud_delivered_firewall_management_center_rest_api_quick_start_guide/Connecting_With_A_Client.html)

A minimal call looks like this:

```bash
curl 'https://<cdfmc-server>:<port>/api/fmc_config/v1/domain/<domainUUID>/object/hosts' \
  --header 'Authorization: Bearer <api_token>'
```

## Step 3 — Set Up Your Python Environment

Create a Python virtual environment for the project so dependencies stay isolated.

**Linux / macOS**

```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows**

```powershell
python -m venv venv
venv\Scripts\activate
```

Then install the Python packages we'll use:

```bash
pip install requests python-dotenv pandas openpyxl
```

What each one is for:

- **requests** — making REST API calls.
- **python-dotenv** — loading credentials from a local `.env` file.
- **pandas** / **openpyxl** — reading CSV/Excel input (handy for bulk object or rule creation).

## Step 4 — Install Ansible and the Cisco FMC Collection

Install Ansible and the Cisco FMC Ansible collection:

```bash
pip install ansible
ansible-galaxy collection install cisco.fmcansible
```

The `cisco.fmcansible` collection ships the `fmc_configuration` module, which wraps the FMC REST API for managing policies, devices, objects, and more.

## Step 5 — Export Your API Token

Export the API token as an environment variable so playbooks and `curl` commands can read it:

```bash
export CDFMC_API_TOKEN='<YOUR_NEW_API_USER_TOKEN>'
```

> **Heads up:** Never commit your real token to git. The example below is a redacted token used purely for shape illustration.

```bash
export CDFMC_API_TOKEN='Paste your API token here'
```

Confirm it's set:

```bash
echo $CDFMC_API_TOKEN
```

## Step 6 — Test Base Connectivity

Now test that the token works end-to-end by listing your inventory:

```bash
curl -sk -X GET \
  "https://api.apj.security.cisco.com/firewall/v1/inventory/devices" \
  -H "Authorization: Bearer $CDFMC_API_TOKEN" \
  -H "Accept: application/json"
```

Expected shape:

```json
{
  "items": [ ]
}
```

- If this **fails** → it's a token or permissions issue.
- If this **works** → you're good to keep going.

### What to extract from the response

From the JSON above, capture these IDs — you'll reuse them everywhere:

| Field | Value |
| --- | --- |
| `domain_uuid` | `enter domain ID` |
| `device_record_uuid` | `enter device ID` |
| `current_access_policy_id` | `enter policy ID` |
| `base_url` | `entr your base URL` |

> Your `base_url` will differ by region (e.g., `apj`, `eu`, `us`). Use the one returned by your tenant.

## Step 7 — Test cdFMC Access (Access Policy)

Now query the actual access policy through the cdFMC API:

```bash
curl -sk -X GET \
  "https://api.apj.security.cisco.com/firewall/v1/cdfmc/api/fmc_config/v1/domain/e276abec-e0f2-11e3-8169-6d9ed49b625f/policy/accesspolicies/0ad4678e-a79d-0ed3-0000-030064778522" \
  -H "Authorization: Bearer $CDFMC_API_TOKEN" \
  -H "Accept: application/json" | jq
```

Trimmed response:

If you get back a JSON object with your policy `name` and `id`, the cdFMC REST surface is fully reachable with your token.

## Step 8 — Run Your First Ansible Playbook

Time to drive the same API from Ansible. Run the connectivity-validation playbook:

```bash
ansible-playbook -i inventory.yml playbooks/00_validate_connectivity.yml
```

Expected output:

```text
PLAY [Validate cdFMC API connectivity] *****************************************

TASK [Fail if token is not set] ************************************************
skipping: [localhost]

TASK [Check deployable devices] ************************************************
ok: [localhost]

TASK [debug] *******************************************************************
ok: [localhost] => {
    "result.json": {
        "items": [
            {
                "id": "XXX......",
                "name": "host IP",
                "type": "DeployableDevice",
                "version": "1777010234276"
            }
        ],
        "paging": { "count": 1, "limit": 25, "offset": 0, "pages": 1 }
    }
}

PLAY RECAP *********************************************************************
localhost : ok=2  changed=0  unreachable=0  failed=0  skipped=1  rescued=0  ignored=0
```

At this point your **inventory check, access-policy fetch, and Ansible run** all succeed, which means:

- ✅ `https://api.apj.security.cisco.com/firewall` is the right base URL.
- ✅ `Authorization: Bearer $CDFMC_API_TOKEN` is the right auth header.
- ✅ Ansible can speak to cdFMC end-to-end.

## Step 9 — A Clean, Minimal Project Layout

Here's the layout I settled on for the simple project:
Create the directories:

```bash
mkdir -p simple_cdfmc_ansible/group_vars
mkdir -p simple_cdfmc_ansible/playbooks
cd simple_cdfmc_ansible
```

### `inventory.yml`

```yaml
all:
  hosts:
    localhost:
      ansible_connection: local
```

### `group_vars/all.yml`

Drop in your own tenant's IDs. You can grab them from the API responses above, or from the cdFMC **API Explorer**:

API Explorer URL (yours will differ): [https://cisco-ranifern.app.apj.cdo.cisco.com/api/api-explorer/](https://cisco-ranifern.app.apj.cdo.cisco.com/api/api-explorer/)

```yaml
---
base_url: "https://api.apj.security.cisco.com/firewall"
domain_uuid: "our ID"
access_policy_id: "your ID"
cdfmc_api_token: "{{ lookup('env', 'CDFMC_API_TOKEN') }}"

src_ip: "enter host IP"
src_object_name: "enter host name"
rule_name: "enter ACL rule name"

common_headers:
  Accept: "application/json"
  Content-Type: "application/json"
  Authorization: "Bearer {{ cdfmc_api_token }}"
```

### `playbooks/00_test.yml` — verify the token from Ansible

```yaml
---
- name: Test cdFMC API token
  hosts: localhost
  gather_facts: false
  vars_files:
    - ../group_vars/all.yml
  tasks:
    - name: Get access policy
      uri:
        url: "{{ base_url }}/v1/cdfmc/api/fmc_config/v1/domain/{{ domain_uuid }}/policy/accesspolicies/{{ access_policy_id }}"
        method: GET
        headers: "{{ common_headers }}"
        return_content: true
        status_code: 200
      register: result

    - name: Show policy name
      debug:
        msg: "Connected successfully. Policy name is {{ result.json.name }}"
```

Run it:

```bash
ansible-playbook -i inventory.yml playbooks/00_test.yml
```

If you see `Connected successfully. Policy name is policy_192.168.78.30` (or whatever your policy is called), you're ready to start building real automation on top of this base.

## What's Next

With this foundation in place, the natural next steps are:

- Create **network/host objects** from a CSV via Ansible.
- Add or modify **access rules** in your policy programmatically.
- Trigger **deployments** to managed FTDs after changes.
- Wire the playbooks into a **CI/CD pipeline** with GitOps-style approvals.

I'll cover each of those in follow-up posts.

## Closing Thoughts

cdFMC removes a lot of the operational friction of running an on-prem FMC, and its REST API plus the `cisco.fmcansible` collection make it a great target for automation. The hardest part — as always — isn't the code. It's getting the **auth, IDs, and base URL** right the first time. Once you have those nailed down, everything else is just composing API calls into idempotent Ansible tasks.

If you found this useful, stay tuned for the next post where I'll automate object and access-rule lifecycle management end-to-end.
