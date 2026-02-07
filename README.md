<img src="https://opensearch.org/wp-content/uploads/2025/01/opensearch_logo_default.svg" height="64px">

- [Alert Manager](#alert-manager)
  - [Features](#features)
  - [Quick Start](#quick-start)
    - [Standalone Mode (npx)](#standalone-mode-npx)
    - [OSD Plugin Mode](#osd-plugin-mode)
  - [Code Summary](#code-summary)
    - [Repository Checks](#repository-checks)
    - [Issues](#issues)
  - [API Reference](#api-reference)
  - [Architecture](#architecture)
  - [Contributing](#contributing)
  - [Getting Help](#getting-help)
  - [Code of Conduct](#code-of-conduct)
  - [Security](#security)
  - [License](#license)
  - [Copyright](#copyright)

# Alert Manager

Alert Manager is a plugin for OpenSearch Dashboards that provides alert rule management and monitoring capabilities. It supports **dual distribution modes** — run as an OSD plugin or as a standalone service.

## Features

- 🚀 **Dual Mode** — Run as OSD plugin or standalone service
- ⚡ **Instant Startup** — Standalone mode starts in ~1 second
- 📦 **Lightweight** — Standalone build is ~4MB vs ~1GB for full OSD
- 🎨 **Full UI** — OUI-based interface in both modes
- 🔌 **REST API** — Standard JSON API for integrations
- 🔄 **Hot Reload** — Development mode with live updates

## Quick Start

### Standalone Mode (npx)

```bash
# Run with default port 5603
npx @anirudhaj/alarms

# Custom port
npx @anirudhaj/alarms --port 8080

# Show help
npx @anirudhaj/alarms --help
```

Open http://localhost:5603 in your browser.

### OSD Plugin Mode

```bash
# Clone OpenSearch Dashboards
git clone https://github.com/opensearch-project/OpenSearch-Dashboards.git
cd OpenSearch-Dashboards

# Clone this plugin
git clone https://github.com/anirudha/alert-manager.git plugins/alarms

# Install dependencies and start
yarn osd bootstrap
yarn start
```

Navigate to http://localhost:5601/app/alarms

## Code Summary

|                          |                                                                 |
| ------------------------ | --------------------------------------------------------------- |
| Test and build           | [![Build][build-badge]][build-link]                             |
| Distribution build tests | [![Standalone][standalone-badge]][standalone-link]              |
| npm publish              | [![Publish][publish-badge]][publish-link]                       |
| npm version              | [![npm][npm-badge]][npm-link]                                   |

### Repository Checks

|              |                                                                 |
| ------------ | --------------------------------------------------------------- |
| DCO Checker  | [![Developer certificate of origin][dco-badge]][dco-badge-link] |
| Link Checker | [![Link Checker][link-check-badge]][link-check-link]            |

### Issues

|                                                                |
| -------------------------------------------------------------- |
| [![good first issues open][good-first-badge]][good-first-link] |
| [![features open][feature-badge]][feature-link]                |
| [![bugs open][bug-badge]][bug-link]                            |

[build-badge]: https://img.shields.io/badge/build-passing-brightgreen
[build-link]: https://github.com/anirudha/alert-manager/actions
[standalone-badge]: https://img.shields.io/badge/standalone-ready-blue
[standalone-link]: https://github.com/anirudha/alert-manager/tree/main/standalone
[publish-badge]: https://github.com/anirudha/alert-manager/actions/workflows/publish.yml/badge.svg
[publish-link]: https://github.com/anirudha/alert-manager/actions/workflows/publish.yml
[npm-badge]: https://img.shields.io/npm/v/@anirudhaj/alarms
[npm-link]: https://www.npmjs.com/package/@anirudhaj/alarms
[dco-badge]: https://img.shields.io/badge/DCO-enabled-brightgreen
[dco-badge-link]: https://github.com/anirudha/alert-manager/actions
[link-check-badge]: https://img.shields.io/badge/links-valid-brightgreen
[link-check-link]: https://github.com/anirudha/alert-manager/actions
[good-first-badge]: https://img.shields.io/github/issues/anirudha/alert-manager/good%20first%20issue.svg
[good-first-link]: https://github.com/anirudha/alert-manager/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
[feature-badge]: https://img.shields.io/github/issues/anirudha/alert-manager/feature.svg
[feature-link]: https://github.com/anirudha/alert-manager/issues?q=is%3Aopen+is%3Aissue+label%3Afeature
[bug-badge]: https://img.shields.io/github/issues/anirudha/alert-manager/bug.svg
[bug-link]: https://github.com/anirudha/alert-manager/issues?q=is%3Aopen+is%3Aissue+label%3Abug

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alarms` | List all alarms |
| GET | `/api/alarms/:id` | Get alarm by ID |
| POST | `/api/alarms` | Create alarm |
| DELETE | `/api/alarms/:id` | Delete alarm |
| POST | `/api/alarms/:id/toggle` | Toggle enabled state |

### Examples

```bash
# Create an alarm
curl -X POST http://localhost:5603/api/alarms \
  -H "Content-Type: application/json" \
  -d '{"name":"CPU High","severity":"critical","condition":"cpu > 90%"}'

# List alarms
curl http://localhost:5603/api/alarms

# Toggle alarm
curl -X POST http://localhost:5603/api/alarms/alarm-1/toggle

# Delete alarm
curl -X DELETE http://localhost:5603/api/alarms/alarm-1
```

## Architecture

```
alert-manager/
├── core/                    # Pure business logic (no platform deps)
│   ├── types.ts             # Shared interfaces
│   ├── alarm_service.ts     # In-memory alarm service
│   └── index.ts
├── server/                  # Server-side code
│   ├── routes/
│   │   ├── handlers.ts      # Framework-agnostic handlers
│   │   └── index.ts         # OSD IRouter adapter
│   ├── plugin.ts            # OSD server plugin
│   └── types.ts
├── public/                  # OSD client-side code
│   ├── components/
│   ├── services/
│   └── plugin.ts
├── standalone/              # Standalone distribution
│   ├── bin/cli.js           # npx entry point
│   ├── server.ts            # Express server
│   ├── client.tsx           # React entry
│   └── components/          # Standalone UI
└── common/                  # Shared constants
```

See [DUAL_MODE.md](DUAL_MODE.md) for detailed architecture documentation.

## Contributing

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

### Development Setup

```bash
# Standalone development
cd standalone
npm install --legacy-peer-deps
npm run dev

# OSD plugin development
cd /path/to/OpenSearch-Dashboards
yarn start
```

### Publishing

The standalone package is published to npm automatically via GitHub Actions when a version tag is pushed:

```bash
# Update version in standalone/package.json, then:
git tag v1.0.1
git push --tags
```

This triggers the [publish workflow](.github/workflows/publish.yml) which builds and publishes to npm.

## Getting Help

If you find a bug, or have a feature request, please don't hesitate to open an issue in this repository.

For more information, see [OpenSearch project website](https://opensearch.org/) and [documentation](https://opensearch.org/docs).

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](CODE_OF_CONDUCT.md). For more information see the [Code of Conduct FAQ](https://aws.github.io/code-of-conduct-faq), or contact [opensource-codeofconduct@amazon.com](mailto:opensource-codeofconduct@amazon.com) with any additional questions or comments.

## Security

If you discover a potential security issue in this project we ask that you notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/). Please do **not** create a public GitHub issue.

## License

This project is licensed under the [Apache v2.0 License](LICENSE).

## Copyright

Copyright OpenSearch Contributors. See [NOTICE](NOTICE) for details.
