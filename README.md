# NanoFig - AI Figurine & Box Art Generator

NanoFig is a powerful web application that uses generative AI to transform your images and ideas into stunning, professional-quality figurine and box art concepts. Upload a base image, describe your subject, and use a rich set of tools to customize every detail of your creation.

![NanoFig Application Screenshot](https://i.imgur.com/LwsuSAl.jpeg)

## ✨ Key Features

- **AI-Powered Transformations:** Convert images using text prompts with two distinct modes: **Figurine** (photorealistic 3D models) and **Box Art** (dynamic 2D illustrations).
- **Deep Customization:** Fine-tune results with extensive controls for Art Style, Environment, Pose, Lighting, Figurine Scale, and Material Modifiers.
- **Advanced Image Editing:**
    - **Crop Tool:** Precisely frame your input image before generation.
    - **Adjustments:** Edit the hue, saturation, and brightness of your input.
- **Interactive Preview:** Zoom, pan, and rotate both the original and generated images for detailed inspection.
- **Generation History:** A dedicated modal to view, reuse, and delete up to 50 of your past creations.
- **Undo/Redo:** Step backward and forward through your settings changes with ease.
- **Example Gallery:** Start quickly by selecting from a gallery of pre-configured examples.
- **Comprehensive Help:** An in-app guide explains what every setting does to help you create the perfect image.
- **Seamless Workflow:** Use a generated image as the input for your next creation with a single click.

## 🛠️ Technology Stack

- **Frontend:** [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
- **AI Model:** Google Gemini API (`gemini-2.5-flash-image`) via the [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (via CDN) for a modern, responsive UI.
- **Dependencies:** All dependencies are loaded directly in the browser via CDN using ES module `importmap`.

## 📂 Project Structure

The project is organized into a logical and maintainable structure:

```
/
├── components/         # Reusable React components (Button, Modals, ImagePreview, etc.)
├── hooks/              # Custom React hooks (e.g., useHistoryState for undo/redo)
├── services/           # Modules for external API calls (geminiService.ts)
├── utils/              # Helper functions (e.g., file and image manipulation)
├── App.tsx             # Main application component, state management, and layout
├── index.html          # The single HTML entry point for the application
├── index.tsx           # Renders the React application into the DOM
└── README.md           # This documentation file
```

## 🚀 Getting Started

To run this project locally, you'll need a web browser and a local web server.

### 1. Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge).
- A Google Gemini API key. You can get one from [Google AI Studio](https://aistudio.google.com/).

### 2. Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/nanofig.git
    cd nanofig
    ```

2.  **Configure your API Key:**
    This project is designed to use an environment variable `process.env.API_KEY`. Since it runs directly in the browser without a build step, you can simulate this by creating a configuration file.

    - Create a new file in the root of the project named `env.js`.
    - Add the following code to `env.js`, replacing `YOUR_GEMINI_API_KEY` with your actual key:

      ```javascript
      // env.js
      window.process = {
        env: {
          API_KEY: 'YOUR_GEMINI_API_KEY'
        }
      };
      ```

    - Open `index.html` and add a script tag to include this file **before** the main application script:

      ```html
      <!-- index.html -->
      <body class="bg-gray-900 text-white">
        <div id="root"></div>
        
        <!-- Add these two lines -->
        <script src="env.js"></script> 
        <script type="module" src="/index.tsx"></script> 
      </body>
      ```

### 3. Running the Application

Because the application uses ES modules (`import`), you need to serve the files from a local web server. You cannot simply open `index.html` from your file system.

- **Option A: Using `npx serve` (requires Node.js)**
  If you have Node.js installed, you can use the `serve` package for a quick and easy server.

  ```bash
  # Run this command in the project's root directory
  npx serve
  ```

- **Option B: Using Python's built-in server**
  If you have Python installed, you can use its simple HTTP server.

  ```bash
  # For Python 3
  python -m http.server

  # For Python 2
  python -m SimpleHTTPServer
  ```

Once the server is running, open your browser and navigate to the local address it provides (e.g., `http://localhost:3000`, `http://localhost:8000`).

## ⚙️ How It Works

1.  **Input:** The user either uploads an image via the `ImageUploader` component or selects a preset from the `PlaceholderGallery`.
2.  **State Management:** All user settings (mode, prompt, style, etc.) are managed in the main `App.tsx` component. The `useHistoryState` custom hook tracks changes to these settings to enable undo/redo functionality.
3.  **Prompt Engineering:** When the user clicks "Generate," a detailed text prompt is dynamically constructed based on all the selected customization options.
4.  **API Call:** The `transformImage` function in `geminiService.ts` is called. It sends the user's input image and the engineered prompt to the `gemini-2.5-flash-image` model via the `@google/genai` SDK.
5.  **Response Handling:** The service awaits the response, parses the `parts` to separate the generated text and image data, and performs robust error handling.
6.  **Display:** The returned image is displayed in the `ImagePreview` component, and the image data is added to the generation history.

## 🤝 Contributing

Contributions are welcome! If you have suggestions for improvements or find any issues, please feel free to open an issue or submit a pull request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
