from flask import Flask, request, send_file, render_template, jsonify
import yt_dlp
import os
import uuid
import json
import re

# Create app with proper static folder structure
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')



@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_info', methods=['POST'])
def get_info():
    url = request.form.get('url')
    if not url:
        return jsonify({"error": "Invalid URL provided"}), 400

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=False)
            
            # Extract available formats
            video_formats = []
            
            # Filter formats for UI display
            for fmt in info_dict.get('formats', []):
                if fmt.get('acodec') != 'none' and fmt.get('vcodec') != 'none':
                    # This is a complete audio+video format
                    format_note = fmt.get('format_note', 'unknown')
                    if format_note and 'p' in format_note:  # Only include formats with resolution
                        video_formats.append({
                            'format_id': fmt['format_id'],
                            'quality': format_note,
                            'ext': fmt.get('ext', 'mp4'),
                            'filesize': fmt.get('filesize', 0),
                            'fps': fmt.get('fps', 30)
                        })
            
            # Get audio format for MP3
            audio_format = None
            for fmt in info_dict.get('formats', []):
                if fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':
                    audio_format = {
                        'format_id': fmt['format_id'],
                        'quality': 'Audio Only',
                        'ext': fmt.get('ext', 'mp3'),
                        'filesize': fmt.get('filesize', 0),
                        'bitrate': fmt.get('abr', 128)
                    }
                    break
            
            # If no audio-only format found, use the fallback
            if not audio_format:
                audio_format = {
                    'format_id': 'bestaudio/best',
                    'quality': 'Best Audio',
                    'ext': 'mp3'
                }
            
            # Extract tags
            tags = info_dict.get('tags', [])
            if not tags and info_dict.get('categories'):
                tags = info_dict.get('categories')
            
            # Sort video formats by quality (assuming format_note contains resolution like "720p")
            video_formats = sorted(
                video_formats, 
                key=lambda x: int(x['quality'].replace('p', '')) if 'p' in x['quality'] else 0, 
                reverse=True
            )
            
            # Extract view count
            views = info_dict.get('view_count', 0)
            
            return jsonify({
                'title': info_dict.get('title', 'Unknown'),
                'thumbnail': info_dict.get('thumbnail', ''),
                'duration': info_dict.get('duration', 0),
                'uploader': info_dict.get('uploader', 'Unknown'),
                'views': views,
                'tags': tags[:10] if tags else [],  # Limit to 10 tags
                'video_formats': video_formats,
                'audio_format': audio_format
            })

    except Exception as e:
        return jsonify({"error": f"Error fetching video info: {str(e)}"}), 500

@app.route('/download', methods=['POST'])
def download():
    url = request.form.get('url')
    format_type = request.form.get('format_type', 'mp4')  # mp4 or mp3
    quality = request.form.get('quality', 'best')  # format_id or 'best'
    start_time = request.form.get('start_time', '0')  # optional start time in seconds
    end_time = request.form.get('end_time', '0')  # optional end time in seconds
    
    if not url:
        return "Invalid URL provided", 400

    try:
        unique_id = str(uuid.uuid4())
        download_path = os.path.join('downloads', unique_id)
        
        ydl_opts = {
            'outtmpl': f'{download_path}.%(ext)s',
            'noplaylist': True,
        }
        
        # Add time range if specified
        if start_time and end_time and start_time != '0' and end_time != '0':
            try:
                start_seconds = float(start_time)
                end_seconds = float(end_time)
                if start_seconds < end_seconds:
                    ydl_opts['download_ranges'] = lambda info_dict: [{
                        'start_time': start_seconds,
                        'end_time': end_seconds
                    }]
            except ValueError:
                pass  # Ignore invalid time values
        
        if format_type == 'mp3':
            # Audio download configuration - get the best audio and rename to MP3
            ydl_opts['format'] = 'bestaudio/best'
            # Attempt to find actual MP3 sources first if available
            ydl_opts['format_sort'] = ['acodec:mp3', 'ext:mp3:m4a', 'acodec:aac', 'audio_only']
        else:
            # Video download configuration
            ydl_opts['format'] = quality if quality != 'best' else 'best[ext=mp4][vcodec!=none][acodec!=none]'

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info_dict)
            
            # Get the original extension
            ext = info_dict.get('ext', 'mp4')
            
            if format_type == 'mp3':
                # For MP3 format, we'll rename the file to have .mp3 extension
                download_name = f"{info_dict.get('title', 'audio')}.mp3"
                
                # Create a copy of the file with .mp3 extension for download
                mp3_filename = os.path.splitext(filename)[0] + '.mp3'
                with open(filename, 'rb') as src_file:
                    with open(mp3_filename, 'wb') as dst_file:
                        dst_file.write(src_file.read())
                
                # Use the renamed file for download
                orig_filename = filename
                filename = mp3_filename
                
                # Add the original file to cleanup list
                files_to_cleanup = [orig_filename, filename]
            else:
                download_name = f"{info_dict.get('title', 'video')}.{ext}"
                files_to_cleanup = [filename]

        # Sanitize filename
        download_name = re.sub(r'[\\/*?:"<>|]', "_", download_name)
        
        response = send_file(
            filename,
            as_attachment=True,
            download_name=download_name
        )

        @response.call_on_close
        def cleanup():
            for f in files_to_cleanup:
                if os.path.exists(f):
                    try:
                        os.remove(f)
                    except:
                        pass

        return response

    except Exception as e:
        return f"Error downloading: {str(e)}", 500

@app.errorhandler(404)
def page_not_found(e):
    return render_template('error.html', error="Page not found"), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('error.html', error="Server error occurred"), 500

# Create static files
def create_static_files():
    """Create CSS and JS files if they don't exist."""
    css_path = os.path.join('static', 'css', 'styles.css')
    js_path = os.path.join('static', 'js', 'scripts.js')
    
    # Create template directory
    templates_dir = 'templates'
    if not os.path.exists(templates_dir):
        os.makedirs(templates_dir)
    
    # Create error.html template
    error_template_path = os.path.join(templates_dir, 'error.html')
    if not os.path.exists(error_template_path):
        with open(error_template_path, 'w') as f:
            f.write('''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error - YouTube Downloader</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='css/styles.css') }}">
</head>
<body class="error-page">
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card main-card">
                    <div class="card-header">
                        <h3><i class="fas fa-exclamation-triangle me-2"></i>Error</h3>
                    </div>
                    <div class="card-body">
                        <div class="error-container">
                            <h4>{{ error }}</h4>
                            <p>Sorry, something went wrong. Please try again or go back to the home page.</p>
                            <a href="/" class="btn btn-primary mt-3">
                                <i class="fas fa-home me-2"></i>Back to Home
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>''')

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)