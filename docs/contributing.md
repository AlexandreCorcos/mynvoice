# Contributing to MYNVOICE

Thank you for your interest in contributing to MYNVOICE.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Follow the setup instructions in the [README](../README.md)

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes following the conventions below

3. Test your changes:
   - Backend: ensure the API responds correctly
   - Frontend: ensure `npm run build` passes with no errors

4. Commit with clear, descriptive messages

5. Push and open a Pull Request against `main`

## Conventions

### Backend (Python)

- Follow PEP 8
- Use type hints
- Use async/await for database operations
- Pydantic schemas for all request/response models
- Keep routes thin — business logic belongs in services

### Frontend (TypeScript)

- Use functional components with hooks
- TailwindCSS for styling — use design tokens from `globals.css`
- Keep components focused and composable
- Use the `api` client from `@/lib/api` for all API calls
- Follow the existing file structure

### Design System

- **Petrol Dark** (`#0F4C5C`) for primary structural elements
- **Petrol Mid** (`#2C7A7B`) for hover states
- **Coral** (`#FF6B6B`) for CTAs and highlights — use sparingly
- Cards: white background, `14px` border radius, soft shadow
- Avoid heavy gradients and visual noise

## Reporting Issues

Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behaviour
- Screenshots if applicable

## Code of Conduct

Be respectful, constructive, and inclusive. We're building something great together.
