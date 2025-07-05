import os
import uuid
import cv2
import numpy as np
from flask import Flask, request, render_template, jsonify, url_for, send_from_directory

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
GENERATED_VIDEOS_FOLDER = 'generated_videos'
STATIC_FOLDER = 'static'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
FPS = 30

# --- Flask App Initialization ---
app = Flask(__name__, static_folder=STATIC_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['GENERATED_VIDEOS_FOLDER'] = GENERATED_VIDEOS_FOLDER


# --- Helper Functions ---
def allowed_file(filename):
    """Checks if the uploaded file has an allowed extension."""
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_resolution_dims(resolution_str):
    """Converts resolution string to (width, height) tuple."""
    resolutions = {
        "720p": (1280, 720),
        "1080p": (1920, 1080),
        "2k": (2560, 1440),
        "4k": (3840, 2160)
    }
    return resolutions.get(resolution_str, (1280, 720))


def create_ken_burns_video(image_path, start_rect, end_rect, duration, resolution, padding):
    """
    Generates a Ken Burns effect video with static padding.
    """
    writer = None
    try:
        img = cv2.imread(image_path)
        if img is None:
            return None, "Could not read the image file."

        img_h, img_w, _ = img.shape
        video_w, video_h = get_resolution_dims(resolution)

        padding_frames = int(padding * FPS)
        total_frames = int(duration * FPS)
        transition_frames = total_frames - (2 * padding_frames)

        if transition_frames < 0:
            return None, "Total duration is less than the start and end padding combined."

        output_filename = f"{uuid.uuid4()}.mp4"
        output_path = os.path.join(app.config['GENERATED_VIDEOS_FOLDER'], output_filename)
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(output_path, fourcc, FPS, (video_w, video_h))

        if not writer.isOpened():
            raise IOError("VideoWriter failed to open.")

        # --- Clamping logic for the start rectangle ---
        sx1 = max(0, int(start_rect['x']))
        sy1 = max(0, int(start_rect['y']))
        sx2 = min(img_w, int(start_rect['x'] + start_rect['w']))
        sy2 = min(img_h, int(start_rect['y'] + start_rect['h']))

        if (sx2 - sx1) <= 0 or (sy2 - sy1) <= 0:
            return None, "The 'Start' rectangle's calculated size is zero or negative after clamping. Please adjust and try again."

        start_crop = img[sy1:sy2, sx1:sx2]
        start_frame = cv2.resize(start_crop, (video_w, video_h), interpolation=cv2.INTER_CUBIC)
        for _ in range(padding_frames):
            writer.write(start_frame)

        if transition_frames > 0:
            for i in range(transition_frames):
                alpha = i / (transition_frames - 1) if transition_frames > 1 else 0
                alpha = 0.5 * (1 - np.cos(np.pi * alpha))

                # Interpolate rectangle properties using floats for precision
                x = start_rect['x'] + (end_rect['x'] - start_rect['x']) * alpha
                y = start_rect['y'] + (end_rect['y'] - start_rect['y']) * alpha
                w = start_rect['w'] + (end_rect['w'] - start_rect['w']) * alpha
                h = start_rect['h'] + (end_rect['h'] - start_rect['h']) * alpha

                # --- Clamping logic for the transition frames ---
                x1 = max(0, int(x))
                y1 = max(0, int(y))
                x2 = min(img_w, int(x + w))
                y2 = min(img_h, int(y + h))

                if (x2 - x1) <= 0 or (y2 - y1) <= 0: continue

                crop = img[y1:y2, x1:x2]
                resized_frame = cv2.resize(crop, (video_w, video_h), interpolation=cv2.INTER_CUBIC)
                writer.write(resized_frame)

        # --- Clamping logic for the end rectangle ---
        ex1 = max(0, int(end_rect['x']))
        ey1 = max(0, int(end_rect['y']))
        ex2 = min(img_w, int(end_rect['x'] + end_rect['w']))
        ey2 = min(img_h, int(end_rect['y'] + end_rect['h']))

        if (ex2 - ex1) <= 0 or (ey2 - ey1) <= 0:
            return None, "The 'End' rectangle's calculated size is zero or negative after clamping. Please adjust and try again."

        end_crop = img[ey1:ey2, ex1:ex2]
        end_frame = cv2.resize(end_crop, (video_w, video_h), interpolation=cv2.INTER_CUBIC)
        for _ in range(padding_frames):
            writer.write(end_frame)

        writer.release()
        return url_for('generated_video', filename=output_filename), None

    except Exception as e:
        print(f"Error during video generation: {e}")
        if writer and writer.isOpened():
            writer.release()
        return None, "An internal error occurred during video generation."


# --- Flask Routes ---
@app.route('/')
def index():
    """Renders the main page."""
    return render_template('index.html')


@app.route('/generate', methods=['POST'])
def generate_video():
    """Handles the video generation request."""
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    filename = f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(image_path)

    try:
        data = request.form
        # FIX: Preserve floating-point precision by using float()
        start_rect = {
            'x': float(data['startX']), 'y': float(data['startY']),
            'w': float(data['startW']), 'h': float(data['startH'])
        }
        end_rect = {
            'x': float(data['endX']), 'y': float(data['endY']),
            'w': float(data['endW']), 'h': float(data['endH'])
        }

        # DEBUG: Print the received coordinates to the console
        print("--- Received Rectangles (from Frontend) ---")
        print(f"Start: {start_rect}")
        print(f"End:   {end_rect}")
        print("------------------------------------------")

        duration = float(data['duration'])
        resolution = data['resolution']
        padding = float(data.get('padding', 1.0))
    except (KeyError, ValueError) as e:
        os.remove(image_path)
        return jsonify({"error": f"Invalid form data: {e}"}), 400

    video_url, error_msg = create_ken_burns_video(image_path, start_rect, end_rect, duration, resolution, padding)

    os.remove(image_path)

    if video_url:
        return jsonify({"video_url": video_url})
    else:
        error_to_send = error_msg if error_msg else "Failed to generate video"
        return jsonify({"error": error_to_send}), 500


@app.route('/videos/<filename>')
def generated_video(filename):
    """Serves the generated video file."""
    # FIX: Add explicit mimetype to ensure browser compatibility
    return send_from_directory(
        app.config['GENERATED_VIDEOS_FOLDER'],
        filename,
        mimetype='video/mp4'
    )


# --- Main Execution ---
if __name__ == '__main__':
    for folder in [UPLOAD_FOLDER, GENERATED_VIDEOS_FOLDER]:
        if not os.path.exists(folder):
            os.makedirs(folder)

    app.run(debug=True)
