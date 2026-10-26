import { App } from "./App";
import "./index.css";

import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getToken } from "@/lib/auth-token";

// Use JWT Bearer token for all API requests (works through Replit proxy)
setAuthTokenGetter(() => getToken());

createRoot(document.getElementById("root")!).render(<App />);
