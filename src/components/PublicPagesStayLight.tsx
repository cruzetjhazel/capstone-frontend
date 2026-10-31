import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";

// Pages that always render light, whatever theme the user picked.
const LIGHT_ONLY = ["/", "/about", "/explore"];

export function PublicPagesStayLight() {
  const { pathname } = useLocation();
  const { resolvedTheme } = useTheme();

  const lightOnly = LIGHT_ONLY.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/"))
  );

  useLayoutEffect(() => {
    const root = document.documentElement;
    const dark = !lightOnly && resolvedTheme === "dark";
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  }, [lightOnly, resolvedTheme, pathname]);

  return null;
}