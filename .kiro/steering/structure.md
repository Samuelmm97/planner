# Project Structure

## Root Directory

```
ai-planning-assistant/
├── src/                 # Source code
├── public/              # Static assets
├── dist/                # Build output (generated)
├── node_modules/        # Dependencies (generated)
└── config files         # TypeScript, Vite, ESLint, etc.
```

## Source Code Organization (`src/`)

### Core Application

- `main.tsx` - Application entry point
- `App.tsx` - Root component with routing setup
- `App.css` - Global application styles
- `index.css` - Base CSS styles
- `vite-env.d.ts` - Vite type definitions

### Feature Directories

#### `components/` - Reusable UI Components

- `ErrorBoundary.tsx` - Error handling wrapper
- `Layout.tsx` - Main application layout
- `Header.tsx` - Application header
- `NaturalLanguageInput.tsx` - Plan input component
- `PlanStorageDemo.tsx` - Demo component
- `index.ts` - Component exports
- `*.module.css` - Component-specific styles
- `*.test.tsx` - Component tests

#### `pages/` - Route Components

- `PlansPage.tsx` - Main plans view
- `ChatPage.tsx` - Chat interface
- `NotFoundPage.tsx` - 404 page
- `index.ts` - Page exports
- `*.module.css` - Page-specific styles
- `*.test.tsx` - Page tests

#### `hooks/` - Custom React Hooks

- `usePlanContext.tsx` - Plan state management
- `usePlans.ts` - Plan operations
- `__tests__/` - Hook tests

#### `services/` - Business Logic

- `planService.ts` - Plan CRUD operations
- `indexeddb.ts` - Local storage service
- `__tests__/` - Service tests

#### `types/` - TypeScript Definitions

- `plan.ts` - Plan-related types
- `enhancement.ts` - AI enhancement types
- `user.ts` - User and preferences types
- `validation.ts` - Validation schemas
- `index.ts` - Type exports
- `README.md` - Type documentation
- `__tests__/` - Type tests

#### `utils/` - Utility Functions

- Currently empty, ready for shared utilities

#### `test/` - Test Configuration

- `setup.ts` - Global test setup

## Naming Conventions

### Files

- **Components**: PascalCase (e.g., `ErrorBoundary.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `usePlanContext.tsx`)
- **Services**: camelCase (e.g., `planService.ts`)
- **Types**: camelCase (e.g., `plan.ts`)
- **CSS Modules**: `ComponentName.module.css`
- **Tests**: `ComponentName.test.tsx`

### Directories

- **Feature directories**: camelCase (e.g., `components/`, `services/`)
- **Test directories**: `__tests__/`

## Import/Export Patterns

- **Barrel exports**: Each directory has an `index.ts` for clean imports
- **Default exports**: For components and main modules
- **Named exports**: For types, utilities, and multiple exports
- **Relative imports**: Use relative paths within the same feature
- **Absolute imports**: From `src/` root for cross-feature imports

## Testing Structure

- **Co-located tests**: Tests live alongside source files
- **Test directories**: `__tests__/` for complex test suites
- **Test naming**: `*.test.tsx` for components, `*.test.ts` for utilities
- **Global setup**: Shared test configuration in `src/test/setup.ts`

## CSS Architecture

- **CSS Modules**: Component-scoped styles with `.module.css`
- **Global styles**: `index.css` for base styles, `App.css` for app-wide
- **Component styles**: Co-located with components
