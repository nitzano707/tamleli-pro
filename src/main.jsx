import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import UploadBox from "./components/upload/UploadBox";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 text-center p-6">
      <h1 className="text-3xl font-bold">🎧 Tamleli Pro</h1>
      <p className="text-gray-600">המערכת לתמלול וזיהוי דוברים בעברית</p>
      <UploadBox />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
