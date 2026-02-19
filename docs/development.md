# Development

This guide explains how to develop and build the Snacking Animation Library.

## Contributing

1.  **Fork** the repository.
2.  **Clone** your fork.
3.  **Install dependencies**:
    ```bash
    pnpm install
    ```
4.  **Make changes** to components in `components/` or hooks in `hooks/`.
5.  **Test** your changes using the demo application (see below).

## Running the Demo App

The project includes a demo application that showcases the library's features.

```bash
# Start the development server
pnpm run dev
```

Open your browser to the URL shown in the terminal (usually `http://localhost:5173`).

## Building the Library

To build the library for distribution (so it can be installed in other projects):

```bash
pnpm build:lib
```

This will compile the TypeScript code and generate the distribution files in the `dist/` directory.

## Building the Demo App

To build the demo application for deployment:

```bash
pnpm build
```

The build artifacts will be in the `dist/` directory.

## Styling

The library relies on **Tailwind CSS**.

- If you are adding new components, try to use existing utility classes.
- If you need custom styles, check `index.css` or consider if it should be a configurable prop.
