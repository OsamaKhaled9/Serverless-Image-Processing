import React, { useState } from 'react';
import './App.css';
import { getUploadUrl } from "./helpers/api";


function App() {
  // State Management
  const [selectedOption, setSelectedOption] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');
  
  
  // Configuration states
  const [resizeWidth, setResizeWidth] = useState('800');
  const [resizeHeight, setResizeHeight] = useState('600');
  const [resizeMode, setResizeMode] = useState('fit');
  const [watermarkText, setWatermarkText] = useState('© Your Brand');
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState('0.7');
  const [compressionQuality, setCompressionQuality] = useState('80');
  const [compressionFormat, setCompressionFormat] = useState('jpeg');

  const processingOptions = [
    { 
      value: 'resize', 
      name: 'Resize', 
      icon: '📏',
      desc: 'Change image dimensions while maintaining quality'
    },
    { 
      value: 'watermark', 
      name: 'Watermark', 
      icon: '💧',
      desc: 'Add text or logo watermark to protect your image'
    },
    { 
      value: 'compress', 
      name: 'Compress', 
      icon: '🗜️',
      desc: 'Reduce file size while preserving visual quality'
    }
  ];

  // Event Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      setSelectedImage(files[0]);
      setProcessedImage(null);
      setStatusMessage('');
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setProcessedImage(null);
      setStatusMessage('');
    }
  };

  const handleFileInputClick = () => {
    document.getElementById('file-input').click();
  };

