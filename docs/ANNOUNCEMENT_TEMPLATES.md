# 📢 Announcement Templates

Fertige Templates für Social Media und Community-Posts zur Verbreitung von willi-mako-client.

---

## 📝 Dev.to / Hashnode Article

```markdown
---
title: Introducing willi-mako-client v0.2.0 - TypeScript SDK for Energy Market Communication
published: true
description: Official TypeScript SDK & CLI for automating energy market communication workflows (UTILMD, MSCONS, INVOIC, etc.)
tags: typescript, nodejs, opensource, api
cover_image: https://github.com/energychain/willi-mako-client/raw/main/docs/media/willi-mako-architecture.svg
---

# 🔌 Introducing willi-mako-client v0.2.0

Today I'm excited to announce the release of **willi-mako-client v0.2.0** – a major upgrade of the official TypeScript SDK and CLI for automating energy market communication workflows in the German energy sector.

## What is Willi-Mako?

Willi-Mako is an AI-powered platform for handling market communication (Marktkommunikation) in the German energy industry. It helps energy suppliers, grid operators, and metering point operators automate compliance workflows around edi@energy standards.

## Why a TypeScript SDK?

Energy companies increasingly need to:
- Automate ETL pipelines for market data
- Ensure compliance with regulatory formats (UTILMD, MSCONS, ORDERS, etc.)
- Integrate AI-powered validation into existing workflows
- Build custom dashboards and reports

The willi-mako-client SDK makes this easy with:

✅ **Fully typed TypeScript client** - Type safety for all API interactions
✅ **Session-aware auth & chat APIs** - Login helpers, session lifecycle, semantic search, reasoning & clarification analysis
✅ **CLI included** - Quick access without writing code (auth, sessions, chat, retrieval, reasoning, clarification)
✅ **MCP Server support** - AI agent integration (Claude, ChatGPT, etc.) mit vollständigem Toolset
✅ **Comprehensive examples** - Docker, Power BI, n8n integrations
✅ **MIT licensed** - Use freely in commercial projects

## Quick Start

### Installation

\`\`\`bash
npm install willi-mako-client
\`\`\`

### Basic Usage

\`\`\`typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient({
  token: process.env.WILLI_MAKO_TOKEN
});

// Create an ETL job for MSCONS clearing
const job = await client.createNodeScriptJob({
  scriptHash: 'mscons-clearing',
  jobName: 'Monthly Consumption Data Processing',
  externalReference: 'project-12345'
});

console.log('Job created:', job.id);
\`\`\`

### CLI Usage

\`\`\`bash
# Get remote OpenAPI spec
willi-mako openapi --remote

# Create a new job
willi-mako create-job --script utilmd-audit --name "Audit Run 2025-01"

# Check job status
willi-mako get-job --id <job-id>
\`\`\`

## Features

### 🎯 Core Capabilities

- **Type-Safe API Client**: Full TypeScript support with Zod validation
- **Built-in OpenAPI Support**: Automatic schema validation
- **Error Handling**: Custom `WilliMakoError` class with structured data
- **CLI Tool**: Execute API calls from the command line
- **MCP Server**: Integrate with AI agents (Claude Desktop, OpenAI, etc.)

### 📦 Integrations

The SDK includes ready-to-use examples for:

- **Docker** - Containerized workflows
- **Power BI** - Custom connectors for dashboards
- **n8n** - No-code automation workflows
- **Web Dashboard** - Lightweight monitoring UI

### 🔧 Use Cases

1. **ETL Pipelines** - Automate consumption data processing (MSCONS)
2. **Compliance Audits** - Validate market location data (UTILMD)
3. **Order Management** - Process energy supply orders (ORDERS)
4. **Price Synchronization** - Update price lists (PRICAT)
5. **Invoice Processing** - Automate invoice generation (INVOIC)
6. **Incident Reports** - Track and resolve data quality issues

## Architecture

The SDK is built with:

- **TypeScript 5+** - Modern language features
- **Zod** - Runtime schema validation
- **Commander** - CLI framework
- **MCP SDK** - AI agent protocol support
- **Vitest** - Fast unit testing
- **ESLint + Prettier** - Code quality
- **GitHub Actions** - CI/CD automation

## Documentation

📚 Comprehensive docs available:

- [API Documentation](https://github.com/energychain/willi-mako-client/blob/main/docs/API.md)
- [Examples](https://github.com/energychain/willi-mako-client/blob/main/docs/EXAMPLES.md)
- [Integrations Guide](https://github.com/energychain/willi-mako-client/blob/main/docs/INTEGRATIONS.md)
- [Troubleshooting](https://github.com/energychain/willi-mako-client/blob/main/docs/TROUBLESHOOTING.md)

## Contributing

We welcome contributions! The project follows best practices:

- 💚 CI/CD with GitHub Actions
- 🧪 Test coverage with Vitest
- 📖 TypeDoc API documentation
- 🔄 Renovate bot for dependencies
- 🎨 ESLint + Prettier formatting
- 🪝 Husky pre-commit hooks

Check out our [Contributing Guide](https://github.com/energychain/willi-mako-client/blob/main/CONTRIBUTING.md).

## Links

- 📦 npm: https://www.npmjs.com/package/willi-mako-client
- 💻 GitHub: https://github.com/energychain/willi-mako-client
- 🐛 Issues: https://github.com/energychain/willi-mako-client/issues
- 📖 Willi-Mako Platform: https://stromhaltig.de

## What's Next?

Roadmap for v0.2.0:

- 📊 Enhanced TypeDoc documentation
- 🔄 Retry logic with exponential backoff
- ⚡ Rate limiting support
- 🧪 Integration test suite
- 📦 Bundle size optimization

## Get Started Today!

\`\`\`bash
npm install willi-mako-client
\`\`\`

⭐ Star the project on GitHub if you find it useful!

---

**Built with ❤️ by [STROMDAO GmbH](https://stromdao.de)**
*Digitizing German energy market communication*
\`\`\`

---

## 🐦 Twitter/X Thread

```
🚀 Excited to announce willi-mako-client v0.2.0!

