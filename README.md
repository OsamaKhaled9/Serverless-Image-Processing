# Image Processing Studio

A serverless image processing application built with React and designed to work with AWS Lambda functions.

## Features
- **Resize**: Change image dimensions with aspect ratio control
- **Watermark**: Add text watermarks with customizable position and opacity
- **Compress**: Reduce file size with quality and format options
- **Drag & Drop**: Easy file upload interface
- **Real-time Preview**: See original vs processed images side by side

## File Structure
- `index.html` - Main HTML structure and script imports
- `styles.css` - All CSS styling and responsive design
- `app.js` - React application logic and AWS Lambda integration
- `README.md` - Project documentation

## Setup
1. Clone or download the files
2. Update the AWS Lambda endpoint in `app.js` (line ~150)
3. Open `index.html` in a web browser

## AWS Lambda Integration
The app sends FormData to your Lambda functions with:
- `image`: The uploaded file
- `operation`: Processing type (resize/watermark/compress)
- Configuration parameters specific to each operation

## Browser Support
- Modern browsers with ES6+ support
- React 17 via CDN
- Babel for JSX compilation
