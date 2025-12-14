#!/usr/bin/env python3
"""
PaddleOCR API Server
Provides REST API for OCR text extraction from images.
Optimized for invoice processing with multi-language support.
"""

import os
import io
import logging
from typing import Dict, List, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
from PIL import Image
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize PaddleOCR
# use_angle_cls=True: Detect text orientation
# lang='es': Spanish language model (also supports 'en', 'fr', etc.)
# use_gpu=False: CPU mode (GPU requires CUDA setup)
logger.info("Initializing PaddleOCR...")
ocr = PaddleOCR(
    use_angle_cls=True,
    lang='es',
    use_gpu=False,
    show_log=False,
    det_db_thresh=0.3,  # Detection threshold (lower = more text detected)
    det_db_box_thresh=0.5,  # Box threshold
    rec_batch_num=6,  # Recognition batch size
)
logger.info("PaddleOCR initialized successfully")


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'paddleocr',
        'version': '2.7.3'
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    Extract text from uploaded image using PaddleOCR

    Request:
        - file: Image file (multipart/form-data)
        - lang: Optional language code (default: 'es')

    Response:
        {
            "success": true,
            "text": "extracted text...",
            "lines": [
                {
                    "text": "line text",
                    "bbox": [[x1,y1], [x2,y2], [x3,y3], [x4,y4]],
                    "confidence": 0.95
                }
            ],
            "provider": "paddleocr"
        }
    """
    try:
        # Validate request
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty filename'
            }), 400

        # Get optional language parameter
        lang = request.form.get('lang', 'es')

        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to numpy array (required by PaddleOCR)
        img_array = np.array(image)

        logger.info(f"Processing image: {file.filename}, size: {image.size}, lang: {lang}")

        # Perform OCR
        result = ocr.ocr(img_array, cls=True)

        if not result or len(result) == 0 or result[0] is None:
            logger.warning("No text detected in image")
            return jsonify({
                'success': True,
                'text': '',
                'lines': [],
                'provider': 'paddleocr'
            }), 200

        # Parse results
        lines = []
        full_text = []

        for line in result[0]:
            bbox = line[0]  # Bounding box coordinates
            text_info = line[1]  # (text, confidence)
            text = text_info[0]
            confidence = float(text_info[1])

            lines.append({
                'text': text,
                'bbox': bbox,
                'confidence': confidence
            })
            full_text.append(text)

        # Join all text with newlines
        extracted_text = '\n'.join(full_text)

        logger.info(f"Extracted {len(lines)} lines, total chars: {len(extracted_text)}")

        return jsonify({
            'success': True,
            'text': extracted_text,
            'lines': lines,
            'provider': 'paddleocr',
            'stats': {
                'total_lines': len(lines),
                'avg_confidence': sum(l['confidence'] for l in lines) / len(lines) if lines else 0
            }
        }), 200

    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/languages', methods=['GET'])
def get_languages():
    """Get list of supported languages"""
    supported_languages = [
        {'code': 'es', 'name': 'Spanish'},
        {'code': 'en', 'name': 'English'},
        {'code': 'fr', 'name': 'French'},
        {'code': 'de', 'name': 'German'},
        {'code': 'it', 'name': 'Italian'},
        {'code': 'pt', 'name': 'Portuguese'},
        {'code': 'ru', 'name': 'Russian'},
        {'code': 'ja', 'name': 'Japanese'},
        {'code': 'ko', 'name': 'Korean'},
        {'code': 'ch', 'name': 'Chinese (Simplified)'},
        {'code': 'ch_tra', 'name': 'Chinese (Traditional)'},
    ]
    return jsonify({
        'languages': supported_languages,
        'default': 'es'
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8866))
    logger.info(f"Starting PaddleOCR API server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
