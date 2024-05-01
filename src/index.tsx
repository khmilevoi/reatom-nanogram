import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app.tsx";
import "./index.css";
import { connectLogger, createCtx } from "@reatom/framework";
import { reatomContext } from "@reatom/npm-react";

const ctx = createCtx();

connectLogger(ctx);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <reatomContext.Provider value={ctx}>
      <App />
    </reatomContext.Provider>
  </React.StrictMode>,
);
