# Next.js and React Three Fiber Project

This project is a Next.js application that utilizes React Three Fiber (R3F) to display a 3D model from Ready Player Me. The model is stored locally in the `public/models` directory.

## Project Structure

```
nextjs-r3f-project
├── public
│   └── models
│       └── avatar.glb
├── src
│   ├── components
│   │   ├── CanvasWrapper.tsx
│   │   └── ModelViewer.tsx
│   ├── pages
│   │   ├── _app.tsx
│   │   ├── index.tsx
│   │   └── _document.tsx
│   └── styles
│       └── globals.css
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

To get started with this project, clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd nextjs-r3f-project
npm install
```

## Running the Project

To run the development server, use the following command:

```bash
npm run dev
```

You can then view the application in your browser at `http://localhost:3000`.

## Features

- Displays a 3D avatar model using React Three Fiber.
- Utilizes `@react-three/drei` for easier handling of 3D assets.
- Full-screen rendering of the 3D scene.
- Basic lighting and environment setup for enhanced visuals.

## Components

- **RPMCharacter**: Loads and displays the 3D model, logging morph target information to the console.
- **AvatarScene**: Sets up the 3D environment and renders the `RPMCharacter`.

## Technologies Used

- Next.js
- React Three Fiber
- TypeScript
- Three.js
- @react-three/drei

## License

This project is licensed under the MIT License.