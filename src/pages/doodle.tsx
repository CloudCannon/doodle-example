import { DoodleCanvas } from "../components/doodle-canvas";
import { useState, useRef, useEffect } from "react"

export type CoordArray = [number, number][];

export function Doodler() {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [savedPixels, setSavedPixels] = useState<CoordArray[]>([]);
    const [loadingState, setLoadingState] = useState<string | undefined>(undefined);
    const [inCloudCannonEditor, setInCloudCannonEditor] = useState<boolean>(false);

    useEffect(() => {
        // setInCloudCannonEditor((window as any).inEditorMode);
        setInCloudCannonEditor(true);
    })

    function undo() {
        savedPixels.pop();
        redraw();
    }

    function redraw() {
        const context = canvasRef.current?.getContext('2d');
        if (context) {
            context.clearRect(0, 0, 300, 300);
            for (const pixelArray of savedPixels) {
                if (pixelArray?.length > 1) {
                    context.beginPath();
                    context.moveTo(pixelArray[0][0], pixelArray[0][1]);
                    for (const pixel of pixelArray) {
                        context.lineTo(pixel[0], pixel[1]);
                        context.stroke();
                    }
                }
            }
        }
    }

    async function submit() {
        setLoadingState('saving');
        const cloudcannonApi = (window as any).CloudCannonAPI.v1;

        try {
            const file = cloudcannonApi.file('/src/data/doodles.json');
            const {readOnly } = await file.claimLock();
            if (readOnly) {
                window.setTimeout(submit, 1000);
                return;
            }

            const canvas = canvasRef.current;
            if (!canvas) {
                // handle no canvas
                return;
            }
            const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve));
            const uploadedPath = await cloudcannonApi.uploadFile(
                new File([blob], 'doodle.png'),
                { options: {
                    uploads: 'public/doodles',
                    uploads_filename: 'doodle[count].png',
                    static: 'public'
                }}
            );
            const length = JSON.parse(await file.get()).doodles.length
            await file.data.addArrayItem({
                slug: 'doodles',
                index: length,
                value: uploadedPath
            });
            file.releaseLock();
        } catch (e) {
            setLoadingState('error');
        }

        setSavedPixels([]);
        redraw();
        setLoadingState('saved');
    }

    if (!inCloudCannonEditor) {
        return <></>;
    }

    return (<>
        <h1>Why not draw something?</h1>

        <DoodleCanvas
            loadingState={loadingState}
            updateLoadingState={setLoadingState}
            finishDraw={(newPixels: CoordArray) => { setSavedPixels([...savedPixels, [...newPixels]]); }}
        ></DoodleCanvas>
        
        <div style={{height: "50px"}} className="flex-column">
            <button type="button" disabled={!!loadingState} onClick={undo}>← Undo</button>
        </div>

    <div className="flex-column">
        <button type="button" disabled={!!loadingState} onClick={submit}>Finish and submit!</button>
        {loadingState === 'saving' && <p>Your doodle is being saved to the site!</p>}
        {loadingState === 'saved' && <p>Ready!! <strong>Click "Save"</strong> in the top-right, <strong>select all the files</strong> and confirm! Your doodle will appear on the site shortly after.</p>}
        {loadingState === 'error' && <p>Oh no, something went wrong, sorry about that.</p>}
    </div>
    </>)
}