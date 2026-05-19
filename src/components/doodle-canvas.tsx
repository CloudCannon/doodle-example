import type { CoordArray } from "../pages/doodle";
import { useRef, useState, type Dispatch, type PointerEvent, type SetStateAction } from "react";

interface Props {
    loadingState: string | undefined;
    updateLoadingState: Dispatch<SetStateAction<string | undefined>>
    finishDraw(newPixels: CoordArray): void;
}

export function DoodleCanvas({loadingState, updateLoadingState, finishDraw}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [drawingState, setDrawingState] = useState<boolean>(false);
    const [activePixels, setActivePixels] = useState<CoordArray>([]);

    function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
        e.preventDefault();
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
        if (loadingState === 'saved' || loadingState === 'error') {
            updateLoadingState(undefined);
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
            className="box"
            width={300}
            height={300}
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={endDraw}
            onPointerOut={endDraw}
            onPointerCancel={endDraw}
            onPointerLeave={endDraw}
        >
            {activePixels.map((coord) => {
                const [x, y] = coord;
                return <div key={coord.join('-')} className="pixel" style={{left: `${x}px`, top: `${y}px`}}></div>;
            })}
        </canvas>);
}