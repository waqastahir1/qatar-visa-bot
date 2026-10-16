import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";
import axios from "axios";
import "../styles/globals.css";

// When running inside the Electron standalone app, pages are served via a
// custom protocol (app://). Point axios at the backend directly.
if (typeof window !== "undefined" && window.location.protocol === "app:") {
  axios.defaults.baseURL = "http://localhost:8000";
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#f9fafb",
            border: "1px solid #374151",
          },
        }}
      />
    </>
  );
}
