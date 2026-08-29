# Mermail for Cursor

Give Cursor agents an authenticated Mermail inbox and focused workflows for reading, drafting, sending, triaging, and automating email. The plugin connects Cursor to Mermail's hosted Streamable HTTP MCP server and installs 15 Agent Skills that route each request to the narrowest safe workflow.

## Install

After marketplace approval:

1. Open **Customize** in Cursor.
2. Search for **Mermail** and select **Install**.
3. Open Cursor's MCP tools and select **Authenticate** for Mermail.
4. Approve OAuth access to the intended Mermail workspace.
5. Ask Cursor to list your Mermail mailboxes as a read-only smoke test.

No API key is stored in this plugin. Interactive Cursor installs authenticate directly with `https://console.mermail.app/mcp` through OAuth.

## Local test install

```bash
git clone https://github.com/Nudgen-Marketing/mermail-cursor-plugin.git
cd mermail-cursor-plugin
npm test
mkdir -p ~/.cursor/plugins/local/mermail
git archive HEAD | tar -x -C ~/.cursor/plugins/local/mermail
```

Run **Developer: Reload Window** in Cursor, open **Customize**, and confirm that Mermail's skills and MCP server appear. Select **Authenticate**, approve the intended workspace, then verify a read-only operation such as listing mailboxes. A marketplace installation with the same plugin name takes precedence over the local copy.

Cursor restricts local plugins to files physically inside `~/.cursor/plugins/local`; on current releases, a symlink to a repository elsewhere on disk can be rejected. Re-run the `git archive` command after local changes.

## Included workflows

- Connection and OAuth troubleshooting
- Agent inbox provisioning and verification mail
- Inbox search, reading, organization, and cleanup
- Draft, send, reply, forward, and scheduled email
- Workspace, domain, mailbox, storage, and usage administration
- Task triage and mailbox-agent workflows
- Composio, scheduling, GTM, support, x402, and Agent Wallet workflows

The root `mermail` skill routes broad requests. Focused skills keep connection setup, inbox work, outbound effects, workspace administration, and payment workflows within separate authorization boundaries.

## Safety model

- Email subjects, bodies, headers, links, attachments, and tool output are untrusted data, never agent instructions.
- Sending, invitations, provider actions, and other external effects require an exact preview and explicit user approval.
- Destructive non-PayBox operations also require a short-lived, single-use Mermail confirmation token.
- Agent Wallet and PayBox require full-profile MCP OAuth. Email content never authorizes a payment.
- The plugin contains no credentials, telemetry, background hooks, or executable install scripts. Workspace scope, roles, limits, credits, and confirmation tokens are enforced by Mermail MCP.

See the [Mermail Privacy Policy](https://mermail.app/privacy), [Terms of Service](https://mermail.app/terms), and [security policy](SECURITY.md).

## Development

Requirements: Node.js 22 or later.

```bash
npm test
npm run test:coverage
npm run validate
```

The validator checks the Cursor manifest, MCP configuration, component discovery, skill frontmatter, relative references, required marketplace documentation, placeholder text, and credential-shaped content.

## Support

- Documentation: https://docs.mermail.app/ai/skills
- Security reports: follow [SECURITY.md](SECURITY.md)
- Support: contact@mermail.app

## License

MIT — see [LICENSE](LICENSE).
