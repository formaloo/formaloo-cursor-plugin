---
name: formaloo-results
description: Read, filter, and visualize Formaloo submissions, and build Formaloo apps, pages, and dashboard blocks over a form. Use when asked to see responses or entries for a form, filter or export submissions, add or update rows, or build a results dashboard, table, chart, or kanban view in Formaloo.
---

# Formaloo submissions and dashboards

Two paths cover almost every request. Pick one deliberately.

## 1. Inspect rows in the conversation

`list_form_submissions` is the canonical list tool, scoped to one form slug.
Prefer it over the compatibility names `list_form_rows` and `list_rows`, and do
not use `get_form_stats` as the primary results path.

It supports `search`, `sort_by`, `page`, `page_size`, `status`, date bounds
(`submit_time_*`, `created_at_*`, `updated_at_*`), meta filters (`created_by`,
`updated_by`, `tags`), and per-field filters keyed `{fieldSlug}` or
`{fieldSlug}_{operator}` with operators such as `icontains`, `exact`, `gt`,
`gte`, `lt`, `lte`, `in`, and `not_in`.

Responses are compact: `items` with `data` / `rendered_data`, derived `columns`,
and `pagination` carrying `has_more` and `next_page`. Page size defaults to 25.
Then use `get_row`, `update_row`, or `delete_row` for one known row slug, and
`bulk_delete_form_submissions` with `slugs_list` and `confirm=true` for many.

If the form slug is unknown, `list_forms` first and use `submit_count` to pick
the likely candidate; skip that step when the slug is already known.

## 2. Build a saved app view

A saved dashboard in Formaloo is an app block. Compose `create_app` or
`update_app` with inline `pages[]` and `blocks[]` in one request rather than
looping. Useful block types over a form slug: `form_result` (response table),
`form_charts` (charts), plus `kanban`, `gallery`, and `ai_summary`.

Use `get_app` to inspect menus, pages, blocks, and admin/share links, and
`list_app_blocks` to find a block slug. `list_app_block_content` reads a data
block's runtime rows; its `page`, `search`, date and field parameters are
request-time filters only. Saved settings (`filters`, `fields`,
`columns_width`, `columns_field`, card options) change only through
`update_app_block`.

## Writing rows

`create_row` puts answer values directly on `body`, keyed by saved field slugs,
with `status: "submit"` to submit. Do not wrap answers in `body.fields`. Public
entry uses `submit_form_display` with the display slug; it accepts field aliases
only with `submit_by_alias=true`.

Value shapes: scalars for text, email, number, date, and time; one choice slug
for single choice, dropdown, rating, opinion scale, and NPS; an array of choice
slugs for multi-select; nested objects keyed by row and column slug for table
and matrix fields. Dates are `YYYY-MM-DD`, datetimes `YYYY-MM-DD HH:MM:SS`,
times `HH:MM:SS`. Use `null` when a value cannot be extracted. Read the form
with `get_form` first when slugs or value shapes are unknown.

For the full contract, `read_formaloo_resource` with
`formaloo://forms/submission-data`, `formaloo://apps/authoring-guide`, or
`formaloo://apps/data-blocks`.
