import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initSync } from "./lib/sync";
import "./index.css";

initSync();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
