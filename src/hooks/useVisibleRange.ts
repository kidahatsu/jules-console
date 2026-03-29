import { useState, useEffect, useRef, useCallback } from "react";

/**
 * A simple hook for windowing/virtualization.
 * Returns the range of indices that should be rendered based on scroll.
 */
export function useVisibleRange(totalItems: number, itemsPerBatch: number = 12) {
    const [visibleCount, setVisibleCount] = useState(itemsPerBatch);
    const observerTarget = useRef<HTMLDivElement | null>(null);

    const loadMore = useCallback(() => {
        setVisibleCount(prev => Math.min(prev + itemsPerBatch, totalItems));
    }, [itemsPerBatch, totalItems]);

    useEffect(() => {
        if (!observerTarget.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: "200px" }
        );

        observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [loadMore]);

    const [prevTotalItems, setPrevTotalItems] = useState(totalItems);
    const [prevItemsPerBatch, setPrevItemsPerBatch] = useState(itemsPerBatch);

    // Reset when total items change significantly (e.g. filter change)
    if (totalItems !== prevTotalItems || itemsPerBatch !== prevItemsPerBatch) {
        setVisibleCount(itemsPerBatch);
        setPrevTotalItems(totalItems);
        setPrevItemsPerBatch(itemsPerBatch);
    }

    return { visibleCount, observerTarget };
}
