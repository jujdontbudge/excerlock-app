import { createContext, useContext, type ReactNode } from "react";

import { theme, type Theme } from "./theme";

const ThemeContext = createContext<Theme>(theme);

type ThemeProviderProps = {
  children: ReactNode;
  /** Override the tokens — the seam for a night theme or a test double. */
  value?: Theme;
};

export function ThemeProvider({ children, value = theme }: ThemeProviderProps) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Reads the active tokens. Unwrapped consumers get the default theme rather
 * than an error, so a component is always renderable on its own in a test.
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
