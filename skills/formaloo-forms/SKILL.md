---
name: formaloo-forms
description: Create and edit Formaloo forms, fields, logic, and themes through the Formaloo MCP server. Use when asked to build a form, survey, quiz, application, booking page, or feedback form in Formaloo, or to change an existing form's fields, conditional logic, settings, or design.
---

# Formaloo forms

## Workspace first

Never guess between workspaces. If the target workspace is unclear or the user
belongs to several, call `select_workspace_context` and use the slug it returns.
Pass that slug as `x_workspace` on workspace-scoped calls.

## Creating a form

Call `create_form` once with the whole form rather than looping over small
writes. Put ordered `fields[]`, form settings, and theme inputs in the same
request, and put conditional logic in the top-level `logic` argument so the
server can resolve field and choice references to saved slugs for you.

A successful `create_form` returns a `form_authoring_context` with the saved
field and choice slugs. Reuse it for follow-up work instead of calling
`get_form` again. It also returns a `next_steps` block naming optional
follow-ups (notifications, integrations, sharing, a results dashboard).

Notes that save rework:

- Logic references must be unambiguous. When two choices share a label, use the
  object form, e.g. `{ "field": "Project type", "choice": "Other" }`.
- `create_form` attaches a reusable v5 theme by default. Pass `theme` or
  `theme_slug` to reuse an existing one, or `theme_body` to define a new one.
  Custom CSS is blocked unless the user explicitly asks for it.
- Connected field types need their source first: `profile` and `user` need a
  user-form slug; `lookup` and `linked_rows` need exact form and field slugs.
- Media is attached by file slug (`logo_slug`, `banner_slug`,
  `background_image_slug`, ...). Create the Formaloo file with `upload_file`
  first. A `file` field type is a respondent upload question, not branding.

## Editing a form

Call `get_form` first when exact current field slugs, choice slugs, logic,
theme, or settings matter.

Formaloo's form-fields PATCH removes omitted fields. `update_form` compensates
by reading current fields and overlaying your `fields[]` by saved `slug` or
`ref_id`, so send patches, not a trimmed list. Set `confirm_field_removal=true`
only when the `fields[]` you send really is the complete remaining field set.

Prefer `update_form` with `fields[]` for structural changes. Use the surgical
tools (`create_field`, `update_field`, `delete_field`, `check_field_type_change`)
only for a single-field change. Form-level `body.logic` is a full-array PATCH:
omitted rules are deleted.

## When a contract is unclear

- `search_formaloo_tools` with a task in plain words finds the right tool;
  `tool=<name>` returns one tool's full schema, and `field_type=<type>` narrows
  `create_field` to one branch.
- `read_formaloo_resource` loads the server's own guidance:
  `formaloo://forms/authoring-guide`, `formaloo://forms/field-types`,
  `formaloo://forms/logic-guide`, `formaloo://forms/themes-guide`,
  `formaloo://forms/authoring-patterns` (quizzes, NPS, bookings, trackers), and
  `formaloo://forms/from-spec-guide` for building a form from a prompt,
  screenshot, PDF, or HTML.
- `dry_run_formaloo_tool` previews an unfamiliar or destructive write.

## Safety

Deletes and bulk writes require `confirm=true`. Confirm with the user before
passing it. Report back with real slugs and URLs, not raw API envelopes.
