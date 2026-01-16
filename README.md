# What's On The Menu

A family meal planning web app where parents create menus and children select what they want to eat through a kid-friendly interface.

## Quick Start

### Local Development

```bash
npm install
npm run dev
```

### Docker Development

```bash
docker compose up
```

Configure the port in `.env`:
```bash
PORT=5173
```

## Environment Variables

See `.env` for configuration:
- `PORT` - Dev server port (default: 5173)
- `VITE_POLLINATIONS_API_KEY` - API key for AI image generation

## Project Structure

```
src/
├── components/
│   ├── common/     # Shared UI components
│   ├── kid/        # Kid mode components
│   └── parent/     # Parent mode components
├── contexts/       # React Context state management
├── hooks/          # Custom React hooks
├── views/          # Page-level views
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