A TypeScript SDK for automating energy market communication in the German energy sector.

Perfect for ETL pipelines, compliance automation, and AI-powered workflows.

🧵 Thread 👇

1/8

---

What does it do?

✅ Type-safe API client for Willi-Mako platform
✅ Handle UTILMD, MSCONS, ORDERS, PRICAT, INVOIC formats
✅ Built-in CLI tool
✅ MCP Server for AI agents
✅ MIT licensed

Install: npm install willi-mako-client

2/8

---

Who is it for?

🏢 Energy suppliers
🔌 Grid operators
📊 Metering point operators
🤖 AI/ML engineers
⚡ DevOps teams

Anyone automating energy market data workflows in Germany.

3/8

---

Quick example - Create an MSCONS clearing job:

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();
const job = await client.createNodeScriptJob({
  scriptHash: 'mscons-clearing',
  jobName: 'Monthly Processing'
});
```

4/8

---

Built-in integrations:

🐳 Docker
📊 Power BI
🔄 n8n automation
🌐 Web dashboard
🤖 MCP (Claude, ChatGPT)

All examples included in the repo!

5/8

---

Tech stack:

• TypeScript 5+
• Zod validation
• Commander CLI
• Vitest testing
• GitHub Actions CI/CD
• ESLint + Prettier

Following modern best practices for OSS projects.

6/8

---

Getting started is easy:

📦 npm install willi-mako-client
📖 Docs: github.com/energychain/willi-mako-client
🐛 Issues: github.com/energychain/willi-mako-client/issues

Contributions welcome!

7/8

---

Thanks to @nodejs, @typescriptlang, and the OSS community for amazing tools! 🙏

⭐ Star the repo if you find it useful!
🔄 RT to spread the word!

npm: npmjs.com/package/willi-mako-client
GitHub: github.com/energychain/willi-mako-client

8/8
```

---

## 💼 LinkedIn Post

```
🚀 Exciting News for the Energy Sector! 🚀

I'm thrilled to announce the release of willi-mako-client v0.2.0 – a major upgrade of the official TypeScript SDK for automating energy market communication workflows.

🔌 What is it?
A comprehensive SDK and CLI tool for handling German energy market communication formats (UTILMD, MSCONS, ORDERS, PRICAT, INVOIC) with full TypeScript support and AI integration capabilities.

⚡ Key Benefits:
✅ Type-safe API interactions
✅ Built-in compliance validation
✅ CLI for quick operations
✅ MCP server for AI agents (Claude, ChatGPT)
✅ Ready-to-use integrations (Docker, Power BI, n8n)
✅ MIT licensed - free for commercial use

🎯 Perfect For:
• Energy suppliers automating ETL pipelines
• Grid operators ensuring compliance
• DevOps teams building energy data platforms
• AI engineers integrating market communication

📦 Get Started:
npm install willi-mako-client

📖 Full Documentation:
https://github.com/energychain/willi-mako-client

This project represents STROMDAO's commitment to open-source tools that make energy market digitalization accessible to everyone.

Feedback and contributions welcome! 🙌

#EnergyTech #OpenSource #TypeScript #API #Automation #EnergyTransition #DigitalTransformation #GreenTech
```

