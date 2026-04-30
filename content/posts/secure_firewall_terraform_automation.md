---
title: "Cisco Secure Firewall Automation: Terraform Setup and Validation"
date: 2025-05-16
draft: false
description: "A beginner-friendly Terraform starter for Cisco Secure Firewall Management Center (FMC) — install, init, validate, and plan against the FMC provider before you ever touch a real resource."
tags:
  - Cisco
  - Secure Firewall
  - FMC
  - Terraform
  - Infrastructure as Code
  - Automation
  - DevOps
  - Security
---

# Cisco Secure Firewall Automation: Terraform Setup and Validation

> Use case 8 of my Cisco Secure Firewall automation series — a focused, beginner-friendly starter for **Terraform + FMC**. The goal here isn't to build production resources yet; it's to prove the framework works end-to-end before you touch anything real.

## Introduction

This use case is intentionally different from the Python and Ansible ones I've covered earlier:

- **Python** — easiest for custom workflows.
- **Ansible** — easy for operational playbooks.
- **Terraform** — best for **infrastructure as code**, repeatable builds, and version-controlled state.

For the starter pack, Terraform is treated as a **validation use case**, which means:

1. First confirm Terraform is installed.
2. Then confirm the FMC provider can initialize.
3. Then confirm your variables are passed correctly.
4. Then confirm the Terraform config is syntactically valid.
5. Finally, move toward real FMC resources.

## 1. Goal of This Use Case

You want to prove:

- Terraform is installed correctly.
- The FMC provider can initialize.
- Your variables are being passed correctly.
- The Terraform config is syntactically valid.
- You're ready to add real FMC resources later.

At this stage, this is mostly a **setup and framework validation** exercise.

## 2. Where to Run It

Run from the project root first, then drop into the `terraform/` folder:

```bash
cd ~/lab/secure-firewall-automation
source fw/bin/activate
cd terraform
```

## 3. Check Terraform Is Installed

```bash
terraform version
```

You should see a Terraform version banner. If not, install Terraform first using the [official HashiCorp instructions](https://developer.hashicorp.com/terraform/install).

## 4. Check Your Terraform Files

```bash
find . -maxdepth 2 -type f | sort
```

Inside `terraform/` you should have:

```text
./main.tf
./outputs.tf
./provider.tf
./variables.tf
./versions.tf
```

## 5. Inspect What's Already There

Take a look at the current contents so you know what the starter pack is shipping:

```bash
cat versions.tf
cat provider.tf
cat variables.tf
cat main.tf
cat outputs.tf
```

You're checking whether the starter pack contains:

- A **provider block**.
- **Variable definitions**.
- A placeholder resource or an empty `main.tf`.

## 6. Recommended Starter Content

If your files are incomplete, use these baseline files.

### `versions.tf`

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    fmc = {
      source = "CiscoDevNet/fmc"
    }
  }
}
```

### `provider.tf`

```hcl
provider "fmc" {
  url      = var.fmc_url
  username = var.fmc_username
  password = var.fmc_password
}
```

### `variables.tf`

```hcl
variable "fmc_url" {
  type = string
}

variable "fmc_username" {
  type = string
}

variable "fmc_password" {
  type      = string
  sensitive = true
}
```

### `main.tf`

For initial validation, keep it dead simple:

```hcl
# Starter placeholder for Terraform validation.
# Add real FMC resources here after init/validate succeeds.
```

### `outputs.tf`

```hcl
output "terraform_test_message" {
  value = "Terraform FMC starter configuration loaded successfully"
}
```

## 7. First Terraform Test Sequence

From inside the `terraform/` folder, run these in order.

### Step 1 — Initialize the provider

```bash
terraform init
```

What this does:

- Downloads the FMC provider.
- Creates the `.terraform/` directory.
- Prepares the working directory.

Expected result:

```text
Terraform has been successfully initialized!
```

### Step 2 — Format the files

```bash
terraform fmt
```

This normalizes whitespace and indentation in your `.tf` files.

### Step 3 — Validate syntax

```bash
terraform validate
```

Expected result:

```text
Success! The configuration is valid.
```

If this passes, your Terraform files are structurally sound.

## 8. First Variable Test

```bash
terraform plan \
  -var="fmc_url=https://192.168.30.184" \
  -var="fmc_username=admin" \
  -var="fmc_password=yourpassword"
