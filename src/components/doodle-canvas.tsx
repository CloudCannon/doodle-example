import type { CoordArray } from "./doodle";
import { useState, type PointerEvent, type RefObject } from "react";

interface Props {
    loadingState: 'saving' | 'saved' | 'error' | undefined;
    resetLoadingState: () => void
    finishDraw(newPixels: CoordArray): void;
    canvasRef: RefObject<HTMLCanvasElement | null>
}

export function DoodleCanvas({loadingState, resetLoadingState, finishDraw, canvasRef}: Props) {
    const [drawingState, setDrawingState] = useState<boolean>(false);
    const [activePixels, setActivePixels] = useState<CoordArray>([]);

    function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
        e.preventDefault();
        e.stopPropagation();
        if (canvasRef.current && drawingState && !loadingState) {
            const previous = activePixels[activePixels.length - 1];
            if (previous) {
                const context = canvasRef.current.getContext('2d');
                if (context) {
                    context.lineWidth = 4;
                    context.beginPath();
                    context.moveTo(previous[0], previous[1]);
                    context.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                    context.stroke();
                }
            }
            setActivePixels(
                [...activePixels, [e.nativeEvent.offsetX, e.nativeEvent.offsetY]]
            )
        }
    }

    function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
        e.preventDefault();
        setDrawingState(true);
        if (loadingState !== 'saving') {
            resetLoadingState();
        }
    }

    function endDraw() {
        setDrawingState(false);
        if (activePixels.length) {
            finishDraw(activePixels);
        }
        setActivePixels([]);
    }


    return (<canvas
            width={500}
            height={500}
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={endDraw}
            onPointerOut={endDraw}
            onPointerCancel={endDraw}
            onPointerLeave={endDraw}
        />);
}