---

## 📧 Reddit Posts

### r/typescript

**Title**: `[Release] willi-mako-client v0.2.0 - TypeScript SDK for German Energy Market Communication`

**Body**:
```markdown
Hi r/typescript! 👋

I've just released **willi-mako-client v0.2.0** – a fully-typed TypeScript SDK for automating energy market communication workflows with built-in login, sessions, chat, semantic search, reasoning and clarification analysis.

## What is it?

A TypeScript SDK that provides:
- Type-safe API client with Zod validation
- CLI tool built with Commander
- MCP server for AI agent integration
- Full OpenAPI 3.0 support

## Why TypeScript?

The energy sector deals with complex regulatory formats (UTILMD, MSCONS, etc.) where type safety prevents costly mistakes. Using TypeScript ensures:
- Compile-time error detection
- IntelliSense support in IDEs
- Self-documenting code
- Reduced runtime errors

## Tech Stack

- TypeScript 5.9+
- Zod for runtime validation
- Commander for CLI
- Vitest for testing
- ESM-only (modern Node.js)

## Installation

```bash
npm install willi-mako-client
```

## Example

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient({ token: process.env.TOKEN });

const job = await client.createNodeScriptJob({
  scriptHash: 'mscons-clearing',
  jobName: 'Monthly Processing'
});
```

## Links

- npm: https://www.npmjs.com/package/willi-mako-client
- GitHub: https://github.com/energychain/willi-mako-client
- Docs: https://github.com/energychain/willi-mako-client/blob/main/docs/API.md

Feedback and contributions welcome! Would love to hear thoughts on the architecture.
```

### r/node

**Title**: `Show r/node: willi-mako-client - TypeScript SDK for Energy Data Automation`

**Body**:
```markdown
Hey Node.js community!

Just published **willi-mako-client** - a Node.js SDK for automating energy market data workflows in the German energy sector.

## Features

- 🔒 Type-safe with TypeScript & Zod
- ⚡ Native fetch (Node 18+)
- 🛠️ Built-in CLI tool
- 🤖 MCP server for AI agents
- 🐳 Docker examples included
- 📦 ESM-only, tree-shakeable

## Quick Start

```bash
npm install willi-mako-client

# CLI usage
npx willi-mako-client openapi --remote

# Programmatic usage
import { WilliMakoClient } from 'willi-mako-client';
const client = new WilliMakoClient();
```

## Use Cases

- ETL pipelines for energy consumption data
- Compliance automation for regulatory formats
- AI-powered data validation
- Integration with existing tools (n8n, Power BI)

## Tech Details

- Built with TypeScript 5.9
- Requires Node.js 18+ (for native fetch)
- Zero dependencies for core client
- Full test coverage with Vitest
- CI/CD with GitHub Actions

Links:
- npm: https://www.npmjs.com/package/willi-mako-client
- GitHub: https://github.com/energychain/willi-mako-client

Open to feedback and contributions! 🚀
```

---

## 🎬 Hacker News

**Title**: `Show HN: Willi-Mako Client – TypeScript SDK for German Energy Market Communication`

**URL**: `https://github.com/energychain/willi-mako-client`

**Optional Comment**:
```
Hi HN! Author here.

I built willi-mako-client to solve a specific problem in the German energy sector: automating compliance workflows for market communication formats (similar to EDI in other industries).

The interesting technical challenges were:

1. Type safety for complex nested data structures - solved with Zod runtime validation
2. CLI + SDK in one package - used Commander with shared logic
3. AI agent integration - implemented MCP (Model Context Protocol) server
4. Zero-config for most use cases - sensible defaults with escape hatches

The SDK is being used in production for ETL pipelines processing millions of consumption data points monthly.

Tech stack: TypeScript 5.9, Node 18+, ESM-only, Vitest

Happy to answer questions!
```

