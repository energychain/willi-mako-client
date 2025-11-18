# Contributing to Willi-Mako Client SDK

First off, thank you for considering contributing to the Willi-Mako Client SDK! 🎉

This document provides guidelines and instructions for contributing to this project. Following these guidelines helps maintain code quality and makes the contribution process smooth for everyone involved.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 or **pnpm** >= 8.0.0 (recommended)
- **Git** >= 2.0.0
- **TypeScript** knowledge (preferred)

### Setup Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/willi-mako-client.git
   cd willi-mako-client
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/energychain/willi-mako-client.git
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Build the project:**
   ```bash
   npm run build
   ```

6. **Run tests:**
   ```bash
   npm test
   ```

## How Can I Contribute?

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug fixes**: Fix issues reported in GitHub Issues
- ✨ **New features**: Add new functionality to the SDK
- 📚 **Documentation**: Improve or expand documentation
- 🧪 **Tests**: Add or improve test coverage
- 🎨 **Code quality**: Refactoring, performance improvements
- 🌍 **Translations**: Help translate documentation (especially German ↔ English)
- 💡 **Examples**: Add usage examples for different scenarios

### Good First Issues

Look for issues labeled `good first issue` or `help wanted` if you're new to the project. These are typically:
- Well-defined tasks
- Lower complexity
- Good entry points for new contributors

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/my-feature-name
# or
git checkout -b fix/issue-123
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add or update tests as needed
- Update documentation if you're changing APIs

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Type checking
npm run lint

# Build to ensure no compilation errors
npm run build
```

### 4. Commit Your Changes

Follow our [commit message conventions](#commit-messages):

```bash
git add .
git commit -m "feat: add support for artifact filtering"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/my-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript Style Guide

- Use **TypeScript** for all source files
- Enable strict mode (`"strict": true` in tsconfig.json)
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable and function names
- Add JSDoc comments for all public APIs

### Code Formatting

We use consistent formatting across the codebase:

```typescript
// ✅ Good
export interface WilliMakoClientOptions {
  baseUrl?: string;
  token?: string | null;
}

// ❌ Bad
export interface WilliMakoClientOptions
{
    baseUrl?:string
    token?:string|null
}
```

### Documentation Standards

All public APIs must include JSDoc comments:

```typescript
/**
 * Creates a new artifact to store data snapshots.
 *
 * @param payload - Artifact creation request with content and metadata
 * @returns Promise resolving to the created artifact details
 *
 * @example
 * ```typescript
 * await client.createArtifact({
 *   sessionId: 'session-id',
 *   type: 'validation-report',
 *   name: 'report.json',
 *   mimeType: 'application/json',
 *   encoding: 'utf8',
 *   content: JSON.stringify(data)
 * });
 * ```
 */
public async createArtifact(payload: CreateArtifactRequest): Promise<CreateArtifactResponse> {
  // Implementation
}
```

### Testing Standards

- Write tests for new features
- Maintain or improve code coverage
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

```typescript
it('throws a WilliMakoError on non-successful responses', async () => {
  // Arrange
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403
    })
  );
  const client = new WilliMakoClient({ token: 'secret', fetch: fetchMock });

  // Act & Assert
  await expect(client.getToolJob('job-1')).rejects.toBeInstanceOf(WilliMakoError);
});
```

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build config)
- `perf`: Performance improvements

### Examples

```
feat(client): add support for batch artifact creation

Add a new method `createArtifactBatch` that allows creating
multiple artifacts in a single API call.

Closes #123
```

```
fix(cli): handle timeout errors gracefully

Previously, timeout errors would crash the CLI. This change
catches timeout exceptions and displays a user-friendly message.

Fixes #456
```

```
docs: add examples for MSCONS processing

Added comprehensive examples showing how to process MSCONS
meter reading messages using the sandbox API.
```

## Pull Request Process

### Before Submitting

- [ ] Tests pass: `npm test`
- [ ] Code builds: `npm run build`
- [ ] Types are correct: `npm run lint`
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with `main`

### PR Title

Use the same format as commit messages:

```
feat: add artifact filtering by tags
fix: resolve timeout issues in sandbox jobs
docs: improve quickstart guide
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Related to #456

## How Has This Been Tested?
Describe the tests you ran and how to reproduce them.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated checks** must pass (tests, linting, build)
2. **Code review** by at least one maintainer
3. **Address feedback** by pushing additional commits
4. **Approval** from maintainer(s)
5. **Merge** by maintainer

## Reporting Bugs

### Before Submitting a Bug Report

- Check the [existing issues](https://github.com/energychain/willi-mako-client/issues)
- Try the latest version from the `main` branch
- Check the [documentation](./README.md) and [FAQ](./README.md#frequently-asked-questions)

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Create client with '...'
2. Call method '....'
3. See error

**Expected behavior**
What you expected to happen.

**Code sample**
```typescript
// Your code that reproduces the issue
const client = new WilliMakoClient({ token: 'xxx' });
// ...
```

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Node.js version: [e.g. 18.17.0]
 - Package version: [e.g. 0.2.0]

**Additional context**
Any other context about the problem.
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Use case**
Describe your use case and why this feature would be valuable.

**Additional context**
Any other context, screenshots, or examples.
```

## Energy Sector Specific Contributions

If you're contributing features or examples related to:
- EDIFACT/edi@energy formats
- Market communication processes
- Compliance requirements
- Energy data processing

Please consider:
1. **Context**: Explain the energy sector context for reviewers unfamiliar with the domain
2. **Standards**: Reference relevant BDEW or edi@energy specifications
3. **Examples**: Provide realistic examples (with anonymized data)
4. **Documentation**: Add both German and English explanations where helpful

## Questions?

If you have questions about contributing:

- 💬 Open a [GitHub Discussion](https://github.com/energychain/willi-mako-client/discussions)
- 📧 Email us at [dev@stromdao.com](mailto:dev@stromdao.com)
- 🌐 Visit [stromhaltig.de](https://stromhaltig.de)

---

## Thank You! 🙏

Your contributions make this project better for the entire energy sector community. We appreciate your time and effort!

---

**Happy coding! ⚡**

*Made with ❤️ by the STROMDAO Community*
