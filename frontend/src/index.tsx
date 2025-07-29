import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import theme from "./theme";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./styles/rtl.css";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <GoogleOAuthProvider
        clientId={
          process.env.REACT_APP_GOOGLE_CLIENT_ID ||
          "845776418724-r4203kap79t1rc5f53j23uc4vnt8e8f3.apps.googleusercontent.com"
        }
      >
        <App />
      </GoogleOAuthProvider>
    </ChakraProvider>
  </React.StrictMode>
);