---

## 🎮 Product Hunt

**Name**: willi-mako-client

**Tagline**: TypeScript SDK for automating energy market workflows

**Description**:
```
Official TypeScript SDK for the Willi-Mako platform. Automate energy market communication workflows including ETL pipelines, compliance validation, and AI-powered data processing.

Perfect for energy companies building custom integrations with German market communication standards (UTILMD, MSCONS, ORDERS, etc.).
```

**Topics**: Developer Tools, API, Energy, Open Source, TypeScript

**Features**:
- ✅ Type-safe TypeScript client
- ✅ Built-in CLI tool
- ✅ MCP server for AI agents
- ✅ Docker/Power BI/n8n integrations
- ✅ Comprehensive documentation
- ✅ MIT licensed

**Links**:
- Website: https://github.com/energychain/willi-mako-client
- GitHub: https://github.com/energychain/willi-mako-client
- npm: https://www.npmjs.com/package/willi-mako-client

---

## 📮 Newsletter Submissions

### Node Weekly

**Email to**: hello@cooperpress.com

**Subject**: Submission for Node Weekly - willi-mako-client SDK

**Body**:
```
Hi Node Weekly team,

I'd like to submit willi-mako-client for consideration in an upcoming issue.

willi-mako-client is a TypeScript SDK for automating energy market communication workflows in the German energy sector. It provides a type-safe API client, CLI tool, and MCP server for AI agent integration.

Key features:
- Full TypeScript support with Zod validation
- Node.js 18+ with native fetch
- ESM-only, tree-shakeable
- Comprehensive examples (Docker, Power BI, n8n)
- MIT licensed

Links:
- npm: https://www.npmjs.com/package/willi-mako-client
- GitHub: https://github.com/energychain/willi-mako-client

The project might be interesting for your readers working on ETL pipelines, API clients, or energy tech.

Thanks for considering!

Best regards,
STROMDAO GmbH
```

### JavaScript Weekly

**Similar format as Node Weekly**

### TypeScript Weekly

**Tweet to @typescriptweek**:
```
📦 New TypeScript library: willi-mako-client

Type-safe SDK for energy market communication with Zod validation, CLI tool, and MCP server support.

npm: npmjs.com/package/willi-mako-client
GitHub: github.com/energychain/willi-mako-client

#TypeScript
```

---

## 🎙️ Podcast Pitch

### The Changelog

**GitHub Issue**: https://github.com/thechangelog/ping/issues/new

**Title**: willi-mako-client - TypeScript SDK for Energy Market Automation

**Body**:
```markdown
## Project

- Name: willi-mako-client
- URL: https://github.com/energychain/willi-mako-client
- License: MIT
- Language: TypeScript

## What is it?

A TypeScript SDK for automating energy market communication workflows in Germany. Handles regulatory formats (UTILMD, MSCONS, etc.) with type safety and AI integration.

## Why it's interesting for The Changelog

1. **Niche but impactful**: Solves real problems in energy sector digitalization
2. **Modern stack**: TypeScript 5.9, ESM-only, MCP protocol integration
3. **Open source**: MIT licensed, accepting contributions
4. **Multiple use cases**: ETL, compliance, AI agents, dashboards

## Story Angles

- Building type-safe SDKs for complex domain-specific APIs
- Integrating AI agents into traditional industries
- Open source in regulated industries
- Developer experience in CLI + SDK design

## Links

- npm: https://www.npmjs.com/package/willi-mako-client
- Docs: https://github.com/energychain/willi-mako-client/tree/main/docs
- Examples: https://github.com/energychain/willi-mako-client/tree/main/examples

Would love to chat about the project!
```

---

## 📊 Monitoring Dashboard

Track these metrics weekly:

```markdown
## Week 1 Results

### Package Downloads
- npm: ___ downloads
- JSR: ___ downloads
- GPR: ___ downloads

### GitHub Stats
- Stars: ___
- Forks: ___
- Issues: ___
- PRs: ___

### Social Reach
- Twitter impressions: ___
- LinkedIn views: ___
- Reddit upvotes: ___
- Dev.to views: ___

### Discovery
- npm search ranking: ___
- GitHub trending: Yes/No
- Mentioned in newsletters: ___
```

---

**Last Updated**: 2025-10-12
**Version**: 1.0
