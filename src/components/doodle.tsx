import { DoodleCanvas } from "./doodle-canvas";
import { useState, useRef, useEffect } from "react"
import type { CloudCannonVisualEditorAPIV1, CloudCannonVisualEditorWindow } from '@cloudcannon/visual-editor-api';

export type CoordArray = [number, number][];
const CANVAS_SIZE = 500;

declare const window: CloudCannonVisualEditorWindow & { inEditorMode: true | undefined }

export function Doodler() {
    let cloudcannonApi: CloudCannonVisualEditorAPIV1 | undefined;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [caption, setCaption] = useState<string>('');
    const [savedPixels, setSavedPixels] = useState<CoordArray[]>([]);
    const [loadingState, setLoadingState] = useState<'saving' | 'saved' | 'error' | undefined>(undefined);
    const [currentStateMessage, setCurrentStateMessage] = useState<string | undefined>(undefined);
    const [inCloudCannonEditor, setInCloudCannonEditor] = useState<boolean>(false);

    useEffect(() => {
        setInCloudCannonEditor(!!window.inEditorMode);
        if (window.inEditorMode) {
            cloudcannonApi = window.CloudCannonAPI?.useVersion('v1', true);
        }
    })

    function undo() {
        savedPixels.pop();
        redraw();
    }

    function clear() {
        setSavedPixels([]);
        const context = canvasRef.current?.getContext('2d');
        if (context) {
            context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        }
    }

    function redraw() {
        const context = canvasRef.current?.getContext('2d');
        if (context) {
            context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
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
        if (cloudcannonApi === undefined) {
            setCurrentStateMessage('Can\'t access the CloudCannon API! Refresh and try again.');
            setLoadingState('error');
            return;
        }

        setCurrentStateMessage('Your doodle is being saved to the site...');
        setLoadingState('saving');

        const file = cloudcannonApi.file('/src/data/doodles.json');
        
        try {

            /**
             * First we'll get a reference to the file we want to save to.
             */
            
            /**
             * Next we need to claim a lock on that file,
             * to prevent race condition edits with any other 
             * person actively editing the site.
             */
            setCurrentStateMessage('Claiming file lock...');
            let readOnly = true;
            for (let fileLockAttempts = 0; readOnly; fileLockAttempts++) {
                readOnly = (await file.claimLock()).readOnly;
                if (readOnly) {
                    if (fileLockAttempts > 3) {
                        throw new Error('Someone else is editing this file. Try again in a second!')
                    } 
                    await new Promise((resolve) => window.setTimeout(resolve, 1000));
                }
            }

            const canvas = canvasRef.current;
            if (!canvas) {
                throw new Error('Lost reference to the canvas.');
            }

            setCurrentStateMessage('Processing your artwork...');
            const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve));
            if (!blob) {
                throw new Error("couldn't turn this drawing into an image file");
            }

            /**
             * We've turned out canvas into a blob. Now we
             * want to upload that blob as a new .png in
             * the /public/ directory.
             */
            setCurrentStateMessage('Uploading to CloudCannon...');
            const uploadedPath = await cloudcannonApi.uploadFile(
                new File([blob], 'doodle.png'),
                { 
                    type: 'image',
                    options: {
                        paths: {
                            uploads: 'public/doodles',
                            uploads_filename: 'doodle[count].png',
                            static: 'public'
                        },
                    }
                }
            );

            /**
             * Finally, we'll update the array in our data file,
             * adding an item that references our newly uploaded
             * file and attaches a caption.
             */
            setCurrentStateMessage('Adding to the gallery...');
            const doodles = await file.data.get({ slug: 'doodles' });
            if (typeof doodles !== 'object' || typeof doodles.length !== 'number') {
                throw new Error('The data file is incorrectly formatted.');
            }

            await file.data.addArrayItem({
                slug: 'doodles',
                index: doodles.length,
                value: { src: uploadedPath, caption }
            });
        } catch (e) {
            const errorMessage = e instanceof Error && e.message ? `: ${e.message}` : undefined;
            setCurrentStateMessage(`Something went wrong${errorMessage}`);
            setLoadingState('error');
            return;
        } finally {
            /** Release our lock on the file after editing is finished. */
            file.releaseLock();
        }

        clear();
        setCurrentStateMessage('Ready! Click "Save" in the top-right, select all the files and confirm. Your doodle will appear on the site shortly after.');
        setLoadingState('saved');
    }

    if (!inCloudCannonEditor) {
        return undefined;
    }

    return (<section className="cloudcannon-visual-editor-component">
        <h1 className="doodler-title">DOODLE TIME</h1>
        <p>
            Welcome to the CloudCannon Visual Editor!<br/>
            Draw something fun on the canvas below,
            give it a name, and add it to the collection. It will appear on the homepage of this
            website, and in the list below!
        </p>

        <div className="doodler-container">

            <div className="canvas-col">
                <div className="canvas-frame">
                    <DoodleCanvas
                        canvasRef={canvasRef}
                        loadingState={loadingState}
                        resetLoadingState={() => {setCurrentStateMessage(undefined); setLoadingState(undefined)}}
                        finishDraw={(newPixels: CoordArray) => { setSavedPixels([...savedPixels, [...newPixels]]); }}
                    />
                </div>
                <p>Click and drag inside the frame to draw.</p>
            </div>

            <div className="controls doodler-controls">
                <div className="button-row">
                    <button type="button" className="btn" disabled={!!currentStateMessage || !savedPixels.length} onClick={undo}>
                        <span aria-hidden="true">&#8617;</span> Undo stroke
                    </button>
                    <button type="button" className="btn" disabled={!!currentStateMessage || !savedPixels.length} onClick={clear}>
                        <span aria-hidden="true">&#10005;</span> Start over
                    </button>
                </div>

                <div className="field">
                    <label htmlFor="caption">
                        Caption your art
                    </label>
                    <input className="input" type="text" id="caption" placeholder="e.g. my cool doodle ♡"
                        maxLength={40} value={caption}
                        onInput={(e) => setCaption(e.currentTarget.value)} />
                    
                </div>

                <button className="btn btn-primary" type="button" disabled={!!currentStateMessage || !caption.trim()} onClick={submit}>
                    Add to the gallery
                </button>

                <p role="alert">{currentStateMessage}</p>
            </div>
            
        </div>
    </section>)
}