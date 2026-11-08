"use client";

import * as React from "react";

// React 18 warns when useLayoutEffect renders on the server
export const useLayoutEffect = typeof document === "undefined" ? React.useEffect : React.useLayoutEffect;
