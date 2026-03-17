import { useState, useEffect } from "react";

/**
 * Hook to determine the number of grid columns based on tailwind breakpoints.
 * Matches: grid-cols-1 md:grid-cols-2 xl:grid-cols-3
 */
export function useGridColumns() {
    const [columns, setColumns] = useState(1);

    useEffect(() => {
        const updateColumns = () => {
            const width = window.innerWidth;
            if (width >= 1280) { // xl
                setColumns(3);
            } else if (width >= 768) { // md
                setColumns(2);
            } else {
                setColumns(1);
            }
        };

        updateColumns();
        window.addEventListener("resize", updateColumns);
        return () => window.removeEventListener("resize", updateColumns);
    }, []);

    return columns;
}
