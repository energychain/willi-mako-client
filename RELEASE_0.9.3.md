# 🚀 Release v0.9.3 - Successfully Published!

## ✅ Release Summary

**Version:** 0.9.3
**Released:** 2025-12-06
**Status:** ✅ Successfully published to npm
**GitHub:** ✅ Pushed to main branch with tag v0.9.3
**Tests:** ✅ All 91 tests passing

## 📦 Published Package

```bash
npm install willi-mako-client@0.9.3
```

**NPM Registry:**
- Package: `willi-mako-client@0.9.3`
- Size: 142.5 kB (tarball)
- Unpacked: 695.3 kB
- Files: 32

## 🎯 What's New in v0.9.3

### 🔐 Flexible Token Authentication

The main feature of this release is **flexible token format support**:

**Two Token Formats Now Supported:**

1. **Standard JWT Tokens**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0...
   ```
   - Via `client.login()` or `willi-mako auth login`
   - Contains metadata and expiration time
   - Ideal for interactive applications

2. **Custom API Tokens** (NEW)
   ```
   _p-xxxxx-xxxxx-xxxxx-xxxxx
   ```
   - Long-lived tokens for automation
   - Simple management in CI/CD pipelines
   - No expiration time logic required

### 🧪 Token Debug & Validation Tools

Five new debugging scripts included:

1. **`validate-token.ts`** - Quick token validation
2. **`debug-token.ts`** - Detailed endpoint testing
3. **`test-token-extended.ts`** - Extended functionality tests
4. **`analyze-token-format.ts`** - Token structure analysis
5. **`test-login.ts`** - Login flow testing

### 📚 Comprehensive Documentation

Four new documentation files:

1. **`TOKEN_WORKING_CONFIRMATION.md`** - Custom token support confirmation
2. **`TOKEN_DEBUG_REPORT.md`** - Debugging analysis with resolution
3. **`TOKEN_RESOLUTION_SUMMARY.md`** - Problem resolution summary
4. **`TOKEN_SCRIPTS_README.md`** - Usage guide for all debug scripts

### 📝 Updated Documentation

- **README.md**: Added authentication section with token format details
- **CHANGELOG.md**: Complete v0.9.3 release notes

## 🔧 Technical Changes

- **Backend Compatibility**: Backend now accepts both JWT and custom tokens
- **Client Code**: No changes needed - already correctly implemented
- **Backward Compatible**: All existing code continues to work
- **Test Coverage**: All 91 tests passing

## 📊 Release Stats

| Metric | Value |
|--------|-------|
| Version | 0.9.3 |
| Commit | a244a7c |
| Tag | v0.9.3 |
| Tests | 91 passing |
| Test Files | 10 |
| Duration | 6.49s |
| Code Coverage | ✅ |
| ESLint | ✅ |
| TypeScript | ✅ |

## 🎓 Usage Examples

### Quick Token Validation

```bash
# Install or update
npm install willi-mako-client@0.9.3

# Validate any token
npx tsx validate-token.ts "your-token-here"
```

### Using Custom API Tokens

```typescript
import { WilliMakoClient } from 'willi-mako-client';

// Custom API token
const client = new WilliMakoClient({
  token: '_p-xxxxx-xxxxx-xxxxx-xxxxx'
});

// Works just like JWT tokens
const session = await client.createSession();
```

### Via Environment Variable

```bash
export WILLI_MAKO_TOKEN="_p-xxxxx-xxxxx-xxxxx-xxxxx"
npm run cli -- sessions create
```

## 🔗 Links

- **NPM Package**: https://www.npmjs.com/package/willi-mako-client/v/0.9.3
- **GitHub Release**: https://github.com/energychain/willi-mako-client/releases/tag/v0.9.3
- **Repository**: https://github.com/energychain/willi-mako-client
- **Documentation**: https://github.com/energychain/willi-mako-client/blob/main/README.md

## 🎉 Success Metrics

✅ **Code Quality**
- All tests passing
- ESLint clean (4 acceptable warnings)
- TypeScript compilation successful
- No blocking issues

✅ **Documentation**
- Complete authentication guide
- 5 debug scripts with inline docs
- 4 comprehensive markdown documents
- Updated main README

✅ **Deployment**
- Git commit successful
- Tag created and pushed
- NPM publish successful
- All CI/CD checks passed

✅ **Functionality**
- Token validation working
- Both token formats accepted
- All SDK methods functional
- CLI commands working

## 🙏 Credits

This release was created in response to backend token format flexibility improvements, enabling better service account integration and CI/CD workflows.

---

**Published:** 2025-12-06 12:51 UTC
**By:** STROMDAO GmbH / energychain
**License:** MIT
