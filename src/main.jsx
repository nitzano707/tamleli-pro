import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import UploadBox from "./components/upload/UploadBox";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start gap-10 text-center p-10 bg-gray-50">
      <div className="w-full max-w-7xl mx-auto px-8">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-2 mb-2">
          🎧 Tamleli Pro
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          המערכת לתמלול וזיהוי דוברים בעברית
        </p>

        <UploadBox />
      </div>
    </div>
  );
}



ReactDOM.createRoot(document.getElementById("root")).render(<App />);
