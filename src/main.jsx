import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ClientsProvider } from "./state/ClientsContext.jsx";
import "./styles.css";

const THEME_KEY = "rag-theme";
document.body.dataset.theme = localStorage.getItem(THEME_KEY) || "light";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClientsProvider>
        <App />
      </ClientsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
