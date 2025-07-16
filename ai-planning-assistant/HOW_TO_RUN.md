# How to Run the AI Planning Assistant

## Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd ai-planning-assistant
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Development

### Start the development server:
```bash
npm run dev
```

This will start the Vite development server, typically at `http://localhost:5173`. The application will automatically reload when you make changes to the code.

### Available Scripts

- **`npm run dev`** - Start the development server with hot module replacement
- **`npm run build`** - Build the application for production
- **`npm run preview`** - Preview the production build locally
- **`npm run test`** - Run tests once
- **`npm run test:watch`** - Run tests in watch mode
- **`npm run test:ui`** - Run tests with UI interface
- **`npm run lint`** - Check code for linting errors
- **`npm run lint:fix`** - Fix linting errors automatically
- **`npm run format`** - Format code with Prettier
- **`npm run format:check`** - Check if code is properly formatted

## Production Build

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Preview the build locally:**
   ```bash
   npm run preview
   ```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Development Workflow

1. **Start development server:** `npm run dev`
2. **Make your changes** to the source code
3. **Run tests:** `npm run test:watch` (in a separate terminal)
4. **Check code quality:** `npm run lint` and `npm run format:check`
5. **Fix any issues:** `npm run lint:fix` and `npm run format`

## Troubleshooting

### Port Already in Use
If port 5173 is already in use, Vite will automatically try the next available port. Check the terminal output for the actual URL.

### Node Version Issues
If you encounter issues, ensure you're using Node.js version 18 or higher:
```bash
node --version
```

### Clear Cache
If you experience unexpected behavior, try clearing the node modules and reinstalling:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Issues
If the build fails, ensure all TypeScript errors are resolved:
```bash
npm run lint
npx tsc --noEmit
```