```

Replace these with your real values.

What this does:

- Loads the provider config.
- Checks variable passing.
- Builds a plan.

Since `main.tf` is just a placeholder, you may see:

- No changes.
- An output value displayed.
- Or simply a clean plan.

That's okay — at this stage, **a clean plan is the win**.

## 9. What Counts as Success

This use case is successful when all of these pass:

```bash
terraform version
terraform init
terraform fmt
terraform validate
terraform plan -var=...
```

That proves:

- ✅ Terraform is installed.
- ✅ The FMC provider loads.
- ✅ Your syntax is correct.
- ✅ Credentials and variables are accepted by Terraform.

## 10. If `terraform init` Fails

Common reasons:

**A. Terraform isn't installed**
Install it.

**B. Provider download issue**
Could be:

- Internet connectivity.
- Typo in the provider `source`.
- Temporary registry/provider problem.

**C. Wrong provider source**
Confirm:

```hcl
source = "CiscoDevNet/fmc"
```

## 11. If `terraform validate` Fails

That means your `.tf` syntax is wrong. Check for:

- Missing braces.
- Missing quotes.
- Invalid block names.
- Bad `output` syntax.

## 12. If `terraform plan` Fails

Common reasons:

**A. Wrong FMC URL** — use a full URL, scheme included:

```text
https://192.168.30.184
```

**B. Wrong credentials** — same as Python/Ansible: verify your username and password.

**C. Provider-specific argument mismatch** — read the exact provider error and check the expected attribute names for your FMC provider version.

## 13. Where Terraform Fits in Your Starter Pack

At this point, this use case is primarily a **setup / validation** exercise, not a full create/update workflow.

For the rest of the starter pack:

- **Python** is your strongest implementation path.
- **Ansible** is partially working for operational tasks.
- **Terraform** is being validated as a framework you can grow into.

Once this passes, you can confidently start adding real FMC resources.

## 14. Suggested Next Milestone

Once `terraform init`, `validate`, and `plan` all work, the next step is the **Terraform object test**:

> Add one simple, supported FMC resource and confirm `plan` and `apply` behave as expected.

Resource support can vary by provider version and FMC release, so **validate the framework first**, then add real resources carefully — one at a time.

## 15. Exact Commands to Run Now

From the project root:

```bash
cd ~/lab/secure-firewall-automation
source fw/bin/activate
cd terraform

terraform version
cat versions.tf
cat provider.tf
cat variables.tf
cat main.tf
cat outputs.tf

terraform init
terraform fmt
terraform validate

terraform plan \
  -var="fmc_url=https://192.168.30.184" \
  -var="fmc_username=admin" \
  -var="fmc_password=yourpassword"
```

Replace `admin` and `yourpassword` with your real credentials.

## 16. What to Capture for Troubleshooting

If you hit issues and want help debugging, capture the output of:

```bash
terraform init
terraform validate
terraform plan \
  -var="fmc_url=https://192.168.30.184" \
  -var="fmc_username=admin" \
  -var="fmc_password=yourpassword"
```

Plus the contents of:

```bash
cat main.tf
```

That's almost always enough to pinpoint a setup problem without guessing.

## Closing Thoughts

It's tempting to jump straight to writing real Terraform resources for FMC, but the boring four-step ritual — **install → init → validate → plan** — saves enormous time later. Once you trust the framework, every resource you add becomes a small, verifiable change instead of a debugging adventure.

In the next post, I'll build on this foundation by adding a real FMC resource (objects first, then policy) and walking through a proper `plan` / `apply` / `destroy` lifecycle.
