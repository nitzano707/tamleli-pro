import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Button } from "./components/ui/button";

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-3xl font-bold">🎧 Tamleli Pro</h1>
      <p className="text-gray-600">המערכת לתמלול וזיהוי דוברים בעברית</p>
      <Button onClick={() => alert("שלום ניצן!")}>התחל תמלול</Button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
