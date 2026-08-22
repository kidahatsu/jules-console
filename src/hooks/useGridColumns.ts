import { useState, useEffect } from "react";

/**
 * Hook to determine the number of grid columns based on tailwind breakpoints.
 * Matches: grid-cols-1 md:grid-cols-2 xl:grid-cols-3
 */
function getGridColumns() {
    if (typeof window === "undefined") return 1;
    const width = window.innerWidth;
    if (width >= 1280) return 3; // xl
    if (width >= 768) return 2;  // md
    return 1;
}

export function useGridColumns() {
    const [columns, setColumns] = useState(getGridColumns);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const handleResize = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setColumns(getGridColumns());
            }, 100);
        };

        window.addEventListener("resize", handleResize);
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return columns;
}
