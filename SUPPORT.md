# Support

> FF_SmartControl is a software product — a license + an SD card image. The Pi and the
> equipment on your farm are yours; we support *our* software. See [`DIRECTION.md`](DIRECTION.md)
> for what we sell and what is in scope for v1.0.

Use this guide to route questions and issues.

## Where to ask for help

- Usage/setup questions: open a GitHub Issue using the templates.
- Bug reports: use the "Bug report" issue template.
- Feature requests: use the "Feature request" issue template.

## Security issues

Do not open public issues for vulnerabilities.

Use the private security reporting path in `.github/SECURITY.md`.

## Before opening an issue

1. Read [`README.md`](README.md), [`DIRECTION.md`](DIRECTION.md), and the relevant guides under `docs/`.
2. Run local checks:
   - `npm run validate:skills`
   - `npm run typecheck`
   - `npm test`
3. Include:
   - version/tag
   - platform/runtime (Docker or host runtime)
   - minimal reproduction steps
   - whether you're on the **software license** SKU or the **pre-flashed SD card** SKU
