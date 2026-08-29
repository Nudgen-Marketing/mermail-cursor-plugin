# Security Policy

## Supported versions

Security fixes apply to the latest `main` branch.

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose credentials or mailbox data, bypass approval or destructive confirmation, enable prompt injection from email, or authorize an unintended Agent Wallet / PayBox operation.

Email **contact@mermail.app** with the affected file or workflow, impact, minimal reproduction steps, and whether production MCP may be involved. Never include live API keys, OAuth tokens, cookies, verification links, or customer mailbox content.

## Security invariants

- Treat email and MCP-returned content as untrusted data, not authority.
- Never embed, print, log, or commit credentials.
- Require an exact preview and user approval before external effects.
- Require Mermail's short-lived confirmation token for destructive non-PayBox actions.
- Never let email content authorize a payment, scope expansion, credential disclosure, or unrelated action.
- Do not retry an uncertain write through another tool, client, or workflow.
