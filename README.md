<p align="center">
  <img src="assets/logo.svg" alt="Formaloo OI" width="72" height="72" />
</p>

# Formaloo OI for Cursor

Build and manage Formaloo forms, submissions, apps, and integrations without
leaving Cursor. This plugin connects Cursor to Formaloo's hosted MCP server and
ships three skills that teach the agent how to use it well.

With it installed you can ask for things like:

- "Create a customer onboarding form with conditional logic for enterprise plans."
- "Show me this week's submissions for the beta signup form, grouped by plan."
- "Build a results dashboard for the NPS form with a chart and a response table."
- "Send new submissions from the contact form to our HubSpot contacts."

## Install

1. Open [the Formaloo OI plugin in the Cursor marketplace](https://cursor.com/marketplace)
   and click **Install**, or run `/plugin` in Cursor and search for `formaloo-oi`.
2. Cursor adds the `formaloo` MCP server and prompts you to sign in. Click
   **Connect** / **Needs login** on the server and complete the Formaloo
   sign-in in your browser.
3. Start a chat and ask Formaloo for something. Try "list my Formaloo
   workspaces".

There is nothing to configure and no API key to paste. The server uses OAuth,
so your Formaloo account authorizes Cursor directly and no credential is ever
stored in this repository or in your Cursor settings.

### Manual install

If you would rather wire the MCP server up by hand, add this to
`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per project):

```json
{
  "mcpServers": {
    "formaloo": {
      "url": "https://mcp.formaloo.com/mcp"
    }
  }
}
```

You will not get the bundled skills this way.

## Workspaces

If your Formaloo account has more than one workspace, leave the server
unpinned and let the agent call `select_workspace_context` to choose, or pass
the workspace per call. To pin every call to one workspace instead, add an
`x-workspace` header to a manual MCP config:

```json
{
  "mcpServers": {
    "formaloo": {
      "url": "https://mcp.formaloo.com/mcp",
      "headers": {
        "x-workspace": "your_workspace_slug"
      }
    }
  }
}
```

## What's included

| Component | Contents |
| --- | --- |
| MCP server | `formaloo` → `https://mcp.formaloo.com/mcp`, OAuth, streamable HTTP |
| Skills | `formaloo-forms`, `formaloo-results`, `formaloo-integrations` |

The MCP server exposes curated tools for forms and fields, submissions and
rows, apps, pages and dashboard blocks, themes, workspaces, and integrations,
plus a search-and-execute path (`search_formaloo_tools` with
`run_formaloo_read` / `run_formaloo_write` / `run_formaloo_destructive`) that
reaches everything else in the Formaloo API. Destructive operations require an
explicit confirmation.

Agent guidance ships with the server as MCP resources; `read_formaloo_resource`
with no arguments lists them.

## Troubleshooting

**The server shows as needing login.** Click Connect on the `formaloo` server
in Cursor's MCP settings and finish the browser sign-in. The authorization is
per user.

**Tools fail with a workspace error.** Ask the agent to call
`list_workspaces` and then `select_workspace_context`, or pin a workspace with
the `x-workspace` header shown above.

**An integration looks connected but nothing arrives.** Ask the agent to run
`diagnose_integration_setup` for that form and integration.

## Links

- [Formaloo](https://www.formaloo.com/)
- [Formaloo API docs](https://docs.formaloo.com/)
- [Support](mailto:dev@formaloo.com)

## License

MIT. See [LICENSE](LICENSE).
