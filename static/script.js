document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const imageUpload = document.getElementById('image-upload');
    const displayImage = document.getElementById('display-image');
    const imageContainer = document.getElementById('image-container');
    const startRect = document.getElementById('start-rect');
    const endRect = document.getElementById('end-rect');
    const generateBtn = document.getElementById('generate-btn');
    const enforceAspectCheckbox = document.getElementById('enforce-aspect');
    const aspectRatioInput = document.getElementById('aspect-ratio');
    const resolutionSelect = document.getElementById('resolution');
    const loader = document.getElementById('loader');
    const resultVideo = document.getElementById('result-video');
    const downloadLink = document.getElementById('download-link');
    const dimensionsInfo = document.getElementById('dimensions-info');
    const startDimInfo = document.getElementById('start-dim-info');
    const endDimInfo = document.getElementById('end-dim-info');
    const resolutionWarning = document.getElementById('resolution-warning');

    // State Variables
    let originalImageWidth = 0;
    let originalImageHeight = 0;
    let uploadedFile = null;

    // Resolution dimensions mapping for validation
    const RESOLUTION_DIMS = {
        "720p": { w: 1280, h: 720 },
        "1080p": { w: 1920, h: 1080 },
        "2k": { w: 2560, h: 1440 },
        "4k": { w: 3840, h: 2160 }
    };

    /**
     * Updates the dimension info text and checks for resolution warnings.
     */
    function updateDimensions() {
        if (!originalImageWidth || !displayImage.width) return;

        const scaleX = originalImageWidth / displayImage.width;
        const scaleY = originalImageHeight / displayImage.height;

        const getRealDims = (rect) => ({
            w: Math.round(rect.offsetWidth * scaleX),
            h: Math.round(rect.offsetHeight * scaleY)
        });

        const startDims = getRealDims(startRect);
        const endDims = getRealDims(endRect);

        startDimInfo.textContent = `${startDims.w}px x ${startDims.h}px`;
        endDimInfo.textContent = `${endDims.w}px x ${endDims.h}px`;

        const targetRes = RESOLUTION_DIMS[resolutionSelect.value];
        let warnings = [];

        if (startDims.w < targetRes.w || startDims.h < targetRes.h) {
            warnings.push("Start rectangle is smaller than the target resolution. This may result in a low-quality video.");
        }
        if (endDims.w < targetRes.w || endDims.h < targetRes.h) {
             warnings.push("End rectangle is smaller than the target resolution. This may result in a low-quality video.");
        }

        resolutionWarning.innerHTML = [...new Set(warnings)].join('<br>');
    }

    /**
     * Handles the image upload event.
     */
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadedFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                displayImage.src = event.target.result;
                displayImage.onload = () => {
                    originalImageWidth = displayImage.naturalWidth;
                    originalImageHeight = displayImage.naturalHeight;

                    displayImage.style.opacity = 1;
                    startRect.style.visibility = 'visible';
                    endRect.style.visibility = 'visible';
                    generateBtn.disabled = false;
                    dimensionsInfo.classList.remove('hidden');

                    const w = displayImage.width * 0.8;
                    const h = displayImage.height * 0.8;

                    positionRect(startRect, displayImage.width * 0.1, displayImage.height * 0.1, w, h);
                    positionRect(endRect, displayImage.width * 0.1, displayImage.height * 0.1, w / 2, h / 2);

                    updateDimensions();
                };
            };
            reader.readAsDataURL(file);
        }
    });

    /**
     * Sets the initial position and size of a rectangle.
     */
    function positionRect(target, x, y, w, h) {
        target.style.width = `${w}px`;
        target.style.height = `${h}px`;
        target.style.transform = `translate(${x}px, ${y}px)`;
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }

    /**
     * Gets the aspect ratio from the input field.
     */
    function getAspectRatio() {
        const ratioStr = aspectRatioInput.value;
        const parts = ratioStr.split(':').map(Number);
        return (parts.length === 2 && parts[0] > 0 && parts[1] > 0) ? parts[0] / parts[1] : 16 / 9;
    }

    /**
     * Initializes Interact.js for draggable and resizable rectangles.
     */
    interact('.resizable-draggable')
        .draggable({
            listeners: {
                move(event) {
                    const target = event.target;
                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    updateDimensions();
                }
            },
            inertia: true
        })
        .resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move(event) {
                    const target = event.target;
                    let x = (parseFloat(target.getAttribute('data-x')) || 0);
                    let y = (parseFloat(target.getAttribute('data-y')) || 0);

                    target.style.width = `${event.rect.width}px`;
                    target.style.height = `${event.rect.height}px`;

                    x += event.deltaRect.left;
                    y += event.deltaRect.top;

                    target.style.transform = `translate(${x}px, ${y}px)`;
                    target.setAttribute('data-x', x);
                    target.setAttribute('data-y', y);
                    updateDimensions();
                }
            },
            modifiers: [
                interact.modifiers.aspectRatio({
                    ratio: 'preserve',
                    equalDelta: true,
                    modifiers: [
                        interact.modifiers.restrictSize({
                            min: { width: 50, height: 50 }
                        })
                    ]
                })
            ],
            inertia: true
        });

    /**
     * Toggles aspect ratio enforcement for rectangles.
     */
    function toggleAspectRatio(enforce) {
        interact('.resizable-draggable').resizable({
            aspectRatio: enforce ? getAspectRatio() : 'preserve'
        });
    }

    enforceAspectCheckbox.addEventListener('change', (e) => toggleAspectRatio(e.target.checked));
    aspectRatioInput.addEventListener('input', () => {
        if (enforceAspectCheckbox.checked) {
            toggleAspectRatio(true);
        }
    });
    resolutionSelect.addEventListener('change', updateDimensions);

    /**
     * Handles the "Generate Video" button click event.
     */
    generateBtn.addEventListener('click', async () => {
        if (!uploadedFile) {
            alert("Please upload an image first.");
            return;
        }

        loader.classList.remove('hidden');
        resultVideo.classList.add('hidden');
        downloadLink.classList.add('hidden');
        generateBtn.disabled = true;

        const scaleX = originalImageWidth / displayImage.width;
        const scaleY = originalImageHeight / displayImage.height;

        // --- DEFINITIVE FIX for coordinate calculation ---
        const getRectData = (rect) => {
            const imageBounds = displayImage.getBoundingClientRect();
            const rectBounds = rect.getBoundingClientRect();

            // Calculate position of the rectangle relative to the image's top-left corner
            const x = rectBounds.left - imageBounds.left;
            const y = rectBounds.top - imageBounds.top;

            return {
                x: x * scaleX,
                y: y * scaleY,
                w: rectBounds.width * scaleX,
                h: rectBounds.height * scaleY
            };
        };

        const startRectData = getRectData(startRect);
        const endRectData = getRectData(endRect);

        const formData = new FormData();
        formData.append('image', uploadedFile);
        formData.append('startX', startRectData.x);
        formData.append('startY', startRectData.y);
        formData.append('startW', startRectData.w);
        formData.append('startH', startRectData.h);
        formData.append('endX', endRectData.x);
        formData.append('endY', endRectData.y);
        formData.append('endW', endRectData.w);
        formData.append('endH', endRectData.h);
        formData.append('duration', document.getElementById('duration').value);
        formData.append('resolution', document.getElementById('resolution').value);
        formData.append('padding', document.getElementById('padding').value);

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                resultVideo.src = result.video_url;
                // --- FIX: Explicitly load the new video source ---
                resultVideo.load();
                resultVideo.classList.remove('hidden');
                downloadLink.href = result.video_url;
                downloadLink.classList.remove('hidden');
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            alert('An unexpected error occurred. Please check the console.');
            console.error(error);
        } finally {
            loader.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });

    toggleAspectRatio(enforceAspectCheckbox.checked);
});
