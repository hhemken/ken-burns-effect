# Ken Burns Effect Video Generator

This web application allows users to create a Ken Burns effect video from a single static image. Users can upload an image, define the start and end frames by positioning and resizing two rectangles, and generate a smooth pan-and-zoom video.

## Features

-   **Image Upload:** Supports uploading JPG and PNG images.
-   **Interactive Framing:** Use draggable and resizable rectangles to visually define the start and end views of the video.
-   **Customizable Video Settings:**
    -   Set the total video duration.
    -   Add static padding at the beginning and end of the video.
    -   Choose from multiple output resolutions (720p, 1080p, 2K, 4K).
-   **Aspect Ratio Enforcement:** Optionally lock the aspect ratio of the selection rectangles to match standard video formats (e.g., 16:9).
-   **Real-time Validation:**
    -   The UI displays the calculated dimensions of the start/end rectangles based on the original image size.
    -   A warning message appears if a selected rectangle is smaller than the target video resolution, which could lead to upscaling and quality loss.
-   **Video Preview & Download:** After generation, the video can be previewed directly on the page and downloaded.

## Technology Stack

-   **Backend:** Python, Flask, OpenCV, NumPy
-   **Frontend:** HTML, CSS, JavaScript
-   **JavaScript Libraries:** Interact.js for draggable and resizable elements.

## Setup and Installation

To run this project locally, you will need Python 3 and `pip` installed.

1.  **Clone the repository or download the project files.**

2.  **Create and activate a virtual environment (recommended):**
    ```bash
    # For Unix/macOS
    python3 -m venv venv
    source venv/bin/activate

    # For Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install the required Python packages:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Create the necessary directories:**
    The application will automatically create the `uploads` and `generated_videos` folders on the first run.

## How to Use

1.  **Start the Flask server:**
    ```bash
    python app.py
    ```

2.  **Open your web browser** and navigate to `http://127.0.0.1:5000`.

3.  **Upload an Image:** Click "Choose File" and select a JPG or PNG image.

4.  **Adjust Settings:**
    -   Set the desired duration, padding, and resolution using the controls at the top.
    -   If you want to maintain a specific aspect ratio for your zoom, ensure "Enforce Aspect Ratio" is checked and the ratio is correct.

5.  **Define Start and End Frames:**
    -   Drag and resize the green "Start" rectangle to define the initial view.
    -   Drag and resize the red "End" rectangle to define the final view.
    -   Pay attention to the dimension information and warnings below the image.

6.  **Generate Video:** Click the "Generate Video" button. The process may take a few moments.

7.  **Preview and Download:** Once complete, the video will appear. You can play it directly or use the "Download Video" link to save it.
