# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | ✅ Yes    |
| < 0.2.0 | ❌ No     |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, email us at **security@synergyflowlabs.com** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for fix.

## Security Considerations for Contributors

### Widgets (HTML/JS)

- **No external requests** — Widgets must be fully self-contained (Rule 1 of Widget Contract)
- **No eval/Function constructor** — Never use `eval()`, `new Function()`, or similar
- **Sanitize user input** — All user-entered data displayed in the widget must be escaped
- **CSP-friendly** — No inline scripts that would violate Content Security Policy
- **No sensitive data in localStorage** — Only store user preferences, never tokens/PII

### Native Recipes (Notion API)

- **Token handling** — Never log or store Notion integration tokens
- **Minimal permissions** — Request only the scopes needed
- **Input validation** — Validate all user-provided data before API calls
- **Rate limiting** — Respect Notion API rate limits (3 requests/second)
- **Error handling** — Don't expose internal errors to users

### MCP Server

- **Stdio transport only** — No network exposure
- **No credential storage** — Tokens passed per-request, not stored
- **Input validation** — All tool inputs validated against schemas
- **Sandboxed execution** — Each tool call isolated

## Dependency Security

- Dependencies updated weekly via Dependabot
- `npm audit` run in CI
- Only production dependencies in final build
- Lock file (`package-lock.json`) committed

## Disclosure Timeline

1. **Day 0** — Vulnerability reported privately
2. **Day 1-2** — Acknowledgment & initial assessment
3. **Day 7** — Preliminary fix or mitigation plan
4. **Day 30** — Target for patch release
5. **Day 45** — Public disclosure (coordinated)

## Hall of Fame

Thanks to researchers who have responsibly disclosed vulnerabilities:

*None yet — be the first!*