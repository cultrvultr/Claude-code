# CLAUDE.md - AI Assistant Guidelines

This document provides guidance for AI assistants working with this repository. It contains essential information about the project structure, conventions, and best practices.

## Project Overview

**Repository**: Claude-code
**Purpose**: This repository is designed for development with Claude Code - Anthropic's official CLI tool for AI-assisted software development.

## Getting Started

### Prerequisites

- Node.js (version 18+)
- npm or yarn package manager
- Git

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd Claude-code

# Install dependencies (when package.json exists)
npm install

# Start development server (when configured)
npm run dev
```

## Repository Structure

```
Claude-code/
├── CLAUDE.md          # AI assistant guidelines (this file)
├── README.md          # Project documentation
├── package.json       # Node.js dependencies and scripts
├── src/               # Source code
│   ├── index.ts       # Main entry point
│   ├── components/    # UI components (if applicable)
│   ├── services/      # Business logic and services
│   ├── utils/         # Utility functions
│   └── types/         # TypeScript type definitions
├── tests/             # Test files
├── docs/              # Additional documentation
└── .github/           # GitHub workflows and templates
```

## Development Conventions

### Code Style

- **Language**: TypeScript/JavaScript (preferred)
- **Formatting**: Use Prettier with default settings
- **Linting**: ESLint with recommended rules
- **Naming Conventions**:
  - Files: `kebab-case.ts` or `PascalCase.tsx` for React components
  - Variables/Functions: `camelCase`
  - Classes/Types/Interfaces: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`

### Git Workflow

1. **Branch Naming**:
   - Features: `feature/description`
   - Bug fixes: `fix/description`
   - Claude Code branches: `claude/description-SESSION_ID`

2. **Commit Messages**:
   - Use clear, descriptive messages
   - Start with a verb: `Add`, `Fix`, `Update`, `Remove`, `Refactor`
   - Keep the first line under 72 characters
   - Example: `Add user authentication service`

3. **Pull Requests**:
   - Include a summary of changes
   - Reference related issues
   - Ensure all tests pass before merging

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix auto-fixable linting issues
npm run format       # Format code with Prettier
npm run typecheck    # Run TypeScript type checking
```

## AI Assistant Guidelines

### When Working on This Codebase

1. **Always Read Before Modifying**: Never propose changes to code without reading it first. Understand the existing patterns and conventions.

2. **Keep Changes Focused**: Make only the requested changes. Avoid over-engineering or adding unnecessary features.

3. **Follow Existing Patterns**: Match the coding style and patterns already established in the codebase.

4. **Test Your Changes**: Ensure tests pass after making modifications. Add tests for new functionality.

5. **Security First**: Be vigilant about security vulnerabilities (XSS, SQL injection, command injection, etc.).

### Task Planning

For complex tasks, break them down into smaller steps:

1. Understand the requirements
2. Research the existing codebase
3. Plan the implementation
4. Implement changes incrementally
5. Test thoroughly
6. Review and refine

### File Operations

- Prefer editing existing files over creating new ones
- Use the appropriate tools for file operations (Read, Edit, Write)
- Maintain consistent formatting with the rest of the codebase

### Communication

- Ask clarifying questions when requirements are ambiguous
- Provide clear explanations of changes made
- Document complex logic with comments when necessary

## Testing Guidelines

### Test Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Best Practices

- Write descriptive test names that explain the expected behavior
- Test edge cases and error conditions
- Keep tests independent and isolated
- Use mocks/stubs for external dependencies
- Aim for high coverage on critical paths

## Error Handling

### Patterns

```typescript
// Prefer explicit error handling
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle specific error
  }
  throw error; // Re-throw if unhandled
}

// Use Result types for expected failures
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

## Environment Variables

Store sensitive configuration in environment variables:

```bash
# .env.example
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=your-api-key-here
NODE_ENV=development
```

Never commit `.env` files with real credentials to version control.

## Dependencies

### Adding New Dependencies

1. Prefer well-maintained packages with active communities
2. Check bundle size impact for frontend dependencies
3. Review security advisories before adding
4. Document why the dependency is needed

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Update to latest major versions (carefully)
npx npm-check-updates -u
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Clear build cache: `npm run clean` (if available)

2. **Type Errors**
   - Run `npm run typecheck` to see all type issues
   - Ensure @types packages are installed for dependencies

3. **Test Failures**
   - Run tests individually to isolate issues
   - Check for environment-specific problems

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## Resources

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

*This document should be updated as the project evolves. Last updated: January 2026*
