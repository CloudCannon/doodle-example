import { DoodleCanvas } from "./doodle-canvas";
import { useState, useRef, useEffect } from "react"

export type CoordArray = [number, number][];

export function Doodler() {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [caption, setCaption] = useState<string>('');
    const [savedPixels, setSavedPixels] = useState<CoordArray[]>([]);
    const [currentStateMessage, setCurrentStateMessage] = useState<string | undefined>(undefined);
    const [inCloudCannonEditor, setInCloudCannonEditor] = useState<boolean>(false);

    useEffect(() => {
        setInCloudCannonEditor((window as any).inEditorMode);
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
        setCurrentStateMessage('Your doodle is being saved to the site...');
        
        try {
            const cloudcannonApi = (window as any).CloudCannonAPI.v1;
            const file = cloudcannonApi.file('/src/data/doodles.json');

            setCurrentStateMessage('Claiming file lock...');
            const {readOnly } = await file.claimLock();
            if (readOnly) {
                window.setTimeout(submit, 1000);
                return;
            }

            const canvas = canvasRef.current;
            if (!canvas) {
                setCurrentStateMessage('Lost reference to the canvas.');
                return;
            }

            setCurrentStateMessage('Processing your artwork...');
            const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve));
            setCurrentStateMessage('Uploading to CloudCannon...');
            const uploadedPath = await cloudcannonApi.uploadFile(
                new File([blob], 'doodle.png'),
                { options: {
                    uploads: 'public/doodles',
                    uploads_filename: 'doodle[count].png',
                    static: 'public'
                }}
            );
            setCurrentStateMessage('Adding to the gallery...');
            const length = JSON.parse(await file.get()).doodles.length
            await file.data.addArrayItem({
                slug: 'doodles',
                index: length,
                value: { src: uploadedPath, caption }
            });
            file.releaseLock();
        } catch (e) {
            const errorMessage = e instanceof Error && e.message ? `: ${e.message}` : undefined;
            setCurrentStateMessage(`Oh no, something went wrong${errorMessage}`);
            return;
        }

        setSavedPixels([]);
        redraw();
        setCurrentStateMessage('Ready! Click "Save" in the top-right, select all the files and confirm. Your doodle will appear on the site shortly after.');
    }

    if (!inCloudCannonEditor) {
        return undefined;
    }

    return (<>
        <h1>Why not draw something?</h1>

        <DoodleCanvas
            loadingState={currentStateMessage}
            updateLoadingState={setCurrentStateMessage}
            finishDraw={(newPixels: CoordArray) => { setSavedPixels([...savedPixels, [...newPixels]]); }}
        ></DoodleCanvas>
        
        <div style={{height: "50px"}} className="flex-column">
            <button type="button" disabled={!!currentStateMessage} onClick={undo}>← Undo</button>
        </div>

    <div className="flex-column">

        <label>
            Caption for the new image<br></br>
            <input type="text" onInput={(e) => {
                setCaption(e.currentTarget.value);
            }} />
        </label>

        <button type="button" disabled={!!currentStateMessage} onClick={submit}>Finish and submit</button>
        {currentStateMessage ? <p>{currentStateMessage}</p> : undefined}
    </div>
    </>)
}