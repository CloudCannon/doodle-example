import { DoodleCanvas } from "./doodle-canvas";
import { useState, useRef, useEffect } from "react"

export type CoordArray = [number, number][];

export function Doodler() {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [caption, setCaption] = useState<string>('');
    const [savedPixels, setSavedPixels] = useState<CoordArray[]>([]);
    const [loadingState, setLoadingState] = useState<'saving' | 'saved' | 'error' | undefined>(undefined);
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
        setLoadingState('saving');
        
        try {
            const cloudcannonApi = (window as any).CloudCannonAPI.v1;
            /**
             * First we'll get a reference to the file we want to save to.
             */
            const file = cloudcannonApi.file('/src/data/doodles.json');

            
            /**
             * Next we need to claim a lock on that file,
             * to prevent race condition edits with any other 
             * person actively editing the site.
             */
            setCurrentStateMessage('Claiming file lock...');
            const {readOnly } = await file.claimLock();
            if (readOnly) {
                window.setTimeout(submit, 1000);
                return;
            }

            const canvas = canvasRef.current;
            if (!canvas) {
                setCurrentStateMessage('Lost reference to the canvas.');
                setLoadingState('error');
                return;
            }

            setCurrentStateMessage('Processing your artwork...');
            const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve));
            if (!blob) {
                setCurrentStateMessage('Something went wrong turning this drawing into an image file.');
                setLoadingState('error');
                return;
            }

            /**
             * We've turned out canvas into a blob. Now we
             * want to upload that blob as a new .png in
             * the /public/ directory.
             */
            setCurrentStateMessage('Uploading to CloudCannon...');
            const uploadedPath = await cloudcannonApi.uploadFile(
                new File([blob], 'doodle.png'),
                { options: {
                    uploads: 'public/doodles',
                    uploads_filename: 'doodle[count].png',
                    static: 'public'
                }}
            );

            /**
             * Finally, we'll update the array in our data file,
             * adding an item that references our newly uploaded
             * file and attaches a caption.
             */
            setCurrentStateMessage('Adding to the gallery...');
            const length = JSON.parse(await file.get()).doodles.length
            await file.data.addArrayItem({
                slug: 'doodles',
                index: length,
                value: { src: uploadedPath, caption }
            });
        } catch (e) {
            const errorMessage = e instanceof Error && e.message ? `: ${e.message}` : undefined;
            setCurrentStateMessage(`Something went wrong${errorMessage}`);
            setLoadingState('error');
            return;
        }

        setSavedPixels([]);
        redraw();
        setCurrentStateMessage('Ready! Click "Save" in the top-right, select all the files and confirm. Your doodle will appear on the site shortly after.');
    }

    if (!inCloudCannonEditor) {
        return undefined;
    }

    return (<div className="cloudcannon-visual-editor-component">
        <div className="flex-column justify-center">
            <h1>Why not draw something?</h1>

            <DoodleCanvas
                canvasRef={canvasRef}
                loadingState={loadingState}
                resetLoadingState={() => {setCurrentStateMessage(undefined); setLoadingState(undefined)}}
                finishDraw={(newPixels: CoordArray) => { setSavedPixels([...savedPixels, [...newPixels]]); }}
            ></DoodleCanvas>
            
            <div className="flex-column">
                <button type="button" disabled={!!currentStateMessage} onClick={undo}>← Undo</button>
            </div>

            <div className="flex-column">
                <div>
                    <label htmlFor="caption">Caption for the new image (required)</label>
                    <input type="text" id="caption" onInput={(e) => {
                        setCaption(e.currentTarget.value);
                    }} />
                </div>


                <button type="button" disabled={!!currentStateMessage || !caption} onClick={submit}>Finish and submit</button>
                {currentStateMessage ? <p>{currentStateMessage}</p> : undefined}
            </div>
        </div>
    </div>)
}