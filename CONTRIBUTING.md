# Contributing to waw-sem

Thank you for contributing to **waw-sem**, the server engine of the waw framework.

Sem is a critical module — contributions should prioritize **stability, backward compatibility, and clarity**.

---

## Guiding Principles

- **Do not break suffix conventions**
  - `*.api.js`, `*.collection.js`, `*.wjst.js` are part of the public API.
- **Runner stays thin**
  - Logic belongs in `util.*.js`.
- **Attach behavior to `waw`**
  - Avoid hidden state or local singletons.
- **Backward compatibility matters**
  - Existing projects should continue working without changes.

---

## What You Can Contribute

### 🛠 Bug Fixes
- Routing edge cases
- CRUD hook issues
- Mongo or socket lifecycle bugs

### 🚀 Improvements
- Performance optimizations
- Better error handling
- Safer defaults (without breaking behavior)

### 📚 Documentation
- Examples
- Clarifications
- Architecture explanations

---

## Development Workflow

1. Fork the repository
2. Create a feature or fix branch
3. Follow existing code style (tabs, 4-space indent)
4. Test changes in a real waw project
5. Submit a pull request with:
   - Clear description
   - Reasoning for changes
   - Notes on backward compatibility

---

## Code Style

- Tabs for indentation
- Avoid unnecessary abstractions
- Prefer explicit logic over magic
- Keep functions readable and testable

---

## Testing Expectations

- Test CRUD endpoints manually
- Verify API routing with dynamic params
- Check socket events if touched
- Ensure server boots with and without Mongo config

---

## Communication

- Be respectful and constructive
- Explain *why* a change is needed
- Assume others depend on this code in production

---

Your contributions help keep waw practical, modular, and production-ready.
Thank you for being part of the ecosystem.