const uploadImageToS3 = async (file, resizeParams = {}) => {
  try {
    // Convert parameters to metadata format
    const metadata = {};
    if (resizeParams.width) metadata['resize-width'] = resizeParams.width.toString();
    if (resizeParams.height) metadata['resize-height'] = resizeParams.height.toString();
    if (resizeParams.mode) metadata['resize-mode'] = resizeParams.mode;
    if (resizeParams.quality) metadata['quality'] = resizeParams.quality.toString();

    // Ask backend for a pre-signed URL with metadata
    const { uploadURL, key } = await getUploadUrl(file, metadata);

    // PUT the file to S3 (no custom headers needed)
    const put = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    
    if (!put.ok) throw new Error("S3 upload failed");

    return { success: true, key };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
};



const processImage = async () => {
  if (!selectedImage || !selectedOption) {
    setStatusMessage('Please select both an image and a processing option');
    setStatusType('error');
    return;
  }

  setIsProcessing(true);
  setStatusMessage('Uploading image to S3...');
  setStatusType('processing');

  // Prepare parameters based on selected option
  let uploadParams = {};
  let processingMessage = '';

  if (selectedOption === 'resize') {
    uploadParams = {
      width: parseInt(resizeWidth) || 800,
      height: parseInt(resizeHeight) || 600,
      mode: resizeMode || 'fit',
      quality: 90
    };
    processingMessage = `Resizing to ${uploadParams.width}x${uploadParams.height} (${uploadParams.mode} mode)`;
  } else if (selectedOption === 'watermark') {
    processingMessage = `Adding watermark "${watermarkText}"`;
    // Future: Add watermark parameters here
  } else if (selectedOption === 'compress') {
    processingMessage = `Compressing to ${compressionQuality}% quality`;
    // Future: Add compression parameters here
  }

  // Upload with parameters
  const uploadResult = await uploadImageToS3(selectedImage, uploadParams);
  
  if (!uploadResult.success) {
    setStatusMessage(`Upload failed: ${uploadResult.error}`);
    setStatusType('error');
    setIsProcessing(false);
    return;
  }

  // Update status based on selected option
  if (selectedOption === 'resize') {
    setStatusMessage(`✅ Image uploaded! ${processingMessage}...`);
    
    // Processing happens automatically via S3 event trigger
    setTimeout(() => {
      setStatusMessage(
        `🎉 Image successfully resized to ${uploadParams.width}x${uploadParams.height}! ` +
        `Check your processed S3 bucket under "resized/" folder.`
      );
      setStatusType('success');
      setIsProcessing(false);
    }, 3000);
  } else {
    // For watermark and compress (future Lambdas)
    setStatusMessage(`✅ Image uploaded! ${processingMessage}...`);
    
    setTimeout(() => {
      setStatusMessage(
        `⚠️ Image uploaded successfully! ${selectedOption.charAt(0).toUpperCase() + selectedOption.slice(1)} Lambda will be implemented next.`
      );
      setStatusType('success');
      setIsProcessing(false);
    }, 2000);
  }
};




  const downloadImage = () => {
    if (processedImage) {
      const url = URL.createObjectURL(processedImage);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${selectedOption}_${Date.now()}.${compressionFormat || 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Image Processing Studio</h1>
        <p>Resize, watermark, and compress your images with AWS Lambda</p>
      </div>

      <div className="main-card">
        {/* Upload Section */}
        <div className="upload-section">
          <h2 className="section-title">📁 Upload Your Image</h2>
          <div 
            className={`upload-area ${dragOver ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileInputClick}
          >
            <div className="upload-icon">📸</div>
            <div className="upload-text">
              {selectedImage ? selectedImage.name : 'Drag & drop your image here'}
            </div>
            <div className="upload-subtext">
              {selectedImage ? 'Click to change image' : 'Supports JPG, PNG, WebP (max 10MB)'}
            </div>
            <input 
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file-input"
            />
          </div>
        </div>
        
        {/* Processing Options */}
        <div className="options-section">
          <h2 className="section-title">🛠️ Select Processing Type</h2>
          <div className="options-grid">
            {processingOptions.map(option => (
              <div 
                key={option.value}
                className={`option-card ${selectedOption === option.value ? 'selected' : ''}`}
                onClick={() => setSelectedOption(option.value)}
              >
                <div className="option-icon">{option.icon}</div>
                <div className="option-name">{option.name}</div>
                <div className="option-desc">{option.desc}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Configuration Section */}
        {selectedOption && (
          <div className="config-section">
            <h3 className="section-title">
              ⚙️ {processingOptions.find(opt => opt.value === selectedOption)?.name} Settings
            </h3>
            <div className="config-grid">
              {selectedOption === 'resize' && (
                <>
                  <div className="config-item">
                    <label className="config-label">Width (px)</label>
                    <input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => setResizeWidth(e.target.value)}
                      className="config-input"
                      min="1"
                      max="4000"
                    />
                  </div>
                  <div className="config-item">
                    <label className="config-label">Height (px)</label>
                    <input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => setResizeHeight(e.target.value)}
                      className="config-input"
                      min="1"
                      max="4000"
                    />
                  </div>
                  <div className="config-item">
                    <label className="config-label">Resize Mode</label>
                    <select
                      value={resizeMode}
                      onChange={(e) => setResizeMode(e.target.value)}
                      className="config-select"
                    >
                      <option value="fit">Fit (maintain aspect ratio)</option>
                      <option value="fill">Fill (crop if needed)</option>
                      <option value="stretch">Stretch (ignore aspect ratio)</option>
                    </select>
                  </div>
                </>
              )}
              
              {selectedOption === 'watermark' && (
                <>
                  <div className="config-item">
                    <label className="config-label">Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="config-input"
                      placeholder="Enter watermark text"
                    />
                  </div>
                  <div className="config-item">
                    <label className="config-label">Position</label>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value)}
                      className="config-select"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="center">Center</option>
                    </select>
                  </div>
                  <div className="config-item">
                    <label className="config-label">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(e.target.value)}
                      className="config-input"
                    />
                  </div>
                </>
              )}
              
              {selectedOption === 'compress' && (
                <>
                  <div className="config-item">
                    <label className="config-label">Quality ({compressionQuality}%)</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={compressionQuality}
                      onChange={(e) => setCompressionQuality(e.target.value)}
                      className="config-input"
                    />
                  </div>
                  <div className="config-item">
                    <label className="config-label">Output Format</label>
                    <select
                      value={compressionFormat}
                      onChange={(e) => setCompressionFormat(e.target.value)}
                      className="config-select"
                    >
                      <option value="jpeg">JPEG (smaller file)</option>
                      <option value="png">PNG (better quality)</option>
                      <option value="webp">WebP (modern format)</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Status Message */}
        {statusMessage && (
          <div className={`status-message status-${statusType}`}>
            {statusMessage}
          </div>
        )}
        
        {/* Process Button */}
        <button 
          className="process-btn"
          onClick={processImage}
          disabled={!selectedImage || !selectedOption || isProcessing}
        >
          {isProcessing ? '🔄 Processing...' : '🚀 Process Image'}
        </button>
        
        {/* Preview Section */}
        {selectedImage && (
          <div className="preview-section">
            <div className="preview-card">
              <div className="preview-header">📤 Original</div>
              <div className="preview-content">
                <img 
                  src={URL.createObjectURL(selectedImage)} 
                  alt="Original" 
                  className="preview-image"
                />
              </div>
            </div>
            
            <div className="preview-card">
              <div className="preview-header">
                {selectedOption ? `📥 ${processingOptions.find(opt => opt.value === selectedOption)?.name}d` : 'Processed'}
              </div>
              <div className="preview-content">
                {isProcessing ? (
                  <div className="loading-spinner"></div>
                ) : processedImage ? (
                  <>
                    <img 
                      src={URL.createObjectURL(processedImage)} 
                      alt="Processed" 
                      className="preview-image"
                    />
                    <button 
                      className="download-btn"
                      onClick={downloadImage}
                    >
                      📥 Download Result
                    </button>
                  </>
                ) : (
                  <div style={{color: '#999', fontSize: '0.9rem'}}>
                    Processed image will appear here
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
