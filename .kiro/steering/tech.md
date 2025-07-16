# Technology Stack

## Core Technologies

- **React 19.1.0** - UI framework with latest features
- **TypeScript 5.8.3** - Type-safe JavaScript development
- **Vite 7.0.4** - Fast build tool and dev server
- **React Router DOM 7.6.3** - Client-side routing
- **Zod 4.0.5** - Runtime type validation and schema definition

## Testing & Quality

- **Vitest 3.2.4** - Fast unit testing framework
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers
- **ESLint 9.30.1** - Code linting with TypeScript support
- **Prettier 3.6.2** - Code formatting
- **TypeScript ESLint** - TypeScript-specific linting rules

## Development Tools

- **jsdom** - DOM environment for testing
- **Vite React Plugin** - React support in Vite
- **Hot Module Replacement** - Live reloading during development

## Common Commands

### Development

```bash
npm run dev          # Start development server (usually http://localhost:5173)
npm run build        # Build for production (outputs to dist/)
npm run preview      # Preview production build locally
```

### Testing

```bash
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with UI interface
```

### Code Quality

```bash
npm run lint         # Check for linting errors
npm run lint:fix     # Fix linting errors automatically
npm run format       # Format code with Prettier
npm run format:check # Check if code is properly formatted
```

## Build Configuration

- **Vite Config**: Includes React plugin and Vitest test configuration
- **TypeScript**: Uses project references with separate app and node configs
- **ESLint**: Configured with React hooks, TypeScript, and Prettier integration
- **Test Setup**: Global test environment with jsdom and custom setup file
