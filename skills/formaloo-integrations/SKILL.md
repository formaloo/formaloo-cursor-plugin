---
name: formaloo-integrations
description: Connect a Formaloo form to another service — HubSpot, Mailchimp, Notion, Brevo, NetSuite, webhooks, email and PDF templates, WhatsApp campaigns, lead enrichment, or recurring submissions. Use when asked to send Formaloo submissions somewhere, set up a notification or webhook, or diagnose an integration that is installed but not working.
---

# Formaloo integrations

Most integration tools are not advertised individually. Reach them in two
steps: `search_formaloo_tools` with the task in plain words ("connect a form to
mailchimp") returns the matching tool, whether it is called directly or through
an executor, and its input schema. Then run it with `run_formaloo_read`,
`run_formaloo_write`, or `run_formaloo_destructive`, passing `tool` and
`arguments`. The named tool gets the same validation, confirmation gates, and
output shaping as a direct call.

`list_supported_integrations` and `get_integration_setup_guide` carry the
server's current setup recipes; `diagnose_integration_setup` is the first stop
for "it's connected but nothing arrives".

## Four states, never one flag

An integration that looks connected may not be. Check these separately:

1. **Catalog definition** — Formaloo knows the integration type.
   `list_integration_apps`, `get_integration_app`, `list_integration_tags`.
2. **Workspace installation** — this workspace installed it.
   `install_integration_app` (a returned redirect URL is the next auth step),
   `get_installed_integration_app`.
3. **Provider connection** — Formaloo can authenticate to the provider (OAuth,
   credentials, payment account, WhatsApp connection).
4. **Configured item** — a runnable mapping exists for a specific form: a
   provider form mapping, webhook, template, campaign, or schedule.

Set them up in that order. Integrations with no external provider, such as
webhooks and the PDF generator, skip step 3.

## What has a native contract

Form provider mappings with full CRUD: HubSpot, Mailchimp, Notion, Brevo
(`sendinblue` in API paths), and NetSuite. List the provider's target fields
first (`list_hubspot_properties`, `list_mailchimp_audiences`,
`list_mailchimp_merge_fields`, `list_notion_databases`, `list_brevo_attributes`,
`list_brevo_lists`, `list_netsuite_metadata`) so the mapping references real
destination fields.

Also native: form webhooks, email templates, PDF templates and per-row PDF
generation, WhatsApp campaigns and templates with their approval submission,
lead enrichment, and recurring submissions.

Slack, Google Sheets, Google Forms, Make, Calendly, ActiveCampaign, and the
payment gateways (Stripe, PayPal, Square, Razorpay) are dashboard or
payment-API workflows. Point the user at the dashboard rather than inventing an
API call, and do not guess Google Sheets sync semantics.

## Before destructive changes

`uninstall_integration_app` has type-specific side effects: it clears Slack
access and Google Sheets links from the user's forms, deactivates payment
methods for that gateway, and deletes accessible form webhooks. Preview the
effect, get explicit confirmation, then pass `confirm=true`.

Depth lives in `read_formaloo_resource` with `formaloo://integrations/guide`.
